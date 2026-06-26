# 使い方マニュアル

## 1. 事前準備

### Tampermonkey を入れる

Chrome に Tampermonkey をインストールしてください。

## 2. スクリプトを登録する

### 推奨: URL からインストール

1. Tampermonkey のダッシュボードを開く
2. `ユーティリティ` を開く
3. `URL からインストール` を使う
4. 次の URL を貼る:

   ```text
   https://raw.githubusercontent.com/Nekoneko-maker/grok-files-bulk-downloader/main/grok-files-downloader.user.js
   ```

5. Tampermonkey のインストール確認画面で確定する

### うまくいかない場合: 手動登録

URL インストールが動かない場合は、次の手順で登録してください。

1. Tampermonkey のダッシュボードを開く
2. `新規スクリプトを作成` を選ぶ
3. 初期コードをすべて消す
4. `grok-files-downloader.user.js` の中身を丸ごと貼り付ける
5. 保存する

## 3. 一括ダウンロードを始める

1. Chrome で `https://grok.com/files` を開く
2. 右下に `Grok Files Downloader` パネルが出る
3. `一括DL開始` を押す

スクリプトは 50 件ずつ一覧を取得し、そのページ分をすぐダウンロードします。すべての一覧取得が終わるまで待つ必要はありません。

## 4. 保存先とファイル名

既定では Chrome のダウンロードフォルダ配下に保存されます。

```text
grok-files/images/
grok-files/videos/
grok-files/files/
```

保存名は次の形式です。

```text
元ファイル名_作成日_assetId先頭8桁.ext
```

例:

```text
grok-files/videos/generated_video_2026-04-11_83405ee7.mp4
grok-files/files/document_2026-04-11_12ab34cd.pdf
grok-files/images/imagine_xxx_2026-04-11_a8db689d.jpg
```

フォルダ名を変えたい場合は、スクリプト先頭の `downloadRootFolder` を編集してください。

## 5. ボタンの意味

| ボタン | 動作 |
|---|---|
| `一括DL開始` | 選択対象の全件取得とダウンロードを開始 |
| `失敗分再試行` | 失敗として記録されたファイルだけ再実行 |
| `失敗一覧を表示` | 失敗したファイルの保存予定名・MIME type・asset ID・作成日時を表示 |
| `失敗一覧をコピー` | 失敗一覧をタブ区切りテキストとしてコピー |
| `停止` | 新しい処理の開始を止める。進行中の数件は完了またはタイムアウトまで待つ |
| `強制停止` | UI 上の処理を即時停止扱いにする。次回再開前提 |
| `既存DLを取り込む` | すでに保存済みのフォルダを読み込み、次回以降スキップ対象にする |
| `履歴リセット` | 完了済み・既存取り込み・失敗記録を消す |

## 6. 途中で止まったとき

### すでに最新版を使っていた場合

もう一度 `一括DL開始` を押せば、完了済みは自動でスキップされます。

### 旧版で途中まで落とした場合

1. 最新版へ更新
2. `既存DLを取り込む` を押す
3. 以前の `grok-files` フォルダを選ぶ
4. `一括DL開始` を押す

ファイル名末尾の asset ID 断片を読み取り、既存ファイルを再利用します。

## 7. 失敗が出たとき

大量件数の一括ダウンロードでは、一時的な通信失敗が混ざることがあります。

処理完了後に `失敗一覧を表示` を押すと、ダウンロードできなかったファイル名を確認できます。`失敗一覧をコピー` で一覧をコピーでき、`失敗分再試行` で失敗として記録されたファイルだけを再試行します。

## 8. 設定を変える

スクリプト先頭の `CONFIG` で調整できます。

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

よく使う変更:

- 動画だけ落としたい: `includeImage: false`、`includeFile: false`
- 画像だけ落としたい: `includeVideo: false`、`includeFile: false`
- その他ファイルだけ落としたい: `includeImage: false`、`includeVideo: false`
- 大量件数で慎重に動かしたい: `concurrency: 1` または `2`
- 保存フォルダ名を変えたい: `downloadRootFolder`

## 9. 注意事項

- Chrome のダウンロード設定によっては、複数ファイルの保存許可が必要です。
- `既存DLを取り込む` は、ファイル名に含まれる asset ID の先頭 8 文字を使って既存判定します。
- asset ID 先頭 8 文字の衝突は理論上ありえますが、通常の利用規模ではかなり低確率です。
- Grok 側の API 仕様変更で動作しなくなる可能性があります。
