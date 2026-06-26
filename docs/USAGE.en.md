# Usage Guide

## 1. Prerequisites

### Install Tampermonkey

Install Tampermonkey in Chrome first.

## 2. Add the userscript

1. Open the Tampermonkey dashboard
2. Choose `Create a new script`
3. Remove the default code
4. Paste the full contents of `grok-files-downloader.user.js`
5. Save the script

## 3. Start a bulk download

1. Open `https://grok.com/files` in Chrome
2. A `Grok Files Downloader` panel appears in the lower-right corner
3. Click `一括DL開始` (`Start bulk download`)

The script fetches assets 50 at a time and starts downloading each batch immediately. It does not wait until the full library has been indexed.

## 4. Save location and filenames

By default, files are saved under Chrome's normal download directory:

```text
grok-files/images/
grok-files/videos/
grok-files/files/
```

Filenames use this format:

```text
original-name_created-date_first-8-chars-of-asset-id.ext
```

Examples:

```text
grok-files/videos/generated_video_2026-04-11_83405ee7.mp4
grok-files/files/document_2026-04-11_12ab34cd.pdf
grok-files/images/imagine_xxx_2026-04-11_a8db689d.jpg
```

To change the root folder name, edit `downloadRootFolder` near the top of the script.

## 5. Button reference

| Button | Behavior |
|---|---|
| `一括DL開始` | Start fetching and downloading all selected asset types |
| `失敗分再試行` | Retry only files previously recorded as failed |
| `停止` | Stop starting new work. In-flight downloads continue until they finish or time out |
| `強制停止` | Stop the UI flow immediately. Intended for resuming later |
| `既存DLを取り込む` | Import an existing download folder and skip already-downloaded assets later |
| `履歴リセット` | Clear completed, imported, and failed-history records |

## 6. If a run is interrupted

### If you were already using the current version

Click `一括DL開始` again. Completed assets are remembered and skipped automatically.

### If files were downloaded with an older version

1. Update to the latest script
2. Click `既存DLを取り込む`
3. Select your existing `grok-files` folder
4. Click `一括DL開始`

The script reads the asset ID fragment embedded in existing filenames and uses it to avoid downloading those files again.

## 7. If some downloads fail

A small number of failures can happen during large batch downloads because of temporary network or server issues.

After the main run finishes, click `失敗分再試行` to retry only the files recorded as failed.

## 8. Configuration

You can edit the `CONFIG` block near the top of the script:

```js
const CONFIG = {
  pageSize: 50,
  concurrency: 3,
  retryCount: 2,
  downloadTimeoutMs: 120000,
  delayBetweenBatchesMs: 250,
  includeImage: true,
  includeVideo: true,
  includeFile: true,
  downloadRootFolder: 'grok-files',
};
```

Common changes:

- Videos only: `includeImage: false` and `includeFile: false`
- Images only: `includeVideo: false` and `includeFile: false`
- Other files only: `includeImage: false` and `includeVideo: false`
- More cautious behavior for very large libraries: set `concurrency` to `1` or `2`
- Different output folder name: edit `downloadRootFolder`

## 9. Notes

- Chrome may ask for permission to allow multiple automatic downloads.
- `既存DLを取り込む` uses the first 8 characters of the asset ID embedded in filenames to identify existing downloads.
- A collision on those first 8 characters is theoretically possible, but unlikely at ordinary library sizes.
- The script may stop working if Grok changes its API or page structure.
