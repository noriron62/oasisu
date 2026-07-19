name: Update lens prices

on:
  schedule:
    # 毎日 10:00 と 22:00（UTC 1:00 / 13:00）に実行
    - cron: "0 1,13 * * *"
  workflow_dispatch: {} # 手動実行用ボタン

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Fetch latest prices
        env:
          RAKUTEN_APP_ID: ${{ secrets.RAKUTEN_APP_ID }}
          RAKUTEN_ACCESS_KEY: ${{ secrets.RAKUTEN_ACCESS_KEY }}
          RAKUTEN_AFFILIATE_ID: ${{ secrets.RAKUTEN_AFFILIATE_ID }}
          SITE_URL: ${{ secrets.SITE_URL }}
          YAHOO_CLIENT_ID: ${{ secrets.YAHOO_CLIENT_ID }}
          MOSHIMO_A_ID: ${{ secrets.MOSHIMO_A_ID }}
          MOSHIMO_P_ID: ${{ secrets.MOSHIMO_P_ID }}
          MOSHIMO_PC_ID: ${{ secrets.MOSHIMO_PC_ID }}
          MOSHIMO_PL_ID: ${{ secrets.MOSHIMO_PL_ID }}
          VALUECOMMERCE_SID: ${{ secrets.VALUECOMMERCE_SID }}
          VALUECOMMERCE_PID: ${{ secrets.VALUECOMMERCE_PID }}
        run: node scripts/fetch-prices.mjs

      - name: Commit updated data
        run: |
          git config user.name "price-bot"
          git config user.email "price-bot@users.noreply.github.com"
          git add docs/data.json
          git diff --cached --quiet && echo "変更なし" || git commit -m "chore: update prices $(date -u +%Y-%m-%d)"
          git push
