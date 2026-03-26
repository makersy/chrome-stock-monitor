const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
const MIN_REFRESH_INTERVAL_SECONDS = 1;
const MAX_REFRESH_INTERVAL_SECONDS = 30;

let timerId = null;
let running = false;
let refreshInFlight = false;

function normalizeIntervalSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_REFRESH_INTERVAL_SECONDS;
  }

  return Math.min(
    MAX_REFRESH_INTERVAL_SECONDS,
    Math.max(MIN_REFRESH_INTERVAL_SECONDS, Math.round(numeric))
  );
}

function clearTicker() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

async function triggerRefreshTick() {
  if (!running || refreshInFlight) {
    return;
  }

  refreshInFlight = true;

  try {
    await chrome.runtime.sendMessage({ type: "OFFSCREEN_REFRESH_TICK" });
  } catch (_error) {
    // Background service worker may be spinning up; next tick will retry.
  } finally {
    refreshInFlight = false;
  }
}

function startTicker(intervalSeconds) {
  const normalizedSeconds = normalizeIntervalSeconds(intervalSeconds);
  clearTicker();
  timerId = setInterval(() => {
    void triggerRefreshTick();
  }, normalizedSeconds * 1000);
}

function applyConfig(message) {
  const enabled = Boolean(message?.enabled);

  if (!enabled) {
    running = false;
    clearTicker();
    return;
  }

  running = true;
  startTicker(message.intervalSeconds);
  void triggerRefreshTick();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "OFFSCREEN_REFRESHER_CONFIG") {
    return false;
  }

  applyConfig(message);
  sendResponse({ ok: true });
  return true;
});

void chrome.runtime.sendMessage({ type: "OFFSCREEN_REFRESHER_READY" }).catch(() => {});
