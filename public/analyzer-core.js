const tokenLabels = {
  comma: "引数の区切り",
  error: "エラー値",
  lparen: "開きかっこ",
  name: "関数・名前",
  number: "数値",
  operator: "演算子",
  percent: "パーセント",
  reference: "セル参照",
  rparen: "閉じかっこ",
  semicolon: "配列の区切り",
  string: "文字列",
  whitespace: "空白",
};

const functionRules = {
  COUNTIFS: { max: 254, min: 2, parity: "even" },
  DATE: { max: 3, min: 3 },
  FILTER: { max: 3, min: 2 },
  IF: { max: 3, min: 2 },
  IFERROR: { max: 2, min: 2 },
  LET: { max: 253, min: 3, parity: "odd" },
  SUMIFS: { max: 255, min: 3, parity: "odd" },
  TEXT: { max: 2, min: 2 },
  VLOOKUP: { max: 4, min: 3 },
  XLOOKUP: { max: 6, min: 3 },
};

const functionDescriptions = {
  COUNTIFS: "複数の条件をすべて満たすセルを数えます。",
  DATE: "年・月・日から日付値を組み立てます。",
  FILTER: "条件に合う行や列を配列として取り出します。",
  IF: "条件によって返す値を切り替えます。",
  IFERROR: "式がエラーのときだけ別の値を返します。",
  LET: "途中の値へ名前を付け、最後の計算で使います。",
  SUMIFS: "複数の条件をすべて満たす値を合計します。",
  TEXT: "値を指定した表示形式の文字列に変えます。",
  VLOOKUP: "表の左端で値を探し、指定列から返します。",
  XLOOKUP: "検索範囲で値を探し、対応する範囲から返します。",
};

const referencePattern =
  /^(?:(?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*)!)?(?:\$?[A-Z]{1,3}\$?\d{1,7})(?::(?:\$?[A-Z]{1,3}\$?\d{1,7}))?/u;
const wholeColumnPattern =
  /^(?:(?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*)!)?\$?[A-Z]{1,3}:\$?[A-Z]{1,3}/u;
const wholeRowPattern = /^(?:(?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*)!)?\$?\d+:\$?\d+/u;

function pushToken(tokens, kind, value, start) {
  tokens.push({ kind, label: tokenLabels[kind] ?? "確認対象", start, value });
}

export function tokenizeFormula(input) {
  const formula = String(input ?? "")
    .trim()
    .slice(0, 2000);
  const tokens = [];
  let index = 0;

  while (index < formula.length) {
    const rest = formula.slice(index);
    const char = formula[index];

    if (/\s/.test(char)) {
      const match = rest.match(/^\s+/u);
      pushToken(tokens, "whitespace", match[0], index);
      index += match[0].length;
      continue;
    }

    if (char === '"') {
      let end = index + 1;
      while (end < formula.length) {
        if (formula[end] === '"' && formula[end + 1] === '"') {
          end += 2;
          continue;
        }
        if (formula[end] === '"') {
          end += 1;
          break;
        }
        end += 1;
      }
      pushToken(tokens, "string", formula.slice(index, end), index);
      index = end;
      continue;
    }

    const reference =
      rest.match(referencePattern) ?? rest.match(wholeColumnPattern) ?? rest.match(wholeRowPattern);
    if (reference) {
      pushToken(tokens, "reference", reference[0], index);
      index += reference[0].length;
      continue;
    }

    const error = rest.match(/^#(?:DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!|SPILL!|CALC!)/iu);
    if (error) {
      pushToken(tokens, "error", error[0].toUpperCase(), index);
      index += error[0].length;
      continue;
    }

    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?/iu);
    if (number) {
      pushToken(tokens, "number", number[0], index);
      index += number[0].length;
      continue;
    }

    const name = rest.match(/^[\p{L}_\\][\p{L}\p{N}_.\\]*/u);
    if (name) {
      pushToken(tokens, "name", name[0], index);
      index += name[0].length;
      continue;
    }

    if (char === "(") pushToken(tokens, "lparen", char, index);
    else if (char === ")") pushToken(tokens, "rparen", char, index);
    else if (char === ",") pushToken(tokens, "comma", char, index);
    else if (char === ";") pushToken(tokens, "semicolon", char, index);
    else if (char === "%") pushToken(tokens, "percent", char, index);
    else {
      const operator = rest.match(/^(?:<=|>=|<>|[=+\-*/^&<>:@{}])/u);
      pushToken(tokens, operator ? "operator" : "unknown", operator?.[0] ?? char, index);
      index += (operator?.[0] ?? char).length;
      continue;
    }
    index += 1;
  }

  return { formula, tokens };
}

function significantTokens(tokens) {
  return tokens.filter((token) => token.kind !== "whitespace");
}

export function extractFunctions(tokens) {
  const source = significantTokens(tokens);
  const roots = [];
  const parenFrames = [];
  let maxDepth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const token = source[index];
    const previous = source[index - 1];
    if (token.kind === "lparen" && previous?.kind === "name") {
      const parent = [...parenFrames].reverse().find((frame) => frame.node)?.node;
      const functionDepth = parenFrames.filter((frame) => frame.node).length + 1;
      const node = {
        argCount: source[index + 1]?.kind === "rparen" ? 0 : 1,
        children: [],
        depth: functionDepth,
        description:
          functionDescriptions[previous.value.toUpperCase()] ?? "名前付きの処理または関数です。",
        name: previous.value.toUpperCase(),
        start: previous.start,
      };
      if (parent) parent.children.push(node);
      else roots.push(node);
      parenFrames.push({ node });
      maxDepth = Math.max(maxDepth, node.depth);
      continue;
    }

    if (token.kind === "lparen") parenFrames.push({ node: null });
    if (token.kind === "comma" && parenFrames.at(-1)?.node) parenFrames.at(-1).node.argCount += 1;
    if (token.kind === "rparen" && parenFrames.length > 0) parenFrames.pop();
  }

  const flat = [];
  const visit = (node) => {
    flat.push(node);
    for (const child of node.children) visit(child);
  };
  for (const root of roots) visit(root);
  return { flat, maxDepth, roots };
}

function classifyReference(reference) {
  const value = reference.replace(/^(?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*)!/u, "");
  if (/^\$?[A-Z]{1,3}:\$?[A-Z]{1,3}$/u.test(value)) return "列全体";
  if (/^\$?\d+:\$?\d+$/u.test(value)) return "行全体";
  if (value.includes(":")) return "セル範囲";
  if (/^\$[A-Z]+\$\d+$/u.test(value)) return "絶対参照";
  if (/\$/u.test(value)) return "複合参照";
  return "相対参照";
}

export function extractReferences(tokens) {
  const seen = new Set();
  const references = [];
  for (const token of tokens) {
    if (token.kind !== "reference") continue;
    const key = token.value.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const sheet =
      token.value.match(/^((?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*))!/u)?.[1] ?? "現在のシート";
    references.push({ kind: classifyReference(token.value), sheet, value: token.value });
  }
  return references;
}

function addDiagnostic(diagnostics, level, code, title, message) {
  if (diagnostics.some((item) => item.code === code)) return;
  diagnostics.push({ code, level, message, title });
}

function quoteCount(formula) {
  let count = 0;
  for (let index = 0; index < formula.length; index += 1) {
    if (formula[index] !== '"') continue;
    if (formula[index + 1] === '"') index += 1;
    else count += 1;
  }
  return count;
}

export function diagnoseFormula(formula, tokens, functions) {
  const diagnostics = [];
  const trimmed = formula.trim();

  if (!trimmed) {
    addDiagnostic(
      diagnostics,
      "notice",
      "empty",
      "数式を貼ってください",
      "例から試すこともできます。",
    );
    return diagnostics;
  }
  if (!trimmed.startsWith("="))
    addDiagnostic(
      diagnostics,
      "warning",
      "equals",
      "先頭の = を確認",
      "Excelの数式は通常、等号から始まります。",
    );
  if (/[＝（）＋－＊／，：＃＄！]/u.test(trimmed))
    addDiagnostic(
      diagnostics,
      "warning",
      "fullwidth",
      "全角記号があります",
      "全角のかっこや演算記号は、半角へ置き換えて確認してください。",
    );
  if (quoteCount(trimmed) % 2 !== 0)
    addDiagnostic(
      diagnostics,
      "warning",
      "quote",
      "引用符が閉じていません",
      "文字列を囲む二重引用符の組を確認してください。",
    );

  let balance = 0;
  let belowZero = false;
  for (const token of tokens) {
    if (token.kind === "lparen") balance += 1;
    if (token.kind === "rparen") balance -= 1;
    if (balance < 0) belowZero = true;
  }
  if (balance !== 0 || belowZero)
    addDiagnostic(
      diagnostics,
      "warning",
      "paren",
      "かっこの対応を確認",
      "開きかっこと閉じかっこの数または順序が合っていません。",
    );

  if (tokens.some((token) => token.kind === "unknown"))
    addDiagnostic(
      diagnostics,
      "warning",
      "unknown",
      "読み取れない記号があります",
      "数式に貼り付いた特殊文字や区切り記号を確認してください。",
    );

  for (const fn of functions.flat) {
    const rule = functionRules[fn.name];
    if (!rule) continue;
    const parityWrong =
      rule.parity === "even"
        ? fn.argCount % 2 !== 0
        : rule.parity === "odd" && fn.argCount % 2 !== 1;
    if (fn.argCount < rule.min || fn.argCount > rule.max || parityWrong)
      addDiagnostic(
        diagnostics,
        "warning",
        `args-${fn.name}-${fn.start}`,
        `${fn.name} の引数を確認`,
        `現在は${fn.argCount}個として読み取りました。区切りと必須引数を公式構文で確認してください。`,
      );
    if (fn.name === "VLOOKUP" && fn.argCount === 3)
      addDiagnostic(
        diagnostics,
        "notice",
        "vlookup-mode",
        "VLOOKUPの照合方法",
        "4番目の引数を省くと近似一致です。完全一致ならFALSEまたは0を明示します。",
      );
    if (["XLOOKUP", "FILTER", "LET"].includes(fn.name))
      addDiagnostic(
        diagnostics,
        "notice",
        `version-${fn.name}`,
        "Excelの版を確認",
        `${fn.name}は古いExcelで利用できない場合があります。共有先の版も確認してください。`,
      );
    if (fn.name === "IFERROR")
      addDiagnostic(
        diagnostics,
        "notice",
        "iferror",
        "元のエラーも確認",
        "IFERRORで表示を整える前に、内側の式が返すエラー原因も確認してください。",
      );
  }

  const names = new Set(functions.flat.map((fn) => fn.name));
  const volatile = [...names].filter((name) =>
    ["INDIRECT", "NOW", "OFFSET", "RAND", "RANDARRAY", "RANDBETWEEN", "TODAY"].includes(name),
  );
  if (volatile.length > 0)
    addDiagnostic(
      diagnostics,
      "notice",
      "volatile",
      "再計算が多い関数",
      `${volatile.join("、")}は再計算や参照の追跡へ影響することがあります。`,
    );
  if (functions.maxDepth > 7)
    addDiagnostic(
      diagnostics,
      "notice",
      "depth",
      "入れ子が深い数式です",
      `関数が最大${functions.maxDepth}段あります。LETや補助列で途中の意味を分けると確認しやすくなります。`,
    );
  if (
    tokens.some(
      (token) => token.kind === "reference" && /\$?[A-Z]{1,3}:\$?[A-Z]{1,3}/u.test(token.value),
    )
  )
    addDiagnostic(
      diagnostics,
      "notice",
      "whole-column",
      "列全体の参照があります",
      "大きなブックでは計算量が増えることがあります。必要な範囲へ絞れるか確認してください。",
    );

  if (diagnostics.length === 0)
    addDiagnostic(
      diagnostics,
      "clean",
      "clean",
      "基本構文は整っています",
      "この画面で分かる範囲に大きな崩れはありません。計算結果はExcel本体で確認してください。",
    );
  return diagnostics;
}

export function anonymizeFormula(input) {
  const { formula, tokens } = tokenizeFormula(input);
  const referenceMap = new Map();
  const sheetMap = new Map();
  let referenceIndex = 0;
  let sheetIndex = 0;
  let output = "";

  for (const token of tokens) {
    let value = token.value;
    if (token.kind === "string") value = '"文字列"';
    if (token.kind === "number") value = "0";
    if (token.kind === "reference") {
      const sheetMatch = value.match(/^((?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*))!/u);
      let sheetPrefix = "";
      if (sheetMatch) {
        if (!sheetMap.has(sheetMatch[1])) sheetMap.set(sheetMatch[1], `Sheet${(sheetIndex += 1)}`);
        sheetPrefix = `${sheetMap.get(sheetMatch[1])}!`;
      }
      const referenceOnly = value.replace(/^((?:'(?:[^']|'')+'|[\p{L}_][\p{L}\p{N}_.]*))!/u, "");
      if (!referenceMap.has(referenceOnly)) {
        const column = String.fromCharCode(65 + (referenceIndex % 26));
        referenceMap.set(referenceOnly, `${column}${Math.floor(referenceIndex / 26) + 1}`);
        referenceIndex += 1;
      }
      value = `${sheetPrefix}${referenceMap.get(referenceOnly)}`;
    }
    output += value;
  }
  return output || formula;
}

export function analyzeFormula(input) {
  const { formula, tokens } = tokenizeFormula(input);
  const functions = extractFunctions(tokens);
  const references = extractReferences(tokens);
  const diagnostics = diagnoseFormula(formula, tokens, functions);
  const severity = diagnostics.some((item) => item.level === "warning")
    ? "warning"
    : diagnostics.some((item) => item.level === "notice")
      ? "notice"
      : "clean";
  return {
    diagnostics,
    formula,
    functions,
    references,
    severity,
    tokens,
  };
}
