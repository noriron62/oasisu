// scripts/lib/common.mjs
//
// 複数商品サイトで共通して使うロジック一式。
// 商品ごとに異なる部分（検索キーワード、ブランド判定、箱数判定など）は
// scripts/products.config.mjs 側で定義し、ここでは使い回せる処理だけを置く。

const yenFmt = new Intl.NumberFormat("ja-JP");
export const yen = (n) => (typeof n === "number" ? yenFmt.format(n) : "-");

export const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#dce8e5"/></svg>'
  );

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value ?? "");
  }
  return out;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 楽天APIへのアクセス間隔を、全商品・全リクエストを通じて管理する。
// 通常の安い順取得（複数ページ）に加え、価格帯を指定した追加取得も
// 行うようになったため、商品をまたいで立て続けにリクエストが飛ぶと
// 楽天側のレート制限（429 Too Many Requests）に引っかかることがある。
// そのため、実際にHTTPリクエストを送る直前に必ずこの関数を呼び、
// 前回の楽天APIリクエストから一定時間（1.1秒）空くようにする。
// （複数のリクエストがほぼ同時に発生しても取りこぼさないよう、
//   1本のPromiseチェーンに直列につなげて順番に処理する）
let lastRakutenCallAt = 0;
let rakutenChain = Promise.resolve();
const RAKUTEN_MIN_INTERVAL_MS = 1100;
function throttleRakuten() {
  const next = rakutenChain.then(async () => {
    const elapsed = Date.now() - lastRakutenCallAt;
    if (elapsed < RAKUTEN_MIN_INTERVAL_MS) {
      await sleep(RAKUTEN_MIN_INTERVAL_MS - elapsed);
    }
    lastRakutenCallAt = Date.now();
  });
  rakutenChain = next.catch(() => {}); // エラーが起きてもチェーンが途切れないようにする
  return next;
}

/**
 * 商品ごとのテーマカラーを反映する<style>ブロックを生成する。
 * 共通のCSS(style.css)はそのままに、CSS変数だけを上書きする方式なので、
 * サイトごとに個別のCSSファイルを用意する必要がない。
 * theme = { accent: "#0C6E6B", gold: "#B8892B" } のような形で指定する
 * （指定が無い場合は style.css 側のデフォルト色がそのまま使われる）。
 */
export function renderThemeStyle(theme) {
  if (!theme) return "";
  const lines = [":root {"];
  if (theme.accent) {
    lines.push(`  --teal: ${theme.accent};`);
    lines.push(`  --teal-dim: ${theme.accent}1a;`);
  }
  if (theme.gold) {
    lines.push(`  --gold: ${theme.gold};`);
    lines.push(`  --gold-dim: ${theme.gold}14;`);
  }
  lines.push("}");
  if (lines.length <= 2) return ""; // 何も上書きしない場合
  return `<style>${lines.join("\n")}</style>`;
}

/**
 * 「2~12箱セット」「2箱 4箱 6箱 12箱」のように、購入時に複数の箱数から
 * 選べるタイプの商品を判定する。この手の商品はAPIが返す価格が
 * どの箱数に対応するものか特定できない（多くの場合、最小数量の価格）ため、
 * どの比較単位からも除外する対象として扱う。
 */
export function isAmbiguousMultiBoxListing(name) {
  if (!name) return false;
  const n = name.replace(/\s/g, "");
  // 「2~12箱」「2〜12箱」「2-12箱」のような範囲表記
  if (/\d+[~〜\-]\d+箱/.test(n)) return true;
  // 「2箱 4箱 6箱 12箱」のように、3種類以上の箱数がまとめて列挙されている場合
  const matches = n.match(/\d+箱/g) || [];
  const uniqueCounts = new Set(matches);
  if (uniqueCounts.size >= 3) return true;
  return false;
}

/**
 * 「2箱で送料無料」「2箱購入で送料無料」のような、購入数のしきい値を
 * 示すだけの販促文言を、箱数判定の対象から取り除く。
 */
export function stripShippingPromoText(n) {
  // 「2箱で送料無料」「2箱購入で送料無料」「2箱でポスト便送料無料」のように、
  // 「箱」と「で」の間、「で」と「送料無料」の間、それぞれに別の単語が
  // 挟まる表記ゆれがあるため、どちらの間にも短い語句が入ってよいようにする
  return n.replace(/\d箱.{0,10}?で.{0,10}?送料無料/g, "");
}

/** 処方箋の提出が必要な商品を除外する */
export function isPrescriptionFree(text) {
  if (!text) return true;
  const n = text.replace(/\s/g, "");
  const requiresPrescription =
    /(処方箋あり|要処方箋|処方箋必要|処方箋提出|処方箋が必要|処方箋を提出)/;
  return !requiresPrescription.test(n);
}

/** 商品コード・URLに「-rx-」のような処方箋(Rx)を示す記号が含まれる場合に除外する */
export function hasRxCode(text) {
  if (!text) return false;
  return /(^|[^a-z0-9])rx([^a-z0-9]|$)/i.test(text);
}

/** 楽天市場から商品を取得する（フィルタ前の生データを返す。複数ページ・価格帯指定に対応） */
export async function fetchRakutenRaw({
  keyword,
  appId,
  accessKey,
  affiliateId,
  siteUrl,
  maxPages = 3, // 1ページ30件 × 3ページ = 最大90件取得する
  minPrice, // 指定すると、この価格以上の商品だけに絞り込んで取得できる
  maxPrice, // 指定すると、この価格以下の商品だけに絞り込んで取得できる
}) {
  if (!appId || !accessKey) {
    return { items: [], skipped: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定" };
  }

  const allItems = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = new URL(
      "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601"
    );
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("accessKey", accessKey);
    if (affiliateId) {
      url.searchParams.set("affiliateId", affiliateId);
    }
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("sort", "+itemPrice");
    url.searchParams.set("hits", "30");
    url.searchParams.set("page", String(page));
    url.searchParams.set("imageFlag", "1");
    url.searchParams.set("formatVersion", "2");
    if (minPrice) url.searchParams.set("minPrice", String(Math.round(minPrice)));
    if (maxPrice) url.searchParams.set("maxPrice", String(Math.round(maxPrice)));

    await throttleRakuten(); // 前回の楽天APIリクエストから一定時間空ける
    const res = await fetch(url, {
      headers: { Origin: siteUrl, Referer: siteUrl },
    });
    if (!res.ok) {
      if (page === 1) {
        throw new Error(`楽天API failed: ${res.status} ${await res.text()}`);
      }
      break; // 2ページ目以降の失敗は、1ページ目の結果だけ使って続行する
    }
    const json = await res.json();
    const items = json.Items || [];
    allItems.push(...items);
    if (items.length < 30) break; // これ以上ページが無い
  }

  return { items: allItems, skipped: null };
}

/** Yahoo!ショッピングから商品を取得する（フィルタ前の生データを返す。複数ページ・価格帯指定に対応） */
export async function fetchYahooRaw({
  keyword,
  clientId,
  maxPages = 3,
  minPrice,
  maxPrice,
}) {
  if (!clientId) {
    return { items: [], skipped: "YAHOO_CLIENT_ID が未設定" };
  }

  const allItems = [];
  for (let page = 0; page < maxPages; page++) {
    const url = new URL(
      "https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch"
    );
    url.searchParams.set("appid", clientId);
    url.searchParams.set("query", keyword);
    url.searchParams.set("sort", "+price");
    url.searchParams.set("results", "30");
    url.searchParams.set("start", String(page * 30 + 1));
    if (minPrice) url.searchParams.set("price_from", String(Math.round(minPrice)));
    if (maxPrice) url.searchParams.set("price_to", String(Math.round(maxPrice)));

    const res = await fetch(url);
    if (!res.ok) {
      if (page === 0) {
        throw new Error(`Yahoo API failed: ${res.status} ${await res.text()}`);
      }
      break;
    }
    const json = await res.json();
    const items = json.hits || [];
    allItems.push(...items);
    if (items.length < 30) break;
  }

  return { items: allItems, skipped: null };
}

/** 楽天の生アイテムを共通形式に変換する */
export function normalizeRakutenItem(item, { affiliateId, moshimo }) {
  return {
    source: "楽天市場",
    name: item.itemName,
    caption: item.itemCaption,
    catchcopy: item.catchcopy,
    itemCode: item.itemCode,
    shop: item.shopName,
    price: item.itemPrice,
    url: toRakutenAffiliateUrl(item, { affiliateId, moshimo }),
    reviewUrl: item.itemUrl,
    reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : null,
    reviewAverage: typeof item.reviewAverage === "number" ? item.reviewAverage : null,
    image:
      item.mediumImageUrls && item.mediumImageUrls[0] ? item.mediumImageUrls[0] : null,
  };
}

/** Yahoo!の生アイテムを共通形式に変換する */
export function normalizeYahooItem(item, { valuecommerce }) {
  return {
    source: "Yahoo!ショッピング",
    name: item.name,
    caption: item.description,
    catchcopy: item.headLine,
    itemCode: item.code,
    shop: item.seller && item.seller.name ? item.seller.name : "Yahoo!ショッピング",
    price: item.price,
    url: toYahooAffiliateUrl(item.url, valuecommerce),
    reviewUrl: item.url,
    reviewCount:
      item.review && typeof item.review.count === "number" ? item.review.count : null,
    reviewAverage:
      item.review && typeof item.review.rate === "number" ? item.review.rate : null,
    image: item.image && item.image.medium ? item.image.medium : null,
  };
}

function toRakutenAffiliateUrl(item, { affiliateId, moshimo }) {
  if (affiliateId && item.affiliateUrl) {
    return item.affiliateUrl;
  }
  const itemUrl = item.itemUrl;
  if (!moshimo || !moshimo.aId || !moshimo.pId || !moshimo.pcId || !moshimo.plId) {
    return itemUrl;
  }
  const encoded = encodeURIComponent(itemUrl);
  return (
    `https://af.moshimo.com/af/c/click?a_id=${moshimo.aId}` +
    `&p_id=${moshimo.pId}&pc_id=${moshimo.pcId}&pl_id=${moshimo.plId}` +
    `&url=${encoded}`
  );
}

function toYahooAffiliateUrl(itemUrl, valuecommerce) {
  if (!valuecommerce || !valuecommerce.sid || !valuecommerce.pid) {
    return itemUrl;
  }
  const encoded = encodeURIComponent(itemUrl);
  return (
    `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${valuecommerce.sid}` +
    `&pid=${valuecommerce.pid}&vc_url=${encoded}`
  );
}

/** 共通フィルタ（処方箋あり・Rxコード）を適用する */
export function applyCommonFilters(items) {
  return items.filter(
    (item) =>
      isPrescriptionFree(item.name) &&
      isPrescriptionFree(item.caption) &&
      isPrescriptionFree(item.catchcopy) &&
      !hasRxCode(item.itemCode) &&
      !hasRxCode(item.reviewUrl) &&
      !isAmbiguousMultiBoxListing(item.name)
  );
}

/** 価格の安い順に並べ替え、単価を付与して上位N件を作る */
export function buildRanking(items, totalLenses, topN = 5) {
  const boxesOf30 = totalLenses / 30;
  return items
    .filter((i) => typeof i.price === "number" && i.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, topN)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
      unitPrice: Math.round(item.price / totalLenses),
      boxUnitPrice: Math.round(item.price / boxesOf30),
    }));
}

function formatReviewMeta(item) {
  if (!item || !item.reviewCount) return "";
  const avg = typeof item.reviewAverage === "number" ? item.reviewAverage.toFixed(1) : null;
  return avg
    ? ` (★${avg}・${item.reviewCount.toLocaleString("ja-JP")}件のレビュー)`
    : ` (${item.reviewCount.toLocaleString("ja-JP")}件のレビュー)`;
}

/** 1件分のランキング行のHTMLを生成する */
export function renderRow(item) {
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

/** ランキング一覧（0件なら案内文）のHTMLを生成する */
export function renderList(items) {
  if (!items || items.length === 0) {
    return '      <p class="empty">該当する商品が見つかりませんでした。</p>';
  }
  return items.map(renderRow).join("\n");
}

/** 1つの比較単位（例:「6箱」）ぶんの見出し＋楽天/Yahoo!2列のHTMLを生成する */
export function renderUnitSection(unit, rakutenItems, yahooItems) {
  return `  ${unit.introHtml || ""}
  <section class="shop-section" aria-label="楽天市場ランキング(${escapeHtml(unit.label)})">
    <h2 class="shop-heading"><span class="shop-mark rakuten">楽天</span>楽天市場 ${escapeHtml(unit.label)} 最安値TOP5</h2>
    <div class="chart">
${renderList(rakutenItems)}
    </div>
  </section>

  <section class="shop-section" aria-label="Yahoo!ショッピングランキング(${escapeHtml(unit.label)})">
    <h2 class="shop-heading"><span class="shop-mark yahoo">Yahoo!</span>Yahoo!ショッピング ${escapeHtml(unit.label)} 最安値TOP5</h2>
    <div class="chart">
${renderList(yahooItems)}
    </div>
  </section>
`;
}

/** 口コミ情報セクションのリンクHTMLを生成する（楽天・Yahoo!それぞれの最安値商品を両方表示する） */
export function renderReviewLinks(rakutenTop, yahooTop) {
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

/** 「本日の総合最安値」セクションのHTMLを生成する（データが無ければ空文字） */
export function renderHeroSection(item, heroLabel, heroName) {
  if (!item) return "";
  return `  <section class="hero">
    <p class="hero-label">${escapeHtml(heroLabel)}</p>
    <p class="hero-price"><span class="yen">¥</span><span>${yen(item.price)}</span></p>
    <p class="hero-unit">1箱(30枚)あたり ${yen(item.boxUnitPrice)}円 ・ 1枚あたり ${yen(item.unitPrice)}円</p>
    <div class="hero-meta">
      <span class="hero-name">${escapeHtml(heroName)}</span>
      <span class="badge">${escapeHtml(item.source)} ・ ${escapeHtml(item.shop)}</span>
    </div>
    <a class="hero-cta" href="${escapeHtml(item.url)}" target="_blank" rel="noopener sponsored">
      このショップで見る →
    </a>
  </section>`;
}

export function formatUpdatedText(updatedAt) {
  if (!updatedAt) return "";
  const d = new Date(updatedAt);
  const formatted = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(d);
  return `最終更新: ${formatted}`;
}

/** 構造化データ（JSON-LD, schema.org Product）を生成する */
export function buildJsonLd({ productName, siteName, allItems }) {
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
    name: productName,
    description: siteName,
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
