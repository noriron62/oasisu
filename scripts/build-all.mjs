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

import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { products } from "./products.config.mjs";
import { generateRootFiles } from "./generate-root-files.mjs";
import { generateTopPage } from "./generate-top-page.mjs";
import { scrapeShopPrice } from "./lib/scrape-rx-free.mjs";
import { scrapeOtherShopPrice } from "./lib/scrape-rx-free.mjs";
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
  buildBreadcrumbJsonLd,
  todayJstDateString,
  updatePriceHistory,
  renderPriceHistorySection,
  renderRxFreeSection,
  renderOtherShopsSection,
} from "./lib/common.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "docs-template", "site.template.html");
const STYLE_CSS_PATH = path.join(ROOT, "docs-template", "style.css");

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
      hintedUnits.flatMap((unit) => {
        // unit.hintedKeywords（配列）を指定すると、複数のキーワードで
        // それぞれ検索し、結果をすべて合流させる。表記ゆれ（例:
        // 「ワンデー」の有無）でAPIの検索結果に出てこないショップを
        // 拾うための仕組み。単一の hintedKeyword のみ指定した場合は
        // 従来通り1種類のキーワードだけで検索する。
        const keywords = unit.hintedKeywords || [unit.hintedKeyword || product.searchKeyword];
        return keywords.flatMap((keyword) => [
          fetchRakutenRaw({
            // 比較単位ごとに unit.hintedKeyword を指定した場合、価格帯指定の
            // 追加取得だけそのキーワードで検索する。同じ価格帯に類似の
            //他ユニット商品が大量にあり、通常のキーワードでは埋もれてしまう
            // ケース（例: 96枚×2箱が32枚×4箱セットに埋もれる）向けの仕組み。
            keyword,
            appId: RAKUTEN_APP_ID,
            accessKey: RAKUTEN_ACCESS_KEY,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            siteUrl,
            maxPages: 5,
            minPrice: unit.priceHint.min,
            maxPrice: unit.priceHint.max,
          }).then((r) => ({ source: "rakuten", unit: unit.key, ...r })),
          fetchYahooRaw({
            keyword,
            clientId: YAHOO_CLIENT_ID,
            maxPages: 5,
            minPrice: unit.priceHint.min,
            maxPrice: unit.priceHint.max,
          }).then((r) => ({ source: "yahoo", unit: unit.key, ...r })),
        ]);
      })
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
      for (const item of yahooHint.items.slice(0, 5)) {
        console.log(`      [Yahoo!/${unit.label}ヒント] ¥${item.price} ${item.name}`);
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
      (i) => !claimedRakuten.has(itemKey(i)) && unit.matches(i.name, i.price)
    );
    const yahooCandidates = yahooItems.filter(
      (i) => !claimedYahoo.has(itemKey(i)) && unit.matches(i.name, i.price)
    );

    // APIの検索結果に、たまたま毎回出てこないショップがあった場合の救済策。
    // unit.manualListings に手動で登録しておくと、API結果に合流させる。
    // 手動登録なので価格が自動更新されない点に注意（運営者が定期的に見直す）。
    if (unit.manualListings) {
      for (const m of unit.manualListings.rakuten || []) {
        rakutenCandidates.push({ ...m, source: "楽天市場" });
      }
      for (const m of unit.manualListings.yahoo || []) {
        yahooCandidates.push({ ...m, source: "Yahoo!ショッピング" });
      }
    }

    for (const i of rakutenCandidates) claimedRakuten.add(itemKey(i));
    for (const i of yahooCandidates) claimedYahoo.add(itemKey(i));

    const topN = product.rankingTopN || 5;
    const rakutenRanking = buildRanking(rakutenCandidates, unit.totalLenses, topN, product.lensesPerBox || 30);
    const yahooRanking = buildRanking(yahooCandidates, unit.totalLenses, topN, product.lensesPerBox || 30);
    return { unit, rakutenRanking, yahooRanking };
  });

  // ---- 「その他のショップ」(楽天/Yahoo!以外の独自サイト)の価格取得 ----
  // unit.otherShops に設定がある比較単位だけ対象にする。
  // 「総合最安値」の比較対象にも含めるため、楽天/Yahoo!の総合最安値計算より
  // 前にここで取得しておく。
  const otherShopsRankedByUnitKey = {};
  for (const unit of product.units) {
    if (!unit.otherShops || unit.otherShops.length === 0) continue;
    const items = [];
    for (const shop of unit.otherShops) {
      const price =
        typeof shop.staticPrice === "number" ? shop.staticPrice : await scrapeOtherShopPrice(shop.scrapeUrl);
      console.log(
        price !== null
          ? `  [その他のショップ] ${shop.shop} ${unit.label}: ¥${price}${typeof shop.staticPrice === "number" ? "（固定値）" : ""}`
          : `  [その他のショップ] ${shop.shop} ${unit.label}: 取得失敗`
      );
      if (price === null) continue;
      items.push({ shop: shop.shop, price, url: shop.affiliateUrl, source: "その他のショップ", image: shop.image });
    }
    // 通常の楽天/Yahoo!ランキングと同じ関数(buildRanking)に通すことで、
    // 順位・1箱あたり単価・1枚あたり単価を正しく計算する
    // （直接pushしただけでは、これらの項目がundefinedのままになってしまう）。
    otherShopsRankedByUnitKey[unit.key] = buildRanking(items, unit.totalLenses, items.length, product.lensesPerBox || 30);
  }

  // 「総合最安値」は、特定の比較単位に固定するのではなく、
  // 全ユニット(1箱・2箱・6箱など)の最安値候補の中から、
  // 1枚あたり単価(rawUnitPrice、四捨五入前の値)が最も安いものを選ぶ。
  // 四捨五入後のunitPriceで比較すると、同額になった際に配列内で先に
  // 出てくるユニットが残ってしまい、実際にはわずかに安い方を見逃す
  // ことがあるため、必ず四捨五入前の値で比較する。
  // 「その他のショップ」(アットレンズ等)も、同じページ内に掲載している以上、
  // 「最安値」と謳うからには比較対象に含める（楽天/Yahoo!だけで計算すると、
  // 実際にはその他のショップの方が安いのに矛盾した表示になってしまうため）。
  let overallBest = null;
  let overallBestUnit = null;
  let overallBestUnitResult = null;
  for (const unitResult of unitResults) {
    const { unit, rakutenRanking, yahooRanking } = unitResult;
    const otherShopBest = (otherShopsRankedByUnitKey[unit.key] || [])[0];
    for (const candidate of [rakutenRanking[0], yahooRanking[0], otherShopBest]) {
      if (!candidate) continue;
      if (!overallBest || candidate.rawUnitPrice < overallBest.rawUnitPrice) {
        overallBest = candidate;
        overallBestUnit = unit;
        overallBestUnitResult = unitResult;
      }
    }
  }

  const updatedAt = new Date().toISOString();
  const outDir = path.join(ROOT, product.outputDir);
  await mkdir(outDir, { recursive: true });

  // ---- 処方箋不要ショップ(レンズモード・レンズラボ等)の価格取得 ----
  // rxFreeShops が設定されている商品(今のところプロクリアワンデーのみ)だけ
  // 対象にする。公式APIが無いため、商品ページを直接取得して価格を読み取る。
  let rxFreeSectionHtml = "";
  let rxFreeBestForHistory = null; // 価格推移データ用（別枠で記録する）
  if (product.rxFreeShops) {
    const { quantities, shops } = product.rxFreeShops;
    const shopResults = [];
    for (const shop of shops) {
      const shopQuantities = [];
      for (const qty of quantities) {
        const page = shop.pages[qty];
        if (!page) continue;
        // staticPrice（手動固定値）が設定されているページは、スクレイピングせず
        // その値をそのまま使う（JavaScript描画等でスクレイピングできないショップ向け）
        const price =
          typeof page.staticPrice === "number" ? page.staticPrice : await scrapeShopPrice(page.scrapeUrl, qty);
        console.log(
          price !== null
            ? `  [処方箋不要] ${shop.name} ${qty}箱: ¥${price}${typeof page.staticPrice === "number" ? "（固定値）" : ""}`
            : `  [処方箋不要] ${shop.name} ${qty}箱: 取得失敗`
        );
        shopQuantities.push({ qty, productPrice: price, affiliateUrl: page.affiliateUrl });
      }
      shopResults.push({ name: shop.name, shippingFor: shop.shippingFor, quantities: shopQuantities });
    }

    // 総合最安値(処方箋不要側)を、価格推移グラフ用に先に控えておく
    for (const shop of shopResults) {
      for (const q of shop.quantities) {
        if (q.productPrice === null) continue;
        const total = q.productPrice + shop.shippingFor(q.qty);
        const rawUnitPrice = total / (q.qty * 30);
        if (!rxFreeBestForHistory || rawUnitPrice < rxFreeBestForHistory.rawUnitPrice) {
          rxFreeBestForHistory = {
            rawUnitPrice,
            unitPrice: Math.round(rawUnitPrice),
            // グラフには合計金額ではなく「1箱あたり」の金額を記録する。
            // 合計金額のままだと、日によって最安の箱数(1/2/4/6箱)が
            // 入れ替わるたびにグラフの数字が大きく飛んでしまうため。
            price: Math.round(total / q.qty),
            shop: shop.name,
            source: shop.name,
            url: q.affiliateUrl,
            unitLabel: `${q.qty}箱`,
          };
        }
      }
    }

    const sectionHtml = renderRxFreeSection({
      productName: product.shortName || product.siteName,
      quantities,
      shopResults,
    });

    // 処方箋不要ショップの価格推移も、処方箋あり側とは別ファイルで
    // 独立して記録する（両者は買い方の体験が異なるため、あえて1つの
    // グラフにまとめず、別々のグラフとして持たせる）。
    let rxFreePriceHistoryHtml = "";
    if (rxFreeBestForHistory) {
      const rxHistoryPath = path.join(outDir, "price-history-rxfree.json");
      let rxHistory = [];
      try {
        rxHistory = JSON.parse(await readFile(rxHistoryPath, "utf-8"));
        if (rxHistory.some((h) => !h.unitLabel)) rxHistory = [];
      } catch {
        rxHistory = [];
      }
      rxHistory = updatePriceHistory(rxHistory, {
        date: todayJstDateString(),
        price: rxFreeBestForHistory.price,
        unitLabel: rxFreeBestForHistory.unitLabel,
        source: rxFreeBestForHistory.source,
        shop: rxFreeBestForHistory.shop,
        url: rxFreeBestForHistory.url,
      });
      await writeFile(rxHistoryPath, JSON.stringify(rxHistory, null, 2), "utf-8");
      rxFreePriceHistoryHtml = renderPriceHistorySection({
        history: rxHistory,
        productName: `${product.shortName || product.siteName}（処方箋不要ショップ）`,
        lensesPerBox: 30,
      });
    }

    rxFreeSectionHtml =
      sectionHtml +
      (rxFreePriceHistoryHtml ? `\n\n${rxFreePriceHistoryHtml}` : "") +
      `\n\n  <hr style="border:none; border-top:1px solid var(--line); margin:32px 0;" />\n\n  <h2 class="section-heading" style="margin-bottom:4px;">処方箋ありでも良ければこちら</h2>`;

  }

  const payload = {
    siteName: product.siteName,
    keyword: product.searchKeyword,
    updatedAt,
    overallBest,
    // トップページのカード表示で「(6箱換算)」のように単位を出すために保持しておく
    overallBestUnitLabel: overallBestUnit ? overallBestUnit.label : null,
    units: unitResults.map(({ unit, rakutenRanking, yahooRanking }) => ({
      key: unit.key,
      label: unit.label,
      totalLenses: unit.totalLenses,
      rakuten: rakutenRanking,
      yahoo: yahooRanking,
    })),
  };

  // style.cssは全商品共通のため、docs-template/style.css を正本として
  // 毎回自動的にコピーする（商品ごとに手動で置く必要をなくすため）。
  await copyFile(STYLE_CSS_PATH, path.join(outDir, "style.css"));

  // ---- 価格推移（履歴）の更新 ----
  // 箱数によって日ごとに「一番お得な単位」が入れ替わりうるため、固定の
  // 比較単位を追い続けるのではなく、その日の総合最安値(overallBest)を
  // 1箱換算した価格を docs-xxx/price-history.json に記録していく
  // （直近30日分を保持）。
  let priceHistorySectionHtml = "";
  if (overallBest && overallBestUnit) {
    const lensesPerBox = product.lensesPerBox || 30;
    const perBoxPrice = Math.round(overallBest.rawUnitPrice * lensesPerBox);

    const historyPath = path.join(outDir, "price-history.json");
    let history = [];
    try {
      history = JSON.parse(await readFile(historyPath, "utf-8"));
      // 旧形式（固定の比較単位の合計金額を記録していた形式）のデータが
      // 残っていた場合、今回の設計変更に伴いリセットして新形式で貯め直す
      if (history.some((h) => !h.unitLabel)) {
        history = [];
      }
    } catch {
      history = []; // ファイルが無い（初回実行）場合は空から始める
    }

    history = updatePriceHistory(history, {
      date: todayJstDateString(),
      price: perBoxPrice,
      unitLabel: overallBestUnit.label,
      source: overallBest.source,
      shop: overallBest.shop,
      url: overallBest.url,
    });

    await writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");

    priceHistorySectionHtml = renderPriceHistorySection({
      history,
      productName: product.siteName.replace(/最安値通販価格情報$/, "").trim(),
      lensesPerBox,
    });
  }

  // ---- HTML生成 ----
  const canonicalUrl = siteUrl;
  const allItems = unitResults.flatMap((r) => [...r.rakutenRanking, ...r.yahooRanking]);
  // 通常は楽天ランキング1位の商品画像を自動流用するが、並行輸入品など
  // 実際の商品と異なる画像が紛れ込むことがあるため、商品ごとに固定の
  // 画像URL(productInfoImageOverride)を指定できるようにしている。
  const rakutenImage =
    product.productInfoImageOverride ||
    unitResults.flatMap((r) => r.rakutenRanking).find((i) => i.image)?.image ||
    "images/product-1.jpg";

  // 上ですでに取得済みの otherShopsRankedByUnitKey から、表示用HTMLを生成する
  const otherShopsHtmlByUnitKey = {};
  for (const unit of product.units) {
    if (!otherShopsRankedByUnitKey[unit.key]) continue;
    otherShopsHtmlByUnitKey[unit.key] = renderOtherShopsSection(unit, otherShopsRankedByUnitKey[unit.key]);
  }

  const unitsHtml = unitResults
    .map(({ unit, rakutenRanking, yahooRanking }) =>
      renderUnitSection(unit, rakutenRanking, yahooRanking, otherShopsHtmlByUnitKey[unit.key] || "")
    )
    .join("\n");

  const html = renderTemplate(template, {
    PAGE_TITLE: escapeHtml(product.siteName),
    META_DESCRIPTION: escapeHtml(product.metaDescription),
    SUBTITLE: escapeHtml(product.subtitle),
    CANONICAL_URL: escapeHtml(canonicalUrl),
    SEARCH_CONSOLE_VERIFICATION: product.searchConsoleVerification || "",
    THEME_STYLE: renderThemeStyle(product.theme),
    JSON_LD:
      buildJsonLd({
        productName: product.productSchemaName,
        siteName: product.siteName,
        allItems,
        brandName: product.brandName,
      }) +
      "\n" +
      buildBreadcrumbJsonLd({
        siteBaseUrl: SITE_BASE_URL,
        productName: product.shortName || product.siteName,
        productUrl: canonicalUrl,
      }),
    BREADCRUMB_HTML: `  <nav class="breadcrumb" aria-label="パンくずリスト">
    <a href="/">ホーム</a><span class="sep">&gt;</span><span>${escapeHtml(product.shortName || product.siteName)}</span>
  </nav>`,
    PRODUCT_LIST_FOOTER_HTML: products
      .map(
        (p) =>
          `        <a href="/${p.slug}/">${escapeHtml(p.shortName || p.siteName)}</a>`
      )
      .join("\n"),
    UPDATED_TEXT: escapeHtml(formatUpdatedText(updatedAt)),
    HERO_SECTION: overallBest
      ? renderHeroSection(overallBest, overallBestUnit.heroLabel, overallBestUnit.heroName)
      : "",
    RX_FREE_SECTION: rxFreeSectionHtml,
    PRODUCT_INTRO: product.productIntroHtml,
    UNITS_HTML: unitsHtml,
    PRICE_HISTORY_SECTION: priceHistorySectionHtml,
    PRODUCT_INFO_HEADING: escapeHtml(product.productInfoHeading),
    PRODUCT_INFO_HTML: product.productInfoHtml,
    PRODUCT_INFO_IMAGE: escapeHtml(rakutenImage),
    REVIEW_LINKS: renderReviewLinks(
      overallBestUnitResult?.rakutenRanking[0],
      overallBestUnitResult?.yahooRanking[0]
    ),
  });

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

  // トップページの商品カードで使う「本日の総合最安値」情報。
  // overallBestが無い(該当商品が1件も見つからなかった)場合はnullを返す。
  const topPageCard = overallBest
    ? {
        perBoxPrice: Math.round(overallBest.rawUnitPrice * (product.lensesPerBox || 30)),
        lensesPerBox: product.lensesPerBox || 30,
        unitPrice: overallBest.unitPrice,
        unitLabel: overallBestUnit.label,
      }
    : null;

  return { ok: true, summary: summaryParts.join(" / "), topPageCard };
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

  // ルート用ファイル（sitemap_index.xml / robots.txt）は、PRODUCT_ID による
  // 絞り込みに関わらず、常に全商品分を対象に再生成する
  // （商品を1つ追加しただけでも索引に反映されるようにするため）。
  await generateRootFiles();

  // トップページも同様に、PRODUCT_ID の絞り込みに関わらず常に全商品分を
  // 対象に再生成する（各商品の最新 data.json から値を読み込むため、
  // 一部商品だけをビルドした場合でも他商品のカードは前回分の値のまま
  // 正しく表示される）。
  await generateTopPage();
}

main().catch((err) => {
  console.error("致命的なエラーが発生しました:", err);
  process.exit(1);
});
