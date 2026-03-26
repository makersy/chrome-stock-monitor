import { evaluateAlerts } from "./alerts.js";
import { MARKETS, createEmptyMarketStatus } from "./config.js";
import { fetchQuotesForWatchlist } from "./quotes/market-service.js";
import {
  collectWatchlistIds,
  ensureStorageState,
  getStorageState,
  normalizeWatchlist,
  pruneObjectByIds
} from "./storage.js";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";
const OFFSCREEN_DOCUMENT_URL = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
const OFFSCREEN_REFRESH_REASONS = ["WORKERS"];
const DEFAULT_REFRESH_INTERVAL_SECONDS = 30;
const MIN_REFRESH_INTERVAL_SECONDS = 1;
const MAX_REFRESH_INTERVAL_SECONDS = 30;

let creatingOffscreenDocument = null;
let refreshInFlight = null;

function normalizeRefreshIntervalSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_REFRESH_INTERVAL_SECONDS;
  }

  return Math.min(
    MAX_REFRESH_INTERVAL_SECONDS,
    Math.max(MIN_REFRESH_INTERVAL_SECONDS, Math.round(numeric))
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasWatchlistItems(watchlist) {
  return collectWatchlistIds(watchlist).size > 0;
}

function applyWatchlistUpdates(watchlist, updates) {
  const nextWatchlist = normalizeWatchlist(watchlist);

  MARKETS.forEach((market) => {
    nextWatchlist[market] = nextWatchlist[market].map((stock) => {
      const patch = updates[stock.id];
      return patch ? { ...stock, ...patch } : stock;
    });
  });

  return nextWatchlist;
}

function buildLoadingStatus(watchlist, previousStatus = createEmptyMarketStatus()) {
  const nextStatus = createEmptyMarketStatus();

  MARKETS.forEach((market) => {
    const hasItems = (watchlist[market] || []).length > 0;
    nextStatus[market] = {
      ...previousStatus[market],
      loading: hasItems,
      error: hasItems ? "" : previousStatus[market]?.error || ""
    };
  });

  return nextStatus;
}

async function hasOffscreenDocument() {
  if (!chrome.offscreen) {
    return false;
  }

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [OFFSCREEN_DOCUMENT_URL]
    });
    return contexts.length > 0;
  }

  const matchedClients = await self.clients.matchAll();
  return matchedClients.some((client) => client.url === OFFSCREEN_DOCUMENT_URL);
}

async function ensureOffscreenRefresher() {
  if (!chrome.offscreen) {
    return;
  }

  if (await hasOffscreenDocument()) {
    return;
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: OFFSCREEN_REFRESH_REASONS,
    justification: "Run second-level stock refresh intervals in the background"
  });

  try {
    await creatingOffscreenDocument;
  } finally {
    creatingOffscreenDocument = null;
  }
}

async function stopOffscreenRefresher() {
  if (!chrome.offscreen) {
    return;
  }

  if (!(await hasOffscreenDocument())) {
    return;
  }

  await chrome.offscreen.closeDocument();
}

async function sendOffscreenConfig(enabled, intervalSeconds) {
  if (!chrome.offscreen) {
    return;
  }

  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "OFFSCREEN_REFRESHER_CONFIG",
        enabled,
        intervalSeconds
      });

      if (response?.ok === false) {
        throw new Error(response.error || "Failed to configure offscreen refresher");
      }

      return;
    } catch (error) {
      lastError = error;
      await delay(100);
    }
  }

  if (lastError) {
    throw lastError;
  }
}

async function updateOffscreenInterval() {
  const state = await getStorageState();
  const shouldRun = state.settings.autoRefresh && hasWatchlistItems(state.watchlist);

  if (!shouldRun) {
    await stopOffscreenRefresher();
    return;
  }

  await ensureOffscreenRefresher();
  const intervalSeconds = normalizeRefreshIntervalSeconds(state.settings.refreshIntervalSeconds);
  try {
    await sendOffscreenConfig(true, intervalSeconds);
  } catch (error) {
    console.warn("Failed to sync offscreen refresh interval", error);
  }
}

async function setBadge(activeCount, alertsEnabled = true) {
  if (!alertsEnabled || activeCount <= 0) {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "股票监控" });
    return;
  }

  await chrome.action.setBadgeBackgroundColor({ color: "#9f3f2b" });
  await chrome.action.setBadgeText({
    text: activeCount > 99 ? "99+" : String(activeCount)
  });
  await chrome.action.setTitle({
    title: `股票监控（${activeCount} 只触发股票）`
  });
}

async function syncBadgeFromStorage() {
  const state = await getStorageState();
  const { activeCount } = evaluateAlerts({
    watchlist: state.watchlist,
    quotes: state.quotes,
    settings: state.settings,
    previousAlertState: state.alertState
  });

  await setBadge(activeCount, state.settings.alertsEnabled);
}

async function refreshQuotesInternal(reason = "manual") {
  const state = await getStorageState();
  const ids = collectWatchlistIds(state.watchlist);

  if (!ids.size) {
    const emptyMeta = {
      ...state.meta,
      marketStatus: createEmptyMarketStatus()
    };
    await chrome.storage.local.set({
      quotes: {},
      alertState: {},
      meta: emptyMeta
    });
    await setBadge(0, state.settings.alertsEnabled);
    return { ok: true, reason };
  }

  await chrome.storage.local.set({
    meta: {
      ...state.meta,
      marketStatus: buildLoadingStatus(state.watchlist, state.meta.marketStatus)
    }
  });

  const result = await fetchQuotesForWatchlist(state.watchlist);
  const hasWatchlistUpdates = Object.keys(result.watchlistUpdates || {}).length > 0;
  const nextWatchlist = hasWatchlistUpdates
    ? applyWatchlistUpdates(state.watchlist, result.watchlistUpdates)
    : state.watchlist;
  const nextIds = collectWatchlistIds(nextWatchlist);
  const nextQuotes = pruneObjectByIds(state.quotes, nextIds);

  Object.entries(result.quotes).forEach(([stockId, quote]) => {
    const previous = state.quotes[stockId] || {};
    nextQuotes[stockId] = quote.error ? { ...previous, ...quote } : quote;
  });

  const nextMeta = {
    ...state.meta,
    lastRefreshAt: new Date().toISOString(),
    marketStatus: result.marketStatus
  };

  const { alertState, activeCount } = evaluateAlerts({
    watchlist: nextWatchlist,
    quotes: nextQuotes,
    settings: state.settings,
    previousAlertState: state.alertState
  });

  const payload = {
    quotes: nextQuotes,
    meta: nextMeta,
    alertState
  };

  if (hasWatchlistUpdates) {
    payload.watchlist = nextWatchlist;
  }

  await chrome.storage.local.set(payload);

  await setBadge(activeCount, state.settings.alertsEnabled);
  return { ok: true, reason };
}

function refreshQuotes(reason = "manual") {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshQuotesInternal(reason).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function initialize(shouldRefresh) {
  await ensureStorageState();
  await updateOffscreenInterval();
  await syncBadgeFromStorage();

  if (shouldRefresh) {
    const state = await getStorageState();
    if (hasWatchlistItems(state.watchlist)) {
      await refreshQuotes("startup");
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize(true);
});

chrome.runtime.onStartup.addListener(() => {
  void initialize(true);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.settings || changes.watchlist) {
    void updateOffscreenInterval();
  }

  if (changes.settings || changes.watchlist || changes.quotes || changes.alertState) {
    void syncBadgeFromStorage();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REFRESH_QUOTES") {
    refreshQuotes(message.reason || "popup")
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "SYNC_BADGE") {
    syncBadgeFromStorage()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "OFFSCREEN_REFRESH_TICK") {
    refreshQuotes("offscreen-tick")
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === "OFFSCREEN_REFRESHER_READY") {
    updateOffscreenInterval()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
