import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  analyzeFormula,
  anonymizeFormula,
  extractFunctions,
  tokenizeFormula,
} from "../public/analyzer-core.js";
import {
  app,
  canonicalOrigin,
  detailNames,
  errorGuides,
  eventNames,
  functionGuides,
  scheduled,
  type Bindings,
} from "../src/worker";

const pathOf = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const session = "f72e17de-0d95-4bba-84e9-a6638e0308df";
let miniflare: Miniflare;
let bindings: Bindings;

const eventRequest = (
  name: string,
  detail = "",
  options: { body?: string; origin?: string; qa?: boolean; session?: string; type?: string } = {},
) => ({
  body: options.body ?? JSON.stringify({ detail, name }),
  headers: {
    "content-type": options.type ?? "application/json",
    origin: options.origin ?? "http://localhost",
    "x-sushiki-hodoki-qa": options.qa ? "1" : "0",
    "x-sushiki-hodoki-session": options.session ?? session,
  },
  method: "POST",
});

beforeAll(async () => {
  miniflare = new Miniflare({
    d1Databases: { DB: "sushiki-hodoki-test" },
    modules: true,
    script: "export default { fetch() { return new Response('test') } }",
  });
  const database = await miniflare.getD1Database("DB");
  const migration = await readFile(pathOf("../migrations/0001_product.sql"), "utf8");
  for (const statement of migration
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean))
    await database.prepare(statement).run();
  bindings = {
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
    DB: database as unknown as D1Database,
  };
});

beforeEach(async () => {
  await bindings.DB.prepare("DELETE FROM product_events").run();
});

afterAll(async () => miniflare.dispose());

describe("public product", () => {
  it.each([
    ["/", "数式を、見える手順に。", `${canonicalOrigin}/`],
    ["/guide", "式だけを貼り、順番に確かめる。", `${canonicalOrigin}/guide`],
    ["/privacy", "数式は、端末の外へ出しません。", `${canonicalOrigin}/privacy`],
  ])("renders %s with a canonical URL", async (path, marker, canonical) => {
    const response = await app.request(path, undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain(marker);
    expect(body).toContain(`href="${canonical}" rel="canonical"`);
    expect(body).not.toMatch(/成功条件|市場スコア|公開実験|収益性|仮説/);
    expect(response.headers.get("content-security-policy")).toContain("script-src 'self'");
    expect(response.headers.get("content-security-policy")).not.toContain("unsafe-inline");
    expect(response.headers.get("permissions-policy")).toContain("geolocation=()");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("communicates the workbench through visible instruments", async () => {
    const body = await (await app.request("/", undefined, bindings)).text();
    for (const marker of [
      'class="flow-instrument"',
      'class="formula-roll"',
      'class="machine-gate"',
      'class="output-trays"',
      "記号レール",
      "入れ子トレー",
      "参照地図",
      "質問札",
    ])
      expect(body).toContain(marker);
    expect(body).toContain('maxLength="2000"');
    expect(body).toContain("内容は自動保存しません");
  });

  it.each(functionGuides)("publishes the $name official function guide", async (guide) => {
    const response = await app.request(`/functions/${guide.slug}`, undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain(guide.syntax.replaceAll('"', "&quot;"));
    expect(body).toContain(guide.source);
    expect(body).toContain("Microsoft公式の説明を開く");
    expect(guide.source).toMatch(/^https:\/\/support\.microsoft\.com\/ja-jp\/excel\//);
  });

  it.each(errorGuides)("publishes the $name official error guide", async (guide) => {
    const response = await app.request(`/errors/${guide.slug}`, undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain(guide.summary);
    expect(body).toContain(guide.source);
  });

  it("exposes a stable health and twenty-URL sitemap baseline", async () => {
    expect(await (await app.request("/healthz", undefined, bindings)).json()).toEqual({
      errors: 7,
      functions: 10,
      ok: true,
    });
    const sitemap = await (await app.request("/sitemap.xml", undefined, bindings)).text();
    expect([...sitemap.matchAll(/<loc>/g)]).toHaveLength(20);
    for (const guide of functionGuides)
      expect(sitemap).toContain(`${canonicalOrigin}/functions/${guide.slug}`);
    for (const guide of errorGuides)
      expect(sitemap).toContain(`${canonicalOrigin}/errors/${guide.slug}`);
  });

  it("returns branded noindex 404 pages", async () => {
    const response = await app.request("/missing", undefined, bindings);
    const body = await response.text();
    expect(response.status).toBe(404);
    expect(body).toContain("その札は、引き出しにありません");
    expect(body).toContain('content="noindex,nofollow"');
    expect((await app.request("/functions/not-real", undefined, bindings)).status).toBe(404);
    expect((await app.request("/errors/not-real", undefined, bindings)).status).toBe(404);
    expect(await (await app.request("/api/not-real", undefined, bindings)).json()).toEqual({
      error: "not_found",
    });
  });
});

describe("formula analyzer", () => {
  it("tokenizes names, references, strings, numbers, and operators", () => {
    const analysis = analyzeFormula('=IF($B2>=80,"合格","確認")');
    expect(analysis.tokens.map((token) => token.kind)).toEqual(
      expect.arrayContaining(["name", "reference", "number", "operator", "string"]),
    );
    expect(analysis.references).toEqual([
      { kind: "複合参照", sheet: "現在のシート", value: "$B2" },
    ]);
    expect(analysis.functions.flat[0]).toMatchObject({ argCount: 3, depth: 1, name: "IF" });
  });

  it("builds nested function trays while preserving grouped parentheses", () => {
    const nested = extractFunctions(
      tokenizeFormula('=IF((A1+B1)>0,IF(C1>0,"正","負"),"なし")').tokens,
    );
    expect(nested.maxDepth).toBe(2);
    expect(nested.roots).toHaveLength(1);
    expect(nested.roots[0]).toMatchObject({ argCount: 3, name: "IF" });
    expect(nested.roots[0]?.children[0]).toMatchObject({ argCount: 3, name: "IF" });
  });

  it.each([
    ["IF(A1>0,1,0)", "equals"],
    ["=IF（A1＞0，1，0）", "fullwidth"],
    ['=IF(A1>0,"yes","no"', "paren"],
    ['=IF(A1>0,"yes,0)', "quote"],
    ["=IF(A1)", "args-IF-1"],
  ])("finds %s as %s", (formula, code) => {
    expect(analyzeFormula(formula).diagnostics.some((item) => item.code === code)).toBe(true);
  });

  it("shows compatibility, omitted matching mode, whole-column, and error masking notices", () => {
    const vlookup = analyzeFormula("=VLOOKUP(A1,A:D,4)");
    expect(vlookup.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(["vlookup-mode", "whole-column"]),
    );
    const modern = analyzeFormula('=IFERROR(XLOOKUP(A1,B:B,C:C),"")');
    expect(modern.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(["iferror", "version-XLOOKUP", "whole-column"]),
    );
  });

  it("deduplicates and classifies sheet references", () => {
    const analysis = analyzeFormula("=SUM('売上 2026'!$A$1:$A$10,'売上 2026'!$A$1:$A$10,B2)");
    expect(analysis.references).toEqual([
      { kind: "セル範囲", sheet: "'売上 2026'", value: "'売上 2026'!$A$1:$A$10" },
      { kind: "相対参照", sheet: "現在のシート", value: "B2" },
    ]);
  });

  it("creates a question formula without original literals, sheets, or references", () => {
    const safe = anonymizeFormula('=IF(顧客名簿!D18>125000,"山田商店","確認")');
    expect(safe).not.toMatch(/顧客名簿|D18|125000|山田商店|確認/);
    expect(safe).toContain("Sheet1!");
    expect(safe).toContain('"文字列"');
  });

  it("marks a simple formula as structurally clean", () => {
    const analysis = analyzeFormula("=A1+B1");
    expect(analysis.severity).toBe("clean");
    expect(analysis.diagnostics).toEqual([
      expect.objectContaining({ code: "clean", level: "clean" }),
    ]);
  });
});

describe("anonymous metrics", () => {
  it("accepts all eight events while storing only allowed labels", async () => {
    expect(eventNames).toHaveProperty("size", 8);
    expect(detailNames).not.toContain("=IF(A1>0,1,0)");
    for (const name of eventNames) {
      const detail =
        name === "analyzed" ? "warning" : name === "official_source_opened" ? "if" : "";
      const response = await app.request("/api/events", eventRequest(name, detail), bindings);
      expect(response.status).toBe(202);
    }
    const rows = await bindings.DB.prepare(
      "SELECT name,session_hash,detail,is_qa FROM product_events ORDER BY id",
    ).all<{ detail: string | null; is_qa: number; name: string; session_hash: string }>();
    expect(rows.results).toHaveLength(8);
    expect(rows.results?.every((row) => row.session_hash.length === 64)).toBe(true);
    expect(JSON.stringify(rows.results)).not.toContain("IF(A1");
  });

  it("separates automated QA from real use", async () => {
    await app.request("/api/events", eventRequest("visited", "", { qa: true }), bindings);
    await app.request("/api/events", eventRequest("visited"), bindings);
    const counts = await bindings.DB.prepare(
      "SELECT SUM(CASE WHEN is_qa=0 THEN 1 ELSE 0 END) AS real,SUM(CASE WHEN is_qa=1 THEN 1 ELSE 0 END) AS qa FROM product_events",
    ).first<{ qa: number; real: number }>();
    expect(counts).toEqual({ qa: 1, real: 1 });
  });

  it.each([
    ["unknown event", eventRequest("unknown"), 400, "invalid_event"],
    ["unknown detail", eventRequest("analyzed", "formula text"), 400, "invalid_event"],
    ["bad session", eventRequest("visited", "", { session: "bad" }), 400, "invalid_session"],
    [
      "cross-site",
      eventRequest("visited", "", { origin: "https://evil.example" }),
      403,
      "invalid_origin",
    ],
    [
      "plain text",
      eventRequest("visited", "", { type: "text/plain" }),
      415,
      "unsupported_media_type",
    ],
    ["broken JSON", eventRequest("visited", "", { body: "{" }), 400, "invalid_json"],
    [
      "extra field",
      eventRequest("visited", "", {
        body: JSON.stringify({ detail: "", formula: "secret", name: "visited" }),
      }),
      400,
      "invalid_shape",
    ],
    [
      "large body",
      eventRequest("visited", "", {
        body: JSON.stringify({ detail: "", name: "visited", pad: "x".repeat(700) }),
      }),
      413,
      "payload_too_large",
    ],
  ])("rejects %s", async (_label, request, status, error) => {
    const response = await app.request("/api/events", request, bindings);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it("removes anonymous events after forty-five days", async () => {
    await bindings.DB.prepare(
      "INSERT INTO product_events(name,session_hash,detail,day,is_qa,created_at) VALUES('visited',?,NULL,'2026-01-01',0,unixepoch()-46*86400)",
    )
      .bind("a".repeat(64))
      .run();
    await scheduled({} as ScheduledController, bindings, {} as ExecutionContext);
    const count = await bindings.DB.prepare("SELECT COUNT(*) AS total FROM product_events").first<{
      total: number;
    }>();
    expect(count?.total).toBe(0);
  });
});

describe("static release contract", () => {
  it("keeps text, privacy, and visual constraints in code", async () => {
    const [worker, styles, common, analyzer, core, privacy] = await Promise.all([
      readFile(pathOf("../src/worker.tsx"), "utf8"),
      readFile(pathOf("../public/styles.css"), "utf8"),
      readFile(pathOf("../public/common.js"), "utf8"),
      readFile(pathOf("../public/analyzer.js"), "utf8"),
      readFile(pathOf("../public/analyzer-core.js"), "utf8"),
      readFile(pathOf("../docs/privacy-boundary.md"), "utf8"),
    ]);
    expect(styles).toContain("clamp(1.75rem, 3.8vw, 2.35rem)");
    expect(styles).not.toMatch(/gradient/i);
    expect(styles).toContain("@media print");
    expect(worker).not.toMatch(/成功条件|市場スコア|公開実験|収益性|仮説/);
    expect(`${common}\n${analyzer}`).not.toContain("innerHTML");
    expect(analyzer).toContain("textContent");
    expect(common).not.toContain("formula-input");
    expect(common).not.toContain("input.value");
    expect(core).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon/);
    expect(privacy).toContain("数式、シート名、セル参照、文字列リテラル");
  });

  it("publishes the required static assets", async () => {
    for (const path of [
      "../public/og.png",
      "../public/styles.css",
      "../public/common.js",
      "../public/analyzer-core.js",
      "../public/analyzer.js",
      "../public/sw.js",
      "../public/manifest.webmanifest",
      "../public/robots.txt",
      "../public/favicon.svg",
      "../public/16a103f18dc448aeb04dc8c01f241e62.txt",
    ])
      expect((await readFile(pathOf(path))).byteLength).toBeGreaterThan(0);
  });
});
