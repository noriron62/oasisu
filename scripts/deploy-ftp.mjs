// scripts/deploy-ftp.mjs
//
// scripts/products.config.mjs に定義された全商品の docs-xxx フォルダを、
// それぞれ対応するFTPサブディレクトリへアップロードする。
//
// build-all.mjs と同様、1商品のアップロードが失敗しても、そこで
// 全体を止めず次の商品へ進む（接続自体は使い回すので、1回だけ接続する）。
//
// 環境変数（GitHub Actions の Secrets）:
//   FTP_SERVER / FTP_USERNAME / FTP_PASSWORD
//   FTP_BASE_DIR  公開フォルダ（public_html等）の絶対パス（例: /newmediagallery.org/public_html）。
//                  Xserver等、1つのFTPアカウントで複数ドメインを管理している場合、
//                  ログイン直後の場所が公開フォルダと異なることがあるため、
//                  このSecretで明示的に指定する（末尾の / は有り無しどちらでもよい）。
//                  未設定の場合は、ログイン直後の場所をそのまま使う。

import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";

import { products } from "./products.config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FTP_SERVER = process.env.FTP_SERVER || "";
const FTP_USERNAME = process.env.FTP_USERNAME || "";
const FTP_PASSWORD = process.env.FTP_PASSWORD || "";
const FTP_SECURE = (process.env.FTP_SECURE || "true") !== "false"; // "false"を指定するとFTPS無効化
const FTP_BASE_DIR = (process.env.FTP_BASE_DIR || "").replace(/\/+$/, ""); // 末尾のスラッシュを除去

async function main() {
  if (!FTP_SERVER || !FTP_USERNAME || !FTP_PASSWORD) {
    console.error(
      "[error] FTP_SERVER / FTP_USERNAME / FTP_PASSWORD のいずれかが未設定です。デプロイをスキップします。"
    );
    process.exit(1);
  }

  const client = new Client();
  client.ftp.verbose = false;

  await client.access({
    host: FTP_SERVER,
    user: FTP_USERNAME,
    password: FTP_PASSWORD,
    secure: FTP_SECURE,
  });

  // 「基準地点」を決める：FTP_BASE_DIR が指定されていればそれを使い、
  // 無指定ならログイン直後の場所をそのまま使う。
  let baseDir;
  if (FTP_BASE_DIR) {
    await client.cd(FTP_BASE_DIR);
    baseDir = await client.pwd();
    console.log(`[debug] FTP_BASE_DIR を指定された場所に移動しました: ${baseDir}`);
  } else {
    baseDir = await client.pwd();
    console.log(`[debug] FTP_BASE_DIR 未指定のため、ログイン直後の場所を使用: ${baseDir}`);
  }

  // PRODUCT_ID が指定されている場合（"all" 以外）は、その商品だけをデプロイする
  const productIdFilter = (process.env.PRODUCT_ID || "").trim();
  const targetProducts =
    productIdFilter && productIdFilter !== "all"
      ? products.filter((p) => p.id === productIdFilter)
      : products;

  if (targetProducts.length !== products.length) {
    console.log(`[info] 対象を絞り込んでデプロイします: ${targetProducts.map((p) => p.id).join(", ")}`);
  }

  const results = [];

  for (const product of targetProducts) {
    const localDir = path.join(ROOT, product.outputDir);
    console.log(`\n=== ${product.id} → ${baseDir}/${product.slug}/ ===`);
    try {
      await client.cd(baseDir); // 必ず基準地点に戻ってから処理する
      await client.ensureDir(product.slug); // 相対パスで指定（先頭に「/」を付けない）
      await client.clearWorkingDir();
      await client.uploadFromDir(localDir);
      console.log(`  OK: ${localDir} をアップロードしました`);
      results.push({ id: product.id, ok: true });
    } catch (err) {
      console.error(`  [error] ${product.id} のアップロードに失敗しました: ${err.message}`);
      results.push({ id: product.id, ok: false, detail: err.message });
      // 接続はそのまま使い回し、次の商品へ進む
    }
  }

  client.close();

  console.log("\n=== デプロイ結果サマリー ===");
  const okCount = results.filter((r) => r.ok).length;
  const ngCount = results.length - okCount;
  for (const r of results) {
    console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.id}${r.detail ? `: ${r.detail}` : ""}`);
  }
  console.log(`\n合計 ${results.length}商品中、成功 ${okCount}件 / 失敗 ${ngCount}件`);

  if (ngCount > 0) {
    process.exitCode = 1; // 1件でも失敗があれば、ワークフロー側で気づけるように失敗扱いにする
  }
}

main().catch((err) => {
  console.error("致命的なエラーが発生しました:", err);
  process.exit(1);
});
