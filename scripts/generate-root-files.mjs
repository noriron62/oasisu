// scripts/generate-root-files.mjs
//
// ドメインのルート（例: https://newmediagallery.org/）に配置する
// robots.txt と sitemap_index.xml を生成する。
//
// 背景:
//   robots.txt はサブディレクトリに置いても効果がない
//   （Googleはドメイン直下の robots.txt しか見ない仕様のため、
//    現状の docs-xxx/robots.txt は実質機能していなかった）。
//   そこでルート専用のファイルを docs-root/ に生成し、
//   deploy-ftp.mjs でFTPのベースディレクトリ直下（サブフォルダなし）に
//   アップロードする。
//
//   sitemap_index.xml は、商品ごとに既に生成されている
//   docs-xxx/sitemap.xml を1つに束ねるだけの「索引」ファイル。
//   商品が増えても products.config.mjs に1項目追加するだけで
//   自動的に反映される。
//
// 単体実行: node scripts/generate-root-files.mjs
// （build-all.mjs の最後からも自動的に呼び出される）

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { products } from "./products.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs-root");

export async function generateRootFiles() {
  const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://example.com").replace(/\/+$/, "");

  await mkdir(OUT_DIR, { recursive: true });

  // ---- sitemap_index.xml ----
  // 各商品の docs-xxx/sitemap.xml（既存のURL構成をそのまま踏襲）を列挙する。
  const sitemapEntries = products
    .map(
      (p) => `  <sitemap>
    <loc>${SITE_BASE_URL}/${p.slug}/sitemap.xml</loc>
  </sitemap>`
    )
    .join("\n");

  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>
`;
  await writeFile(path.join(OUT_DIR, "sitemap_index.xml"), sitemapIndex, "utf-8");

  // ---- robots.txt（ドメイン直下用）----
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_BASE_URL}/sitemap_index.xml
`;
  await writeFile(path.join(OUT_DIR, "robots.txt"), robots, "utf-8");

  console.log(`[info] ルート用ファイルを生成しました（対象商品: ${products.length}件）`);
  console.log(`  - ${path.join("docs-root", "sitemap_index.xml")}`);
  console.log(`  - ${path.join("docs-root", "robots.txt")}`);

  return { outDir: OUT_DIR, productCount: products.length };
}

// build-all.mjs からimportされた場合は実行せず、
// 単体で `node scripts/generate-root-files.mjs` された場合のみ実行する。
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  generateRootFiles().catch((err) => {
    console.error("致命的なエラーが発生しました:", err);
    process.exit(1);
  });
}
