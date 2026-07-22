// scripts/build-all.mjs
//
// scripts/products.config.mjs に定義された全商品について、
// 楽天・Yahoo!から価格を取得し、商品ごとに docs-xxx/data.json ・
// index.html ・ sitemap.xml ・ robots.txt を生成する。
//
// 商品数が増えても対応できるよう、以下の設計にしている。
//   - 商品を1つずつ順番に処理し、間に待ち時間を入れる（API負荷対策）
//   - 1商品でエラーが起きても、そこで全体を止めず次の商品へ進む
//     （失敗した商品は、前回成功時のファイルをそのまま残す）
//   - 最後に「何商品中、何商品成功したか」の一覧をログに出す
//
// 環境変数（GitHub Actions の Secrets）:
//   SITE_BASE_URL        サイトのドメイン（例: https://example.com）。
//                          商品ごとのURLは SITE_BASE_URL + "/" + slug + "/" で組み立てる。
//   RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID
//   YAHOO_CLIENT_ID
//   MOSHIMO_A_ID / MOSHIMO_P_ID / MOSHIMO_PC_ID / MOSHIMO_PL_ID
//   VALUECOMMERCE_SID / VALUECOMMERCE_PID
// （すべて商品共通。商品ごとに変える必要はない）

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { products } from "./products.config.mjs";
import {
  escapeHtml,
  renderTemplate,
  renderThemeStyle,
  sleep,
  fetchRakutenRaw,
  fetchYahooRaw,
  normalizeRakutenItem,
  normalizeYahooItem,
  applyCommonFilters,
  buildRanking,
  renderUnitSection,
  renderReviewLinks,
  renderHeroSection,
  formatUpdatedText,
  buildJsonLd,
} from "./lib/common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "docs-template", "site.template.html");

const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://example.com").replace(/\/+$/, "");
const DELAY_BETWEEN_PRODUCTS_MS = 1500; // 商品間の待ち時間（API負荷対策）

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID || "";
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY || "";
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "";
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID || "";
const MOSHIMO = {
  aId: process.env.MOSHIMO_A_ID || "",
  pId: process.env.MOSHIMO_P_ID || "",
  pcId: process.env.MOSHIMO_PC_ID || "",
  plId: process.env.MOSHIMO_PL_ID || "",
};
const VALUECOMMERCE = {
  sid: process.env.VALUECOMMERCE_SID || "",
  pid: process.env.VALUECOMMERCE_PID || "",
};

/** 1商品ぶんを処理する（このcallの外に例外を投げない：呼び出し側でtry/catchする） */
async function buildOneProduct(product, template) {
  const siteUrl = `${SITE_BASE_URL}/${product.slug}/`;

  const [rakutenResult, yahooResult] = await Promise.all([
    fetchRakutenRaw({
      keyword: product.searchKeyword,
      appId: RAKUTEN_APP_ID,
      accessKey: RAKUTEN_ACCESS_KEY,
      affiliateId: RAKUTEN_AFFILIATE_ID,
      siteUrl,
    }),
    fetchYahooRaw({ keyword: product.searchKeyword, clientId: YAHOO_CLIENT_ID }),
  ]);

  if (rakutenResult.skipped) console.warn(`  [skip] 楽天: ${rakutenResult.skipped}`);
  if (yahooResult.skipped) console.warn(`  [skip] Yahoo!: ${yahooResult.skipped}`);

  let rakutenRawItems = rakutenResult.items;
  let yahooRawItems = yahooResult.items;

  // 比較単位に priceHint（想定価格帯）が設定されている場合、その価格帯を
  // 直接指定した追加取得を行う。安い順の取得だけでは、単価の安い商品が
  // 大量にあると、まとめ買い商品が取得件数の範囲外に埋もれてしまうことが
  // あるため、価格帯を直接指定して確実に拾えるようにする。
  const hintedUnits = product.units.filter((u) => u.priceHint);
  if (hintedUnits.length > 0) {
    const seenRakutenCodes = new Set(rakutenRawItems.map((i) => i.itemCode || i.itemUrl));
    const seenYahooCodes = new Set(yahooRawItems.map((i) => i.code || i.url));

    const hintedResults = await Promise.all(
      hintedUnits.flatMap((unit) => [
        fetchRakutenRaw({
          keyword: product.searchKeyword,
          appId: RAKUTEN_APP_ID,
          accessKey: RAKUTEN_ACCESS_KEY,
          affiliateId: RAKUTEN_AFFILIATE_ID,
          siteUrl,
          maxPages: 3,
          minPrice: unit.priceHint.min,
          maxPrice: unit.priceHint.max,
        }).then((r) => ({ source: "rakuten", unit: unit.key, ...r })),
        fetchYahooRaw({
          keyword: product.searchKeyword,
          clientId: YAHOO_CLIENT_ID,
          maxPages: 3,
          minPrice: unit.priceHint.min,
          maxPrice: unit.priceHint.max,
        }).then((r) => ({ source: "yahoo", unit: unit.key, ...r })),
      ])
    );

    for (const result of hintedResults) {
      if (result.source === "rakuten") {
        const newItems = result.items.filter(
          (i) => !seenRakutenCodes.has(i.itemCode || i.itemUrl)
        );
        for (const i of newItems) seenRakutenCodes.add(i.itemCode || i.itemUrl);
        rakutenRawItems = rakutenRawItems.concat(newItems);
      } else {
        const newItems = result.items.filter((i) => !seenYahooCodes.has(i.code || i.url));
        for (const i of newItems) seenYahooCodes.add(i.code || i.url);
        yahooRawItems = yahooRawItems.concat(newItems);
      }
    }
    console.log(
      `  [debug] 価格帯指定の追加取得: 楽天+${rakutenRawItems.length - rakutenResult.items.length}件 / Yahoo!+${yahooRawItems.length - yahooResult.items.length}件`
    );

    // 診断用ログ：どの比較単位の価格帯ヒントで、実際に何件見つかったか
    // 個別に確認できるようにする（「0件」の原因調査に使う）
    for (let i = 0; i < hintedUnits.length; i++) {
      const unit = hintedUnits[i];
      const rakutenHint = hintedResults[i * 2];
      const yahooHint = hintedResults[i * 2 + 1];
      console.log(
        `    [debug] ${unit.label}のヒント(¥${unit.priceHint.min}〜¥${unit.priceHint.max}): 楽天${rakutenHint.items.length}件 / Yahoo!${yahooHint.items.length}件`
      );
      for (const item of rakutenHint.items.slice(0, 5)) {
        console.log(`      [楽天/${unit.label}ヒント] ¥${item.itemPrice} ${item.itemName}`);
      }
    }
  }

  const rakutenItems = applyCommonFilters(
    rakutenRawItems
      .filter((i) => product.isCorrectProduct(i.itemName))
      .map((i) => normalizeRakutenItem(i, { affiliateId: RAKUTEN_AFFILIATE_ID, moshimo: MOSHIMO }))
  );
  const yahooItems = applyCommonFilters(
    yahooRawItems
      .filter((i) => product.isCorrectProduct(i.name))
      .map((i) => normalizeYahooItem(i, { valuecommerce: VALUECOMMERCE }))
  );

  // 診断用ログ：ブランド判定・処方箋フィルタ後、比較単位への振り分け前の
  // 総数と商品名サンプルを出しておく（「該当0件」の原因調査に使う）
  console.log(
    `  [debug] ブランド判定後の件数: 楽天${rakutenItems.length}件 / Yahoo!${yahooItems.length}件`
  );
  for (const item of rakutenItems.slice(0, 5)) {
    console.log(`    [楽天] ¥${item.price} ${item.name}`);
  }
  for (const item of yahooItems.slice(0, 5)) {
    console.log(`    [Yahoo!] ¥${item.price} ${item.name}`);
  }
  // 「〇箱」という文字列を含む商品だけをピンポイントで抽出する
  // （全件のうち、実際にどんな箱数表記があるのか確認するため）
  const withBoxCount = [...rakutenItems, ...yahooItems].filter((i) =>
    /\d箱/.test((i.name || "").replace(/\s/g, ""))
  );
  console.log(`  [debug] 「〇箱」を含む商品: ${withBoxCount.length}件`);
  for (const item of withBoxCount.slice(0, 15)) {
    console.log(`    [${item.source}] ¥${item.price} ${item.name}`);
  }

  // 商品ごとの比較単位（例: 90枚×2箱／90枚1箱）ごとにランキングを作る。
  // 単位は配列の順番に処理し、先に該当した商品は後の単位では重複して
  // 拾わないようにする（例: 「90枚×2箱セット」に該当した商品が
  // 「90枚1箱」側にも二重計上されるのを防ぐ）。
  const claimedRakuten = new Set();
  const claimedYahoo = new Set();
  const itemKey = (item) => `${item.shop}__${item.price}__${item.url}`;

  const unitResults = product.units.map((unit) => {
    const rakutenCandidates = rakutenItems.filter(
      (i) => !claimedRakuten.has(itemKey(i)) && unit.matches(i.name)
    );
    const yahooCandidates = yahooItems.filter(
      (i) => !claimedYahoo.has(itemKey(i)) && unit.matches(i.name)
    );
    for (const i of rakutenCandidates) claimedRakuten.add(itemKey(i));
    for (const i of yahooCandidates) claimedYahoo.add(itemKey(i));

    const rakutenRanking = buildRanking(rakutenCandidates, unit.totalLenses);
    const yahooRanking = buildRanking(yahooCandidates, unit.totalLenses);
    return { unit, rakutenRanking, yahooRanking };
  });

  // 「総合最安値」は、特定の比較単位に固定するのではなく、
  // 全ユニット(1箱・2箱・6箱など)の最安値候補の中から、
  // 1枚あたり単価(unitPrice)が最も安いものを選ぶ。
  // こうすることで、例えば6箱セットの方が1箱より1枚あたり安い場合に、
  // きちんと6箱の方が総合最安値として表示されるようになる。
  let overallBest = null;
  let overallBestUnit = null;
  let overallBestUnitResult = null;
  for (const unitResult of unitResults) {
    const { unit, rakutenRanking, yahooRanking } = unitResult;
    for (const candidate of [rakutenRanking[0], yahooRanking[0]]) {
      if (!candidate) continue;
      if (!overallBest || candidate.unitPrice < overallBest.unitPrice) {
        overallBest = candidate;
        overallBestUnit = unit;
        overallBestUnitResult = unitResult;
      }
    }
  }

  const updatedAt = new Date().toISOString();

  const payload = {
    siteName: product.siteName,
    keyword: product.searchKeyword,
    updatedAt,
    overallBest,
    units: unitResults.map(({ unit, rakutenRanking, yahooRanking }) => ({
      key: unit.key,
      label: unit.label,
      totalLenses: unit.totalLenses,
      rakuten: rakutenRanking,
      yahoo: yahooRanking,
    })),
  };

  // ---- HTML生成 ----
  const canonicalUrl = siteUrl;
  const allItems = unitResults.flatMap((r) => [...r.rakutenRanking, ...r.yahooRanking]);
  const rakutenImage =
    unitResults.flatMap((r) => r.rakutenRanking).find((i) => i.image)?.image ||
    "images/product-1.jpg";

  const unitsHtml = unitResults
    .map(({ unit, rakutenRanking, yahooRanking }) =>
      renderUnitSection(unit, rakutenRanking, yahooRanking)
    )
    .join("\n");

  const html = renderTemplate(template, {
    PAGE_TITLE: escapeHtml(product.siteName),
    META_DESCRIPTION: escapeHtml(product.metaDescription),
    SUBTITLE: escapeHtml(product.subtitle),
    CANONICAL_URL: escapeHtml(canonicalUrl),
    THEME_STYLE: renderThemeStyle(product.theme),
    JSON_LD: buildJsonLd({
      productName: product.productSchemaName,
      siteName: product.siteName,
      allItems,
    }),
    UPDATED_TEXT: escapeHtml(formatUpdatedText(updatedAt)),
    HERO_SECTION: overallBest
      ? renderHeroSection(overallBest, overallBestUnit.heroLabel, overallBestUnit.heroName)
      : "",
    PRODUCT_INTRO: product.productIntroHtml,
    UNITS_HTML: unitsHtml,
    PRODUCT_INFO_HEADING: escapeHtml(product.productInfoHeading),
    PRODUCT_INFO_HTML: product.productInfoHtml,
    PRODUCT_INFO_IMAGE: escapeHtml(rakutenImage),
    REVIEW_LINKS: renderReviewLinks(
      overallBestUnitResult?.rakutenRanking[0],
      overallBestUnitResult?.yahooRanking[0]
    ),
  });

  const outDir = path.join(ROOT, product.outputDir);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "data.json"), JSON.stringify(payload, null, 2), "utf-8");
  await writeFile(path.join(outDir, "index.html"), html, "utf-8");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(canonicalUrl)}</loc>
    <lastmod>${updatedAt.slice(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
  </url>
</urlset>
`;
  await writeFile(path.join(outDir, "sitemap.xml"), sitemap, "utf-8");

  const robots = `User-agent: *
Allow: /

Sitemap: ${canonicalUrl}sitemap.xml
`;
  await writeFile(path.join(outDir, "robots.txt"), robots, "utf-8");

  const summaryParts = unitResults.map(
    ({ unit, rakutenRanking, yahooRanking }) =>
      `${unit.label}: 楽天${rakutenRanking.length}件/Yahoo!${yahooRanking.length}件`
  );
  return { ok: true, summary: summaryParts.join(" / ") };
}

async function main() {
  const template = await readFile(TEMPLATE_PATH, "utf-8");

  // PRODUCT_ID が指定されている場合（"all" 以外）は、その商品だけに絞り込む。
  // 未指定・空文字・"all" の場合は、これまで通り全商品を処理する。
  const productIdFilter = (process.env.PRODUCT_ID || "").trim();
  const targetProducts =
    productIdFilter && productIdFilter !== "all"
      ? products.filter((p) => p.id === productIdFilter)
      : products;

  if (productIdFilter && productIdFilter !== "all" && targetProducts.length === 0) {
    console.error(
      `[error] 指定された商品ID「${productIdFilter}」が products.config.mjs に見つかりません。`
    );
    process.exit(1);
  }

  if (targetProducts.length !== products.length) {
    console.log(`[info] 対象を絞り込んで実行します: ${targetProducts.map((p) => p.id).join(", ")}`);
  }

  const results = [];

  for (const product of targetProducts) {
    console.log(`\n=== ${product.siteName} (${product.slug}) ===`);
    try {
      const result = await buildOneProduct(product, template);
      console.log(`  OK: ${result.summary}`);
      results.push({ id: product.id, ok: true, detail: result.summary });
    } catch (err) {
      console.error(`  [error] ${product.id} の処理に失敗しました: ${err.message}`);
      results.push({ id: product.id, ok: false, detail: err.message });
      // このまま次の商品の処理へ進む（全体を止めない）
    }
    await sleep(DELAY_BETWEEN_PRODUCTS_MS);
  }

  console.log("\n=== 実行結果サマリー ===");
  const okCount = results.filter((r) => r.ok).length;
  const ngCount = results.length - okCount;
  for (const r of results) {
    console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.id}: ${r.detail}`);
  }
  console.log(`\n合計 ${results.length}商品中、成功 ${okCount}件 / 失敗 ${ngCount}件`);

  if (ngCount > 0) {
    console.log(
      "一部の商品でエラーが発生しましたが、成功した商品のファイルは正常に更新されています。"
    );
  }
}

main().catch((err) => {
  console.error("致命的なエラーが発生しました:", err);
  process.exit(1);
});
