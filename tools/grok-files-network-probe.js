(() => {
  const logs = [];
  const startedAt = new Date().toISOString();

  const push = (entry) => {
    logs.push(entry);
    console.log('[grok-files-network-probe]', entry);
  };

  // すでに発生済みのリソース読み込みも拾う
  for (const entry of performance.getEntriesByType('resource')) {
    push({
      type: 'performance-resource',
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
    });
  }

  const safePreview = async (response) => {
    try {
      const clone = response.clone();
      const type = clone.headers.get('content-type') || '';
      if (!/json|text/i.test(type)) return null;
      const body = await clone.text();
      return body.slice(0, 1200);
    } catch {
      return null;
    }
  };

  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const request = args[0];
    const url = typeof request === 'string' ? request : request?.url;
    const method = (args[1]?.method || request?.method || 'GET').toUpperCase();
    const response = await origFetch(...args);
    push({
      type: 'fetch',
      time: new Date().toISOString(),
      method,
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bodyPreview: await safePreview(response),
    });
    return response;
  };

  const OrigXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends OrigXHR {
    open(method, url, ...rest) {
      this.__probeMethod = method;
      this.__probeUrl = url;
      return super.open(method, url, ...rest);
    }

    send(...args) {
      this.addEventListener('load', () => {
        push({
          type: 'xhr',
          time: new Date().toISOString(),
          method: this.__probeMethod,
          url: this.__probeUrl,
          status: this.status,
          contentType: this.getResponseHeader('content-type'),
          bodyPreview: typeof this.responseText === 'string' ? this.responseText.slice(0, 1200) : null,
        });
      });
      return super.send(...args);
    }
  };

  window.__grokFilesNetworkProbe = {
    startedAt,
    logs,
    export() {
      const output = JSON.stringify({ startedAt, capturedAt: new Date().toISOString(), logs }, null, 2);
      console.log(output);
      return output;
    },
    restore() {
      window.fetch = origFetch;
      window.XMLHttpRequest = OrigXHR;
      console.log('[grok-files-network-probe] restored original fetch/XMLHttpRequest');
    },
  };

  console.log('[grok-files-network-probe] active');
  console.log('このまま少しスクロールしてください。終わったら __grokFilesNetworkProbe.export() を実行してください。');
})();
