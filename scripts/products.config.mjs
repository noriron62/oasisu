// scripts/products.config.mjs
//
// 商品を追加したいときは、この配列に1項目追加するだけでよい。
// 検索キーワード・ブランド判定・比較単位（何箱で比較するか）などを
// 商品ごとに定義する。共通の処理（API取得・単価計算・HTML生成・
// アフィリエイトリンク化など）は scripts/lib/common.mjs 側にまとまっている。

import { stripShippingPromoText } from "./lib/common.mjs";

/**
 * 商品名から「単品」を最優先で除外し、対象の箱数表記があるかを判定する
 * 共通ヘルパー（通常版・乱視用のいずれの判定にも使う）。
 */
function isBoxCount(name, targetCount) {
  if (!name) return false;
  const n = stripShippingPromoText(name.replace(/\s/g, ""));
  if (/単品/.test(n)) return false;
  return new RegExp(`${targetCount}箱`).test(n);
}

export const products = [
  // ------------------------------------------------------------------
  // 1. ワンデーアキュビューオアシス（通常）
  // ------------------------------------------------------------------
  {
    id: "oasys-saiyasu",
    slug: "oasys-saiyasu", // サイトURL・FTPアップロード先フォルダ名に使う
    outputDir: "docs", // 生成物の出力先（既存の運用をそのまま踏襲）
    siteName: "ワンデーアキュビューオアシス最安値通販価格情報",
    theme: { accent: "#0C6E6B", gold: "#B8892B" }, // ティール系(元のデザイン)
    historyUnitKey: "bundle", // 価格推移グラフで記録する比較単位（90枚×2箱セット）
    searchKeyword: "ワンデーアキュビューオアシス 90枚",
    metaDescription:
      "ワンデーアキュビューオアシス 90枚入り×2箱セット（180枚）の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「90枚入り×2箱セット(180枚)」を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "ワンデーアキュビューオアシス 90枚入り×2箱セット（180枚）",
    brandName: "ACUVUE", // JSON-LD(構造化データ)のbrand.nameに使用
    brand: "ジョンソン・エンド・ジョンソン(アキュビュー)", // トップページのブランド別グルーピングに使用
    brandKey: "acuvue",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "senofilcon A(シリコーンハイドロゲル)",
      water: 38, // 含水率(%)
      dk: 121, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "ワンデーアキュビューオアシス", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「ワンデーアキュビューオアシス」（乱視用ではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(乱視|トーリック|toric)/i.test(n)) return false; // 乱視用は別商品として除外
      return /アキュビュー/.test(n) && /オアシス/.test(n);
    },

    units: [
      {
        key: "bundle",
        label: "90枚×2箱セット",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューオアシス 90枚入り×2箱セット(180枚)",
        // 検索キーワードから「2箱」を外した影響で、1箱の商品が大量にヒットし
        // 2箱セットが取得範囲から押し出されてしまうため、価格帯を直接指定する
        priceHint: { min: 13000, max: 18000 },
        introHtml: "",
        /** 「90枚入り×2箱（180枚）セット」らしきものだけを判定する */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;

          const mentionsSingleBoxTerms = /(1箱)/.test(n);
          const mentions2Box = /2箱/.test(n);
          if (mentionsSingleBoxTerms && !mentions2Box) return false;

          if (/180枚/.test(n)) return true;

          const has90 = /90/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
          return has90 && has2Box;
        },
      },
      {
        key: "single90",
        label: "90枚1箱",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューオアシス 90枚1箱",
        // 実際に確認できた1箱の価格帯(7,600円前後)をもとに、
        // その価格帯を直接指定した追加取得を行う（postageFlag/shipping絞り込みの
        // 影響で、通常の安い順取得だけでは埋もれてしまうことがあるため）
        priceHint: { min: 6500, max: 10000 },
        introHtml: `    <h2 class="section-heading">90枚1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、90枚1箱(単品)の価格帯も
      別枠で掲載しています。<strong>90枚×2箱セットとは金額の単位が異なる</strong>ため、
      混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        /** bundleに該当しない商品のうち、90枚を含み他の箱数を明示していないものを対象にする */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          const otherBoxCount = /(3箱|4箱|5箱|6箱|180枚|270枚|360枚)/;
          if (otherBoxCount.test(n)) return false;
          return /90/.test(n);
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">なぜ「90枚入り×2箱セット」がお得なのか</h2>
    <p>
      ワンデーアキュビューオアシスは、購入する数量によって1枚あたりの単価が変わります。
      1箱(30枚)だけの購入は数量が少ないため単価が割高になりがちで、
      2箱に増やしても送料や販売手数料の比率はあまり下がらず、単価の下がり方はゆるやかです。
    </p>
    <p>
      一方で、<strong>90枚入り×2箱セット(180枚)</strong>は、多くのショップが
      「送料込み・まとめ買い向け」として力を入れて価格設定している定番の販売単位のため、
      1枚あたりの単価がもっとも下がりやすい傾向があります。
      そのため当サイトでは、この90枚入り×2箱セットに絞って、
      楽天市場・Yahoo!ショッピングの実勢価格を比較しています。
    </p>`,

    productInfoHeading: "ワンデーアキュビューオアシスとは",
    productInfoHtml: `        <p>
          ワンデーアキュビューオアシスは、ジョンソン・エンド・ジョンソンが展開する
          「アキュビュー」シリーズの1日使い捨てタイプのコンタクトレンズです。
          シリコーンハイドロゲルという素材を使用しており、レンズを通して角膜に
          酸素を届けやすい設計になっているのが特徴です。
        </p>
        <h3>素材と装用感</h3>
        <p>
          シリコーンハイドロゲル素材は、従来の含水率重視の素材に比べて、
          長時間の装用でも乾燥感を抑えやすいとされています。
          涙となじみやすい表面設計により、まばたきの際の摩擦を軽減する
          工夫がされている点も特徴です。
        </p>
        <h3>UVカット機能</h3>
        <p>
          レンズには紫外線をカットする機能が備わっており、
          屋外での活動が多い方にも配慮された設計になっています
          （UVカット機能はあくまで補助的なものであり、サングラス等の
          代わりにはなりませんのでご注意ください）。
        </p>
        <h3>1日使い捨てのメリット</h3>
        <p>
          毎日新しいレンズに交換するため、レンズケースや洗浄液を使った
          お手入れが不要です。衛生面を重視したい方や、レンズケアの
          手間を減らしたい方に選ばれています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乾燥や装用中の違和感が気になる方</li>
          <li>レンズケアの手間を減らしたい方</li>
          <li>紫外線対策も意識したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブ・含水率などの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。本ページは購入の最終判断材料として
          ではなく、比較検討のための参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 2. ワンデーアキュビューオアシス 乱視用
  // ------------------------------------------------------------------
  {
    id: "oasys-ranshi-saiyasu",
    slug: "oasys-ranshi-saiyasu",
    outputDir: "docs-toric",
    siteName: "ワンデーアキュビューオアシス乱視用最安値通販価格情報",
    theme: { accent: "#3B5BA5", gold: "#B8892B" }, // インディゴ系(通常版と見分けやすい配色)
    historyUnitKey: "box6", // 価格推移グラフで記録する比較単位（6箱が主軸のため）
    searchKeyword: "ワンデーアキュビューオアシス 乱視",
    metaDescription:
      "ワンデーアキュビューオアシス乱視用の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、6箱(180枚)あたりの最安値トップ5を掲載しています。",
    subtitle:
      "「6箱(180枚)」を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "ワンデーアキュビューオアシス 乱視用",
    brandName: "ACUVUE", // JSON-LD(構造化データ)のbrand.nameに使用
    brand: "ジョンソン・エンド・ジョンソン(アキュビュー)", // トップページのブランド別グルーピングに使用
    brandKey: "acuvue",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "senofilcon A(シリコーンハイドロゲル)",
      water: 38, // 含水率(%)
      dk: 121, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "乱視用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "ワンデーアキュビューオアシス 乱視用", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「ワンデーアキュビューオアシス 乱視用」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      const negatesRanshi = /(非乱視|乱視用ではな|乱視無し|乱視なし)/.test(n);
      if (negatesRanshi) return false;
      return (
        /アキュビュー/.test(n) &&
        /オアシス/.test(n) &&
        /(乱視|トーリック|toric)/i.test(n)
      );
    },

    units: [
      {
        key: "box6",
        label: "6箱(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューオアシス 乱視用 6箱セット(180枚)",
        // 1箱・2箱の価格帯から概算した想定価格帯。当初15,000円からにしていたが、
        // 「4箱」の商品(15,000〜16,000円台に多い)と価格帯が重なり、本物の
        // 6箱セットが埋もれてしまっていたため、下限を引き上げて回避している
        priceHint: { min: 17000, max: 26000 },
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /180枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューオアシス 乱視用 2箱セット(60枚)",
        // 実際に確認できた2箱セットの価格帯(6,700〜7,000円前後)をもとに、
        // その価格帯を直接指定した追加取得を行う（安い順の取得だけでは、
        // 3,000円台の1箱商品が大量にあり、埋もれてしまうため）
        priceHint: { min: 5500, max: 9000 },
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(60枚・約2ヶ月分)で販売しているショップも一部あるため、
      見つかった場合はこちらに別枠で掲載しています。<strong>6箱の価格とは
      単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2);
        },
      },
      {
        key: "box1",
        label: "1箱(30枚)",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューオアシス 乱視用 1箱(30枚)",
        introHtml: `    <h2 class="section-heading">1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、1箱(30枚・約1ヶ月分)の
      価格帯も別枠で掲載しています。<strong>6箱・2箱の価格とは単位が異なる</strong>
      ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 「2箱」等をはっきり示す表記がある商品は、こちらでは対象外にする
        // （box2・box6ユニット側で正しく拾われるようにするため）
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(2箱|3箱|4箱|5箱|6箱|60枚|90枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">6箱(180枚)あたりの価格を中心に比較しています</h2>
    <p>
      ワンデーアキュビューオアシス乱視用は、標準の30枚入り(1箱)を何箱まとめて
      購入するかによって、1枚あたりの単価が変わります。1箱・2箱だけの購入では、
      送料や販売手数料の比率が高く、単価が割高になりがちです。
    </p>
    <p>
      一方で、<strong>6箱(180枚・約6ヶ月分)</strong>は、まとめ買い向けに
      価格設定しているショップが多く、1枚あたりの単価がもっとも下がりやすい
      傾向があります。そのため当サイトでは、6箱(180枚)あたりの実勢価格を
      中心に比較しつつ、2箱・1箱で見つかった場合は、それぞれ別枠で
      あわせて掲載しています。
    </p>`,

    productInfoHeading: "ワンデーアキュビューオアシス乱視用とは",
    productInfoHtml: `        <p>
          ワンデーアキュビューオアシス乱視用は、ジョンソン・エンド・ジョンソンが
          展開する「アキュビュー」シリーズの、乱視矯正に対応した1日使い捨て
          タイプのコンタクトレンズです。通常版と同じシリコーンハイドロゲル素材を
          採用しつつ、乱視特有のレンズの向きのズレを抑える設計になっているのが
          特徴です。
        </p>
        <h3>乱視用ならではの安定した見え方</h3>
        <p>
          乱視用レンズは、瞬きのたびにレンズの向きがズレると視界がぼやけやすく
          なります。安定した装用感を保つための設計により、まばたきの際も
          レンズの向きが元の位置に戻りやすいよう工夫されています。
        </p>
        <h3>素材と装用感</h3>
        <p>
          シリコーンハイドロゲル素材は、従来の含水率重視の素材に比べて、
          長時間の装用でも乾燥感を抑えやすいとされています。
        </p>
        <h3>UVカット機能</h3>
        <p>
          レンズには紫外線をカットする機能が備わっており、屋外での活動が
          多い方にも配慮された設計になっています（UVカット機能はあくまで
          補助的なものであり、サングラス等の代わりにはなりませんのでご注意ください）。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乱視があり、見え方の安定感を重視したい方</li>
          <li>乾燥や装用中の違和感が気になる方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・乱視軸・カーブなどの詳細仕様は変更される場合があります。
          乱視用レンズは度数だけでなく乱視軸の指定も必要なため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 3. ワンデーアキュビューモイスト
  // ------------------------------------------------------------------
  {
    id: "moist-saiyasu",
    slug: "moist-saiyasu",
    outputDir: "docs-moist",
    siteName: "ワンデーアキュビューモイスト最安値通販価格情報",
    theme: { accent: "#B8631D", gold: "#B8892B" }, // アンバー系(通常版・乱視用と見分けやすい配色)
    historyUnitKey: "bundle", // 価格推移グラフで記録する比較単位（90枚×2箱セット）
    searchKeyword: "ワンデーアキュビューモイスト 90枚",
    metaDescription:
      "ワンデーアキュビューモイスト 90枚入り×2箱セット（180枚）の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「90枚入り×2箱セット(180枚)」を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "ワンデーアキュビューモイスト 90枚入り×2箱セット（180枚）",
    brandName: "ACUVUE", // JSON-LD(構造化データ)のbrand.nameに使用
    brand: "ジョンソン・エンド・ジョンソン(アキュビュー)", // トップページのブランド別グルーピングに使用
    brandKey: "acuvue",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "etafilcon A",
      water: 58, // 含水率(%)
      dk: 33.3, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "ワンデーアキュビューモイスト", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「ワンデーアキュビューモイスト」（乱視用ではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(乱視|トーリック|toric)/i.test(n)) return false; // 乱視用は別商品として除外
      if (/オアシス/.test(n)) return false; // 同シリーズの別商品(オアシス)との混同を防ぐ
      return /アキュビュー/.test(n) && /モイスト/.test(n);
    },

    units: [
      {
        key: "bundle",
        label: "90枚×2箱セット",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト 90枚入り×2箱セット(180枚)",
        // 検索キーワードから「2箱」を外した影響で、1箱の商品が大量にヒットし
        // 2箱セットが取得範囲から押し出されてしまうため、価格帯を直接指定する
        priceHint: { min: 11000, max: 16000 },
        introHtml: "",
        /** 「90枚入り×2箱（180枚）セット」らしきものだけを判定する（通常版と同じロジック） */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;

          const mentionsSingleBoxTerms = /(1箱)/.test(n);
          const mentions2Box = /2箱/.test(n);
          if (mentionsSingleBoxTerms && !mentions2Box) return false;

          if (/180枚/.test(n)) return true;

          const has90 = /90/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
          return has90 && has2Box;
        },
      },
      {
        key: "single90",
        label: "90枚1箱",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト 90枚1箱",
        // 実際に確認できた1箱の価格帯(8,350円前後)をもとに、
        // その価格帯を直接指定した追加取得を行う（postageFlag/shipping絞り込みの
        // 影響で、通常の安い順取得だけでは埋もれてしまうことがあるため）
        priceHint: { min: 7000, max: 11000 },
        introHtml: `    <h2 class="section-heading">90枚1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、90枚1箱(単品)の価格帯も
      別枠で掲載しています。<strong>90枚×2箱セットとは金額の単位が異なる</strong>ため、
      混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        /** bundleに該当しない商品のうち、90枚を含み他の箱数を明示していないものを対象にする */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          const otherBoxCount = /(3箱|4箱|5箱|6箱|180枚|270枚|360枚)/;
          if (otherBoxCount.test(n)) return false;
          return /90/.test(n);
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">なぜ「90枚入り×2箱セット」がお得なのか</h2>
    <p>
      ワンデーアキュビューモイストは、購入する数量によって1枚あたりの単価が変わります。
      1箱(30枚)だけの購入は数量が少ないため単価が割高になりがちで、
      2箱に増やしても送料や販売手数料の比率はあまり下がらず、単価の下がり方はゆるやかです。
    </p>
    <p>
      一方で、<strong>90枚入り×2箱セット(180枚)</strong>は、多くのショップが
      「送料込み・まとめ買い向け」として力を入れて価格設定している定番の販売単位のため、
      1枚あたりの単価がもっとも下がりやすい傾向があります。
      そのため当サイトでは、この90枚入り×2箱セットに絞って、
      楽天市場・Yahoo!ショッピングの実勢価格を比較しています。
    </p>`,

    productInfoHeading: "ワンデーアキュビューモイストとは",
    productInfoHtml: `        <p>
          ワンデーアキュビューモイストは、ジョンソン・エンド・ジョンソンが展開する
          「アキュビュー」シリーズの1日使い捨てタイプのコンタクトレンズです。
          独自の「ラクリオン・テクノロジー」により、うるおい成分をレンズ素材に
          閉じ込める設計になっているのが特徴とされています。
        </p>
        <h3>うるおいを保つ設計</h3>
        <p>
          ラクリオン・テクノロジーは、レンズの中にうるおい成分を組み込むことで、
          装用中もレンズの保水力を保ちやすくする技術とされています。
          朝から夜まで、やさしく軽い装用感が続きやすいとされている点が特徴です。
        </p>
        <h3>UVカット機能</h3>
        <p>
          レンズには紫外線をカットする機能が備わっており、
          屋外での活動が多い方にも配慮された設計になっています
          （UVカット機能はあくまで補助的なものであり、サングラス等の
          代わりにはなりませんのでご注意ください）。
        </p>
        <h3>1日使い捨てのメリット</h3>
        <p>
          毎日新しいレンズに交換するため、レンズケースや洗浄液を使った
          お手入れが不要です。衛生面を重視したい方や、レンズケアの
          手間を減らしたい方に選ばれています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>装用中のうるおい・やさしい付け心地を重視したい方</li>
          <li>コンタクトレンズを初めて使う方</li>
          <li>レンズケアの手間を減らしたい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブ・含水率などの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。本ページは購入の最終判断材料として
          ではなく、比較検討のための参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 4. ワンデーアキュビューモイスト乱視用
  // ------------------------------------------------------------------
  {
    id: "moist-ranshi-saiyasu",
    slug: "moist-ranshi-saiyasu",
    outputDir: "docs-moist-toric",
    siteName: "ワンデーアキュビューモイスト乱視用最安値通販価格情報",
    theme: { accent: "#7A3B5E", gold: "#B8892B" }, // プラム系(他3サイトと見分けやすい配色)
    historyUnitKey: "box6", // 価格推移グラフで記録する比較単位（6箱が実測でも最安のため）
    searchKeyword: "ワンデーアキュビューモイスト 乱視",
    metaDescription:
      "ワンデーアキュビューモイスト乱視用の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、6箱・4箱・2箱・1箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「6箱」「4箱」「2箱」「1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "ワンデーアキュビューモイスト乱視用 6箱セット（180枚）",
    brandName: "ACUVUE", // JSON-LD(構造化データ)のbrand.nameに使用
    brand: "ジョンソン・エンド・ジョンソン(アキュビュー)", // トップページのブランド別グルーピングに使用
    brandKey: "acuvue",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "etafilcon A",
      water: 58, // 含水率(%)
      dk: 33.3, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "乱視用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "ワンデーアキュビューモイスト 乱視用", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「ワンデーアキュビューモイスト乱視用」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      const negatesRanshi = /(非乱視|乱視用ではな|乱視無し|乱視なし)/.test(n);
      if (negatesRanshi) return false;
      if (/オアシス/.test(n)) return false; // 同シリーズの別商品(オアシス)との混同を防ぐ
      return (
        /アキュビュー/.test(n) &&
        /モイスト/.test(n) &&
        /(乱視|トーリック|toric)/i.test(n)
      );
    },

    units: [
      {
        key: "box6",
        label: "6箱(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト乱視用 6箱セット(180枚)",
        // 参考価格(6箱16,770円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 14500, max: 19500 },
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /180枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box4",
        label: "4箱(120枚)",
        totalLenses: 120,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト乱視用 4箱セット(120枚)",
        // 参考価格(4箱11,659円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 10000, max: 14000 },
        introHtml: `    <h2 class="section-heading">4箱(単品)でも比較したい方へ</h2>
    <p>
      4箱セット(120枚・約4ヶ月分)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 4) || /120枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト乱視用 2箱セット(60枚)",
        // 参考価格(2箱5,930円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 4800, max: 7500 },
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(60枚・約2ヶ月分)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱・4箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2) || /60枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box1",
        label: "1箱(30枚)",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト乱視用 1箱(30枚)",
        introHtml: `    <h2 class="section-heading">1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、1箱(30枚・約1ヶ月分)の
      価格帯も別枠で掲載しています。<strong>6箱・4箱・2箱とは金額の単位が異なる</strong>
      ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(2箱|3箱|4箱|5箱|6箱|60枚|90枚|120枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">6箱(180枚)あたりの価格を中心に比較しています</h2>
    <p>
      ワンデーアキュビューモイスト乱視用は、標準の30枚入り(1箱)を何箱まとめて
      購入するかによって、1枚あたりの単価が変わります。1箱・2箱だけの購入では、
      送料や販売手数料の比率が高く、単価が割高になりがちです。
    </p>
    <p>
      一方で、<strong>6箱(180枚・約6ヶ月分)</strong>は、まとめ買い向けに
      価格設定しているショップが多く、1枚あたりの単価がもっとも下がりやすい
      傾向があります。そのため当サイトでは、6箱(180枚)あたりの実勢価格を
      中心に比較しつつ、4箱・2箱・1箱で見つかった場合も、それぞれ別枠で
      あわせて掲載しています。
    </p>`,

    productInfoHeading: "ワンデーアキュビューモイスト乱視用とは",
    productInfoHtml: `        <p>
          ワンデーアキュビューモイスト乱視用は、ジョンソン・エンド・ジョンソンが
          展開する「アキュビュー」シリーズの、乱視矯正に対応した1日使い捨て
          タイプのコンタクトレンズです。通常版と同じ「ラクリオン・テクノロジー」
          により、うるおい成分をレンズ素材に閉じ込める設計になっているのが
          特徴とされています。
        </p>
        <h3>乱視用ならではの安定した見え方</h3>
        <p>
          乱視用レンズは、瞬きのたびにレンズの向きがズレると視界がぼやけやすく
          なります。安定した装用感を保つための設計により、まばたきの際も
          レンズの向きが元の位置に戻りやすいよう工夫されています。
        </p>
        <h3>うるおいを保つ設計</h3>
        <p>
          ラクリオン・テクノロジーは、レンズの中にうるおい成分を組み込むことで、
          装用中もレンズの保水力を保ちやすくする技術とされています。
        </p>
        <h3>UVカット機能</h3>
        <p>
          レンズには紫外線をカットする機能が備わっており、屋外での活動が
          多い方にも配慮された設計になっています（UVカット機能はあくまで
          補助的なものであり、サングラス等の代わりにはなりませんのでご注意ください）。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乱視があり、見え方の安定感を重視したい方</li>
          <li>装用中のうるおいを重視したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・乱視軸・カーブなどの詳細仕様は変更される場合があります。
          乱視用レンズは度数だけでなく乱視軸の指定も必要なため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 5. プロクリアワンデー
  // ------------------------------------------------------------------
  {
    id: "proclear-saiyasu",
    slug: "proclear-saiyasu",
    outputDir: "docs-proclear",
    siteName: "プロクリアワンデー最安値通販価格情報",
    theme: { accent: "#2F6B4F", gold: "#B8892B" }, // フォレストグリーン系(他4サイトと見分けやすい配色)
    historyUnitKey: "bundle", // 価格推移グラフで記録する比較単位（90枚×2箱セットが実測でも最安のため）
    searchKeyword: "プロクリアワンデー",
    metaDescription:
      "プロクリアワンデーの楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、90枚×2箱・90枚1箱・2箱・1箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「90枚×2箱」「90枚1箱」「2箱」「1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "プロクリアワンデー 90枚入り×2箱セット（180枚）",
    brandName: "Proclear", // JSON-LD(構造化データ)のbrand.nameに使用（クーパービジョン社製のため他商品と異なる）
    brand: "クーパービジョン", // トップページのブランド別グルーピングに使用
    brandKey: "coopervision",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "omafilcon A",
      water: 60, // 含水率(%)
      dk: 22.8, // 酸素透過率(Dk/t)
      uv: false, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "プロクリアワンデー", // トップページの商品カード・フッターで使う短い正式名称
    // 処方箋不要ショップのセクションを新設した分、ページが長くなりすぎない
    // よう、楽天/Yahoo!ランキングは各ベスト3に絞る
    rankingTopN: 3,

    // 「処方箋不要」を明言している専門ショップ（楽天/Yahoo!とは別に、
    // HTMLスクレイピングで価格を取得する）。1/2/4/6箱それぞれの
    // 商品ページURLと、A8.net経由のアフィリエイトリンクを保持する。
    rxFreeShops: {
      quantities: [1, 2, 4, 6],
      shops: [
        {
          name: "レンズモード",
          // 送料: 300円×箱数（最低1,000円）
          shippingFor: (boxes) => Math.max(300 * boxes, 1000),
          // レンズモードはJavaScriptで価格を表示する作りのため、自動取得ができない。
          // そのため商品価格は固定値（staticPrice）で運用し、運営者が定期的に
          // （目安2週間ごと）手動で最新価格に更新する方針とする。
          pages: {
            1: {
              staticPrice: 2230,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1%2F",
            },
            2: {
              staticPrice: 4456,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1%212%2F",
            },
            4: {
              staticPrice: 8900,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1%214%2F",
            },
            6: {
              staticPrice: 13344,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1%216%2F",
            },
          },
        },
        {
          name: "レンズラボ",
          // 送料: 全国一律700円
          shippingFor: () => 700,
          pages: {
            1: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0012-1",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0012-1",
            },
            2: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0012-2",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0012-2",
            },
            4: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0012-4",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0012-4",
            },
            6: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0012-6",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0012-6",
            },
          },
        },
      ],
    },

    /** 商品名が「プロクリアワンデー」（マルチフォーカル・乱視用ではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(マルチフォーカル|遠近両用|乱視用|トーリック|toric)/i.test(n)) return false;
      return /プロクリア/.test(n);
    },

    units: [
      {
        key: "bundle",
        label: "90枚×2箱セット",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー 90枚入り×2箱セット(180枚)",
        // 参考価格(90枚×2箱13,120円)をもとに、価格帯を直接指定して追加取得する。
        // 下限は当初11,000円だったが、Yahoo!側の母数が少なすぎたため
        // 10,500円まで広げている。上限も16,000円→18,000円に広げ、
        // 処方箋不要の商品がより多く含まれるか確認中（90枚1箱・90枚1箱系の
        // 実勢価格帯とは matches() 側のロジックで区別している）。
        priceHint: { min: 10500, max: 18000 },
        // 通常の検索キーワードのままだと、同じ価格帯にある「×4箱セット」
        // 「90枚1箱」等の商品が多く、90枚×2箱セットが埋もれてしまうため、
        // 検索キーワード自体を絞り込む。Yahoo!側は「2箱」まで含めると
        // 母数が少なすぎたため、「2箱」は外して広めにしている
        // （90枚1箱との区別は matches() 側のロジックで行っている）。
        hintedKeyword: "プロクリアワンデー 90枚",
        introHtml: "",
        /** 「90枚入り×2箱（180枚）セット」らしきものだけを判定する */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;

          const mentionsSingleBoxTerms = /(1箱)/.test(n);
          const mentions2Box = /2箱/.test(n);
          if (mentionsSingleBoxTerms && !mentions2Box) return false;

          if (/180枚/.test(n)) return true;

          const has90 = /90/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
          return has90 && has2Box;
        },
      },
      {
        key: "single90",
        label: "90枚1箱",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー 90枚1箱",
        // 参考価格(90枚1箱6,800円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 5800, max: 8500 },
        introHtml: `    <h2 class="section-heading">90枚1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、90枚1箱(単品)の価格帯も
      別枠で掲載しています。<strong>90枚×2箱セットとは金額の単位が異なる</strong>ため、
      混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        // この商品は「標準サイズ(30枚入り)の2箱・1箱」も別途存在するため、
        // それらとの混同を防ぐよう「2箱」の表記も明示的に除外する
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          const otherBoxCount = /(2箱|3箱|4箱|5箱|6箱|60枚|180枚|270枚|360枚)/;
          if (otherBoxCount.test(n)) return false;
          return /90/.test(n);
        },
      },
      {
        key: "box2",
        label: "2箱(標準サイズ・60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー 2箱セット(60枚・標準サイズ)",
        // 参考価格(2箱4,900円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 4000, max: 6200 },
        introHtml: `    <h2 class="section-heading">標準サイズ(30枚入り)の2箱でも比較したい方へ</h2>
    <p>
      90枚パックとは別に、標準サイズ(30枚入り)を2箱で販売しているショップも
      見つかった場合は、こちらに別枠で掲載しています。<strong>90枚パックとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚パック系(bundle/single90)との混同を防ぐため、「90」を含む商品は除外する
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/90/.test(n)) return false;
          if (/(3箱|4箱|5箱|6箱)/.test(n)) return false;
          return /2箱/.test(n);
        },
      },
      {
        key: "box1",
        label: "1箱(標準サイズ・30枚)",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー 1箱(30枚・標準サイズ)",
        // 参考価格(1箱2,590円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2000, max: 3500 },
        introHtml: `    <h2 class="section-heading">標準サイズ(30枚入り)の1箱でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、標準サイズ(30枚入り)1箱の
      価格帯も別枠で掲載しています。<strong>90枚パック・2箱セットとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 他の箱数・90枚パックをはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(90|2箱|3箱|4箱|5箱|6箱|60枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">処方箋不要で購入できるショップを中心に比較しています</h2>
    <p>
      プロクリアワンデーは、コンタクトレンズの中でも「処方箋の提示が必要」な
      ショップで取り扱われることが多い商品です。当サイトでは、商品名や説明文に
      「処方箋あり」「処方箋必要」などと明記された商品はあらかじめ除外していて、
      処方箋不要で購入できるショップを中心に価格を比較しています。
    </p>
    <p>
      楽天・Yahooで扱っているお店は処方箋が必要です。でも店頭で購入するよりは
      安いので処方箋を用意できる方は、ぜひ利用したいですね！
      処方箋が不要というと一般激安サイトで手にすることになりますが、安いサイトも
      ありますので、参考にしてくださいね。掲載金額はもちろん送料無料（又は込み）です。
    </p>
    <p>
      あわせて、購入する数量によって1枚あたりの単価が変わる点にも注目しています。
      1箱(30枚)だけの購入は単価が割高になりがちですが、90枚入り×2箱セット
      (180枚)は、まとめ買い向けに価格設定しているショップが多く、
      1枚あたりの単価がもっとも下がりやすい傾向があります。そのため当サイトでは、
      90枚×2箱セットを中心に比較しつつ、90枚1箱・標準サイズの2箱・1箱で
      見つかった場合も、それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 「処方箋不要」とは、購入時に処方箋の提示を求めないショップがある、という
      販売形態の説明であり、眼科での検査が不要という意味ではありません。
      コンタクトレンズは高度管理医療機器です。目の健康のため、定期的に眼科での
      検査を受けたうえでご購入・ご使用くださいね。
    </p>
    <p style="text-align:center; font-weight:700; color:var(--teal); margin-top:16px;">
      瞳を美しく維持するためにも…..
    </p>`,

    productInfoHeading: "プロクリアワンデーとは",
    productInfoHtml: `        <p>
          プロクリアワンデーは、クーパービジョン社が展開する1日使い捨てタイプの
          コンタクトレンズです。瞳の角膜細胞の膜構造をモデルにした独自素材
          「オマフィルコンA」を採用し、うるおい成分「MPC」をレンズに配合している
          のが特徴とされています。
        </p>
        <h3>PCテクノロジーによる生体適合性</h3>
        <p>
          人工臓器などにも応用されている「PCテクノロジー」により、生体適合性が
          高く瞳になじみやすいとされています。また、レンズ表面に汚れが
          付着しにくい設計になっており、清潔さを保ちやすい点も特徴です。
        </p>
        <h3>うるおいを保つ設計</h3>
        <p>
          MPCという保水成分により、レンズ内の水分が減少しにくく、装用中の
          うるおいが続きやすいとされています。レンズの形状変化も少なく、
          快適なつけ心地が期待できます。
        </p>
        <h3>取り扱いやすい設計</h3>
        <p>
          薄型でありながら形状がしっかりしているため、レンズの表裏が
          分かりやすく、扱いやすい設計になっているとされています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>装用中のうるおい・清潔さを重視したい方</li>
          <li>他のレンズで合わなかった経験がある方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブなどの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。コンタクトレンズは高度管理医療機器のため、
          眼科での検査・処方をふまえたうえでのご購入・ご使用をおすすめします。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 6. シードワンデーピュアうるおいプラス
  // ------------------------------------------------------------------
  {
    id: "seed-saiyasu",
    slug: "seed-saiyasu",
    outputDir: "docs-seed",
    siteName: "シードワンデーピュアうるおいプラス最安値通販価格情報",
    theme: { accent: "#159FD1", gold: "#E8C94A" }, // 明るいスカイブルー×薄い黄色系
    historyUnitKey: "box96x2", // 価格推移グラフで記録する比較単位（96枚×2箱セットが実勢価格でも最安のため）
    searchKeyword: "ワンデーピュアうるおいプラス",
    metaDescription:
      "シードワンデーピュアうるおいプラスの楽天市場・Yahoo!ショッピングの価格を毎日チェックし、96枚×2箱・96枚1箱・32枚×2箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「96枚×2箱」「96枚1箱」「32枚×2箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "シードワンデーピュアうるおいプラス 96枚×2箱セット（192枚）",
    brandName: "SEED", // JSON-LD(構造化データ)のbrand.nameに使用（シード社製のため他商品と異なる）
    brand: "シード(国産)", // トップページのブランド別グルーピングに使用
    brandKey: "seed",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "SIB(国産独自素材)",
      water: 58, // 含水率(%)
      dk: 42.9, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "国産",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "シードワンデーピュアうるおいプラス", // トップページの商品カード・フッターで使う短い正式名称
    lensesPerBox: 32, // シードは1箱32枚入りのため、「1箱あたり」表示の基準を32枚にする

    /** 商品名が「シード ワンデーピュアうるおいプラス」（乱視用・マルチフォーカルではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(乱視|トーリック|toric|マルチフォーカル|遠近両用)/i.test(n)) return false;
      // 「プライムワンデー」(アイレ社)のように、比較訴求のため商品名に
      // 「ワンデーピュアうるおいプラス」という競合製品名を含めているだけの
      // 別ブランド商品を除外する
      if (/(プライムワンデー|アイレ|AIRE)/i.test(n)) return false;
      return /(ピュア|1?daypure)/i.test(n) && /うるおいプラス/.test(n);
    },

    units: [
      {
        key: "box96x2",
        label: "96枚×2箱セット(192枚)",
        totalLenses: 192,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 96枚×2箱セット(192枚)",
        // 参考価格(96枚×2箱8,960円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 7000, max: 11000 },
        // 通常の検索キーワード(「ワンデーピュアうるおいプラス」)のままだと、
        // 同じ価格帯にある「32枚×4箱セット」等の類似商品が大量にヒットし、
        // 96枚×2箱がその中に埋もれてしまうため、この単位だけ検索キーワード
        // 自体を絞り込む。
        hintedKeyword: "ワンデーピュアうるおいプラス 96枚 2箱",
        introHtml: "",
        /** 「96枚×2箱(192枚)」らしきものだけを判定する。「2箱」という漢字表記が
         *  無く「96枚×2」のような記号表記のみのショップも拾えるよう、判定を広めにしている。
         *  さらに、postageFlag(送料込み限定)の関係でAPI取得結果自体に含まれない
         *  ショップ(例:楽天市場「まえだ」)を救済するため、以下の条件を満たす場合も
         *  96枚×2箱とみなす:
         *    ・価格が8,000円以上(このタイプが実勢価格として8,960円前後のため)
         *    ・商品名に「96」という数字を含む
         *    ・かつ「32枚」「4箱」など、明らかに別の単位を示す表記がない
         *  （この救済条件はseed-saiyasuのbox96x2にのみ適用され、他商品には影響しない） */
        matches(name, price) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/192枚/.test(n)) return true;
          if (/96/.test(n)) {
            const mentions2Box =
              /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|96.{0,4}×2|96.{0,4}x2|96.{0,4}ｘ2)/i.test(n);
            if (mentions2Box) return true;
          }
          // 価格ベースの救済条件（postageFlagの都合でAPI結果自体から漏れるショップ向け）
          if (typeof price === "number" && price >= 8000) {
            if (/96/.test(n) && !/(32枚|4箱|5箱|6箱|7箱|8箱)/.test(n)) return true;
          }
          return false;
        },
      },
      {
        key: "box96x1",
        label: "96枚1箱",
        totalLenses: 96,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 96枚1箱",
        // 参考価格(96枚1箱4,700円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 3800, max: 6000 },
        // 通常の検索キーワードのままだと、同じ価格帯にある「32枚×2箱」の
        // 実勢価格(¥3,800前後)と重なってしまい、そちらの商品ばかりが
        // 枠を占有して本来の96枚1箱商品を拾えなくなるため、検索キーワード
        // 自体を絞り込む。
        hintedKeyword: "ワンデーピュアうるおいプラス 96枚入り",
        introHtml: `    <h2 class="section-heading">96枚1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、96枚入り1箱(単品)の価格帯も
      別枠で掲載しています。<strong>96枚×2箱セットとは金額の単位が異なる</strong>ため、
      混同しないようご注意ください(こちらは96枚1箱分の価格です)。
    </p>`,
        /** 「96枚1箱」らしきものだけを判定する（192枚・2箱を示す表記は上のbox96x2側で
         *  処理済みのため、ここでは明示的にそれらを除外する） */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/192枚/.test(n)) return false;
          if (!/96/.test(n)) return false;
          const mentions2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|96.{0,4}×2|96.{0,4}x2|96.{0,4}ｘ2)/i.test(n);
          return !mentions2Box;
        },
      },
      {
        key: "box2_32",
        label: "32枚×2箱セット(64枚)",
        totalLenses: 64,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 32枚×2箱セット(64枚)",
        // 参考価格(32枚×2箱3,280円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2500, max: 4300 },
        introHtml: `    <h2 class="section-heading">32枚×2箱セット(64枚・通常サイズ)でも比較したい方へ</h2>
    <p>
      96枚入りの大容量パックとは別に、通常サイズ(32枚入り)を2箱セットで
      販売しているショップも見つかった場合は、こちらに別枠で掲載しています。
      <strong>96枚パックとは金額の単位が異なる</strong>ため、比較する際は
      1枚あたりの単価をご確認ください。
    </p>`,
        /** 「32枚×2箱(64枚)」らしきものだけを判定する。96枚系(別ラインナップ)との混同を避ける */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/96/.test(n)) return false; // 96枚系(大容量パック)は別ユニットで扱う
          if (/64枚/.test(n)) return true;
          return isBoxCount(n, 2);
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">96枚×2箱セット(192枚)あたりの価格を中心に比較しています</h2>
    <p>
      シードワンデーピュアうるおいプラスは、標準の32枚入りを何箱まとめて
      購入するかや、大容量の96枚入りパックを選ぶかによって、1枚あたりの
      単価が変わります。当サイトでは、1枚あたりの単価がもっとも下がりやすい
      <strong>96枚×2箱セット(192枚)</strong>を基準に比較しつつ、96枚1箱・
      32枚×2箱セットで見つかった場合も、それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 販売単位や内容量は、時期やショップにより変更・終了している場合があります。
      ご購入前に各販売店の商品ページで最新の内容量・価格をご確認ください。
    </p>`,

    productInfoHeading: "シードワンデーピュアうるおいプラスとは",
    productInfoHtml: `        <p>
          シードワンデーピュアうるおいプラスは、国内の医療機器メーカーである
          株式会社シードが展開する、1日使い捨てタイプのコンタクトレンズです。
          「うるおいプラス」の名前の通り、装用中のうるおい感を意識した
          レンズ設計が特徴とされています。
        </p>
        <h3>手に取りやすい価格帯</h3>
        <p>
          国内メーカーが展開する1日使い捨てレンズの中でも、比較的購入しやすい
          価格帯で販売されていることが多く、まとめ買い向けの大容量パック
          (96枚入り)も用意されているのが特徴です。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>装用中のうるおいを重視したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
          <li>国内メーカーのレンズを使いたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブなどの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。コンタクトレンズは高度管理医療機器のため、
          眼科での検査・処方をふまえたうえでのご購入・ご使用をおすすめします。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 7. ワンデーアキュビューモイスト マルチフォーカル(遠近両用)
  // ------------------------------------------------------------------
  {
    id: "moist-multifocal-saiyasu",
    slug: "moist-multifocal-saiyasu",
    outputDir: "docs-moist-multifocal",
    siteName: "ワンデーアキュビューモイスト マルチフォーカル 遠近両用の最安値価格情報",
    theme: { accent: "#5B4B8A", gold: "#B8892B" }, // バイオレット系(他6サイトと見分けやすい配色)
    historyUnitKey: "box6", // 価格推移グラフで記録する比較単位（6箱が実勢価格でも最安のため）
    searchKeyword: "ワンデーアキュビューモイスト マルチフォーカル",
    metaDescription:
      "ワンデーアキュビューモイスト マルチフォーカル(遠近両用)の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、6箱・4箱・2箱・1箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「6箱」「4箱」「2箱」「1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "ワンデーアキュビューモイスト マルチフォーカル 6箱セット（180枚）",
    brandName: "ACUVUE", // JSON-LD(構造化データ)のbrand.nameに使用
    brand: "ジョンソン・エンド・ジョンソン(アキュビュー)", // トップページのブランド別グルーピングに使用
    brandKey: "acuvue",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "etafilcon A",
      water: 58, // 含水率(%)
      dk: 33.3, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "遠近両用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "ワンデーアキュビューモイスト マルチフォーカル 遠近両用", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「ワンデーアキュビューモイスト マルチフォーカル(遠近両用)」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/オアシス/.test(n)) return false; // 同シリーズの別商品(オアシス)との混同を防ぐ
      if (/乱視/.test(n) && !/(マルチフォーカル|遠近両用)/i.test(n)) return false; // 乱視用単体は除外
      return (
        /アキュビュー/.test(n) &&
        /モイスト/.test(n) &&
        /(マルチフォーカル|遠近両用)/i.test(n)
      );
    },

    units: [
      {
        key: "box6",
        label: "6箱(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト マルチフォーカル 6箱セット(180枚)",
        // 参考価格(6箱17,880円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 15500, max: 20500 },
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /180枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box4",
        label: "4箱(120枚)",
        totalLenses: 120,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト マルチフォーカル 4箱セット(120枚)",
        // 参考価格(4箱11,980円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 10500, max: 13500 },
        introHtml: `    <h2 class="section-heading">4箱(単品)でも比較したい方へ</h2>
    <p>
      4箱セット(120枚・約4ヶ月分)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 4) || /120枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト マルチフォーカル 2箱セット(60枚)",
        // 参考価格(2箱6,070円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 5200, max: 7200 },
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(60枚・約2ヶ月分)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱・4箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2) || /60枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box1",
        label: "1箱(30枚)",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "ワンデーアキュビューモイスト マルチフォーカル 1箱(30枚)",
        // 参考価格(1箱3,270円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2600, max: 4200 },
        introHtml: `    <h2 class="section-heading">1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、1箱(30枚・約1ヶ月分)の
      価格帯も別枠で掲載しています。<strong>6箱・4箱・2箱とは金額の単位が異なる</strong>
      ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(2箱|3箱|4箱|5箱|6箱|60枚|120枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">6箱(180枚)あたりの価格を中心に比較しています</h2>
    <p>
      ワンデーアキュビューモイスト マルチフォーカルは、標準の30枚入り(1箱)を
      何箱まとめて購入するかによって、1枚あたりの単価が変わります。1箱・2箱
      だけの購入では、送料や販売手数料の比率が高く、単価が割高になりがちです。
    </p>
    <p>
      一方で、<strong>6箱(180枚・約6ヶ月分)</strong>は、まとめ買い向けに
      価格設定しているショップが多く、1枚あたりの単価がもっとも下がりやすい
      傾向があります。そのため当サイトでは、6箱(180枚)あたりの実勢価格を
      中心に比較しつつ、4箱・2箱・1箱で見つかった場合も、それぞれ別枠で
      あわせて掲載しています。
    </p>`,

    productInfoHeading: "ワンデーアキュビューモイスト マルチフォーカルとは",
    productInfoHtml: `        <p>
          ワンデーアキュビューモイスト マルチフォーカルは、ジョンソン・エンド・
          ジョンソンが展開する「アキュビュー」シリーズの、遠近両用に対応した
          1日使い捨てタイプのコンタクトレンズです。通常版と同じ「ラクリオン・
          テクノロジー」により、うるおい成分をレンズ素材に閉じ込める設計に
          なっているのが特徴とされています。
        </p>
        <h3>遠近両用ならではの見え方設計</h3>
        <p>
          レンズ内で度数を段階的に変化させる設計により、近くも遠くも
          ピントを合わせやすいよう工夫されています。加入度数(ADD)には
          複数の種類が用意されていることが多く、見え方の度合いに応じて
          選べるようになっています。
        </p>
        <h3>うるおいを保つ設計</h3>
        <p>
          ラクリオン・テクノロジーは、レンズの中にうるおい成分を組み込むことで、
          装用中もレンズの保水力を保ちやすくする技術とされています。
        </p>
        <h3>UVカット機能</h3>
        <p>
          レンズには紫外線をカットする機能が備わっており、屋外での活動が
          多い方にも配慮された設計になっています（UVカット機能はあくまで
          補助的なものであり、サングラス等の代わりにはなりませんのでご注意ください）。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>近くも遠くも見えづらさを感じ始めた方</li>
          <li>老眼鏡と裸眼を使い分けるのが面倒に感じる方</li>
          <li>装用中のうるおいを重視したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 加入度数(ADD)・カーブなどの詳細仕様は変更される場合があります。
          遠近両用レンズは見え方の感じ方に個人差が大きいため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 8. シードワンデーピュアうるおいプラス 乱視用
  // ------------------------------------------------------------------
  {
    id: "seed-ranshi-saiyasu",
    slug: "seed-ranshi-saiyasu",
    outputDir: "docs-seed-toric",
    siteName: "シードワンデーピュアうるおいプラス 乱視用 最安値価格情報",
    theme: { accent: "#C24E3A", gold: "#B8892B" }, // テラコッタ系(通常版のスカイブルーと見分けやすい配色)
    historyUnitKey: "box6", // 価格推移グラフで記録する比較単位（6箱が実勢価格でも最安のため）
    searchKeyword: "ワンデーピュアうるおいプラス 乱視用",
    metaDescription:
      "シードワンデーピュアうるおいプラス乱視用の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、6箱・4箱・2箱・1箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「6箱」「4箱」「2箱」「1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "シードワンデーピュアうるおいプラス 乱視用 6箱セット（192枚）",
    brandName: "SEED", // JSON-LD(構造化データ)のbrand.nameに使用（シード社製のため他商品と異なる）
    brand: "シード(国産)", // トップページのブランド別グルーピングに使用
    brandKey: "seed",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "SIB(国産独自素材)",
      water: 58, // 含水率(%)
      dk: 42.9, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "国産",
      type: "乱視用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "シードワンデーピュアうるおいプラス 乱視用", // トップページの商品カード・フッターで使う短い正式名称
    lensesPerBox: 32, // シードは1箱32枚入りのため、「1箱あたり」表示の基準を32枚にする

    /** 商品名が「シード ワンデーピュアうるおいプラス 乱視用」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(マルチフォーカル|遠近両用)/i.test(n)) return false;
      // 「プライムワンデー」(アイレ社)のように、比較訴求のため商品名に
      // 「ワンデーピュアうるおいプラス」という競合製品名を含めているだけの
      // 別ブランド商品を除外する
      if (/(プライムワンデー|アイレ|AIRE)/i.test(n)) return false;
      if (!/(乱視|トーリック|toric)/i.test(n)) return false;
      return /(ピュア|1?daypure)/i.test(n) && /うるおいプラス/.test(n);
    },

    units: [
      {
        key: "box6",
        label: "6箱(192枚)",
        totalLenses: 192,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 乱視用 6箱セット(192枚)",
        // 参考価格(6箱10,956円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 9500, max: 12500 },
        // 通常の検索キーワードのままだと、同じ価格帯にある「4箱セット」等の
        // 商品が多く、6箱セットが埋もれやすいため、検索キーワード自体を
        // 絞り込む。
        // 通常の検索キーワードのままだと、同じ価格帯にある「4箱セット」等の
        // 商品が多く、6箱セットが埋もれやすいため、検索キーワード自体を
        // 絞り込む。「ワンデー」を含めると「1dayPure」表記のみのショップが
        // 漏れてしまう一方、「うるおいプラス」だけだと2週間タイプ
        // (2weekPure)まで混ざってしまうため、「1day」を軸にしている
        // （「ワンデー」表記の商品にも大半"1day"表記が併記されているため、
        // 両方のショップを拾いやすい）。
        // 通常の検索キーワードのままだと、同じ価格帯にある「4箱セット」等の
        // 商品が多く、6箱セットが埋もれやすいため、検索キーワード自体を
        // 絞り込む。「ワンデー」を含めると「1dayPure」表記のみのショップが
        // 漏れてしまう一方、「うるおいプラス」だけだと2週間タイプ
        // (2weekPure)まで混ざってしまうため、「1dayPure」(続けて)を軸に
        // している（楽天の検索が「1dayPure」を1語として扱っている可能性が
        // あり、「1day」と分けて送ると一致しないことがあるため）。
        hintedKeyword: "1dayPure うるおいプラス 乱視用 6箱",
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /192枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box4",
        label: "4箱(128枚)",
        totalLenses: 128,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 乱視用 4箱セット(128枚)",
        // 参考価格(4箱7,449円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 6500, max: 8500 },
        introHtml: `    <h2 class="section-heading">4箱(単品)でも比較したい方へ</h2>
    <p>
      4箱セット(128枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 4) || /128枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(64枚)",
        totalLenses: 64,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 乱視用 2箱セット(64枚)",
        // 参考価格(2箱3,895円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 3200, max: 4700 },
        // 通常の検索キーワードのままだと、「32枚入り」とだけ書かれた箱数
        // 表記が曖昧な商品や、実際は1箱の商品が同じ価格帯に多く、本来の
        // 2箱商品が埋もれてしまうため、検索キーワード自体を絞り込む。
        hintedKeyword: "ワンデーピュアうるおいプラス 乱視用 2箱",
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(64枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱・4箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2) || /64枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box1",
        label: "1箱(32枚)",
        totalLenses: 32,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "シードワンデーピュアうるおいプラス 乱視用 1箱(32枚)",
        // 参考価格(1箱2,080円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 1700, max: 2600 },
        introHtml: `    <h2 class="section-heading">1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、1箱(32枚)の価格帯も
      別枠で掲載しています。<strong>6箱・4箱・2箱とは金額の単位が異なる</strong>
      ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(2箱|3箱|4箱|5箱|6箱|64枚|128枚|192枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">処方箋不要で購入できるショップを中心に比較しています</h2>
    <p>
      シードワンデーピュアうるおいプラス乱視用は、「処方箋の提示が不要」な
      ショップで取り扱われることが多い商品です。当サイトでは、商品名や説明文に
      「処方箋あり」「要処方箋」などと明記された商品はあらかじめ除外しており、
      <strong>処方箋不要で購入できるショップを中心に</strong>価格を比較しています。
    </p>
    <p>
      あわせて、購入する数量によって1枚あたりの単価が変わる点にも注目しています。
      1箱(32枚)だけの購入は単価が割高になりがちですが、<strong>6箱(192枚)</strong>は
      まとめ買い向けに価格設定しているショップが多く、1枚あたりの単価がもっとも
      下がりやすい傾向があります。そのため当サイトでは、6箱セットを中心に比較しつつ、
      4箱・2箱・1箱で見つかった場合も、それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 「処方箋不要」とは、購入時に処方箋の提示を求めないショップがある、という
      販売形態の説明であり、眼科での検査が不要という意味ではありません。
      コンタクトレンズは高度管理医療機器です。目の健康のため、定期的に眼科での
      検査を受けたうえでご購入・ご使用ください。
    </p>`,

    productInfoHeading: "シードワンデーピュアうるおいプラス乱視用とは",
    productInfoHtml: `        <p>
          シードワンデーピュアうるおいプラス乱視用は、国内の医療機器メーカーである
          株式会社シードが展開する、乱視矯正に対応した1日使い捨てタイプの
          コンタクトレンズです。フロントトーリックデザインを採用しており、
          やさしい装用感を保ちながら乱視矯正力を維持する設計とされています。
        </p>
        <h3>安定した見え方を支える設計</h3>
        <p>
          乱視用レンズは、瞬きのたびにレンズの向きがズレると視界がぼやけやすく
          なります。ダイナミックプリズムバラストという構造により、レンズの回転を
          抑え、安定した視力矯正力を維持しやすいよう工夫されています。
        </p>
        <h3>うるおいを意識した設計</h3>
        <p>
          「うるおいプラス」の名前の通り、装用中のうるおい感を意識したレンズ
          設計が特徴とされています。通常版と同様、1箱32枚入り(通常のワンデー
          レンズより2枚多い)で販売されています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乱視があり、見え方の安定感を重視したい方</li>
          <li>装用中のうるおいを重視したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
          <li>国内メーカーのレンズを使いたい方</li>
        </ul>
        <p class="note">
          ※ 度数・乱視軸・カーブなどの詳細仕様は変更される場合があります。
          乱視用レンズは度数だけでなく乱視軸の指定も必要なため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 9. メダリストワンデープラス
  // ------------------------------------------------------------------
  {
    id: "medalist-saiyasu",
    slug: "medalist-saiyasu",
    outputDir: "docs-medalist",
    siteName: "メダリストワンデープラス最安値価格情報",
    theme: { accent: "#B23A6B", gold: "#B8892B" }, // ラズベリー系(他8サイトと見分けやすい配色)
    historyUnitKey: "box2_90", // 価格推移グラフで記録する比較単位（90枚パック2箱が実勢価格でも最安のため）
    searchKeyword: "メダリストワンデープラス",
    metaDescription:
      "メダリストワンデープラスの楽天市場・Yahoo!ショッピングの価格を毎日チェックし、90枚パック2箱・90枚パック1箱・6箱・2箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「90枚パック2箱」「90枚パック1箱」「6箱」「2箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "メダリストワンデープラス 90枚パック2箱セット（180枚）",
    brandName: "Bausch + Lomb", // JSON-LD(構造化データ)のbrand.nameに使用（ボシュロム社製のため他商品と異なる）
    brand: "ボシュロム", // トップページのブランド別グルーピングに使用
    brandKey: "bausch",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "非イオン性素材",
      water: 59, // 含水率(%)
      dk: 24.4, // 酸素透過率(Dk/t)
      uv: false, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "メダリストワンデープラス", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「メダリストワンデープラス」（乱視用・マルチフォーカルではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(マルチフォーカル|遠近両用|乱視用|トーリック|toric)/i.test(n)) return false;
      return /メダリスト/.test(n) && /ワンデー/.test(n) && /プラス/.test(n);
    },

    units: [
      {
        key: "box2_90",
        label: "90枚パック2箱セット(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス 90枚パック(マキシ)2箱セット(180枚)",
        // 参考価格(90枚パック2箱5,707円)をもとに、価格帯を直接指定して追加取得する。
        // 標準箱の6箱(180枚)と実勢価格がほぼ同額のため、価格帯だけでは
        // 区別できず、検索キーワード自体も絞り込んでいる。
        priceHint: { min: 4800, max: 6800 },
        hintedKeyword: "メダリストワンデープラス マキシボックス 2箱",
        introHtml: "",
        /** 「90枚パック(マキシ)を2箱」らしきものだけを判定する。
         *  「90枚パック」「90枚入」は、他商品の説明文中に参考情報として
         *  登場することがあり、判定基準に使うと誤爆するため対象外にした。 */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/マキシ/.test(n)) {
            const mentions1Box = /1箱/.test(n) && !/2箱/.test(n);
            if (mentions1Box) return false;
            if (/180枚/.test(n)) return true;
            const has2Box =
              /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
            return has2Box;
          }
          return false;
        },
      },
      {
        key: "box6",
        label: "6箱(標準サイズ・180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス 6箱セット(標準サイズ・180枚)",
        // 参考価格(6箱5,706円)をもとに、価格帯を直接指定して追加取得する。
        // 90枚パック2箱と実勢価格がほぼ同額のため、検索キーワード自体も
        // 絞り込んでいる。
        priceHint: { min: 4800, max: 6800 },
        hintedKeyword: "メダリストワンデープラス 6箱",
        introHtml: `    <h2 class="section-heading">標準サイズ(30枚入り)の6箱でも比較したい方へ</h2>
    <p>
      90枚パックとは別に、標準サイズ(30枚入り)を6箱で販売しているショップも
      見つかった場合は、こちらに別枠で掲載しています。<strong>90枚パックとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚パック系(box2_90/box1_90)との混同を防ぐため、「マキシ」を含む商品は除外する。
        // 「90枚パック」「90枚入」は、この商品のように参考情報として括弧内に
        // 書かれているだけのケースがあり、除外条件に使うと誤爆するため対象外にした。
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/マキシ/.test(n)) return false;
          return isBoxCount(n, 6) || /180枚/.test(n);
        },
      },
      {
        key: "box1_90",
        label: "90枚パック1箱(90枚)",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス 90枚パック(マキシ)1箱(90枚)",
        // 参考価格(90枚パック1箱3,840円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 3200, max: 4600 },
        hintedKeyword: "メダリストワンデープラス マキシボックス",
        introHtml: `    <h2 class="section-heading">90枚パック(マキシ)1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、90枚パック(マキシ)1箱(単品)の
      価格帯も別枠で掲載しています。<strong>2箱セットとは金額の単位が異なる</strong>
      ため、混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        /** 「90枚パック(マキシ)を1箱」らしきものだけを判定する（2箱以上を示す表記は除外）。
         *  「90枚パック」「90枚入」は、他商品の説明文中に参考情報として
         *  登場することがあり、判定基準に使うと誤爆するため対象外にした。 */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (!/マキシ/.test(n)) return false;
          if (/180枚/.test(n)) return false;
          if (/(2箱|3箱|4箱|5箱|6箱|×2|ｘ2|x2)/i.test(n)) return false;
          return true;
        },
      },
      {
        key: "box2",
        label: "2箱(標準サイズ・60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス 2箱セット(標準サイズ・60枚)",
        // 参考価格(2箱2,260円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 1800, max: 2800 },
        hintedKeyword: "メダリストワンデープラス 2箱",
        introHtml: `    <h2 class="section-heading">標準サイズ(30枚入り)の2箱でも比較したい方へ</h2>
    <p>
      90枚パックとは別に、標準サイズ(30枚入り)を2箱で販売しているショップも
      見つかった場合は、こちらに別枠で掲載しています。<strong>90枚パックとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚パック系との混同を防ぐため、「マキシ」を含む商品は除外する。
        // 「90枚パック」「90枚入」は参考情報として括弧内に書かれているだけの
        // ケースがあり、除外条件に使うと誤爆するため対象外にした。
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/マキシ/.test(n)) return false;
          if (/(3箱|4箱|5箱|6箱)/.test(n)) return false;
          return isBoxCount(n, 2) || /60枚/.test(n);
        },
      },
    ],

    productIntroHtml: `  <div class="value-explainer" aria-label="90枚パック最安値について">
    <h2 class="section-heading">90枚パック(マキシ)最安値を中心に比較しています</h2>
    <p>
      メダリストワンデープラスは、標準サイズ(30枚入り)を何箱まとめて購入するかや、
      まとめ買い向けの90枚パック(通称「マキシ」)を選ぶかによって、1枚あたりの
      単価が変わります。当サイトでは、実勢価格でもっとも下がりやすい傾向のある
      <strong>90枚パック2箱セット(180枚)</strong>を中心に比較しつつ、90枚パック
      1箱・標準サイズの6箱・2箱で見つかった場合も、それぞれ別枠であわせて
      掲載しています。
    </p>
    <p class="note">
      ※ 販売単位や内容量は、時期やショップにより変更・終了している場合があります。
      ご購入前に各販売店の商品ページで最新の内容量・価格をご確認ください。
    </p>
  </div>

  <div class="value-explainer" aria-label="メダリストワンデープラスが安い理由とメリット">
    <h2 class="section-heading">メダリストワンデープラスが安い理由</h2>
    <p>
      メダリストワンデープラスは、他の1日使い捨てレンズと比べて比較的安く
      手に入りやすい商品です。理由としては、主に4つが挙げられます。
    </p>
    <p>
      1つ目は、<strong>発売から長く展開されている定番モデル</strong>であることです。
      長期間にわたって安定して生産されてきたことで生産ラインが確立しており、
      大量生産による製造コストの削減が実現しやすくなっているとされています。
    </p>
    <p>
      2つ目は、<strong>レンズ素材</strong>にあります。近年主流のシリコーンハイドロゲル
      素材ではなく、従来から使われてきた含水性の素材(HEMA系)を採用しているため、
      最新素材を使う高価格帯モデルと比べて製造コストを抑えやすい構造になっている
      とされています。
    </p>
    <p>
      3つ目は、<strong>海外生産</strong>です。製造拠点が海外にあることで、
      人件費や設備コストを抑えやすくなっているとされています。
    </p>
    <p>
      4つ目は、<strong>流通のシンプルさ</strong>です。実店舗中心の販売ではなく
      ネット通販を中心に展開しているショップが多いため、店舗運営や中間流通に
      かかるコストを抑えやすい構造になっているとされています。
    </p>
    <p class="note">
      ※ 素材が違う分、装用感などの特徴も異なります。安いからといって
      品質面で劣るわけではありませんが、ご自身の目に合うかどうかは
      個人差があるため、購入前に眼科でのご相談をおすすめします。
    </p>
    <h3>価格が手頃だからこそのメリット</h3>
    <p>
      こうした理由で価格が抑えられていることは、使う側にとって複数の
      メリットにつながります。<strong>まとめ買いしやすい</strong>ことが
      挙げられます。1枚あたりの単価が抑えられている分、90枚パックや
      6箱セットのようなまとめ買いをしても、総額の負担を抑えやすくなります。
    </p>
    <p>
      1日使い捨てレンズは消耗品のため、日々の使用が積み重なるほど価格差が
      総額に響いてきます。定番のメダリストワンデープラスは、<strong>継続的な
      コストを抑えやすい</strong>選択肢と言えます。また、1箱単位の価格が
      手頃なため、<strong>初めての方でも少量から試しやすい</strong>点も
      ポイントです。
    </p>
  </div>`,

    productInfoHeading: "メダリストワンデープラスとは",
    productInfoHtml: `        <p>
          メダリストワンデープラスは、ボシュロムが展開する1日使い捨てタイプの
          コンタクトレンズです。「メダリスト」シリーズは長年展開されている
          定番ブランドで、多くのユーザーに使われてきた実績があります。
        </p>
        <h3>手に取りやすい価格帯</h3>
        <p>
          検索されている件数・取り扱いショップ数がともに多い商品のため、
          価格競争が起きやすく、まとめ買い向けの90枚パック(マキシ)も
          用意されているのが特徴です。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>コストを抑えつつ定番ブランドを使いたい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
          <li>取り扱いショップが多い商品で安心して選びたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブなどの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。コンタクトレンズは高度管理医療機器のため、
          眼科での検査・処方をふまえたうえでのご購入・ご使用をおすすめします。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 10. メダリストワンデープラス乱視用
  // ------------------------------------------------------------------
  {
    id: "medalist-ranshi-saiyasu",
    slug: "medalist-ranshi-saiyasu",
    outputDir: "docs-medalist-toric",
    siteName: "メダリストワンデープラス乱視用最安値価格情報",
    theme: { accent: "#7A5C2E", gold: "#B8892B" }, // ブロンズ系(他9サイトと見分けやすい配色)
    historyUnitKey: "box6", // 価格推移グラフで記録する比較単位（6箱が実勢価格でも最安のため）
    searchKeyword: "メダリストワンデープラス 乱視用",
    metaDescription:
      "メダリストワンデープラス乱視用の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、6箱・4箱・2箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「6箱」「4箱」「2箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "メダリストワンデープラス乱視用 6箱セット（180枚）",
    brandName: "Bausch + Lomb", // JSON-LD(構造化データ)のbrand.nameに使用（ボシュロム社製のため他商品と異なる）
    brand: "ボシュロム", // トップページのブランド別グルーピングに使用
    brandKey: "bausch",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "非イオン性素材",
      water: 59, // 含水率(%)
      dk: 17.6, // 酸素透過率(Dk/t)
      uv: false, // UVカットの有無
      origin: "海外",
      type: "乱視用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "メダリストワンデープラス 乱視用", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「メダリストワンデープラス乱視用」（マルチフォーカルではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(マルチフォーカル|遠近両用)/i.test(n)) return false;
      if (!/(乱視|トーリック|toric)/i.test(n)) return false;
      return /メダリスト/.test(n) && /ワンデー/.test(n) && /プラス/.test(n);
    },

    units: [
      {
        key: "box6",
        label: "6箱(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス乱視用 6箱セット(180枚)",
        // 参考価格(6箱11,580円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 10000, max: 13000 },
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /180枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box4",
        label: "4箱(120枚)",
        totalLenses: 120,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス乱視用 4箱セット(120枚)",
        // 参考価格(4箱8,190円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 7000, max: 9500 },
        introHtml: `    <h2 class="section-heading">4箱(単品)でも比較したい方へ</h2>
    <p>
      4箱セット(120枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 4) || /120枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "メダリストワンデープラス乱視用 2箱セット(60枚)",
        // 参考価格(2箱4,350円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 3600, max: 5200 },
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(60枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱・4箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2) || /60枚/.test(name.replace(/\s/g, ""));
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">6箱(180枚)あたりの価格を中心に比較しています</h2>
    <p>
      メダリストワンデープラス乱視用は、標準の30枚入り(1箱)を何箱まとめて
      購入するかによって、1枚あたりの単価が変わります。2箱・4箱だけの購入では、
      送料や販売手数料の比率が高く、単価が割高になりがちです。
    </p>
    <p>
      一方で、<strong>6箱(180枚・約6ヶ月分)</strong>は、まとめ買い向けに
      価格設定しているショップが多く、1枚あたりの単価がもっとも下がりやすい
      傾向があります。そのため当サイトでは、6箱(180枚)あたりの実勢価格を
      中心に比較しつつ、4箱・2箱で見つかった場合も、それぞれ別枠で
      あわせて掲載しています。
    </p>
    <p class="note">
      ※ 販売単位や内容量は、時期やショップにより変更・終了している場合があります。
      ご購入前に各販売店の商品ページで最新の内容量・価格をご確認ください。
    </p>`,

    productInfoHeading: "メダリストワンデープラス乱視用とは",
    productInfoHtml: `        <p>
          メダリストワンデープラス乱視用は、ボシュロムが展開する1日使い捨てタイプの
          コンタクトレンズで、乱視矯正に対応したラインナップです。「HDオプティクス」
          という非球面レンズデザインを採用し、輪郭や細部までシャープな見え方を
          目指した設計とされています。
        </p>
        <h3>乱視用ならではの安定した見え方</h3>
        <p>
          乱視用レンズは、瞬きのたびにレンズの向きがズレると視界がぼやけやすく
          なります。レンズの形をしっかり保つ設計により、裏表も分かりやすく、
          毎日のつけはずしがしやすいよう工夫されているとされています。
        </p>
        <h3>手に取りやすい価格帯</h3>
        <p>
          定番ブランドとして長く展開されている商品のため、他の乱視用1日使い捨て
          レンズと比べても、比較的購入しやすい価格帯で販売されている傾向があります。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乱視があり、見え方の安定感を重視したい方</li>
          <li>コストを抑えつつ定番ブランドを使いたい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・乱視軸・カーブなどの詳細仕様は変更される場合があります。
          乱視用レンズは度数だけでなく乱視軸の指定も必要なため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 11. プロクリアワンデー マルチフォーカル(遠近両用)
  // ------------------------------------------------------------------
  {
    id: "proclear-multifocal-saiyasu",
    slug: "proclear-multifocal-saiyasu",
    outputDir: "docs-proclear-multifocal",
    siteName: "プロクリアワンデー マルチフォーカル(遠近両用)最安値通販価格情報",
    theme: { accent: "#1F6FB2", gold: "#B8892B" }, // ブライトブルー系(他11サイトと見分けやすい配色)
    historyUnitKey: "box2", // 価格推移グラフで記録する比較単位（2箱が参考価格上もっとも安いため）
    searchKeyword: "プロクリアワンデー マルチフォーカル",
    metaDescription:
      "プロクリアワンデー マルチフォーカル(遠近両用)の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、6箱・4箱・2箱・1箱それぞれの最安値トップ3を掲載しています。",
    subtitle:
      "「6箱」「4箱」「2箱」「1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、それぞれのショップ別最安値トップ3を掲載しています。",
    productSchemaName: "プロクリアワンデー マルチフォーカル(遠近両用) 6箱セット（180枚）",
    brandName: "Proclear", // JSON-LD(構造化データ)のbrand.nameに使用（クーパービジョン社製のため他商品と異なる）
    brand: "クーパービジョン", // トップページのブランド別グルーピングに使用
    brandKey: "coopervision",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "omafilcon A",
      water: 60, // 含水率(%)
      dk: 22.8, // 酸素透過率(Dk/t)
      uv: false, // UVカットの有無
      origin: "海外",
      type: "遠近両用", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "プロクリアワンデー マルチフォーカル(遠近両用)", // トップページの商品カード・フッターで使う短い正式名称
    // 処方箋不要ショップのセクションがある分、ページが長くなりすぎないよう
    // 楽天/Yahoo!ランキングは各ベスト3に絞る（通常版プロクリアと同じ方針）
    rankingTopN: 3,

    // 「処方箋不要」を明言している専門ショップ（通常版プロクリアと同じ2ショップ）。
    // レンズモードは、この商品では6箱セットの取り扱いが無いため、
    // 1/2/4箱のみ設定している（設定が無い箱数はカード上で「該当ありません」
    // と自動表示される）。
    rxFreeShops: {
      quantities: [1, 2, 4, 6],
      shops: [
        {
          name: "レンズモード",
          // 送料: 300円×箱数（最低1,000円）
          shippingFor: (boxes) => Math.max(300 * boxes, 1000),
          // JavaScriptで価格を表示する作りのため自動取得ができない。
          // 商品価格は固定値（staticPrice）で運用し、運営者が定期的に
          // （目安2週間ごと）手動で最新価格に更新する方針とする。
          pages: {
            1: {
              staticPrice: 2780,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1P%2F",
            },
            2: {
              staticPrice: 5556,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1P%212%2F",
            },
            4: {
              staticPrice: 11100,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FCP1P%214%2F",
            },
            // 6箱セットの取り扱いが無いため設定なし
          },
        },
        {
          name: "レンズラボ",
          // 送料: 全国一律700円
          shippingFor: () => 700,
          pages: {
            1: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0101-1",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0101-1",
            },
            2: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0101-2",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0101-2",
            },
            4: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0101-4",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0101-4",
            },
            6: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0101-6",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0101-6",
            },
          },
        },
      ],
    },

    /** 商品名が「プロクリアワンデー マルチフォーカル(遠近両用)」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(乱視用|トーリック|toric)/i.test(n)) return false;
      if (!/(マルチフォーカル|遠近両用)/i.test(n)) return false;
      return /プロクリア/.test(n);
    },

    // この商品には90枚パックの設定が無く、標準サイズ(30枚入り)の
    // 1/2/4/6箱のみで展開されている（通常版プロクリアとは構成が異なる）。
    units: [
      {
        key: "box6",
        label: "6箱(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー マルチフォーカル 6箱セット(180枚)",
        // 参考価格(6箱14,760円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 12000, max: 18000 },
        // 「4箱」等の商品に埋もれやすいため、「6箱」を含む検索キーワードに絞り込む
        hintedKeyword: "プロクリアワンデー マルチフォーカル 6箱",
        introHtml: "",
        matches(name) {
          return isBoxCount(name, 6) || /180枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box4",
        label: "4箱(120枚)",
        totalLenses: 120,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー マルチフォーカル 4箱セット(120枚)",
        // 参考価格(4箱9,860円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 8000, max: 12000 },
        introHtml: `    <h2 class="section-heading">4箱(単品)でも比較したい方へ</h2>
    <p>
      4箱セット(120枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 4) || /120枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box2",
        label: "2箱(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー マルチフォーカル 2箱セット(60枚)",
        // 参考価格(2箱4,900円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 4000, max: 6200 },
        introHtml: `    <h2 class="section-heading">2箱(単品)でも比較したい方へ</h2>
    <p>
      2箱セット(60枚)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>6箱・4箱とは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          return isBoxCount(name, 2) || /60枚/.test(name.replace(/\s/g, ""));
        },
      },
      {
        key: "box1",
        label: "1箱(30枚)",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プロクリアワンデー マルチフォーカル 1箱(30枚)",
        // 参考価格(1箱2,590円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2000, max: 3500 },
        introHtml: `    <h2 class="section-heading">1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、1箱(30枚)の価格帯も
      別枠で掲載しています。<strong>6箱・4箱・2箱とは金額の単位が異なる</strong>
      ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(2箱|3箱|4箱|5箱|6箱|60枚|120枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">処方箋不要で購入できるショップを中心に比較しています</h2>
    <p>
      プロクリアワンデー マルチフォーカル(遠近両用)は、コンタクトレンズの中でも
      「処方箋の提示が必要」なショップで取り扱われることが多い商品です。
      当サイトでは、商品名や説明文に「処方箋あり」「処方箋必要」などと明記された
      商品はあらかじめ除外していて、処方箋不要で購入できるショップを中心に
      価格を比較しています。
    </p>
    <p>
      楽天・Yahooで扱っているお店は処方箋が必要です。でも店頭で購入するよりは
      安いので処方箋を用意できる方は、ぜひ利用したいですね！
      処方箋が不要というと一般激安サイトで手にすることになりますが、安いサイトも
      ありますので、参考にしてくださいね。掲載金額はもちろん送料無料（又は込み）です。
    </p>
    <p>
      あわせて、購入する数量によって1枚あたりの単価が変わる点にも注目しています。
      1箱(30枚)だけの購入は単価が割高になりがちですが、<strong>6箱(180枚)</strong>は
      まとめ買い向けに価格設定しているショップが多く、1枚あたりの単価がもっとも
      下がりやすい傾向があります。そのため当サイトでは、6箱セットを中心に比較しつつ、
      4箱・2箱・1箱の場合も、それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 「処方箋不要」とは、購入時に処方箋の提示を求めないショップがある、という
      販売形態の説明であり、眼科での検査が不要という意味ではありません。
      コンタクトレンズは高度管理医療機器です。目の健康のため、定期的に眼科での
      検査を受けたうえでご購入・ご使用くださいね。
    </p>
    <p style="text-align:center; font-weight:700; color:var(--teal); margin-top:16px;">
      瞳を美しく維持するためにも…..
    </p>`,

    productInfoHeading: "プロクリアワンデー マルチフォーカル(遠近両用)とは",
    productInfoHtml: `        <p>
          プロクリアワンデー マルチフォーカル(遠近両用)は、クーパービジョン社が
          展開する、遠近両用に対応した1日使い捨てタイプのコンタクトレンズです。
          通常版と同じ独自素材「オマフィルコンA」を採用し、うるおい成分「MPC」を
          レンズに配合しているのが特徴とされています。
        </p>
        <h3>ナチュラル サメーション テクノロジー デザイン</h3>
        <p>
          レンズの中心から外側に向かって度数がなだらかに変化する設計により、
          近くから遠くまでピントを合わせやすいよう工夫されています。まばたきや
          視線移動の際の違和感を抑え、自然な見え方を目指した設計とされています。
          ADD(加入度数)は+1.50のみの展開です。
        </p>
        <h3>うるおいを保つ設計</h3>
        <p>
          通常版と同様、MPCという保水成分により、レンズ内の水分が減少しにくく、
          装用中のうるおいが続きやすいとされています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>近くも遠くも見えづらさを感じ始めた方</li>
          <li>老眼鏡と裸眼を使い分けるのが面倒に感じる方</li>
          <li>装用中のうるおいを重視したい方</li>
          <li>まとめ買いでコストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・ADD(加入度数)・カーブなどの詳細仕様は変更される場合があります。
          遠近両用レンズは見え方の感じ方に個人差が大きいため、
          ご購入前に必ず眼科での検査・処方をふまえてご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 12. デイリーズアクティブ
  // ------------------------------------------------------------------
  {
    id: "dailies-active-saiyasu",
    slug: "dailies-active-saiyasu",
    outputDir: "docs-dailies-active",
    siteName: "デイリーズアクティブ最安値通販価格情報",
    theme: { accent: "#E0522F", gold: "#B8892B" }, // コーラルレッド系(他12サイトと見分けやすい配色)
    historyUnitKey: "pack100x2", // 価格推移グラフで記録する比較単位（100枚×2箱が実勢価格でも最安のため）
    searchKeyword: "デイリーズアクティブ",
    metaDescription:
      "デイリーズアクティブ(旧デイリーズアクアコンフォートプラスの後継品)の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、35枚1箱・35枚2箱・100枚パック1箱・100枚パック2箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「100枚パック2箱」「100枚パック1箱」「35枚2箱」「35枚1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "デイリーズアクティブ 100枚パック×2箱セット（200枚）",
    brandName: "Alcon", // JSON-LD(構造化データ)のbrand.nameに使用（アルコン社製のため他商品と異なる）
    // 楽天ランキング1位が並行輸入品(デイリーズプライム名義)になることが
    // あり、その場合パッケージ画像も実際の商品と異なってしまうため、
    // 正規品の商品画像を固定で指定している
    productInfoImageOverride:
      "https://www.opt-blanc.com/wp-content/uploads/2022/04/eyecatching_dailies-active-100_220427.jpg",
    brand: "アルコン", // トップページのブランド別グルーピングに使用
    brandKey: "alcon",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "PVA",
      water: 69, // 含水率(%)
      dk: 26, // 酸素透過率(Dk/t)
      uv: false, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "デイリーズアクティブ", // トップページの商品カード・フッターで使う短い正式名称

    /** 商品名が「デイリーズアクティブ」（トータルワン・プレシジョンワン等の別ラインではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(トータルワン|トータル1|プレシジョンワン|プレシジョン1)/i.test(n)) return false;
      if (/(マルチフォーカル|遠近両用|乱視用|トーリック|toric)/i.test(n)) return false;
      if (!/デイリーズ/.test(n)) return false;
      // 後継品化の経緯により「デイリーズアクティブ」と「デイリーズアクアコンフォートプラス」
      // (旧名称)のどちらの表記の商品も、同一商品として扱う
      return /(アクティブ|アクアコンフォートプラス|アクアコンフォート)/.test(n);
    },

    // 「35枚入り」と「100枚パック」で内容量(1箱あたりの枚数)が異なる点に注意。
    // それぞれの箱数(1箱/2箱)とあわせて、計4つの比較単位を設定する。
    units: [
      {
        key: "pack100x2",
        label: "100枚パック2箱セット(200枚)",
        totalLenses: 200,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "デイリーズアクティブ 100枚パック×2箱セット(200枚)",
        // 参考価格(100枚パック2箱6,190円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 5000, max: 7800 },
        hintedKeyword: "デイリーズアクティブ 100枚 2箱",
        introHtml: "",
        /** 「100枚パックを2箱」らしきものだけを判定する */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/200枚/.test(n)) return true;
          const has100 = /100枚/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|100.{0,4}×2|100.{0,4}x2|100.{0,4}ｘ2)/i.test(n);
          const mentions1BoxOnly = /1箱/.test(n) && !has2Box;
          if (mentions1BoxOnly) return false;
          return has100 && has2Box;
        },
      },
      {
        key: "pack100x1",
        label: "100枚パック1箱",
        totalLenses: 100,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "デイリーズアクティブ 100枚パック1箱",
        // 参考価格(100枚パック1箱3,580円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2900, max: 4500 },
        hintedKeyword: "デイリーズアクティブ 100枚パック",
        introHtml: `    <h2 class="section-heading">100枚パック(単品)でも比較したい方へ</h2>
    <p>
      100枚パックを1箱(単品)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>2箱セットとは金額の単位が異なる</strong>
      ため、混同しないようご注意ください(こちらは100枚1箱分の価格です)。
    </p>`,
        /** 「100枚パックを1箱」らしきものだけを判定する（2箱を示す表記は除外） */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (!/100枚/.test(n)) return false;
          if (/200枚/.test(n)) return false;
          if (/(2箱|3箱|4箱|5箱|6箱|×2|ｘ2|x2)/i.test(n)) return false;
          return true;
        },
      },
      {
        key: "box2",
        label: "35枚入り2箱セット(70枚)",
        totalLenses: 70,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "デイリーズアクティブ 35枚入り×2箱セット(70枚)",
        // 参考価格(2箱3,230円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2600, max: 4000 },
        introHtml: `    <h2 class="section-heading">35枚入り2箱でも比較したい方へ</h2>
    <p>
      100枚パックとは別に、標準サイズ(35枚入り)を2箱で販売しているショップも
      見つかった場合は、こちらに別枠で掲載しています。<strong>100枚パックとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 100枚パック系との混同を防ぐため、「100」を含む商品は除外する
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/100枚/.test(n)) return false;
          if (/(3箱|4箱|5箱|6箱)/.test(n)) return false;
          return isBoxCount(n, 2) || /70枚/.test(n);
        },
      },
      {
        key: "box1",
        label: "35枚入り1箱",
        totalLenses: 35,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "デイリーズアクティブ 35枚入り1箱",
        // 参考価格(1箱1,860円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 1500, max: 2400 },
        introHtml: `    <h2 class="section-heading">35枚入り1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、標準サイズ(35枚入り)1箱の
      価格帯も別枠で掲載しています。<strong>100枚パック・2箱セットとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 100枚パック系・他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(100枚|2箱|3箱|4箱|5箱|6箱|70枚|200枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">アクアコンフォートプラスの後継品として、100枚パックがお得です</h2>
    <p>
      デイリーズアクティブは、2024年9月末で販売終了となった「デイリーズ
      アクアコンフォートプラス」の後継品です。レンズの素材・設計は旧製品と
      同じまま、<strong>1箱あたりの枚数が増量</strong>されて生まれ変わりました
      (旧製品の30枚入り→35枚入り、90枚入り→100枚入りへ)。
      「アクアコンフォートプラスを使っていたけれど、今の商品名が分からず
      探していた」という方も、この商品で問題ありません。
    </p>
    <p>
      当サイトでは、なかでも<strong>100枚パック(1箱)</strong>という、まとめ買いに
      特化した大容量サイズに注目しています。1枚あたりの単価がもっとも下がり
      やすいのは、この100枚パックを2箱まとめて購入した場合です。そのため
      当サイトでは、100枚パック2箱セットを中心に比較しつつ、100枚パック1箱・
      標準サイズ(35枚入り)の2箱・1箱で見つかった場合も、それぞれ別枠であわせて
      掲載しています。
    </p>
    <p class="note">
      ※ 販売単位や内容量は、時期やショップにより変更・終了している場合があります。
      ご購入前に各販売店の商品ページで最新の内容量・価格をご確認ください。
    </p>`,

    productInfoHeading: "デイリーズアクティブとは",
    productInfoHtml: `        <p>
          デイリーズアクティブは、日本アルコンが展開する1日使い捨てタイプの
          コンタクトレンズです。2024年9月末に販売終了となった「デイリーズ
          アクアコンフォートプラス」の後継品として、同じ規格・同じ素材の
          レンズを、より多い枚数のパッケージ(35枚入り・100枚パック)で
          引き継いでいます。
        </p>
        <h3>うるおいを支えるトリプルモイスチャーテクノロジー</h3>
        <p>
          レンズの約70%を占める水分に加え、保存液中にもうるおい成分を
          配合した「トリプルモイスチャーテクノロジー」により、装用中の
          うるおいをサポートする設計とされています。
        </p>
        <h3>汚れにくい非イオン性素材</h3>
        <p>
          メイク汚れやほこり、花粉など、レンズ表面は汚れやすい環境に
          さらされます。非イオン性の素材により、汚れが付着しにくく、
          クリアな視界を保ちやすいとされています。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>これまでアクアコンフォートプラスを使っていた方</li>
          <li>装用中のうるおいを重視したい方</li>
          <li>100枚パックでまとめ買いし、コストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブなどの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。コンタクトレンズは高度管理医療機器のため、
          眼科での検査・処方をふまえたうえでのご購入・ご使用をおすすめします。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 13. プレシジョンワン
  // ------------------------------------------------------------------
  {
    id: "precision1-saiyasu",
    slug: "precision1-saiyasu",
    outputDir: "docs-precision1",
    siteName: "プレシジョンワン最安値通販価格情報",
    theme: { accent: "#3F6C9E", gold: "#B8892B" }, // デニムブルー系(他13サイトと見分けやすい配色)
    historyUnitKey: "pack90x2", // 価格推移グラフで記録する比較単位（90枚バリューパック2箱が実勢価格でも最安のため）
    searchKeyword: "プレシジョンワン",
    metaDescription:
      "プレシジョンワンの楽天市場・Yahoo!ショッピングの価格を毎日チェックし、30枚1箱・30枚2箱・90枚バリューパック1箱・90枚バリューパック2箱それぞれの最安値トップ5を掲載しています。",
    subtitle:
      "「90枚バリューパック2箱」「90枚バリューパック1箱」「30枚2箱」「30枚1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ5を掲載しています。",
    productSchemaName: "プレシジョンワン 90枚バリューパック×2箱セット（180枚）",
    brandName: "Alcon", // JSON-LD(構造化データ)のbrand.nameに使用（アルコン社製のため他商品と異なる）
    brand: "アルコン", // トップページのブランド別グルーピングに使用
    brandKey: "alcon",
    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "verofilcon A(シリコーンハイドロゲル)",
      water: 51, // 含水率(%)
      dk: 100, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "標準（近視）", // 標準（近視）/乱視用/遠近両用
    },
    shortName: "プレシジョンワン", // トップページの商品カード・フッターで使う短い正式名称
    // 処方箋不要ショップのセクションを新設した分、ページが長くなりすぎない
    // よう、楽天/Yahoo!ランキングは各ベスト3に絞る
    rankingTopN: 3,

    // 「処方箋不要」を明言している専門ショップ(プロクリア等と同じ2ショップ)。
    rxFreeShops: {
      quantities: [1, 2, 4, 6],
      shops: [
        {
          name: "レンズモード",
          // 送料: 300円×箱数（最低1,000円）
          shippingFor: (boxes) => Math.max(300 * boxes, 1000),
          // JavaScriptで価格を表示する作りのため自動取得ができない。
          // 商品価格は固定値（staticPrice）で運用し、運営者が定期的に
          // （目安2週間ごと）手動で最新価格に更新する方針とする。
          pages: {
            1: {
              staticPrice: 2880,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O%2F",
            },
            2: {
              staticPrice: 5756,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O%212%2F",
            },
            4: {
              staticPrice: 11500,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O%214%2F",
            },
            6: {
              staticPrice: 17244,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O%216%2F",
            },
          },
        },
        {
          name: "レンズラボ",
          // 送料: 全国一律700円
          shippingFor: () => 700,
          pages: {
            1: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0128-1",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0128-1",
            },
            2: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0128-2",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0128-2",
            },
            4: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0128-4",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0128-4",
            },
            6: {
              scrapeUrl: "https://www.lens-labo.com/item/detail?itemcd=L0128-6",
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZH1FY+BRCL9U+3SZ4+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lens-labo.com%2Fitem%2Fdetail%3Fitemcd%3DL0128-6",
            },
          },
        },
        {
          name: "レンズゼロ",
          // 送料無料（商品ページに明記）
          shippingFor: () => 0,
          // レンズモードと同じグループのサイトのためかJavaScriptで価格を
          // 表示する作りで自動取得ができない。商品価格は固定値
          // （staticPrice）で運用し、運営者が定期的に（目安2週間ごと）
          // 手動で最新価格に更新する方針とする。
          pages: {
            1: {
              staticPrice: 3320,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZU4AP+2ZSUNM+76W+TR13N&a8ejpredirect=https%3A%2F%2Fwww.lenszero.com%2Fgoods%2Findex%2Fgc%2FC1O%2F",
            },
            2: {
              staticPrice: 6400,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZU4AP+2ZSUNM+76W+TR13N&a8ejpredirect=https%3A%2F%2Fwww.lenszero.com%2Fgoods%2Findex%2Fgc%2FC1O%212%2F",
            },
            4: {
              staticPrice: 12740,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZU4AP+2ZSUNM+76W+TR13N&a8ejpredirect=https%3A%2F%2Fwww.lenszero.com%2Fgoods%2Findex%2Fgc%2FC1O%214%2F",
            },
            6: {
              staticPrice: 19080,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=2ZU4AP+2ZSUNM+76W+TR13N&a8ejpredirect=https%3A%2F%2Fwww.lenszero.com%2Fgoods%2Findex%2Fgc%2FC1O%216%2F",
            },
          },
        },
      ],
    },

    /** 商品名が「プレシジョンワン」（トータルワン等の別ラインではない）であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      if (/(マルチフォーカル|遠近両用|乱視用|トーリック|toric)/i.test(n)) return false;
      // 「プレシジョン」だけだと、包丁・タイムカード等の無関係商品まで
      // 誤って拾ってしまうため、「プレシジョンワン」と続けて書かれている
      // 場合のみ該当とする(ローマ字表記のPRECISION1にも対応)
      return /プレシジョンワン/.test(n) || /precision1/i.test(n);
    },

    // 標準サイズ(30枚入り)とバリューパック(90枚入り)で内容量(1箱あたりの
    // 枚数)が異なる点に注意。それぞれの箱数(1箱/2箱)とあわせて、
    // 計4つの比較単位を設定する。
    units: [
      {
        key: "pack90x2",
        label: "90枚バリューパック2箱セット(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 90枚バリューパック×2箱セット(180枚)",
        // 参考価格(90枚バリューパック2箱14,260円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 11500, max: 17500 },
        hintedKeyword: "プレシジョンワン バリューパック 90枚 2箱",
        introHtml: "",
        /** 「90枚バリューパックを2箱」らしきものだけを判定する */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/180枚/.test(n)) return true;
          const has90 = /90枚/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
          const mentions1BoxOnly = /1箱/.test(n) && !has2Box;
          if (mentions1BoxOnly) return false;
          return has90 && has2Box;
        },
      },
      {
        key: "pack90x1",
        label: "90枚バリューパック1箱",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 90枚バリューパック1箱",
        // 参考価格(90枚バリューパック1箱7,880円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 6300, max: 9800 },
        hintedKeyword: "プレシジョンワン バリューパック",
        introHtml: `    <h2 class="section-heading">90枚バリューパック(単品)でも比較したい方へ</h2>
    <p>
      90枚バリューパックを1箱(単品)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>2箱セットとは金額の単位が異なる</strong>
      ため、混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        /** 「90枚バリューパックを1箱」らしきものだけを判定する（2箱を示す表記は除外） */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (!/90枚/.test(n)) return false;
          if (/180枚/.test(n)) return false;
          if (/(2箱|3箱|4箱|5箱|6箱|×2|ｘ2|x2)/i.test(n)) return false;
          return true;
        },
      },
      {
        key: "box2",
        label: "30枚入り2箱セット(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 30枚入り×2箱セット(60枚)",
        // 参考価格(2箱5,649円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 4500, max: 7000 },
        introHtml: `    <h2 class="section-heading">30枚入り2箱でも比較したい方へ</h2>
    <p>
      90枚バリューパックとは別に、標準サイズ(30枚入り)を2箱で販売している
      ショップも見つかった場合は、こちらに別枠で掲載しています。
      <strong>90枚バリューパックとは金額の単位が異なる</strong>ため、
      比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚バリューパック系との混同を防ぐため、「90枚」を含む商品は除外する
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/90枚/.test(n)) return false;
          if (/(3箱|4箱|5箱|6箱)/.test(n)) return false;
          return isBoxCount(n, 2) || /60枚/.test(n);
        },
      },
      {
        key: "box1",
        label: "30枚入り1箱",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 30枚入り1箱",
        // 参考価格(1箱3,000円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2400, max: 3800 },
        introHtml: `    <h2 class="section-heading">30枚入り1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、標準サイズ(30枚入り)1箱の
      価格帯も別枠で掲載しています。<strong>90枚バリューパック・2箱セットとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚バリューパック系・他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(90枚|2箱|3箱|4箱|5箱|6箱|60枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">処方箋不要で購入できるショップを中心に比較しています</h2>
    <p>
      プレシジョンワンは、コンタクトレンズの中でも「処方箋の提示が必要」な
      ショップで取り扱われることが多い商品です。当サイトでは、商品名や説明文に
      「処方箋あり」「処方箋必要」などと明記された商品はあらかじめ除外していて、
      処方箋不要で購入できるショップを中心に価格を比較しています。
    </p>
    <p>
      楽天・Yahooで扱っているお店は処方箋が必要です。でも店頭で購入するよりは
      安いので処方箋を用意できる方は、ぜひ利用したいですね！
      処方箋が不要というと一般激安サイトで手にすることになりますが、安いサイトも
      ありますので、参考にしてくださいね。掲載金額はもちろん送料無料（又は込み）です。
    </p>
    <p>
      あわせて、購入する数量によって1枚あたりの単価が変わる点にも注目しています。
      標準サイズ(30枚入り)を何箱まとめて購入するかや、まとめ買い向けの「90枚
      バリューパック」を選ぶかによっても、1枚あたりの単価が変わります。1枚あたりの
      単価がもっとも下がりやすいのは、この90枚バリューパックを2箱まとめて購入した
      場合です。そのため当サイトでは、90枚バリューパック2箱セットを中心に比較しつつ、
      90枚バリューパック1箱・標準サイズ(30枚入り)の2箱・1箱で見つかった場合も、
      それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 「処方箋不要」とは、購入時に処方箋の提示を求めないショップがある、という
      販売形態の説明であり、眼科での検査が不要という意味ではありません。
      コンタクトレンズは高度管理医療機器です。目の健康のため、定期的に眼科での
      検査を受けたうえでご購入・ご使用くださいね。
    </p>
    <p style="text-align:center; font-weight:700; color:var(--teal); margin-top:16px;">
      瞳を美しく維持するためにも…..
    </p>`,

    productInfoHeading: "プレシジョンワンとは",
    productInfoHtml: `        <p>
          プレシジョンワンは、日本アルコンが展開する1日使い捨てタイプの
          コンタクトレンズです。シリコーンハイドロゲル素材「verofilcon A」を
          採用し、独自の「スマートサーフェステクノロジー」により、
          レンズ表面の含水率を80%以上まで高めているのが特徴とされています。
        </p>
        <h3>スマートサーフェステクノロジーによるうるおい</h3>
        <p>
          親水性ポリマーがレンズ表面を覆うことで、レンズ表面の含水率を
          高く保ちやすい設計とされています。長時間の装用でもうるおいを
          感じやすいよう工夫されています。
        </p>
        <h3>高い酸素透過率とUVカット</h3>
        <p>
          シリコーンハイドロゲル素材により、高い酸素透過率(Dk/t=100)を
          実現しているとされています。あわせてUVカット機能も備えています
          (UVカット機能はあくまで補助的なものであり、サングラス等の
          代わりにはなりませんのでご注意ください)。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>装用中のうるおいを重視したい方</li>
          <li>シリコーンハイドロゲル素材のレンズを試したい方</li>
          <li>90枚バリューパックでまとめ買いし、コストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・カーブなどの詳細仕様は変更される場合があります。
          ご購入前に、各販売店の商品ページやメーカーの公式情報で
          最新の仕様をご確認ください。コンタクトレンズは高度管理医療機器のため、
          眼科での検査・処方をふまえたうえでのご購入・ご使用をおすすめします。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 14. プレシジョンワン 乱視用
  // ------------------------------------------------------------------
  {
    id: "precision1-toric-saiyasu",
    slug: "precision1-toric-saiyasu",
    outputDir: "docs-precision1-toric",
    siteName: "プレシジョンワン 乱視用最安値通販価格情報",
    theme: { accent: "#9C5B8E", gold: "#B8892B" }, // モーブ系(他14サイトと見分けやすい配色)
    historyUnitKey: "pack90x2", // 価格推移グラフで記録する比較単位（90枚パック2箱が実勢価格でも最安のため）
    searchKeyword: "プレシジョンワン 乱視用",
    metaDescription:
      "プレシジョンワン 乱視用の楽天市場・Yahoo!ショッピングの価格を毎日チェックし、処方箋不要で購入できるショップを中心に、30枚1箱・30枚2箱・90枚パック1箱・90枚パック2箱それぞれの最安値トップ3を掲載しています。",
    subtitle:
      "「90枚パック2箱」「90枚パック1箱」「30枚2箱」「30枚1箱」それぞれの単位を基準に、楽天市場・Yahoo!ショッピングの価格を毎日チェックし、それぞれのショップ別最安値トップ3を掲載しています。",
    productSchemaName: "プレシジョンワン 乱視用 90枚パック×2箱セット（180枚）",
    brandName: "Alcon", // JSON-LD(構造化データ)のbrand.nameに使用（アルコン社製のため他商品と異なる）
    brand: "アルコン", // トップページのブランド別グルーピングに使用
    brandKey: "alcon",
    shortName: "プレシジョンワン 乱視用", // トップページの商品カード・フッターで使う短い正式名称
    // 処方箋不要ショップのセクションがある分、ページが長くなりすぎないよう
    // 楽天/Yahoo!ランキングは各ベスト3に絞る
    rankingTopN: 3,

    // 「処方箋不要」を明言している専門ショップ。レンズモードのみを掲載する
    // （レンズゼロは価格が高いため掲載しない方針、レンズラボは乱視用の
    // 取り扱い自体が無いため対象外）。
    rxFreeShops: {
      quantities: [1, 2, 4, 6],
      shops: [
        {
          name: "レンズモード",
          // 送料: 300円×箱数（最低1,000円）
          shippingFor: (boxes) => Math.max(300 * boxes, 1000),
          // JavaScriptで価格を表示する作りのため自動取得ができない。
          // 商品価格は固定値（staticPrice）で運用し、運営者が定期的に
          // （目安2週間ごと）手動で最新価格に更新する方針とする。
          pages: {
            1: {
              staticPrice: 2880,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O5%2F",
            },
            2: {
              staticPrice: 5756,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O5%212%2F",
            },
            4: {
              staticPrice: 11500,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O5%214%2F",
            },
            6: {
              staticPrice: 17244,
              affiliateUrl:
                "https://px.a8.net/svt/ejp?a8mat=25PI8T+9SI0AA+76W+BW0YB&a8ejpredirect=https%3A%2F%2Fwww.lensmode.com%2Fgoods%2Findex%2Fgc%2FC1O5%216%2F",
            },
          },
        },
      ],
    },

    // トップページのスペック比較表に使用(メーカー公式・販売店情報を確認のうえ設定)
    specs: {
      material: "verofilcon A(シリコーンハイドロゲル)",
      water: 51, // 含水率(%)
      dk: 100, // 酸素透過率(Dk/t)
      uv: true, // UVカットの有無
      origin: "海外",
      type: "乱視用",
    },

    /** 商品名が「プレシジョンワン乱視用」であることを確認する */
    isCorrectProduct(name) {
      if (!name) return false;
      const n = name.replace(/\s/g, "");
      const isPrecision1 = /プレシジョンワン/.test(n) || /precision1/i.test(n);
      if (!isPrecision1) return false;
      return /(乱視用|トーリック|toric)/i.test(n);
    },

    // 標準サイズ(30枚入り)と90枚パックで内容量(1箱あたりの枚数)が
    // 異なる点に注意。それぞれの箱数(1箱/2箱)とあわせて、計4つの
    // 比較単位を設定する。
    units: [
      {
        key: "pack90x2",
        label: "90枚パック2箱セット(180枚)",
        totalLenses: 180,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 乱視用 90枚パック×2箱セット(180枚)",
        // 参考価格(90枚パック2箱15,390円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 12500, max: 19000 },
        hintedKeyword: "プレシジョンワン 乱視用 90枚 2箱",
        introHtml: "",
        /** 「90枚パックを2箱」らしきものだけを判定する */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/180枚/.test(n)) return true;
          const has90 = /90枚/.test(n);
          const has2Box =
            /(2箱|×2箱|ｘ2箱|x2箱|2箱セット|90.{0,4}×2|90.{0,4}x2|90.{0,4}ｘ2)/i.test(n);
          const mentions1BoxOnly = /1箱/.test(n) && !has2Box;
          if (mentions1BoxOnly) return false;
          return has90 && has2Box;
        },
      },
      {
        key: "pack90x1",
        label: "90枚パック1箱",
        totalLenses: 90,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 乱視用 90枚パック1箱",
        // 参考価格(90枚パック1箱7,900円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 6300, max: 9800 },
        hintedKeyword: "プレシジョンワン 乱視用 90枚パック",
        introHtml: `    <h2 class="section-heading">90枚パック(単品)でも比較したい方へ</h2>
    <p>
      90枚パックを1箱(単品)で販売しているショップも見つかった場合は、
      こちらに別枠で掲載しています。<strong>2箱セットとは金額の単位が異なる</strong>
      ため、混同しないようご注意ください(こちらは90枚1箱分の価格です)。
    </p>`,
        /** 「90枚パックを1箱」らしきものだけを判定する（2箱を示す表記は除外） */
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (!/90枚/.test(n)) return false;
          if (/180枚/.test(n)) return false;
          if (/(2箱|3箱|4箱|5箱|6箱|×2|ｘ2|x2)/i.test(n)) return false;
          return true;
        },
      },
      {
        key: "box2",
        label: "30枚入り2箱セット(60枚)",
        totalLenses: 60,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 乱視用 30枚入り×2箱セット(60枚)",
        // 参考価格(2箱5,910円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 4800, max: 7200 },
        introHtml: `    <h2 class="section-heading">30枚入り2箱でも比較したい方へ</h2>
    <p>
      90枚パックとは別に、標準サイズ(30枚入り)を2箱で販売しているショップも
      見つかった場合は、こちらに別枠で掲載しています。<strong>90枚パックとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚パック系との混同を防ぐため、「90枚」を含む商品は除外する
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/単品/.test(n)) return false;
          if (/90枚/.test(n)) return false;
          if (/(3箱|4箱|5箱|6箱)/.test(n)) return false;
          return isBoxCount(n, 2) || /60枚/.test(n);
        },
      },
      {
        key: "box1",
        label: "30枚入り1箱",
        totalLenses: 30,
        heroLabel: "本日の総合最安値（1枚あたり）",
        heroName: "プレシジョンワン 乱視用 30枚入り1箱",
        // 参考価格(1箱3,000円)をもとに、価格帯を直接指定して追加取得する
        priceHint: { min: 2400, max: 3800 },
        introHtml: `    <h2 class="section-heading">30枚入り1箱(単品)でも比較したい方へ</h2>
    <p>
      「まずは1箱だけ試したい」という方向けに、標準サイズ(30枚入り)1箱の
      価格帯も別枠で掲載しています。<strong>90枚パック・2箱セットとは
      金額の単位が異なる</strong>ため、比較する際は1枚あたりの単価をご確認ください。
    </p>`,
        // 90枚パック系・他の箱数をはっきり示す表記がある商品は、こちらでは対象外にする
        matches(name) {
          if (!name) return false;
          const n = stripShippingPromoText(name.replace(/\s/g, ""));
          if (/(90枚|2箱|3箱|4箱|5箱|6箱|60枚|180枚)/.test(n)) return false;
          return true;
        },
      },
    ],

    productIntroHtml: `    <h2 class="section-heading">処方箋不要で購入できるショップを中心に比較しています</h2>
    <p>
      プレシジョンワン 乱視用は、コンタクトレンズの中でも「処方箋の提示が必要」な
      ショップで取り扱われることが多い商品です。当サイトでは、商品名や説明文に
      「処方箋あり」「処方箋必要」などと明記された商品はあらかじめ除外していて、
      処方箋不要で購入できるショップを中心に価格を比較しています。
    </p>
    <p>
      楽天・Yahooで扱っているお店は処方箋が必要です。でも店頭で購入するよりは
      安いので処方箋を用意できる方は、ぜひ利用したいですね！
      処方箋が不要というと一般激安サイトで手にすることになりますが、安いサイトも
      ありますので、参考にしてくださいね。掲載金額はもちろん送料無料（又は込み）です。
    </p>
    <p>
      あわせて、購入する数量によって1枚あたりの単価が変わる点にも注目しています。
      標準サイズ(30枚入り)を何箱まとめて購入するかや、まとめ買い向けの「90枚
      パック」を選ぶかによっても、1枚あたりの単価が変わります。1枚あたりの
      単価がもっとも下がりやすいのは、この90枚パックを2箱まとめて購入した
      場合です。そのため当サイトでは、90枚パック2箱セットを中心に比較しつつ、
      90枚パック1箱・標準サイズ(30枚入り)の2箱・1箱で見つかった場合も、
      それぞれ別枠であわせて掲載しています。
    </p>
    <p class="note">
      ※ 「処方箋不要」とは、購入時に処方箋の提示を求めないショップがある、という
      販売形態の説明であり、眼科での検査が不要という意味ではありません。
      コンタクトレンズは高度管理医療機器です。目の健康のため、定期的に眼科での
      検査を受けたうえでご購入・ご使用くださいね。
    </p>
    <p style="text-align:center; font-weight:700; color:var(--teal); margin-top:16px;">
      瞳を美しく維持するためにも…..
    </p>`,

    productInfoHeading: "プレシジョンワン 乱視用とは",
    productInfoHtml: `        <p>
          プレシジョンワン 乱視用は、日本アルコンが展開する1日使い捨てタイプの
          乱視矯正用コンタクトレンズです。近視用と同じシリコーンハイドロゲル
          素材「verofilcon A」を採用し、「スマートサーフェステクノロジー」に
          より、レンズ表面の含水率を80%以上まで高めているのが特徴とされています。
        </p>
        <h3>独自レンズデザインによる軸安定性</h3>
        <p>
          乱視用レンズは、まばたきのたびにレンズが回転してしまうと見え方が
          ぼやけてしまいます。8時・4時の方向を厚く、6時方向を薄くする独自の
          レンズデザインにより、レンズの回転を抑え、クリアな見え方を保ちやすい
          設計とされています。
        </p>
        <h3>高い酸素透過率とUVカット</h3>
        <p>
          近視用と同様、高い酸素透過率(Dk/t=100、-3.00Dの場合)を実現している
          とされています。あわせてUVカット機能も備えています(UVカット機能は
          あくまで補助的なものであり、サングラス等の代わりにはなりませんので
          ご注意ください)。
        </p>
        <h3>こんな方におすすめ</h3>
        <ul>
          <li>乱視があり、装用中のうるおいを重視したい方</li>
          <li>レンズのズレ・回転による見え方のぼやけが気になる方</li>
          <li>90枚パックでまとめ買いし、コストを抑えたい方</li>
        </ul>
        <p class="note">
          ※ 度数・乱視軸・カーブなどの詳細仕様は変更される場合があります。
          乱視用レンズは特にご自身の乱視軸に合った処方が重要なため、
          ご購入前に、眼科での検査・処方をふまえたうえでご確認ください。
          本ページは購入の最終判断材料としてではなく、比較検討のための
          参考情報としてご活用ください。
        </p>`,
  },

  // ------------------------------------------------------------------
  // 15. 新しい商品を追加する場合は、ここに同じ形式でオブジェクトを追加する。
  // ------------------------------------------------------------------
];
