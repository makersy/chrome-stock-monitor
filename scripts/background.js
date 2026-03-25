import { evaluateAlerts } from "./alerts.js";
import {
  MARKETS,
  REFRESH_ALARM_NAME,
  createEmptyMarketStatus
} from "./config.js";
import { fetchQuotesForWatchlist } from "./quotes/market-service.js";
import {
  collectWatchlistIds,
  ensureStorageState,
  getStorageState,
  normalizeWatchlist,
  pruneObjectByIds
} from "./storage.js";

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
    title: `股票监控（${activeCount} 条提醒）`
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

async function configureRefreshAlarm() {
  const state = await getStorageState();
  await chrome.alarms.clear(REFRESH_ALARM_NAME);

  if (state.settings.autoRefresh && hasWatchlistItems(state.watchlist)) {
    await chrome.alarms.create(REFRESH_ALARM_NAME, {
      periodInMinutes: state.settings.refreshIntervalMinutes
    });
  }
}

async function refreshQuotes(reason = "manual") {
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
  const nextWatchlist = applyWatchlistUpdates(state.watchlist, result.watchlistUpdates);
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

  await chrome.storage.local.set({
    watchlist: nextWatchlist,
    quotes: nextQuotes,
    meta: nextMeta,
    alertState
  });

  await setBadge(activeCount, state.settings.alertsEnabled);
  return { ok: true, reason };
}

async function initialize(shouldRefresh) {
  await ensureStorageState();
  await configureRefreshAlarm();
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

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM_NAME) {
    void refreshQuotes("alarm");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.settings || changes.watchlist) {
    void configureRefreshAlarm();
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

  return false;
});
