import { analyzeFormula, anonymizeFormula } from "/analyzer-core.js";
import { recordEvent } from "/common.js";

const input = document.querySelector("#formula-input");
const analyzeButton = document.querySelector("#analyze-button");
const tokenRail = document.querySelector("#token-rail");
const diagnosticsList = document.querySelector("#diagnostics-list");
const functionTree = document.querySelector("#function-tree");
const referenceMap = document.querySelector("#reference-map");
const resultStatus = document.querySelector("#result-status");
const questionCard = document.querySelector("#question-card");
const copyQuestionButton = document.querySelector("#copy-question");
const characterCount = document.querySelector("#character-count");
const results = document.querySelector("#results");

function clear(node) {
  node.replaceChildren();
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTokens(tokens) {
  clear(tokenRail);
  const visible = tokens.filter((token) => token.kind !== "whitespace");
  for (const token of visible) {
    const item = makeElement("span", `token token-${token.kind}`, token.value);
    item.title = token.label;
    tokenRail.append(item);
  }
  if (visible.length === 0)
    tokenRail.append(makeElement("p", "empty-state", "数式の記号がここに並びます。"));
}

function renderDiagnostics(diagnostics) {
  clear(diagnosticsList);
  for (const diagnostic of diagnostics) {
    const item = makeElement("li", `diagnostic diagnostic-${diagnostic.level}`);
    item.append(makeElement("strong", "", diagnostic.title));
    item.append(makeElement("p", "", diagnostic.message));
    diagnosticsList.append(item);
  }
}

function createFunctionNode(node) {
  const item = makeElement("li", "function-node");
  const line = makeElement("div", "function-line");
  line.append(makeElement("strong", "function-name", node.name));
  line.append(makeElement("span", "argument-count", `${node.argCount}引数`));
  item.append(line, makeElement("p", "", node.description));
  if (node.children.length > 0) {
    const children = makeElement("ol", "function-children");
    for (const child of node.children) children.append(createFunctionNode(child));
    item.append(children);
  }
  return item;
}

function renderFunctions(functions) {
  clear(functionTree);
  if (functions.roots.length === 0) {
    functionTree.append(
      makeElement("p", "empty-state", "関数を使っていない式、またはまだ読み取れていない式です。"),
    );
    return;
  }
  const list = makeElement("ol", "function-roots");
  for (const root of functions.roots) list.append(createFunctionNode(root));
  functionTree.append(list);
}

function renderReferences(references) {
  clear(referenceMap);
  if (references.length === 0) {
    referenceMap.append(makeElement("p", "empty-state", "セル参照は見つかりませんでした。"));
    return;
  }
  for (const reference of references) {
    const card = makeElement("div", "reference-card");
    card.append(makeElement("code", "", reference.value));
    const details = makeElement("div", "reference-detail");
    details.append(makeElement("span", "", reference.kind));
    details.append(makeElement("small", "", reference.sheet));
    card.append(details);
    referenceMap.append(card);
  }
}

function buildQuestion(formula) {
  return [
    "【環境】Excelの版 / OS：",
    `【匿名化した式】${anonymizeFormula(formula)}`,
    "【期待する結果】",
    "【実際の結果・エラー】",
    "【すでに確認したこと】",
  ].join("\n");
}

function runAnalysis(source = "manual") {
  const analysis = analyzeFormula(input.value);
  renderTokens(analysis.tokens);
  renderDiagnostics(analysis.diagnostics);
  renderFunctions(analysis.functions);
  renderReferences(analysis.references);
  questionCard.textContent = buildQuestion(analysis.formula);
  resultStatus.dataset.severity = analysis.severity;
  resultStatus.textContent =
    analysis.severity === "warning"
      ? "確認したい箇所があります"
      : analysis.severity === "notice"
        ? "補足を確認できます"
        : "基本構文は整っています";
  results.hidden = false;
  void recordEvent("analyzed", analysis.severity);
  if (source === "example") void recordEvent("example_opened");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

input.addEventListener("input", () => {
  characterCount.textContent = `${input.value.length} / 2000`;
});

input.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") runAnalysis();
});

analyzeButton.addEventListener("click", () => runAnalysis());

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    input.value = button.dataset.example;
    characterCount.textContent = `${input.value.length} / 2000`;
    runAnalysis("example");
  });
});

document.querySelector("#diagnostics-panel").addEventListener(
  "click",
  () => {
    void recordEvent("diagnosis_viewed");
  },
  { once: true },
);

document.querySelector("#structure-panel").addEventListener(
  "click",
  () => {
    void recordEvent("structure_viewed");
  },
  { once: true },
);

copyQuestionButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(questionCard.textContent);
  copyQuestionButton.textContent = "質問札をコピーしました";
  void recordEvent("question_copied");
  window.setTimeout(() => {
    copyQuestionButton.textContent = "質問札をコピー";
  }, 1600);
});

characterCount.textContent = "0 / 2000";
