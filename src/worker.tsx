import { Hono } from "hono";
import type { Child } from "hono/jsx";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

type Guide = {
  name: string;
  points: string[];
  slug: string;
  source: string;
  summary: string;
  syntax: string;
};

export const canonicalOrigin = "https://sushiki-hodoki.yhay81.com";
export const eventNames = new Set([
  "visited",
  "analyzed",
  "example_opened",
  "diagnosis_viewed",
  "structure_viewed",
  "question_copied",
  "official_source_opened",
  "returned",
]);
export const detailNames = new Set([
  "",
  "clean",
  "notice",
  "warning",
  "if",
  "xlookup",
  "vlookup",
  "sumifs",
  "countifs",
  "filter",
  "let",
  "iferror",
  "text",
  "date",
  "div0",
  "na",
  "name",
  "ref",
  "value",
  "spill",
  "calc",
]);
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const functionGuides: Guide[] = [
  {
    name: "IF",
    points: [
      "条件式を最初に置く",
      "真の場合と偽の場合を分ける",
      "入れ子が深いときはIFSや表設計も検討する",
    ],
    slug: "if",
    source: "https://support.microsoft.com/ja-jp/excel/functions/if-function",
    summary: "条件が真か偽かで、返す値を切り替える。",
    syntax: "=IF(条件, 真の場合, 偽の場合)",
  },
  {
    name: "XLOOKUP",
    points: [
      "検索範囲と戻り範囲を同じ長さにする",
      "見つからない場合の値を指定できる",
      "古いExcelとの互換性を確認する",
    ],
    slug: "xlookup",
    source: "https://support.microsoft.com/ja-jp/excel/functions/xlookup-function",
    summary: "範囲から値を探し、対応する別範囲の値を返す。",
    syntax: "=XLOOKUP(検索値, 検索範囲, 戻り範囲, [見つからない場合], [一致モード], [検索モード])",
  },
  {
    name: "VLOOKUP",
    points: [
      "検索列は表の左端に置く",
      "完全一致なら4番目へFALSEまたは0を明示する",
      "列番号のずれに注意する",
    ],
    slug: "vlookup",
    source: "https://support.microsoft.com/ja-jp/excel/functions/vlookup-function",
    summary: "表の左端で値を探し、指定した列の値を返す。",
    syntax: "=VLOOKUP(検索値, 範囲, 列番号, [検索方法])",
  },
  {
    name: "SUMIFS",
    points: ["合計範囲を最初に置く", "条件範囲と条件を対にする", "各範囲の大きさをそろえる"],
    slug: "sumifs",
    source: "https://support.microsoft.com/ja-jp/excel/functions/sumifs-function",
    summary: "複数条件をすべて満たす値を合計する。",
    syntax: "=SUMIFS(合計範囲, 条件範囲1, 条件1, [条件範囲2, 条件2]...)",
  },
  {
    name: "COUNTIFS",
    points: [
      "条件範囲と条件を対にする",
      "各条件範囲の行列数をそろえる",
      "ワイルドカードの扱いを確認する",
    ],
    slug: "countifs",
    source: "https://support.microsoft.com/ja-jp/excel/functions/countifs-function",
    summary: "複数条件をすべて満たすセルの数を返す。",
    syntax: "=COUNTIFS(条件範囲1, 条件1, [条件範囲2, 条件2]...)",
  },
  {
    name: "FILTER",
    points: [
      "抽出範囲と条件配列の向きをそろえる",
      "空の結果に備えて3番目の引数を使える",
      "出力先のスピル範囲を空ける",
    ],
    slug: "filter",
    source: "https://support.microsoft.com/ja-jp/excel/functions/filter-function",
    summary: "条件に合う行や列を動的配列として取り出す。",
    syntax: "=FILTER(配列, 条件, [空の場合])",
  },
  {
    name: "LET",
    points: ["名前と値を対にする", "最後の引数へ結果の式を置く", "名前はセル参照と競合させない"],
    slug: "let",
    source: "https://support.microsoft.com/ja-jp/excel/let-function",
    summary: "途中計算へ名前を付け、長い数式を読みやすくする。",
    syntax: "=LET(名前1, 値1, [名前2, 値2]..., 最後の計算)",
  },
  {
    name: "IFERROR",
    points: [
      "最初の引数へ確認対象の式を置く",
      "元のエラー原因も先に確認する",
      "想定外のエラーを隠していないか見る",
    ],
    slug: "iferror",
    source: "https://support.microsoft.com/ja-jp/excel/functions/iferror-function",
    summary: "式がエラーのときだけ、別の値を返す。",
    syntax: "=IFERROR(値, エラーの場合の値)",
  },
  {
    name: "TEXT",
    points: [
      "表示形式を二重引用符で囲む",
      "結果は数値ではなく文字列になる",
      "地域設定による書式差を確認する",
    ],
    slug: "text",
    source: "https://support.microsoft.com/ja-jp/excel/functions/text-function",
    summary: "値を指定した表示形式の文字列へ変える。",
    syntax: '=TEXT(値, "表示形式")',
  },
  {
    name: "DATE",
    points: ["年・月・日の順に置く", "表示形式と内部の日付値を分けて考える", "2桁年は避ける"],
    slug: "date",
    source: "https://support.microsoft.com/ja-jp/excel/functions/date-function",
    summary: "年・月・日の値から日付を作る。",
    syntax: "=DATE(年, 月, 日)",
  },
];

export const errorGuides: Guide[] = [
  {
    name: "#DIV/0!",
    points: [
      "割る側のセルが0または空でないか確認する",
      "空白を0として扱う式か確認する",
      "IFやIFERRORを使う前に原因を確かめる",
    ],
    slug: "div0",
    source: "https://support.microsoft.com/ja-jp/excel/detect-formula-errors-in-excel",
    summary: "0または空の値で割ろうとしたときに出る。",
    syntax: "=値 / 0",
  },
  {
    name: "#N/A",
    points: [
      "検索値の型と余分な空白を見る",
      "検索範囲に値があるか確認する",
      "近似一致と完全一致を区別する",
    ],
    slug: "na",
    source: "https://support.microsoft.com/ja-jp/excel/detect-formula-errors-in-excel",
    summary: "検索などで利用できる値が見つからない。",
    syntax: "=XLOOKUP(見つからない値, 範囲, 戻り範囲)",
  },
  {
    name: "#NAME?",
    points: [
      "関数名の綴りを確認する",
      "文字列の引用符を見る",
      "定義名やテーブル名が存在するか確認する",
    ],
    slug: "name",
    source: "https://support.microsoft.com/ja-jp/excel/detect-formula-errors-in-excel",
    summary: "関数名や定義名などの文字列を認識できない。",
    syntax: "=認識されない名前(A1)",
  },
  {
    name: "#REF!",
    points: [
      "参照先の行・列・シートを削除していないか見る",
      "コピーや移動で参照がずれていないか確認する",
      "数式の参照を選び直す",
    ],
    slug: "ref",
    source: "https://support.microsoft.com/ja-jp/excel/detect-formula-errors-in-excel",
    summary: "参照していたセルや範囲が無効になっている。",
    syntax: "=#REF!+A1",
  },
  {
    name: "#VALUE!",
    points: [
      "数値の代わりに文字列がないか見る",
      "配列や範囲の大きさを確認する",
      "関数が求める型を公式構文で確かめる",
    ],
    slug: "value",
    source: "https://support.microsoft.com/ja-jp/excel/detect-formula-errors-in-excel",
    summary: "演算や関数へ想定外の型・範囲が渡されている。",
    syntax: '=1+"文字"',
  },
  {
    name: "#SPILL!",
    points: [
      "結果が広がる先に値や結合セルがないか見る",
      "列全体参照でシート端を越えていないか確認する",
      "動的配列の出力場所を空ける",
    ],
    slug: "spill",
    source: "https://support.microsoft.com/ja-jp/excel/how-to-correct-a-spill-error",
    summary: "複数結果をシート上へ展開できない。",
    syntax: "=FILTER(A2:C100, C2:C100=E2)",
  },
  {
    name: "#CALC!",
    points: [
      "空配列や入れ子配列になっていないか見る",
      "FILTERの空の場合を指定する",
      "数式の評価でエラー箇所をたどる",
    ],
    slug: "calc",
    source: "https://support.microsoft.com/ja-jp/excel/how-to-correct-a-calc-error",
    summary: "計算エンジンが現在扱えない配列などで出る。",
    syntax: "=FILTER(A2:A10, B2:B10=E2)",
  },
];

const app = new Hono<{ Bindings: Bindings }>();

function Layout(props: {
  canonical: string;
  children: Child;
  description: string;
  noindex?: boolean;
  title: string;
}) {
  const canonical = `${canonicalOrigin}${props.canonical}`;
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta content="width=device-width,initial-scale=1" name="viewport" />
        <title>{props.title}</title>
        <meta content={props.description} name="description" />
        {props.noindex ? <meta content="noindex,nofollow" name="robots" /> : null}
        <meta content="#315c55" name="theme-color" />
        <meta content="website" property="og:type" />
        <meta content="数式ほどき" property="og:site_name" />
        <meta content={props.title} property="og:title" />
        <meta content={props.description} property="og:description" />
        <meta content={`${canonicalOrigin}/og.png`} property="og:image" />
        <meta content={canonical} property="og:url" />
        <meta content="summary_large_image" name="twitter:card" />
        <link href={canonical} rel="canonical" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href="/manifest.webmanifest" rel="manifest" />
        <link href="/styles.css?v=20260801" rel="stylesheet" />
        <script src="/common.js?v=20260801" type="module" />
      </head>
      <body>
        <a class="skip-link" href="#main">
          本文へ移動
        </a>
        <header class="site-header">
          <a class="brand" href="/">
            <span aria-hidden="true" class="brand-mark" />
            数式ほどき
          </a>
          <nav aria-label="主要" class="site-nav">
            <a href="/">解析台</a>
            <a href="/#function-guides">関数</a>
            <a href="/#error-guides">エラー</a>
            <a href="/guide">使い方</a>
            <a href="/privacy">データ</a>
          </nav>
        </header>
        <main id="main">{props.children}</main>
        <footer class="site-footer">
          <span>数式は端末内だけで解析</span>
          <span>計算結果はExcel本体で確認</span>
        </footer>
      </body>
    </html>
  );
}

function LinkRack(props: { guides: Guide[]; kind: "errors" | "functions" }) {
  return (
    <div class="link-rack">
      {props.guides.map((guide) => (
        <a href={`/${props.kind}/${guide.slug}`}>
          <strong>{guide.name}</strong>
          <small>{guide.summary}</small>
        </a>
      ))}
    </div>
  );
}

function HomePage() {
  return (
    <>
      <section class="workbench-intro">
        <div>
          <p class="eyebrow">FORMULA WORKBENCH</p>
          <h1>数式を、見える手順に。</h1>
          <p class="lead">
            貼った式を、色のついた記号、関数の入れ子、セル参照、確認候補へ分けます。ブックも数式も外へ送りません。
          </p>
          <p class="privacy-seal">解析はこの端末のブラウザ内だけ</p>
        </div>
        <div aria-label="数式が三つの確認札へ分かれる図" class="flow-instrument" role="img">
          <div class="formula-roll">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div class="machine-gate" />
          <div class="output-trays">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section class="composer" aria-labelledby="composer-title">
        <div class="composer-head">
          <label id="composer-title" for="formula-input">
            確認したい数式
          </label>
          <span id="character-count">0 / 2000</span>
        </div>
        <textarea
          autocomplete="off"
          id="formula-input"
          maxLength={2000}
          placeholder={'例：=IF(B2>=80,"合格","確認")'}
          spellCheck={false}
        />
        <div class="composer-actions">
          <small>Ctrl / ⌘ + Enter でも解析できます。内容は自動保存しません。</small>
          <button id="analyze-button" type="button">
            式をほどく
          </button>
        </div>
        <div aria-label="例から試す" class="example-rack">
          <button data-example={'=IF(B2>=80,"合格","確認")'} type="button">
            IFの分岐
          </button>
          <button data-example={'=XLOOKUP(A2,商品!A:A,商品!C:C,"未登録")'} type="button">
            XLOOKUPの参照
          </button>
          <button data-example={'=SUMIFS(D:D,A:A,G2,B:B,">="&H2)'} type="button">
            SUMIFSの条件
          </button>
          <button data-example={'=IF(A1>0,"はい","いいえ"'} type="button">
            閉じかっこ不足
          </button>
        </div>
      </section>

      <section class="results-shell" hidden id="results">
        <header class="result-header">
          <div>
            <p class="eyebrow">ANALYSIS TRAYS</p>
            <h2>読み取った式</h2>
          </div>
          <span id="result-status" />
        </header>
        <div class="token-panel">
          <span class="panel-label">記号レール</span>
          <div class="token-rail" id="token-rail" />
        </div>
        <div class="analysis-grid">
          <section class="analysis-panel" id="diagnostics-panel">
            <span class="panel-label">確認札</span>
            <ul class="diagnostics-list" id="diagnostics-list" />
          </section>
          <section class="analysis-panel" id="structure-panel">
            <span class="panel-label">入れ子トレー</span>
            <div id="function-tree" />
          </section>
          <section class="analysis-panel">
            <span class="panel-label">参照地図</span>
            <div class="reference-map" id="reference-map" />
          </section>
        </div>
        <section class="question-panel">
          <div>
            <span class="panel-label">質問札</span>
            <p>
              文字列、数値、シート名、セル参照を置き換えた下書きです。コピー後も機密情報が残っていないか確認してください。
            </p>
            <pre id="question-card" />
          </div>
          <button id="copy-question" type="button">
            質問札をコピー
          </button>
        </section>
      </section>

      <section class="guide-strip" aria-label="使い方の三段階">
        <article class="guide-card">
          <span class="guide-symbol">=</span>
          <h3>貼る</h3>
          <p>ブックではなく、確認したい式だけを貼ります。</p>
        </article>
        <article class="guide-card">
          <span class="guide-symbol">( )</span>
          <h3>ほどく</h3>
          <p>記号、関数、引数、参照を別々の札で見ます。</p>
        </article>
        <article class="guide-card">
          <span class="guide-symbol">✓</span>
          <h3>確かめる</h3>
          <p>候補を公式構文とExcel本体で再確認します。</p>
        </article>
      </section>

      <section class="index-section" id="function-guides">
        <p class="eyebrow">FUNCTION DRAWERS</p>
        <h2>よく使う関数の構文札</h2>
        <LinkRack guides={functionGuides} kind="functions" />
      </section>
      <section class="index-section" id="error-guides">
        <p class="eyebrow">ERROR DRAWERS</p>
        <h2>エラー値から確認する</h2>
        <LinkRack guides={errorGuides} kind="errors" />
      </section>
      <script src="/analyzer.js?v=20260801" type="module" />
    </>
  );
}

function GuidePage(props: { guide: Guide; kind: "error" | "function" }) {
  const prefix = props.kind === "function" ? "関数" : "エラー";
  return (
    <div class="content-shell">
      <p class="eyebrow">{prefix.toUpperCase()} GUIDE</p>
      <h1>{props.guide.name} を分けて見る</h1>
      <p class="lead">{props.guide.summary}</p>
      <section class="content-card">
        <h2>構文の形</h2>
        <div class="syntax-box">{props.guide.syntax}</div>
      </section>
      <section class="content-card">
        <h2>確認する順番</h2>
        <ol>
          {props.guide.points.map((point) => (
            <li>{point}</li>
          ))}
        </ol>
      </section>
      <section class="content-card">
        <h2>公式仕様で確かめる</h2>
        <p>
          Excelの版、地域設定、ブックの構造で挙動が変わる場合があります。最終確認はMicrosoftの公式説明とExcel本体で行ってください。
        </p>
        <a
          data-detail={props.guide.slug}
          data-official-source
          href={props.guide.source}
          rel="noopener noreferrer"
        >
          Microsoft公式の説明を開く
        </a>
      </section>
      <p>
        <a class="button" href="/">
          解析台で式をほどく
        </a>
      </p>
    </div>
  );
}

app.use("*", async (c, next) => {
  await next();
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  );
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-origin");
  c.header("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
});

app.get("/", (c) =>
  c.html(
    <Layout
      canonical="/"
      description="Excel数式を送信せず、関数の入れ子、引数、セル参照、よくある確認候補へ分解します。"
      title="数式を、見える手順に。｜数式ほどき"
    >
      <HomePage />
    </Layout>,
  ),
);

app.get("/guide", (c) =>
  c.html(
    <Layout
      canonical="/guide"
      description="数式ほどきを安全に使い、Excel本体と公式仕様で再確認する手順。"
      title="使い方｜数式ほどき"
    >
      <div class="content-shell">
        <p class="eyebrow">HOW TO USE</p>
        <h1>式だけを貼り、順番に確かめる。</h1>
        <div class="guide-grid">
          <article class="content-card">
            <span class="guide-symbol">1</span>
            <h2>式を取り出す</h2>
            <p>
              ブックを複製し、確認したいセルの数式だけをコピーします。個人名や顧客名を含む文字列は先に置き換えてください。
            </p>
          </article>
          <article class="content-card">
            <span class="guide-symbol">2</span>
            <h2>札をたどる</h2>
            <p>
              赤い確認札、入れ子トレー、参照地図の順に見ます。表示は静的な構文確認で、式を実行していません。
            </p>
          </article>
          <article class="content-card">
            <span class="guide-symbol">3</span>
            <h2>Excelで再現する</h2>
            <p>公式構文と利用中のExcel版を確認し、元ブックの複製上で結果を確かめます。</p>
          </article>
        </div>
        <section class="content-card">
          <h2>対応する範囲</h2>
          <p>
            2,000文字までの一般的なA1形式、関数、演算子、文字列、数値、エラー値を読み取ります。R1C1参照、外部ブック参照、テーブル構造化参照、配列定数、LAMBDAの完全な意味解析は対象外です。
          </p>
        </section>
        <section class="content-card">
          <h2>結果の扱い</h2>
          <p>
            「基本構文は整っています」は正しい計算を保証しません。「確認したい箇所」は必ず誤りという意味ではありません。名前定義、テーブル、セルの値、共有先の版を含めてExcel本体で判断してください。
          </p>
        </section>
      </div>
    </Layout>,
  ),
);

app.get("/privacy", (c) =>
  c.html(
    <Layout
      canonical="/privacy"
      description="数式ほどきが送らないデータと、匿名利用計測の範囲。"
      title="データの扱い｜数式ほどき"
    >
      <div class="content-shell">
        <p class="eyebrow">DATA BOUNDARY</p>
        <h1>数式は、端末の外へ出しません。</h1>
        <section class="content-card">
          <h2>送らないもの</h2>
          <p>
            数式、シート名、セル参照、文字列、数値、質問札、ブック、VBA、氏名、メール、IPアドレス、User-Agent、位置情報は、製品の利用記録として送信・保存しません。数式の履歴も端末へ自動保存しません。
          </p>
        </section>
        <section class="content-card">
          <h2>数えるもの</h2>
          <p>
            匿名セッションのハッシュ、訪問・解析・例利用・確認札閲覧・構文閲覧・質問札コピー・公式出典確認・再訪のイベント名、定型区分、JST日付、自動QA区分だけをD1へ保存します。45日後に削除します。
          </p>
        </section>
        <section class="content-card">
          <h2>端末に残るもの</h2>
          <p>
            Cookieは使いません。再訪を区別するための無作為な匿名IDと既訪問印だけをlocalStorageへ残します。解析した数式は残しません。サイトデータを削除すれば匿名IDも消えます。
          </p>
        </section>
        <section class="content-card">
          <h2>質問札</h2>
          <p>
            質問札は文字列、数値、シート名、セル参照を置き換えますが、完全な匿名化を保証しません。外部へ貼る前に、機密情報が残っていないか利用者自身で確認してください。
          </p>
        </section>
      </div>
    </Layout>,
  ),
);

app.get("/functions/:slug", (c) => {
  const guide = functionGuides.find((item) => item.slug === c.req.param("slug"));
  if (!guide) return c.notFound();
  return c.html(
    <Layout
      canonical={`/functions/${guide.slug}`}
      description={`${guide.name}関数の構文と確認順を、公式仕様へのリンク付きで整理します。`}
      title={`${guide.name}関数の構文札｜数式ほどき`}
    >
      <GuidePage guide={guide} kind="function" />
    </Layout>,
  );
});

app.get("/errors/:slug", (c) => {
  const guide = errorGuides.find((item) => item.slug === c.req.param("slug"));
  if (!guide) return c.notFound();
  return c.html(
    <Layout
      canonical={`/errors/${guide.slug}`}
      description={`${guide.name}の主な確認順を、公式仕様へのリンク付きで整理します。`}
      title={`${guide.name}の確認札｜数式ほどき`}
    >
      <GuidePage guide={guide} kind="error" />
    </Layout>,
  );
});

app.get("/healthz", (c) =>
  c.json({ errors: errorGuides.length, functions: functionGuides.length, ok: true }),
);

app.get("/sitemap.xml", (c) => {
  const paths = [
    "/",
    "/guide",
    "/privacy",
    ...functionGuides.map((guide) => `/functions/${guide.slug}`),
    ...errorGuides.map((guide) => `/errors/${guide.slug}`),
  ];
  c.header("Content-Type", "application/xml; charset=UTF-8");
  c.header("Cache-Control", "public, max-age=3600, s-maxage=86400");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${canonicalOrigin}${path}</loc></url>`).join("\n")}\n</urlset>`,
  );
});

app.post("/api/events", async (c) => {
  c.header("Cache-Control", "no-store");
  const origin = c.req.header("Origin");
  if (!origin || origin !== new URL(c.req.url).origin)
    return c.json({ error: "invalid_origin" }, 403);
  if (
    (c.req.header("Content-Type") ?? "").split(";", 1)[0]?.trim().toLowerCase() !==
    "application/json"
  )
    return c.json({ error: "unsupported_media_type" }, 415);
  const contentLength = Number(c.req.header("Content-Length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 512)
    return c.json({ error: "payload_too_large" }, 413);
  const session = c.req.header("X-Sushiki-Hodoki-Session") ?? "";
  if (!sessionPattern.test(session)) return c.json({ error: "invalid_session" }, 400);

  let input: unknown;
  try {
    input = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (JSON.stringify(input).length > 512) return c.json({ error: "payload_too_large" }, 413);
  if (!input || typeof input !== "object" || Array.isArray(input))
    return c.json({ error: "invalid_payload" }, 400);
  const keys = Object.keys(input).sort();
  if (keys.length !== 2 || keys[0] !== "detail" || keys[1] !== "name")
    return c.json({ error: "invalid_shape" }, 400);
  const { detail, name } = input as { detail: unknown; name: unknown };
  if (
    typeof name !== "string" ||
    !eventNames.has(name) ||
    typeof detail !== "string" ||
    !detailNames.has(detail)
  )
    return c.json({ error: "invalid_event" }, 400);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(session));
  const sessionHash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const isQa = c.req.header("X-Sushiki-Hodoki-QA") === "1" ? 1 : 0;
  await c.env.DB.prepare(
    "INSERT INTO product_events(name,session_hash,detail,day,is_qa) VALUES(?,?,?,?,?)",
  )
    .bind(name, sessionHash, detail || null, day, isQa)
    .run();
  return c.body(null, 202);
});

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "not_found" }, 404);
  return c.html(
    <Layout
      canonical={c.req.path}
      description="ページが見つかりません。"
      noindex
      title="見つかりません｜数式ほどき"
    >
      <div class="content-shell">
        <p class="eyebrow">404</p>
        <h1>その札は、引き出しにありません。</h1>
        <p>
          <a class="button" href="/">
            解析台へ戻る
          </a>
        </p>
      </div>
    </Layout>,
    404,
  );
});

export const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (_event, env) => {
  await env.DB.prepare(
    "DELETE FROM product_events WHERE created_at < unixepoch() - (45 * 86400)",
  ).run();
};

export default { fetch: app.fetch, scheduled } satisfies ExportedHandler<Bindings>;
export { app };
