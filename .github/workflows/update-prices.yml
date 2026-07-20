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
//   楽天市場は以下の2方式に対応。RAKUTEN_AFFILIATE_ID が設定されていれば
//   そちらを優先し、未設定の場合のみ MOSHIMO_* を使う（両方設定しても問題ない）。
//     RAKUTEN_AFFILIATE_ID
//         楽天アフィリエイト（https://affiliate.rakuten.co.jp/）で発行されるID。
//         審査不要ですぐ使えるが、報酬は基本的に楽天キャッシュでの受け取りになる。
//     MOSHIMO_A_ID / MOSHIMO_P_ID / MOSHIMO_PC_ID / MOSHIMO_PL_ID
//         もしもアフィリエイトの「楽天市場」提携プログラムで発行されるID。
//         提携審査が必要だが、報酬を現金（銀行振込）で受け取れる。
//   VALUECOMMERCE_SID / VALUECOMMERCE_PID
//       バリューコマースの「Yahoo!ショッピング」提携プログラムで発行されるID
//
// 検索キーワードは KEYWORD 定数、または環境変数 SEARCH_KEYWORD で変更できる。

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "docs", "data.json");

const KEYWORD = process.env.SEARCH_KEYWORD || "ワンデーアキュビューオアシス 90枚 2箱";
const TOP_N = 5;
const LENSES_PER_SET = 180; // 90枚入り×2箱 = 180枚（1枚あたり単価の計算に使用）
const BOXES_OF_30_PER_SET = 6; // 180枚 ÷ 30枚 = 6箱分（1箱30枚あたり単価の計算に使用）

const SINGLE_BOX_LENSES = 90; // 90枚1箱の場合の枚数（1枚あたり単価の計算に使用）
const SINGLE_BOX_OF_30 = 3; // 90枚 ÷ 30枚 = 3箱分（1箱30枚あたり単価の計算に使用）

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || "";
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY || "";
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "";
const SITE_URL = process.env.SITE_URL || "https://example.com";
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || "";

const MOSHIMO_A_ID = process.env.MOSHIMO_A_ID || "";
const MOSHIMO_P_ID = process.env.MOSHIMO_P_ID || "";
const MOSHIMO_PC_ID = process.env.MOSHIMO_PC_ID || "";
const MOSHIMO_PL_ID = process.env.MOSHIMO_PL_ID || "";

const VALUECOMMERCE_SID = process.env.VALUECOMMERCE_SID || "";
const VALUECOMMERCE_PID = process.env.VALUECOMMERCE_PID || "";

/**
 * 商品名が「ワンデーアキュビューオアシス」であることを確認する。
 * Yahoo!ショッピングの検索結果には、キーワードの緩い一致により
 * 別ブランドの商品（例: ロート製薬「フレッシュビュー」等）が
 * 紛れ込むことがあるため、ブランド名を明示的にチェックする。
 */
function isCorrectProduct(name) {
  if (!name) return false;
  const n = name.replace(/\s/g, "");
  return /アキュビュー/.test(n) && /オアシス/.test(n);
}

/**
 * 商品名から「90枚入り×2箱（180枚）セット」らしきものだけを判定する。
 * 「90」を含まない「ただの2箱（=60枚）」を誤って拾わないよう、
 * 90枚を示す表記と2箱系の表記の両方がそろっている場合のみ true にする
 * （「180枚」の直接表記がある場合はそれ単独でも true）。
 *
 * 「2箱で送料無料」のような表現は、実際には90枚1箱のみの商品で
 * 「2箱まとめ買いすると送料が無料になる」という購入促進の文言であり、
 * 実売価格が180枚分ではなく90枚分のことがあるため、
 * 「セット」「×2」「180枚」など、明確に2箱1セットであることを示す
 * 表記が無い限りは対象外として扱う。
 *
 * 商品名の表記ゆれが多いジャンルのため、必要に応じて正規表現を調整すること。
 */
/**
 * 「2箱で送料無料」「2箱購入で送料無料」「2箱以上ご購入で送料無料」のような、
 * 購入数のしきい値を示すだけの販促文言を、箱数判定の対象から取り除く。
 * この手の文言はショップによって表記が微妙に異なり、その都度「2箱」等の
 * 文字列だけを見て判定すると実際の梱包数を誤認識するため、
 * 判定処理の前段階で文章から除去してしまう。
 */
function stripShippingPromoText(n) {
  return n.replace(/\d箱[^\d]{0,6}?で送料無料/g, "");
}

function isTargetBundle(name) {
  if (!name) return false;
  const raw = name.replace(/\s/g, "");
  const n = stripShippingPromoText(raw);

  // 「単品」は購入単位が1個であることを明示する強いシグナルのため、
  // タイトルの目立つ位置に「2箱」等の表記があっても最優先で除外する
  // （ショップによっては「【2箱】」のような紛らわしい見出しを付けつつ、
  // 商品説明の中で「1箱90枚入 単品」と明記しているケースがあるため）
  if (/単品/.test(n)) return false;

  // 「1箱」等の表記があっても、文中のどこかに「2箱」表記が
  // あれば2箱セットの商品として扱う（「1箱90枚入 2箱セット」「左右各1箱」
  // のように、1箱を説明する語が2箱表記の前後どちらに来ても対応できるようにする）
  const mentionsSingleBoxTerms = /(1箱|お試し|サンプル)/.test(n);
  const mentions2Box = /2箱/.test(n);
  if (mentionsSingleBoxTerms && !mentions2Box) return false;

  const has180 = /180枚/.test(n);
  if (has180) return true;

  const has90 = /90/.test(n);
  const has2Box = /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);

  return has90 && has2Box;
}

/**
 * 商品名から「90枚1箱（単品）」の商品を判定する。
 * isTargetBundle() が false と判定した商品のうち、
 * 「90」を含み、かつ 3箱・4箱・6箱など他の箱数を明確に示していないものを
 * 「90枚1箱」として扱う（「2箱で送料無料」のような購入促進の文言だけの
 * 商品も、実売価格は90枚1箱分とみなしてここに含める）。
 * isTargetBundle() と重複しないよう、必ず isTargetBundle() が false の
 * 商品に対してのみ呼び出すこと。
 */
function isSingleBox90(name) {
  if (!name) return false;
  const n = stripShippingPromoText(name.replace(/\s/g, ""));

  const otherBoxCount = /(3箱|4箱|5箱|6箱|180枚|270枚|360枚)/;
  if (otherBoxCount.test(n)) return false;

  return /90/.test(n);
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

/**
 * アフィリエイトリンクへの変換（楽天市場用）
 * 優先順位: ① 楽天アフィリエイト（APIが返す affiliateUrl をそのまま使う）
 *          ② もしもアフィリエイト（未対応時のフォールバック）
 *          ③ どちらも未設定なら直リンク
 */
function toRakutenAffiliateUrl(item) {
  if (RAKUTEN_AFFILIATE_ID && item.affiliateUrl) {
    return item.affiliateUrl;
  }

  const itemUrl = item.itemUrl;
  if (!MOSHIMO_A_ID || !MOSHIMO_P_ID || !MOSHIMO_PC_ID || !MOSHIMO_PL_ID) {
    return itemUrl; // どちらも未設定なら直リンク
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
    return { bundle: [], single: [] };
  }

  const url = new URL(
    "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601"
  );
  url.searchParams.set("applicationId", RAKUTEN_APP_ID);
  url.searchParams.set("accessKey", RAKUTEN_ACCESS_KEY);
  if (RAKUTEN_AFFILIATE_ID) {
    // 楽天アフィリエイトIDを渡すと、レスポンスの各商品に
    // affiliateUrl（アフィリエイトリンク済みのURL）が含まれるようになる
    url.searchParams.set("affiliateId", RAKUTEN_AFFILIATE_ID);
  }
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
    return { bundle: [], single: [] };
  }
  const json = await res.json();
  const items = json.Items || [];

  if (RAKUTEN_AFFILIATE_ID) {
    // 診断用ログ：affiliateUrlが正しく返ってきているか確認するため
    const withAffiliateUrl = items.filter(
      (item) => item.affiliateUrl && item.affiliateUrl.length > 0
    ).length;
    console.log(
      `[debug] 楽天APIレスポンス: 全${items.length}件中、affiliateUrlが取得できたのは${withAffiliateUrl}件`
    );
    if (withAffiliateUrl === 0 && items.length > 0) {
      console.warn(
        "[warn] affiliateUrlが1件も取得できていません。RAKUTEN_AFFILIATE_IDの値、" +
          "または楽天アフィリエイト側のサイト登録状況を確認してください。"
      );
    }
  }

  const base = items.filter(
    (item) =>
      isCorrectProduct(item.itemName) &&
      isPrescriptionFree(item.itemName) &&
      isPrescriptionFree(item.itemCaption) &&
      isPrescriptionFree(item.catchcopy) &&
      !hasRxCode(item.itemCode) &&
      !hasRxCode(item.itemUrl)
  );

  const toEntry = (item) => ({
    source: "楽天市場",
    name: item.itemName,
    shop: item.shopName,
    price: item.itemPrice,
    url: toRakutenAffiliateUrl(item),
    reviewUrl: item.itemUrl, // レビュー確認用（アフィリエイト加工なしの直リンク）
    reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : null,
    reviewAverage:
      typeof item.reviewAverage === "number" ? item.reviewAverage : null,
    image:
      item.mediumImageUrls && item.mediumImageUrls[0]
        ? item.mediumImageUrls[0]
        : null,
  });

  const bundle = base.filter((item) => isTargetBundle(item.itemName)).map(toEntry);
  const single = base
    .filter((item) => !isTargetBundle(item.itemName) && isSingleBox90(item.itemName))
    .map(toEntry);

  return { bundle, single };
}

/** Yahoo!ショッピングから商品を取得する */
async function fetchYahoo() {
  if (!YAHOO_CLIENT_ID) {
    console.warn("[skip] YAHOO_CLIENT_ID が未設定のためYahoo!の取得をスキップしました");
    return { bundle: [], single: [] };
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
    return { bundle: [], single: [] };
  }
  const json = await res.json();
  const items = json.hits || [];

  const base = items.filter(
    (item) =>
      isCorrectProduct(item.name) &&
      isPrescriptionFree(item.name) &&
      isPrescriptionFree(item.description) &&
      isPrescriptionFree(item.headLine) &&
      !hasRxCode(item.code) &&
      !hasRxCode(item.url)
  );

  const toEntry = (item) => ({
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
  });

  const bundle = base.filter((item) => isTargetBundle(item.name)).map(toEntry);
  const single = base
    .filter((item) => !isTargetBundle(item.name) && isSingleBox90(item.name))
    .map(toEntry);

  return { bundle, single };
}

const SITE_NAME = process.env.SITE_NAME || "ワンデーアキュビューオアシス最安値通販価格情報";
const TEMPLATE_PATH = path.join(__dirname, "..", "docs", "index.template.html");
const HTML_OUTPUT_PATH = path.join(__dirname, "..", "docs", "index.html");
const SITEMAP_OUTPUT_PATH = path.join(__dirname, "..", "docs", "sitemap.xml");
const ROBOTS_OUTPUT_PATH = path.join(__dirname, "..", "docs", "robots.txt");

const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#dce8e5"/></svg>'
  );

const yenFmt = new Intl.NumberFormat("ja-JP");
const yen = (n) => (typeof n === "number" ? yenFmt.format(n) : "-");

/** HTMLの特殊文字をエスケープする（Node環境にDOMが無いため手動実装） */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** テンプレート文字列中の {{KEY}} を vars の値で置き換える */
function renderTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value ?? "");
  }
  return out;
}

function formatReviewMeta(item) {
  if (!item || !item.reviewCount) return "";
  const avg = typeof item.reviewAverage === "number" ? item.reviewAverage.toFixed(1) : null;
  return avg
    ? ` (★${avg}・${item.reviewCount.toLocaleString("ja-JP")}件のレビュー)`
    : ` (${item.reviewCount.toLocaleString("ja-JP")}件のレビュー)`;
}

/** 1件分のランキング行のHTMLを生成する */
function renderRow(item) {
  const img = item.image || PLACEHOLDER_IMG;
  return `      <a class="row" href="${escapeHtml(item.url)}" target="_blank" rel="noopener sponsored" data-rank="${item.rank}">
        <span class="rank">${String(item.rank).padStart(2, "0")}</span>
        <img class="thumb" src="${escapeHtml(img)}" alt="" loading="lazy" />
        <span class="row-info">
          <p class="shop-name">${escapeHtml(item.shop)}</p>
          <p class="unit-prices">
            1箱(30枚)あたり <strong>¥${yen(item.boxUnitPrice)}</strong>
            ・ 1枚あたり <strong>¥${yen(item.unitPrice)}</strong>
          </p>
        </span>
        <span class="price">¥${yen(item.price)}</span>
      </a>`;
}

/** ランキング一覧（該当0件の場合は案内文）のHTMLを生成する */
function renderList(items) {
  if (!items || items.length === 0) {
    return '      <p class="empty">該当する商品が見つかりませんでした。</p>';
  }
  return items.map(renderRow).join("\n");
}

/** 口コミ情報セクションのリンク一覧HTMLを生成する */
function renderReviewLinks(rakuten, yahoo) {
  const rakutenTop = Array.isArray(rakuten) ? rakuten[0] : null;
  const yahooTop = Array.isArray(yahoo) ? yahoo[0] : null;

  if (!rakutenTop && !yahooTop) {
    return '      <li class="empty">現在ご案内できる口コミリンクがありません。</li>';
  }

  const links = [];
  if (rakutenTop) {
    links.push(`      <li>
        <a href="${escapeHtml(rakutenTop.reviewUrl || rakutenTop.url)}" target="_blank" rel="noopener">
          <span class="shop-mark rakuten">楽天</span>
          ${escapeHtml(rakutenTop.shop)}の商品ページで口コミを見る${escapeHtml(formatReviewMeta(rakutenTop))}
        </a>
      </li>`);
  }
  if (yahooTop) {
    links.push(`      <li>
        <a href="${escapeHtml(yahooTop.reviewUrl || yahooTop.url)}" target="_blank" rel="noopener">
          <span class="shop-mark yahoo">Yahoo!</span>
          ${escapeHtml(yahooTop.shop)}の商品ページで口コミを見る${escapeHtml(formatReviewMeta(yahooTop))}
        </a>
      </li>`);
  }
  return links.join("\n");
}

/** 「本日の総合最安値」セクションのHTMLを生成する（データが無い場合は空文字） */
function renderHeroSection(overallBest, unitLabel) {
  if (!overallBest) return "";
  const top = overallBest;
  return `  <section class="hero">
    <p class="hero-label">本日の総合最安値（${escapeHtml(unitLabel)}）</p>
    <p class="hero-price"><span class="yen">¥</span><span>${yen(top.price)}</span></p>
    <p class="hero-unit">1箱(30枚)あたり ${yen(top.boxUnitPrice)}円 ・ 1枚あたり ${yen(top.unitPrice)}円</p>
    <div class="hero-meta">
      <span class="hero-name">ワンデーアキュビューオアシス 90枚入り×2箱セット(180枚)</span>
      <span class="badge">${escapeHtml(top.source)} ・ ${escapeHtml(top.shop)}</span>
    </div>
    <a class="hero-cta" href="${escapeHtml(top.url)}" target="_blank" rel="noopener sponsored">
      このショップで見る →
    </a>
  </section>`;
}

function formatUpdatedText(updatedAt) {
  if (!updatedAt) return "";
  const d = new Date(updatedAt);
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
  return `最終更新: ${formatted}`;
}

/**
 * 構造化データ（JSON-LD, schema.org Product）を生成する。
 * 検索エンジンに価格・レビュー情報を正しく伝え、リッチリザルト表示を狙う。
 */
function buildJsonLd(payload, canonicalUrl) {
  const allItems = [...payload.rakuten, ...payload.yahoo];
  if (allItems.length === 0) return "";

  const offers = allItems.map((item) => ({
    "@type": "Offer",
    url: item.url,
    price: item.price,
    priceCurrency: "JPY",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: item.shop },
  }));

  const withReviews = allItems.filter((i) => i.reviewCount && i.reviewAverage);
  let aggregateRating;
  if (withReviews.length > 0) {
    const totalCount = withReviews.reduce((sum, i) => sum + i.reviewCount, 0);
    const weightedAvg =
      withReviews.reduce((sum, i) => sum + i.reviewAverage * i.reviewCount, 0) / totalCount;
    aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(weightedAvg.toFixed(2)),
      reviewCount: totalCount,
    };
  }

  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ワンデーアキュビューオアシス 90枚入り×2箱セット（180枚）",
    description: payload.siteName,
    brand: { "@type": "Brand", name: "ACUVUE" },
    ...(aggregateRating ? { aggregateRating } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "JPY",
      lowPrice: Math.min(...allItems.map((i) => i.price)),
      highPrice: Math.max(...allItems.map((i) => i.price)),
      offerCount: offers.length,
      offers,
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(json)}</script>`;
}

/** 価格の安い順に並べ替え、単価を付与して上位N件を作る（枚数を指定して単価を計算） */
function buildRanking(items, lensesPerUnit) {
  const boxesOf30 = lensesPerUnit / 30;
  return items
    .filter((i) => typeof i.price === "number" && i.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, TOP_N)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      unitPrice: Math.round(item.price / lensesPerUnit),
      boxUnitPrice: Math.round(item.price / boxesOf30),
    }));
}

async function main() {
  const [rakutenRaw, yahooRaw] = await Promise.all([fetchRakuten(), fetchYahoo()]);

  // 90枚入り×2箱セット（180枚）
  const rakuten = buildRanking(rakutenRaw.bundle, LENSES_PER_SET);
  const yahoo = buildRanking(yahooRaw.bundle, LENSES_PER_SET);
  const overallBest =
    buildRanking([...rakutenRaw.bundle, ...yahooRaw.bundle], LENSES_PER_SET)[0] || null;

  // 90枚1箱（単品）
  const rakutenSingle90 = buildRanking(rakutenRaw.single, SINGLE_BOX_LENSES);
  const yahooSingle90 = buildRanking(yahooRaw.single, SINGLE_BOX_LENSES);

  const payload = {
    siteName: SITE_NAME,
    keyword: KEYWORD,
    unit: "90枚入り×2箱（180枚）セット",
    lensesPerSet: LENSES_PER_SET,
    updatedAt: new Date().toISOString(),
    overallBest,
    rakuten,
    yahoo,
    single90Unit: "90枚1箱（単品）",
    single90Lenses: SINGLE_BOX_LENSES,
    rakutenSingle90,
    yahooSingle90,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`書き出し完了: ${OUTPUT_PATH}`);
  console.log(
    `2箱セット該当件数: 楽天 ${rakutenRaw.bundle.length}件(掲載${rakuten.length}) / Yahoo! ${yahooRaw.bundle.length}件(掲載${yahoo.length})`
  );
  console.log(
    `90枚1箱該当件数: 楽天 ${rakutenRaw.single.length}件(掲載${rakutenSingle90.length}) / Yahoo! ${yahooRaw.single.length}件(掲載${yahooSingle90.length})`
  );
  if (rakuten.length === 0 && yahoo.length === 0) {
    console.warn(
      "[warn] 2箱セットの該当商品が0件でした。isTargetBundle() の正規表現やKEYWORDを見直してください。"
    );
  }

  // ---- SEO対応: index.html を完成品として直接生成する ----
  // （これまではJavaScriptが後からdata.jsonを読み込んで中身を書き込む方式だったが、
  //   検索エンジンに正しく内容を認識させるため、ビルド時に完成したHTMLを出力する）
  const canonicalUrl = SITE_URL.endsWith("/") ? SITE_URL : `${SITE_URL}/`;
  const unitLabel = payload.unit;

  const rakutenImage = payload.rakuten.find((i) => i.image)?.image || "images/product-1.jpg";

  const template = await readFile(TEMPLATE_PATH, "utf-8");
  const html = renderTemplate(template, {
    PAGE_TITLE: escapeHtml(payload.siteName),
    META_DESCRIPTION: escapeHtml(
      `ワンデーアキュビューオアシス 90枚入り×2箱セット（180枚）の楽天市場・Yahoo!ショッピングの価格を毎日自動で比較し、それぞれの最安値トップ5を掲載しています。`
    ),
    CANONICAL_URL: escapeHtml(canonicalUrl),
    JSON_LD: buildJsonLd(payload, canonicalUrl),
    UPDATED_TEXT: escapeHtml(formatUpdatedText(payload.updatedAt)),
    HERO_SECTION: renderHeroSection(payload.overallBest, unitLabel),
    RAKUTEN_LIST: renderList(payload.rakuten),
    YAHOO_LIST: renderList(payload.yahoo),
    RAKUTEN_SINGLE_LIST: renderList(payload.rakutenSingle90),
    YAHOO_SINGLE_LIST: renderList(payload.yahooSingle90),
    PRODUCT_INFO_IMAGE: escapeHtml(rakutenImage),
    REVIEW_LINKS: renderReviewLinks(payload.rakuten, payload.yahoo),
  });

  await writeFile(HTML_OUTPUT_PATH, html, "utf-8");
  console.log(`書き出し完了: ${HTML_OUTPUT_PATH}`);

  // ---- sitemap.xml ----
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(canonicalUrl)}</loc>
    <lastmod>${payload.updatedAt.slice(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
  </url>
</urlset>
`;
  await writeFile(SITEMAP_OUTPUT_PATH, sitemap, "utf-8");

  // ---- robots.txt ----
  const robots = `User-agent: *
Allow: /

Sitemap: ${canonicalUrl}sitemap.xml
`;
  await writeFile(ROBOTS_OUTPUT_PATH, robots, "utf-8");

  console.log("sitemap.xml / robots.txt も書き出しました");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
