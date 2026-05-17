// ==UserScript==
// @name         Grok Files Bulk Downloader
// @namespace    https://grok.com/
// @version      0.1.4
// @description  Bulk download images and videos from grok.com/files with collision-safe filenames.
// @match        https://grok.com/files*
// @grant        GM_download
// @connect      grok.com
// @connect      assets.grok.com
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = {
    pageSize: 50,
    concurrency: 3,
    retryCount: 2,
    downloadTimeoutMs: 120000,
    delayBetweenBatchesMs: 250,
    includeImage: true,
    includeVideo: true,
    downloadRootFolder: 'grok-files',
  };

  const state = {
    running: false,
    cancelled: false,
    forceStopped: false,
    items: [],
    completed: 0,
    failed: 0,
    skipped: 0,
    resumed: 0,
  };

  const STORAGE_KEY = 'grok-files-downloader.completed-asset-ids.v1';
  const PREFIX_STORAGE_KEY = 'grok-files-downloader.completed-asset-prefixes.v1';
  const FAILED_STORAGE_KEY = 'grok-files-downloader.failed-assets.v1';

  function loadCompletedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  }

  function saveCompletedIds(ids) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }

  function clearCompletedIds() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadCompletedPrefixes() {
    try {
      return new Set(JSON.parse(localStorage.getItem(PREFIX_STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  }

  function saveCompletedPrefixes(prefixes) {
    localStorage.setItem(PREFIX_STORAGE_KEY, JSON.stringify([...prefixes]));
  }

  function clearCompletedPrefixes() {
    localStorage.removeItem(PREFIX_STORAGE_KEY);
  }

  function loadFailedAssets() {
    try {
      return JSON.parse(localStorage.getItem(FAILED_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveFailedAssets(assets) {
    localStorage.setItem(FAILED_STORAGE_KEY, JSON.stringify(assets));
  }

  function clearFailedAssets() {
    localStorage.removeItem(FAILED_STORAGE_KEY);
  }

  const completedIds = loadCompletedIds();
  const completedPrefixes = loadCompletedPrefixes();
  let failedAssets = loadFailedAssets();

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function sanitizeFilename(name) {
    return String(name || 'file')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatDate(iso) {
    if (!iso) return 'unknown-date';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'unknown-date';
    return d.toISOString().slice(0, 10);
  }

  function splitName(name, mimeType) {
    const safe = sanitizeFilename(name || 'file');
    const lastDot = safe.lastIndexOf('.');
    if (lastDot > 0) return { base: safe.slice(0, lastDot), ext: safe.slice(lastDot + 1) };

    const fallbackExt = mimeType?.split('/')?.[1] || 'bin';
    return { base: safe, ext: fallbackExt };
  }

  function makeFilename(asset) {
    const { base, ext } = splitName(asset.name, asset.mimeType);
    const date = formatDate(asset.createTime);
    const id = String(asset.assetId || '').slice(0, 8) || 'noid';
    const bucket = asset.mimeType?.startsWith('video/') ? 'videos' : 'images';
    const file = `${base}_${date}_${id}.${ext}`;
    return `${CONFIG.downloadRootFolder}/${bucket}/${file}`;
  }

  function isWanted(asset) {
    const mime = asset.mimeType || '';
    return (CONFIG.includeImage && mime.startsWith('image/')) ||
      (CONFIG.includeVideo && mime.startsWith('video/'));
  }

  async function fetchAssetsPage(pageToken) {
    const params = new URLSearchParams({
      pageSize: String(CONFIG.pageSize),
      orderBy: 'ORDER_BY_LAST_USE_TIME',
      source: 'SOURCE_ANY',
      isLatest: 'true',
      includeImagineFiles: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(`/rest/assets?${params.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`一覧取得に失敗しました: HTTP ${response.status}`);
    return response.json();
  }

  async function fetchAndDownloadAll(updateStatus) {
    let nextPageToken = null;
    let page = 0;

    do {
      if (state.cancelled) break;
      const data = await fetchAssetsPage(nextPageToken);
      const pageItems = (data.assets || data.items || []).filter(isWanted);
      state.items.push(...pageItems);
      page += 1;
      updateStatus(`一覧取得中: ${state.items.length} 件発見（${page} ページ）`);

      await runQueue(pageItems, updateStatus);
      nextPageToken = data.nextPageToken || null;
      if (nextPageToken) await sleep(CONFIG.delayBetweenBatchesMs);
    } while (nextPageToken);
  }


  function getDownloadUrl(asset) {
    if (asset.url) return asset.url;
    if (asset.downloadUrl) return asset.downloadUrl;
    if (asset.urlKeys?.content) return asset.urlKeys.content;
    if (asset.auxKeys?.content) return asset.auxKeys.content;
    if (asset.key) return `https://assets.grok.com/${asset.key}`;
    return null;
  }

  function gmDownload(url, name) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`download timed out after ${CONFIG.downloadTimeoutMs}ms`));
      }, CONFIG.downloadTimeoutMs);

      GM_download({
        url,
        name,
        saveAs: false,
        onload: () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        },
        onerror: (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
        ontimeout: (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error || new Error('download timed out'));
        },
      });
    });
  }

  async function downloadOne(asset) {
    const url = getDownloadUrl(asset);
    if (!url) {
      throw new Error(`ダウンロードURLが見つかりません: ${asset.assetId}`);
    }
    const filename = makeFilename(asset);
    await gmDownload(url, filename);
  }

  async function withRetry(fn, retries) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < retries) await sleep(500 * (attempt + 1));
      }
    }
    throw lastError;
  }

  async function runQueue(items, updateStatus) {
    const queue = [...items];

    async function worker() {
      while (queue.length && !state.cancelled && !state.forceStopped) {
        const asset = queue.shift();
        if (completedIds.has(asset.assetId) || completedPrefixes.has(String(asset.assetId || '').slice(0, 8))) {
          state.skipped += 1;
          state.resumed += 1;
          updateStatus();
          continue;
        }
        try {
          await withRetry(() => downloadOne(asset), CONFIG.retryCount);
          completedIds.add(asset.assetId);
          saveCompletedIds(completedIds);
          state.completed += 1;
        } catch (error) {
          state.failed += 1;
          failedAssets = failedAssets.filter((x) => x.assetId !== asset.assetId);
          failedAssets.push(asset);
          saveFailedAssets(failedAssets);
          console.error('[Grok Files Downloader] failed', asset, error);
        }
        updateStatus();
      }
    }

    const workers = Array.from({ length: CONFIG.concurrency }, () => worker());
    await Promise.all(workers);
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'grok-files-downloader-panel';
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 999999;
      width: 320px;
      background: rgba(20,20,20,.96);
      color: #fff;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 14px;
      padding: 14px;
      font: 13px/1.45 system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
    `;

    panel.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;">Grok Files Downloader</div>
      <div id="gfd-status" style="opacity:.9;margin-bottom:10px;">待機中</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button id="gfd-start" style="flex:1;padding:8px;border:0;border-radius:10px;cursor:pointer;">一括DL開始</button>
        <button id="gfd-retry" style="padding:8px;border:0;border-radius:10px;cursor:pointer;">失敗分再試行</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button id="gfd-stop" style="flex:1;padding:7px;border:0;border-radius:10px;cursor:pointer;">停止</button>
        <button id="gfd-force-stop" style="flex:1;padding:7px;border:0;border-radius:10px;cursor:pointer;">強制停止</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button id="gfd-import" style="flex:1;padding:7px;border:0;border-radius:10px;cursor:pointer;opacity:.9;">既存DLを取り込む</button>
        <button id="gfd-reset" style="flex:1;padding:7px;border:0;border-radius:10px;cursor:pointer;opacity:.85;">履歴リセット</button>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  function install() {
    if (document.getElementById('grok-files-downloader-panel')) return;
    const panel = createPanel();
    const status = panel.querySelector('#gfd-status');
    const start = panel.querySelector('#gfd-start');
    const retry = panel.querySelector('#gfd-retry');
    const stop = panel.querySelector('#gfd-stop');
    const forceStop = panel.querySelector('#gfd-force-stop');
    const reset = panel.querySelector('#gfd-reset');
    const importButton = panel.querySelector('#gfd-import');

    const updateStatus = (message) => {
      if (message) {
        status.textContent = message;
        return;
      }
      status.textContent = `完了 ${state.completed} / ${state.items.length} ・再開スキップ ${state.skipped} ・失敗 ${state.failed}`;
    };

    start.addEventListener('click', async () => {
      if (state.running) return;
      state.running = true;
      state.cancelled = false;
      state.forceStopped = false;
      state.completed = 0;
      state.failed = 0;
      state.skipped = 0;
      state.resumed = 0;
      state.items = [];
      start.disabled = true;

      try {
        updateStatus('一覧取得とダウンロードを開始しています…');
        await fetchAndDownloadAll(updateStatus);
        updateStatus(state.forceStopped
          ? `強制停止しました。新規完了 ${state.completed} ・再開スキップ ${state.skipped} ・失敗 ${state.failed}`
          : state.cancelled
            ? `停止しました。新規完了 ${state.completed} ・再開スキップ ${state.skipped} ・失敗 ${state.failed}`
            : `完了しました。新規成功 ${state.completed} ・再開スキップ ${state.skipped} ・失敗 ${state.failed}`);
      } catch (error) {
        console.error('[Grok Files Downloader]', error);
        updateStatus(`エラー: ${error.message}`);
      } finally {
        state.running = false;
        start.disabled = false;
      }
    });

    retry.addEventListener('click', async () => {
      if (state.running) return;
      failedAssets = loadFailedAssets();
      if (!failedAssets.length) {
        updateStatus('再試行対象の失敗分はありません');
        return;
      }
      state.running = true;
      state.cancelled = false;
      state.forceStopped = false;
      state.completed = 0;
      state.failed = 0;
      state.skipped = 0;
      state.items = [...failedAssets];
      try {
        updateStatus(`失敗分 ${state.items.length} 件を再試行中…`);
        failedAssets = [];
        saveFailedAssets(failedAssets);
        await runQueue(state.items, updateStatus);
        updateStatus(state.forceStopped
          ? `強制停止しました。新規完了 ${state.completed} ・失敗 ${state.failed}`
          : state.cancelled
            ? `停止しました。新規完了 ${state.completed} ・失敗 ${state.failed}`
            : `失敗分の再試行が完了しました。成功 ${state.completed} ・失敗 ${state.failed}`);
      } finally {
        state.running = false;
      }
    });

    stop.addEventListener('click', () => {
      state.cancelled = true;
      updateStatus('停止要求を受け付けました…');
    });

    forceStop.addEventListener('click', () => {
      state.forceStopped = true;
      state.cancelled = true;
      state.running = false;
      updateStatus('強制停止しました');
    });

    importButton.addEventListener('click', async () => {
      if (!window.showDirectoryPicker) {
        updateStatus('このブラウザではフォルダ取込に未対応です');
        return;
      }
      try {
        const dir = await window.showDirectoryPicker();
        let imported = 0;
        async function walk(handle) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'directory') {
              await walk(entry);
              continue;
            }
            const match = entry.name.match(/_([0-9a-f]{8})\.[^.]+$/i);
            if (match) {
              completedPrefixes.add(match[1].toLowerCase());
              imported += 1;
            }
          }
        }
        await walk(dir);
        saveCompletedPrefixes(completedPrefixes);
        updateStatus(`既存DLを取り込みました: ${imported} 件`);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('[Grok Files Downloader] import failed', error);
          updateStatus('既存DLの取り込みに失敗しました');
        }
      }
    });

    reset.addEventListener('click', () => {
      clearCompletedIds();
      clearCompletedPrefixes();
      clearFailedAssets();
      completedIds.clear();
      completedPrefixes.clear();
      failedAssets = [];
      updateStatus('履歴をリセットしました');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();
