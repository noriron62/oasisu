// scripts/fetch-prices.mjs
//
// 楽天商品検索API と Yahoo!ショッピング商品検索API から
// 「ワンデーアキュビューオアシス 90枚入り×2箱セット（180枚）」の価格を取得し、
// 送料込み価格の安い順に並べ替えて上位5件を docs/data.json に書き出す。
//
// 比較単位をそろえるため、商品名から「2箱セット」らしきものだけを
// 抽出するフィルタをかけている（1箱・3箱等の単価が混ざらないようにするため）。
//
// 実行に必要な環境変数（GitHub Actions の Secrets に設定する）:
//   RAKUTEN_APP_ID        楽天ウェブサービスの Application ID（必須・UUID形式。2026年2月の仕様変更で必須）
//   RAKUTEN_ACCESS_KEY    楽天ウェブサービスの Access Key（必須・2026年2月の仕様変更で新たに必須化）
//   SITE_URL               このサイトの公開URL（必須寄り・楽天APIのOrigin/Refererチェック対応。
//                            楽天アプリ設定の「許可されたWebサイト」に登録したURLと一致させる）
//   YAHOO_CLIENT_ID       Yahoo!デベロッパーネットワークの Client ID（任意・未設定なら楽天のみ集計）
//
// 2026年2月10日の楽天ウェブサービス仕様変更により、旧エンドポイント（app.rakuten.co.jp）は
// 2026年5月13日に完全停止しました。RAKUTEN_APP_ID・RAKUTEN_ACCESS_KEY は
// 楽天Developer Dashboard（https://webservice.rakuten.co.jp/app/list）でアプリを
// 再登録して発行し直す必要があります（旧アカウントで発行したIDは使えません）。
// 同じ画面の「許可されたWebサイト」に、このサイトのURL（SITE_URLと同じもの）を登録してください。
//
// アフィリエイトリンク化に使う環境変数（任意・未設定ならアフィリエイトなしの直リンク）:
//   MOSHIMO_A_ID / MOSHIMO_P_ID / MOSHIMO_PC_ID / MOSHIMO_PL_ID
//       もしもアフィリエイトの「楽天市場」提携プログラムで発行されるID
//   VALUECOMMERCE_SID / VALUECOMMERCE_PID
//       バリューコマースの「Yahoo!ショッピング」提携プログラムで発行されるID
//
// 検索キーワードは KEYWORD 定数、または環境変数 SEARCH_KEYWORD で変更できる。

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "docs", "data.json");

const KEYWORD = process.env.SEARCH_KEYWORD || "ワンデーアキュビューオアシス 90枚 2箱";
const TOP_N = 5;
const LENSES_PER_SET = 180; // 90枚入り×2箱 = 180枚（1枚あたり単価の計算に使用）
const BOXES_OF_30_PER_SET = 6; // 180枚 ÷ 30枚 = 6箱分（1箱30枚あたり単価の計算に使用）

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || "";
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY || "";
const SITE_URL = process.env.SITE_URL || "https://example.com";
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || "";

const MOSHIMO_A_ID = process.env.MOSHIMO_A_ID || "";
const MOSHIMO_P_ID = process.env.MOSHIMO_P_ID || "";
const MOSHIMO_PC_ID = process.env.MOSHIMO_PC_ID || "";
const MOSHIMO_PL_ID = process.env.MOSHIMO_PL_ID || "";

const VALUECOMMERCE_SID = process.env.VALUECOMMERCE_SID || "";
const VALUECOMMERCE_PID = process.env.VALUECOMMERCE_PID || "";

/**
 * 商品名から「90枚入り×2箱（180枚）セット」らしきものだけを判定する。
 * 「90」を含まない「ただの2箱（=60枚）」を誤って拾わないよう、
 * 90枚を示す表記と2箱系の表記の両方がそろっている場合のみ true にする
 * （「180枚」の直接表記がある場合はそれ単独でも true）。
 * 商品名の表記ゆれが多いジャンルのため、必要に応じて正規表現を調整すること。
 */
function isTargetBundle(name) {
  if (!name) return false;
  const n = name.replace(/\s/g, "");

  const negative = /(1箱|単品|お試し|サンプル)(?!.*2箱)/;
  if (negative.test(n)) return false;

  const has180 = /180枚/.test(n);
  if (has180) return true;

  const has90 = /90/.test(n);
  const has2Box = /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);

  return has90 && has2Box;
}

/**
 * 商品名から「処方箋あり(処方箋の提出が必要)」の商品を除外する。
 * 明示的に「処方箋あり」「要処方箋」等と書かれている商品のみを除外し、
 * 処方箋について何も書かれていない商品は許可する
 * （タイトルに記載が無いだけで、処方箋不要で購入できる商品も多いため）。
 * 「処方箋不要」「処方箋なし」を明記した商品は当然許可する。
 */
function isPrescriptionFree(text) {
  if (!text) return true;
  const n = text.replace(/\s/g, "");
  const requiresPrescription =
    /(処方箋あり|要処方箋|処方箋必要|処方箋提出|処方箋が必要|処方箋を提出)/;
  return !requiresPrescription.test(n);
}

/**
 * 商品コード・URLに「-rx-」のような処方箋(Rx)を示す記号が
 * 含まれている場合、処方箋提出が必要な商品コードとみなして除外する。
 * ショップによっては商品名・説明文に「処方箋」の文字を含めず、
 * 商品コードの中だけで区別している場合があるための補助チェック。
 */
function hasRxCode(text) {
  if (!text) return false;
  return /(^|[^a-z0-9])rx([^a-z0-9]|$)/i.test(text);
}

/** アフィリエイトリンクへの変換 */
function toRakutenAffiliateUrl(itemUrl) {
  if (!MOSHIMO_A_ID || !MOSHIMO_P_ID || !MOSHIMO_PC_ID || !MOSHIMO_PL_ID) {
    return itemUrl; // 未設定なら直リンク
  }
  const encoded = encodeURIComponent(itemUrl);
  return (
    `https://af.moshimo.com/af/c/click?a_id=${MOSHIMO_A_ID}` +
    `&p_id=${MOSHIMO_P_ID}&pc_id=${MOSHIMO_PC_ID}&pl_id=${MOSHIMO_PL_ID}` +
    `&url=${encoded}`
  );
}

function toYahooAffiliateUrl(itemUrl) {
  if (!VALUECOMMERCE_SID || !VALUECOMMERCE_PID) {
    return itemUrl; // 未設定なら直リンク
  }
  const encoded = encodeURIComponent(itemUrl);
  return (
    `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${VALUECOMMERCE_SID}` +
    `&pid=${VALUECOMMERCE_PID}&vc_url=${encoded}`
  );
}

/** 楽天市場から商品を取得する（2026年2月仕様変更後の新API対応） */
async function fetchRakuten() {
  if (!RAKUTEN_APP_ID || !RAKUTEN_ACCESS_KEY) {
    console.warn(
      "[skip] RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定のため楽天の取得をスキップしました"
    );
    return [];
  }

  const url = new URL(
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601"
  );
  url.searchParams.set("applicationId", RAKUTEN_APP_ID);
  url.searchParams.set("accessKey", RAKUTEN_ACCESS_KEY);
  url.searchParams.set("keyword", KEYWORD);
  url.searchParams.set("sort", "+itemPrice"); // 価格の安い順
  url.searchParams.set("hits", "30"); // フィルタで絞り込むため多めに取得
  url.searchParams.set("imageFlag", "1");
  url.searchParams.set("formatVersion", "2");

  const res = await fetch(url, {
    headers: {
      // 2026年2月の仕様変更で、リクエスト元のOrigin/Refererチェックが必須になった。
      // 楽天アプリ設定の「許可されたWebサイト」に SITE_URL と同じドメインを登録しておくこと。
      Origin: SITE_URL,
      Referer: SITE_URL,
    },
  });
  if (!res.ok) {
    console.error(`[error] 楽天API failed: ${res.status} ${await res.text()}`);
    return [];
  }
  const json = await res.json();
  const items = json.Items || [];

  return items
    .filter(
      (item) =>
        isTargetBundle(item.itemName) &&
        isPrescriptionFree(item.itemName) &&
        isPrescriptionFree(item.itemCaption) &&
        isPrescriptionFree(item.catchcopy) &&
        !hasRxCode(item.itemCode) &&
        !hasRxCode(item.itemUrl)
    )
    .map((item) => ({
      source: "楽天市場",
      name: item.itemName,
      shop: item.shopName,
      price: item.itemPrice,
      url: toRakutenAffiliateUrl(item.itemUrl),
      reviewUrl: item.itemUrl, // レビュー確認用（アフィリエイト加工なしの直リンク）
      reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : null,
      reviewAverage:
        typeof item.reviewAverage === "number" ? item.reviewAverage : null,
      image:
        item.mediumImageUrls && item.mediumImageUrls[0]
          ? item.mediumImageUrls[0]
          : null,
    }));
}

/** Yahoo!ショッピングから商品を取得する */
async function fetchYahoo() {
  if (!YAHOO_CLIENT_ID) {
    console.warn("[skip] YAHOO_CLIENT_ID が未設定のためYahoo!の取得をスキップしました");
    return [];
  }

  const url = new URL(
    "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
  );
  url.searchParams.set("appid", YAHOO_CLIENT_ID);
  url.searchParams.set("query", KEYWORD);
  url.searchParams.set("sort", "+price"); // 価格の安い順
  url.searchParams.set("results", "30"); // フィルタで絞り込むため多めに取得

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[error] Yahoo API failed: ${res.status} ${await res.text()}`);
    return [];
  }
  const json = await res.json();
  const items = json.hits || [];

  return items
    .filter(
      (item) =>
        isTargetBundle(item.name) &&
        isPrescriptionFree(item.name) &&
        isPrescriptionFree(item.description) &&
        isPrescriptionFree(item.headLine) &&
        !hasRxCode(item.code) &&
        !hasRxCode(item.url)
    )
    .map((item) => ({
      source: "Yahoo!ショッピング",
      name: item.name,
      shop: item.seller && item.seller.name ? item.seller.name : "Yahoo!ショッピング",
      price: item.price,
      url: toYahooAffiliateUrl(item.url),
      reviewUrl: item.url, // レビュー確認用（アフィリエイト加工なしの直リンク）
      reviewCount:
        item.review && typeof item.review.count === "number"
          ? item.review.count
          : null,
      reviewAverage:
        item.review && typeof item.review.rate === "number"
          ? item.review.rate
          : null,
      image: item.image && item.image.medium ? item.image.medium : null,
    }));
}

const SITE_NAME = process.env.SITE_NAME || "ワンデーアキュビューオアシス最安値通販価格情報";

/** 価格の安い順に並べ替え、単価を付与して上位N件を作る */
function buildRanking(items) {
  return items
    .filter((i) => typeof i.price === "number" && i.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, TOP_N)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      unitPrice: Math.round(item.price / LENSES_PER_SET),
      boxUnitPrice: Math.round(item.price / BOXES_OF_30_PER_SET),
    }));
}

async function main() {
  const [rakutenRaw, yahooRaw] = await Promise.all([fetchRakuten(), fetchYahoo()]);

  const rakuten = buildRanking(rakutenRaw);
  const yahoo = buildRanking(yahooRaw);
  const overallBest = buildRanking([...rakutenRaw, ...yahooRaw])[0] || null;

  const payload = {
    siteName: SITE_NAME,
    keyword: KEYWORD,
    unit: "90枚入り×2箱（180枚）セット",
    lensesPerSet: LENSES_PER_SET,
    updatedAt: new Date().toISOString(),
    overallBest,
    rakuten,
    yahoo,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`書き出し完了: ${OUTPUT_PATH}`);
  console.log(
    `2箱セット該当件数: 楽天 ${rakutenRaw.length}件(掲載${rakuten.length}) / Yahoo! ${yahooRaw.length}件(掲載${yahoo.length})`
  );
  if (rakuten.length === 0 && yahoo.length === 0) {
    console.warn(
      "[warn] 該当商品が0件でした。isTargetBundle() の正規表現やKEYWORDを見直してください。"
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
