# Grok Files Bulk Downloader

[English](#english) | [日本語](#日本語)

## English

A Tampermonkey userscript for bulk-downloading images, videos, and other files from `grok.com/files`.

Unlike tools that only handle favorites, this script targets the full **Files** library, paginates through all assets, and saves them with collision-resistant filenames based on the original name, creation date, and asset ID.

### Features

- Bulk-download images, videos, and other files from `grok.com/files`
- Pagination support for large libraries
- Starts downloading each fetched batch immediately
- Preserves original filenames when possible
- Adds creation date and asset ID to avoid filename collisions
- Automatically sorts files into `images/`, `videos/`, and `files/`
- Resume support after interruptions
- Import an existing download folder to skip already-saved files
- Retry only failed downloads

### Example output

```text
grok-files/images/imagine_xxx_2026-04-11_a8db689d.jpg
grok-files/videos/generated_video_2026-04-11_83405ee7.mp4
grok-files/files/document_2026-04-11_12ab34cd.pdf
```

### Quick start

1. Install Tampermonkey in Chrome
2. Add `grok-files-downloader.user.js` as a userscript
3. Open `https://grok.com/files`
4. Use the `Grok Files Downloader` panel in the lower-right corner

See the full [English usage guide](./docs/USAGE.en.md).

### Notes

- Files are saved under Chrome's normal download directory.
- Due to browser restrictions, the script cannot directly choose an arbitrary absolute path on disk.
- Chrome or Tampermonkey may ask for permission before allowing many automatic downloads.
- Grok API or UI changes may break the script in the future.

### Safety

This script:

- runs only on `grok.com/files`
- uses your existing logged-in browser session
- does not send data to third-party servers
- does not delete, edit, or upload files

---

## 日本語

`grok.com/files` に保存されている画像・動画・その他ファイルを、まとめてダウンロードする Tampermonkey 用ユーザースクリプトです。

Grok の **favorites だけでなく files 全体**を対象に、ページングしながら全件取得し、元ファイル名を活かした衝突しにくい名前で保存します。

### 主な機能

- `grok.com/files` の画像・動画・その他ファイルを一括ダウンロード
- 大量件数に対応したページング取得
- 取得したページから順次ダウンロード開始
- 元ファイル名ベースの自動命名
- 同名ファイル衝突を避けるため、作成日と asset ID を付与
- `images/`、`videos/`、`files/` に自動振り分け
- 途中停止後の再開
- 既存ダウンロード済みフォルダの取り込み
- 失敗分だけの再試行

### 保存例

```text
grok-files/images/imagine_xxx_2026-04-11_a8db689d.jpg
grok-files/videos/generated_video_2026-04-11_83405ee7.mp4
grok-files/files/document_2026-04-11_12ab34cd.pdf
```

### 最短手順

1. Chrome に Tampermonkey を入れる
2. `grok-files-downloader.user.js` を Tampermonkey に登録する
3. `https://grok.com/files` を開く
4. 右下の `Grok Files Downloader` から実行する

詳しくは [日本語の使い方マニュアル](./docs/USAGE.ja.md) を見てください。

### 使う前に知っておくこと

- 保存先は Chrome の通常のダウンロードフォルダ配下です。
- ブラウザの制約上、スクリプトから任意の絶対パスを直接指定することはできません。
- 初回は Chrome / Tampermonkey から複数ダウンロードの許可を求められることがあります。
- Grok 側の API やページ構造が変わると、将来動かなくなる可能性があります。

### 安全性

このスクリプトは:

- `grok.com/files` 上でのみ動作します
- ログイン済みのブラウザセッションを利用してダウンロードします
- 外部サーバーへデータを送信しません
- ファイルの削除・変更・アップロードは行いません

## Developer tools

検証用の補助スクリプトは [`tools/`](./tools) にあります。通常利用者は使う必要はありません。

## License

MIT License
