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

  const results = [];

  for (const product of products) {
    const localDir = path.join(ROOT, product.outputDir);
    const remoteDir = `/${product.slug}/`;
    console.log(`\n=== ${product.id} → ${remoteDir} ===`);
    try {
      await client.ensureDir(remoteDir);
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
