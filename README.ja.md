# My Library

`bookmanager.html` は、HTML / Tailwind CSS / JavaScript のみで構成された、モバイルファーストの単一ファイル蔵書管理アプリです。バーコードのスキャンまたは ISBN の手入力で書誌情報を取得し、読書状況・メモ・価格・表紙画像を保存できます。CSV の入出力にも対応しています。

Firebase の設定が利用可能な場合は Firestore と同期し、Firebase を利用できない場合は自動的にブラウザの `localStorage` にフォールバックします。

## 主な機能

- **英語・日本語・簡体字中国語** の3言語 UI
- モバイル向けレイアウト
- iOS のセーフエリアを考慮した下部余白対応
- `html5-qrcode` を使ったカメラによるバーコード読み取り
- ISBN の手動検索
- 書誌情報取得のフォールバック順:
  1. `openBD`
  2. `Google Books API`
  3. `Open Library Books API`
- 書籍データの追加・編集・削除
- 次の情報を管理可能:
  - ISBN
  - タイトル
  - 著者
  - 価格
  - 読書状況（`unread` / `reading` / `read`）
  - 感想・メモ
  - 表紙画像
  - 登録日時
- 写真撮影または画像アップロードによる表紙登録
- 保存前のクライアント側画像圧縮
- CSV エクスポート / インポート
- 任意の Firebase Authentication + Firestore 連携
- クラウド設定がない場合のローカル専用動作

## アプリの動作概要

1. 利用者が表示言語を選択します。
2. Firebase の初期化と認証に成功した場合、Firestore から蔵書データを読み込みます。
3. クラウド同期が使えない場合は、ブラウザの `localStorage` を使用します。
4. 書籍はバーコードの読み取り、または ISBN の手入力で追加できます。
5. 書誌情報は公開 API から取得し、タイトル・著者・表紙画像を自動入力します。
6. その後、残りの項目を補完して保存します。
7. 保存済みの本はカード形式で表示され、`entryDate` の新しい順に並びます。

## データ項目

| 項目 | 型 | 説明 |
|---|---|---|
| `id` | string | ローカル保存時のID、または Firestore のドキュメント ID |
| `isbn` | string | ISBN / バーコード値 |
| `title` | string | 書名。フォーム上で必須なのはこの項目のみ |
| `author` | string | 著者名 |
| `price` | string | 自由入力の価格欄 |
| `status` | string | `unread` / `reading` / `read` |
| `notes` | string | 感想・メモ |
| `coverUrl` | string | 外部 API から取得した表紙画像 URL |
| `customImage` | string | 圧縮後に Base64 化されたアップロード画像 |
| `entryDate` | string | 並び順に使われる ISO 形式の日時 |

## 技術構成

- **HTML5**
- **Vanilla JavaScript**
- CDN 経由の **Tailwind CSS**
- CDN 経由の **Lucide** アイコン
- バーコード読み取り用 **html5-qrcode**
- **Firebase JS SDK 11.6.1**（任意）
- 利用ブラウザ API:
  - `localStorage`
  - `fetch`
  - `FileReader`
  - `Canvas`
  - カメラ / メディアアクセス

## ファイル構成

```text
.
├── bookmanager.html
├── README.md
├── README.en.md
├── README.ja.md
└── README.zh.md
```

## ローカル実行方法

ビルドは不要です。ローカルサーバーで配信して確認するのが最も簡単です。

```bash
python -m http.server 8000
```

その後、以下を開きます。

```text
http://localhost:8000/bookmanager.html
```

### 注意

- カメラを使うバーコード読み取りは、通常 **`http://localhost` または `https`** のようなセキュアコンテキストが必要です。
- 主要ライブラリは CDN から読み込まれるため、ローカルに同梱しない限りインターネット接続が必要です。

## 任意の Firebase 連携

HTML では、次のグローバル変数が存在するかを確認します。

- `__firebase_config`
- `__app_id`
- `__initial_auth_token`

有効な Firebase 設定が与えられた場合、アプリは次のように動作します。

- Firebase を初期化する
- `__initial_auth_token` があればカスタムトークンでサインインする
- なければ匿名認証を試行する
- 次の Firestore パスを監視して蔵書を同期する

```text
artifacts/{appId}/users/{uid}/books
```

### Firebase に関する補足

- `__initial_auth_token` を渡さない場合、Firebase プロジェクト側で **匿名認証** を有効にしておく必要があります。
- Firestore のセキュリティルールは上記パスに合わせて設計する必要があります。
- Firebase の初期化に失敗した場合でも、アプリはローカル専用モードで継続します。

## 利用している外部サービス

書誌情報取得には、次の公開 API を順番に使用します。

1. **openBD** — 特に日本の書籍で有用な第一候補
2. **Google Books API** — フォールバック
3. **Open Library Books API** — さらに次のフォールバック

取得結果は ISBN の収録状況や API の可用性に依存します。

## 画像処理

利用者が写真を撮影または画像をアップロードすると、ブラウザ内で次の処理が行われます。

- 画像を読み込む
- アスペクト比を維持したまま最大 **600 × 800** に縮小する
- **JPEG** に変換する
- 品質 **0.7** で圧縮する
- `customImage` として Base64 文字列で保存する

アップロードした画像は、その書籍レコードでは API 取得の表紙画像より優先されます。

## CSV 入出力

### 出力カラム

```csv
id,isbn,title,author,price,status,notes,coverUrl,entryDate
```

### 挙動

- エクスポート時のファイル名は `my_library.csv`
- インポートは概ね同じカラム構成を想定
- `title` が空でない行のみ取り込み対象
- 既存 ID または生成 ID をドキュメント ID / ローカル ID として利用

### 重要な制約

`customImage` は CSV のエクスポート / インポート対象に含まれません。つまり、**アップロードした独自画像は CSV バックアップでは保持されません**。

## 注意点・制約

- 選択した言語はページ再読み込み後に保持されません。
- 一部のアラートやログメッセージは中国語でハードコードされています。
- `localStorage` には容量制限があり、画像が多いと上限に達する可能性があります。
- 圧縮後でも画像サイズによっては Firestore のドキュメントサイズ制限やブラウザ保存容量に抵触する可能性があります。
- CSV パーサーは軽量実装のため、すべての CSV エッジケースに対応しているわけではありません。
- バーコード読み取りにはカメラ権限が必要です。
- 書誌情報取得にはネットワーク接続が必要です。

## まとめ

このプロジェクトは、ブラウザだけで動作するコンパクトな個人用蔵書管理アプリです。特に次の点が強みです。

- ビルド不要で配置しやすい
- バーコードから素早く登録できる
- 多言語 UI を備える
- クラウド同期がなくてもローカルで継続利用できる

個人の蔵書整理、読書記録、小規模な在庫管理的ユースケースに適しています。
