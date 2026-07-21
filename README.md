# コンタクトレンズ最安値比較サイト群

楽天市場・Yahoo!ショッピングの価格を毎日自動取得し、商品ごとの
最安値ランキングサイトを複数まとめて運用するためのプロジェクトです。

商品が増えても対応できるよう、**「共通の仕組み」+「商品ごとの設定リスト」**
という構成にしています。新しい商品を追加する際は、`scripts/products.config.mjs`
に1項目追記するだけで済みます（新しいスクリプトやワークフローを作る必要はありません）。

## 現在運用中のサイト

| 商品 | URL(サブディレクトリ) | 比較単位 |
|---|---|---|
| ワンデーアキュビューオアシス | `/oasys-saiyasu/` | 90枚×2箱セット(180枚) / 90枚1箱 |
| ワンデーアキュビューオアシス乱視用 | `/oasys-ranshi-saiyasu/` | 6箱(180枚) / 2箱(60枚) |

## 全体構成

```
scripts/
  lib/common.mjs          共通ロジック（API取得・単価計算・HTML部品・
                            アフィリエイトリンク化・処方箋フィルタなど）
  products.config.mjs     商品ごとの設定リスト（★新商品はここに追記するだけ）
  build-all.mjs            全商品を順番に処理し、docs-xxx/ を生成するメインスクリプト
  deploy-ftp.mjs            全商品分をまとめてFTPアップロードするスクリプト
docs-template/
  site.template.html       全商品共通の1つのHTMLテンプレート
docs/                       商品1（通常版）の公開フォルダ（自動生成される）
docs-toric/                 商品2（乱視用）の公開フォルダ（自動生成される）
.github/workflows/
  update-all-prices.yml     全商品をまとめて処理する、たった1つのワークフロー
package.json                 basic-ftp（FTPアップロード用ライブラリ）に依存
```

### この設計にした理由

- 商品数が今後50を超える可能性があるとのことだったため、
  「1商品につきファイル一式をコピーして増やす」方式ではなく、
  **共通処理を1箇所にまとめ、商品ごとの違いは設定（データ）として持つ**方式にしました。
- 1つのワークフロー実行の中で、全商品を順番に処理します。
  **1商品の取得に失敗しても、そこで処理を止めず次の商品に進みます**
  （失敗した商品は、前回成功時のファイルがそのまま残ります）。
- 商品間には約1.5秒の待ち時間を入れており、API側への急激な負荷を避けています。
- 実行の最後に「何商品中、何商品成功したか」の一覧をログに出力します。

---

## セットアップ手順（新規に導入する場合）

### 1. GitHub Secretsを登録する

| Name | 内容 |
|---|---|
| `SITE_BASE_URL` | サイトのドメイン（例: `https://example.com` ※末尾のスラッシュは無しでも有りでも可） |
| `RAKUTEN_APP_ID` | 楽天ウェブサービスのApplication ID(UUID形式) |
| `RAKUTEN_ACCESS_KEY` | 楽天ウェブサービスのAccess Key |
| `RAKUTEN_AFFILIATE_ID` | 楽天アフィリエイトのID（任意。設定すればこちらが優先） |
| `YAHOO_CLIENT_ID` | Yahoo!のClient ID（任意） |
| `MOSHIMO_A_ID` / `_P_ID` / `_PC_ID` / `_PL_ID` | もしもアフィリエイトのID（任意） |
| `VALUECOMMERCE_SID` / `_PID` | バリューコマースのID（任意） |
| `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` | 既存サイトのFTP接続情報 |

**商品ごとに個別のSecretsを用意する必要はありません。** すべて商品共通です。
商品ごとのURL（例: `/oasys-saiyasu/`）は `SITE_BASE_URL` + 商品設定の `slug` から
自動的に組み立てられます。

### 2. 楽天Developer Dashboardに許可Webサイトを登録する

[楽天Developer Dashboard](https://webservice.rakuten.co.jp/app/list) のアプリ設定の
「許可されたWebサイト」に、`SITE_BASE_URL`のドメインを登録してください。
ドメイン単位で登録しておけば、以後追加する商品（サブディレクトリ）にも
自動的に適用される可能性が高いです（個別のサブディレクトリごとに登録が
必要だった場合は、追って調整します）。

### 3. 画像を用意する

商品ごとに `docs-xxx/images/` の中に、以下の4つを用意してください（同じファイル名で上書き）。

- `banner.jpg`（ページ最上部の横長バナー）
- `product-1.jpg` `product-2.jpg` `product-3.jpg`（商品写真3枚）

### 4. cron-job.orgの設定を1つに統一する

これまで商品ごとに分かれていたcron-job.orgのジョブを、**1つに統一**できます。

- URL: `https://api.github.com/repos/ユーザー名/リポジトリ名/actions/workflows/update-all-prices.yml/dispatches`
- Headers・Request body・スケジュールは、これまでと同じ設定を使い回してください
- 商品ごとに分かれていた古いジョブ（`update-prices.yml`宛て、`update-prices-toric.yml`宛てのもの）は、
  この1本化されたジョブに統合したら削除して構いません

### 5. 手動実行して確認する

Actionsタブ→「Update all product prices」→「Run workflow」で実行し、
ログに表示される実行結果サマリー（成功/失敗件数）を確認してください。

---

## 新しい商品を追加する手順

1. `scripts/products.config.mjs` を開き、配列の末尾に新しい商品オブジェクトを追記する
   （既存の2商品を参考にしてください。最低限必要な項目は下記の通り）

   ```js
   {
     id: "商品を識別する英数字ID",
     slug: "URLのサブディレクトリ名",
     outputDir: "docs-商品名", // 公開フォルダ名（新規に決めてよい）
     siteName: "サイトのタイトル",
     searchKeyword: "楽天/Yahoo!で検索するキーワード",
     metaDescription: "検索結果に表示される説明文",
     subtitle: "ページ冒頭の説明文",
     productSchemaName: "構造化データ用の商品名",
     isCorrectProduct(name) { /* ブランド判定 */ },
     units: [
       {
         key: "unit1", label: "比較単位のラベル(例: 6箱)", totalLenses: 180,
         isHero: true, heroLabel: "...", heroName: "...", introHtml: "",
         matches(name) { /* この単位に該当するかの判定 */ },
       },
       // 2つ目以降の比較単位があれば追加
     ],
     productIntroHtml: "「なぜこの単位がお得か」の説明文(HTML)",
     productInfoHeading: "「〇〇とは」の見出し",
     productInfoHtml: "商品説明文(HTML)",
   }
   ```

2. `docs-商品名/images/` フォルダを作り、`banner.jpg` `product-1.jpg` `product-2.jpg`
   `product-3.jpg` を用意する（プレースホルダーが無くても、Actionsの初回実行時に
   フォルダごと自動生成されるので、画像だけ後から追加する形でも構いません）

3. GitHubにコミット・push

4. Actionsタブから「Run workflow」で実行し、ログでその商品が成功しているか確認する

**新しいSecrets登録もワークフローファイルの追加も不要です。**

---

## ローカルでの動作確認

```bash
npm install
SITE_BASE_URL=https://example.com RAKUTEN_APP_ID=xxx RAKUTEN_ACCESS_KEY=xxx npm run build
npx serve docs        # 商品1を確認
npx serve docs-toric  # 商品2を確認
```

FTPアップロードのテスト:
```bash
FTP_SERVER=xxx FTP_USERNAME=xxx FTP_PASSWORD=xxx npm run deploy
```

---

## 商品判定・比較単位の考え方（共通仕様）

- **ブランド判定(`isCorrectProduct`)**: Yahoo!の検索結果は緩い一致で返ってくることがあり、
  別ブランドの商品が混ざることがあるため、商品名にブランド固有の語（例:
  「アキュビュー」+「オアシス」）が含まれるかを確認しています。
- **処方箋あり商品の除外**: 商品名・説明文・キャッチコピーに「処方箋あり」
  「処方箋提出」等の語がある商品や、商品コードに`-rx-`のような記号が
  含まれる商品を除外しています（`scripts/lib/common.mjs` の
  `isPrescriptionFree` / `hasRxCode`）。
- **販促文言の除外**: 「2箱で送料無料」のような、購入数のしきい値を示すだけの
  文言は、実際の梱包数を誤認識する原因になるため、判定前に取り除いています
  （`stripShippingPromoText`）。
- **比較単位の重複防止**: 1商品に複数の比較単位（例:「90枚×2箱」と「90枚1箱」）
  がある場合、設定した順番に処理し、先に該当した商品は後の単位で
  重複して計上しないようにしています。

いずれも実際の商品名の表記ゆれによって誤判定が起きることがあるため、
新商品を追加した際は、実際に取得された商品名を確認しながら
`matches` 関数を調整していくことをおすすめします。

---

## 楽天ウェブサービスAPIについて（重要）

2026年2月10日の仕様変更により、旧エンドポイント（`app.rakuten.co.jp`）は
2026年5月13日に完全停止しました。現在は `openapi.rakuten.co.jp` の新エンドポイントを
使用し、`applicationId` に加えて `accessKey` が必須です。
[楽天Developer Dashboard](https://webservice.rakuten.co.jp/app/list) でアプリを
再登録して発行し直す必要があります（詳細は `scripts/lib/common.mjs` のコメント参照）。

## アフィリエイトの優先順位

楽天市場は以下の優先順位で自動的に切り替わります（Secretsの設定有無で判定）。

1. `RAKUTEN_AFFILIATE_ID`（楽天アフィリエイト。審査不要・楽天キャッシュでの受け取り）
2. `MOSHIMO_*`（もしもアフィリエイト。提携審査あり・現金受け取り）
3. どちらも未設定なら直リンク

Yahoo!ショッピングは `VALUECOMMERCE_*` が設定されていればアフィリエイトリンクになります。

## SEO対応

- サーバーサイド（ビルド時）でHTMLを完全に生成するため、検索エンジンが
  JavaScriptを実行しなくても価格・商品名・レビュー情報を認識できます
- `schema.org Product` 形式の構造化データ（JSON-LD）を埋め込んでいます
- `robots.txt` / `sitemap.xml` も商品ごとに自動生成されます
- OGP・canonical URLも自動設定されます

## 注意事項

- 本サイトは楽天・Yahoo!の公開APIのみを利用しており、対象サイトの
  スクレイピング（無断でのページ解析・自動取得）は行っていません。
- 表示価格は取得時点のもので、実際の購入時と異なる場合があります。
  免責文言はサイトのフッターに記載済みです。
- FTPパスワード等の秘密情報は、必ずGitHubの「Secrets」に登録してください。
- GitHub Actionsのスケジュール実行（`schedule:`）は信頼性に難があるため
  使用せず、cron-job.org等の外部サービスから`workflow_dispatch`を
  呼び出す運用にしています。
