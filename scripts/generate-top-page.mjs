// scripts/generate-top-page.mjs
//
// products.config.mjs の全商品を対象に、ドメイン直下のトップページ
// (docs-root/index.html) をブランド別に自動生成する。
//
// 「本日の総合最安値」は、各商品の docs-xxx/data.json（前回のビルドで
// 書き出された最新データ）から読み込む。PRODUCT_ID で一部商品だけに
// 絞り込んでビルドした場合でも、対象外の商品については前回分のデータが
// そのまま docs-xxx/data.json に残っているため、トップページには
// 常に全商品が反映される。
//
// 単体実行: SITE_BASE_URL=https://example.com node scripts/generate-top-page.mjs
// （build-all.mjs の最後からも自動的に呼び出される）

import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { products } from "./products.config.mjs";
import { escapeHtml } from "./lib/common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "docs-template", "toppage.template.html");
const STYLE_CSS_PATH = path.join(ROOT, "docs-template", "style.css");
const OUT_DIR = path.join(ROOT, "docs-root");

const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://example.com").replace(/\/+$/, "");

// ブランドの表示順（この配列に無い brandKey の商品は末尾にまとめて表示する）
const BRAND_ORDER = ["seed", "acuvue", "coopervision", "bausch"];

// コラム（FAQ）。表示用HTMLと、FAQPage構造化データの両方をこの1つの配列から生成する。
const COLUMNS = [
  {
    q: "1日使い捨てレンズは何箱まとめ買いするのがお得?",
    a: "まとめ買いをするほど1枚あたりの単価は下がりやすい傾向がありますが、使用期限や保管状況も踏まえて、無理のない範囲でのまとめ買いがおすすめです。",
  },
  {
    q: "楽天市場とYahoo!ショッピング、どちらが安い?",
    a: "どちらが安いかは商品やタイミングによって変わります。同じ商品でもモールによって取り扱いショップや在庫状況が異なるため、購入前に両方チェックするのがおすすめです。",
  },
  {
    q: "コンタクトレンズの送料について",
    a: "まとめ買いをすると送料無料になるショップが多い傾向があります。1箱だけの注文だと送料がかかる場合もあるため、購入前に確認しておくと安心です。",
  },
  {
    q: "処方箋不要で購入できるお店の選び方",
    a: "処方箋の提示を求めないショップも多くありますが、自分の目に合った度数かどうかは重要です。定期的に眼科で検査を受けたうえでの購入をおすすめします。",
  },
  {
    q: "乱視用レンズと通常レンズの違いは?",
    a: "乱視用レンズは、度数だけでなく乱視の角度(乱視軸)の指定が必要です。レンズの向きがズレないような設計になっているのが特徴です。",
  },
  {
    q: "遠近両用(マルチフォーカル)レンズが気になる方へ",
    a: "近くと遠く、両方にピントを合わせやすいよう設計されたレンズです。慣れるまで少し時間がかかることもあるため、まずは少量から試すのがおすすめです。",
  },
  {
    q: "コンタクトレンズの使用期限・保管について",
    a: "1日使い捨てタイプは、開封したその日のうちに使い切るのが基本です。未開封であれば、パッケージに記載の使用期限内に使用してください。",
  },
  {
    q: "国産メーカーと海外メーカーの違いは?",
    a: "シードのような国内メーカーは国内生産にこだわっていることが多く、海外メーカーは世界的な規模でのシリコーンハイドロゲル素材の開発が進んでいる傾向があります。それぞれ特徴が異なるので、装用感を比べてみるのもおすすめです。",
  },
  {
    q: "クーポンやポイント還元をさらに活用するには",
    a: "楽天市場やYahoo!ショッピングでは、期間限定のポイントアップキャンペーンが行われることがあります。まとめ買いのタイミングをキャンペーン時期に合わせると、よりお得に購入できます。",
  },
  {
    q: "初めてコンタクトレンズを使う方へ",
    a: "初めての方は、まず眼科で目の状態を確認し、自分に合った種類・度数を処方してもらうことが大切です。当サイトは価格比較を目的としているため、購入前の検査は別途受けることをおすすめします。",
  },
  {
    q: "中学生・高校生のコンタクトレンズの選び方",
    a: "成長期は目の状態が変化しやすいため、保護者の方と一緒に眼科を受診し、定期的に処方内容を確認することが大切です。衛生管理のしやすさから、1日使い捨てタイプが選ばれることが多い傾向があります。部活動や行事の予定に合わせて、無理のない範囲で使用を検討しましょう。",
  },
  {
    q: "高齢者のコンタクトレンズ選びで気をつけたいこと",
    a: "年齢を重ねると、老眼(近くが見えにくくなる状態)や、涙の量が減ることによる乾燥が気になりやすくなります。遠近両用タイプや、うるおいを意識した設計のレンズが選択肢になりますが、白内障・緑内障など加齢に伴う目の病気が隠れている場合もあるため、まずは眼科での検査をおすすめします。1日使い捨てタイプは、レンズケースの手入れが不要な分、日々のお手入れの負担を減らしやすい点も特徴です。",
  },
];

/** 西暦の日付から「2026年8月3日(令和8年)」のような文字列を作る */
function formatTodayText(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const reiwaYear = y - 2018; // 令和1年 = 2019年
  return `${y}年${m}月${d}日(令和${reiwaYear}年)`;
}

/** 商品ごとの「本日の総合最安値」を、前回ビルド時点の data.json から読み込む */
async function loadOverallBest(product) {
  const dataPath = path.join(ROOT, product.outputDir, "data.json");
  try {
    const raw = await readFile(dataPath, "utf-8");
    const data = JSON.parse(raw);
    if (!data.overallBest) return null;
    return { ...data.overallBest, unitLabel: data.overallBestUnitLabel || null };
  } catch {
    return null; // まだ一度もビルドされていない商品は null のまま
  }
}

/** 商品ごとの画像(product-1.jpg)が用意されているかを確認する */
function findProductImage(product) {
  const imgPath = path.join(ROOT, product.outputDir, "images", "product-1.jpg");
  if (existsSync(imgPath)) {
    return `/${product.slug}/images/product-1.jpg`;
  }
  return null;
}

function renderProductCard(product, overallBest) {
  const accent = product.theme?.accent || "#0C6E6B";
  const image = findProductImage(product);
  const thumbHtml = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.shortName)}" loading="lazy" />`
    : "商品画像";

  let priceHtml;
  if (overallBest && typeof overallBest.rawUnitPrice === "number") {
    const lensesPerBox = product.lensesPerBox || 30;
    const perBoxPrice = Math.round(overallBest.rawUnitPrice * lensesPerBox);
    const unitLabel = overallBest.unitLabel || "";
    priceHtml = `
          <p class="price-main"><span class="unit-label">1箱</span>¥${perBoxPrice.toLocaleString("ja-JP")}</p>
          <p class="price-sub">${escapeHtml(unitLabel ? `(${unitLabel}換算) ` : "")}1枚あたり¥${overallBest.unitPrice}</p>`;
  } else {
    priceHtml = `<p class="price-unavailable">価格情報を準備中です</p>`;
  }

  return `      <a class="top-product-card" id="product-${product.slug}" href="/${product.slug}/" style="--card-c:${accent}; --card-dim:${accent}1a">
        <div class="thumb">${thumbHtml}</div>
        <div class="body">
          <p class="name">${escapeHtml(product.shortName)}</p>${priceHtml}
          <span class="cta">最安値を見る →</span>
        </div>
      </a>`;
}

function renderBrandSections(productsWithData) {
  const groups = new Map();
  for (const item of productsWithData) {
    const key = item.product.brandKey || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const orderedKeys = [
    ...BRAND_ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !BRAND_ORDER.includes(k)),
  ];

  return orderedKeys
    .map((key) => {
      const items = groups.get(key);
      const brandName = items[0].product.brand || "その他";
      const brandColor = items[0].product.theme?.accent || "#0C6E6B";
      const cardsHtml = items.map((item) => renderProductCard(item.product, item.overallBest)).join("\n");
      return `  <section class="brand-group" id="brand-${escapeHtml(key)}">
    <div class="brand-title" style="--brand-c:${brandColor}; --brand-dim:${brandColor}1a">
      <h2>${escapeHtml(brandName)}</h2><span>${items.length}商品</span>
    </div>
    <div class="top-product-grid">
${cardsHtml}
    </div>
  </section>`;
    })
    .join("\n\n");
}

function renderJumpNav(productsWithData) {
  const groups = new Map();
  for (const { product } of productsWithData) {
    const key = product.brandKey || "other";
    if (!groups.has(key)) groups.set(key, product);
  }
  const orderedKeys = [
    ...BRAND_ORDER.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !BRAND_ORDER.includes(k)),
  ];
  return orderedKeys
    .map((key) => {
      const product = groups.get(key);
      const color = product.theme?.accent || "#0C6E6B";
      return `      <a class="jump-pill" style="--jump-c:${color}" href="#brand-${escapeHtml(key)}">${escapeHtml(product.brand || "その他")}</a>`;
    })
    .join("\n");
}

function renderFooterLinks(productsWithData) {
  return productsWithData
    .map(
      ({ product }) =>
        `        <a href="/${product.slug}/">${escapeHtml(product.shortName)}</a>`
    )
    .join("\n");
}

function renderColumnHtml() {
  return COLUMNS.map(
    (c) => `      <div class="column-item">
        <h3>${escapeHtml(c.q)}</h3>
        <p>${escapeHtml(c.a)}</p>
      </div>`
  ).join("\n");
}

function buildJsonLd(productsWithData) {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: productsWithData.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.product.shortName,
      url: `${SITE_BASE_URL}/${item.product.slug}/`,
    })),
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COLUMNS.map((c) => ({
      "@type": "Question",
      name: c.q,
      acceptedAnswer: { "@type": "Answer", text: c.a },
    })),
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "コンタクトレンズ最安値通販価格情報",
    url: `${SITE_BASE_URL}/`,
  };

  return [website, itemList, faqPage]
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n");
}

export async function generateTopPage() {
  const template = await readFile(TEMPLATE_PATH, "utf-8");

  const productsWithData = [];
  for (const product of products) {
    const overallBest = await loadOverallBest(product);
    productsWithData.push({ product, overallBest });
  }

  await mkdir(OUT_DIR, { recursive: true });
  // style.cssはルートにも必要（各商品ページと同じデザインをそのまま使うため）
  await copyFile(STYLE_CSS_PATH, path.join(OUT_DIR, "style.css"));

  const heroImagePath = path.join(OUT_DIR, "images", "hero.jpg");
  const heroImageHtml = existsSync(heroImagePath)
    ? `<img class="hero-image-real" src="/images/hero.jpg" alt="コンタクトレンズ最安値比較" />`
    : `<div class="hero-image">ここにトップ画像を配置できます(images/hero.jpg を docs-root/images/ に置いてください)</div>`;

  const html = template
    .replace("{{SEARCH_CONSOLE_VERIFICATION}}", "")
    .replace(/{{PAGE_TITLE}}/g, escapeHtml("コンタクトレンズ最安値通販価格情報 毎日更新中！"))
    .replace(
      "{{META_DESCRIPTION}}",
      escapeHtml(
        "楽天市場・Yahoo!ショッピングの価格を毎日チェックし、人気コンタクトレンズブランドの最安値をショップ別にまとめています。"
      )
    )
    .replace("{{CANONICAL_URL}}", escapeHtml(`${SITE_BASE_URL}/`))
    .replace("{{HERO_IMAGE_HTML}}", heroImageHtml)
    .replace(
      "{{SUBTITLE}}",
      escapeHtml(
        "楽天市場・Yahoo!ショッピングの価格を毎日チェックし、人気コンタクトレンズブランドの最安値をショップ別にまとめています。"
      )
    )
    .replace("{{PRODUCT_COUNT}}", String(products.length))
    .replace("{{JUMP_NAV_HTML}}", renderJumpNav(productsWithData))
    .replace("{{TODAY_TEXT}}", formatTodayText(new Date()))
    .replace("{{BRAND_SECTIONS_HTML}}", renderBrandSections(productsWithData))
    .replace("{{COLUMN_HTML}}", renderColumnHtml())
    .replace("{{FOOTER_LINKS_HTML}}", renderFooterLinks(productsWithData))
    .replace("{{JSON_LD}}", buildJsonLd(productsWithData));

  await writeFile(path.join(OUT_DIR, "index.html"), html, "utf-8");
  console.log(`[info] トップページを生成しました（対象商品: ${products.length}件）`);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  generateTopPage().catch((err) => {
    console.error("致命的なエラーが発生しました:", err);
    process.exit(1);
  });
}
