const sessionKey = "sushiki_hodoki_session";
const seenKey = "sushiki_hodoki_seen";
const automatedQa =
  new URLSearchParams(window.location.search).get("qa") === "1" || navigator.webdriver === true;

function createSession() {
  if (automatedQa) return crypto.randomUUID();
  const existing = localStorage.getItem(sessionKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(sessionKey, created);
  return created;
}

const session = createSession();

export async function recordEvent(name, detail = "") {
  const headers = {
    "Content-Type": "application/json",
    "X-Sushiki-Hodoki-Session": session,
  };
  if (automatedQa) headers["X-Sushiki-Hodoki-QA"] = "1";
  try {
    await fetch("/api/events", {
      body: JSON.stringify({ detail, name }),
      headers,
      keepalive: true,
      method: "POST",
    });
  } catch {
    // The product remains fully usable without metrics.
  }
}

const previouslySeen = !automatedQa && localStorage.getItem(seenKey) === "1";
void recordEvent("visited");
if (previouslySeen) void recordEvent("returned");
if (!automatedQa) localStorage.setItem(seenKey, "1");

document.querySelectorAll("[data-official-source]").forEach((link) => {
  link.addEventListener("click", () => {
    void recordEvent("official_source_opened", link.dataset.detail ?? "");
  });
});
