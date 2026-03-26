import {
  DEFAULT_ALERTS,
  DEFAULT_META,
  DEFAULT_SETTINGS,
  DEFAULT_WATCHLIST,
  MARKETS,
  STORAGE_KEYS,
  createEmptyMarketStatus
} from "./config.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodeEscapedText(value) {
  return String(value || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/\\x([0-9a-fA-F]{2})/g, (_match, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );
}

function sanitizeNumericInput(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).trim();
  if (!text) {
    return "";
  }

  return /^-?\d+(\.\d+)?$/.test(text) ? text : "";
}

export function normalizeAlerts(alerts = {}) {
  return {
    changeThreshold: sanitizeNumericInput(alerts.changeThreshold),
    priceTarget: sanitizeNumericInput(alerts.priceTarget),
    priceDirection: alerts.priceDirection === "lte" ? "lte" : "gte"
  };
}

export function prepareStockRecord(stock) {
  return {
    id: stock.id || `${stock.market}:${stock.symbol}`,
    market: stock.market,
    symbol: String(stock.symbol || "").trim(),
    code: String(stock.code || "").trim().toUpperCase(),
    name: decodeEscapedText(stock.name || stock.code || "").trim(),
    isCustom: Boolean(stock.isCustom),
    alerts: normalizeAlerts(stock.alerts || DEFAULT_ALERTS)
  };
}

export function normalizeWatchlist(watchlist = {}) {
  const next = clone(DEFAULT_WATCHLIST);

  MARKETS.forEach((market) => {
    const items = Array.isArray(watchlist[market]) ? watchlist[market] : [];
    next[market] = items
      .map((stock) => {
        if (!stock || !stock.symbol || !stock.market) {
          return null;
        }
        return prepareStockRecord(stock);
      })
      .filter(Boolean);
  });

  return next;
}

export function normalizeSettings(settings = {}) {
  const restSettings = { ...settings };
  delete restSettings.refreshIntervalMinutes;
  const intervalSeconds = Number(settings.refreshIntervalSeconds);
  const legacyMinutes = Number(settings.refreshIntervalMinutes);
  const normalizedInterval = Number.isFinite(intervalSeconds)
    ? Math.min(30, Math.max(1, Math.round(intervalSeconds)))
    : [1, 3, 5].includes(legacyMinutes)
      ? 30
      : DEFAULT_SETTINGS.refreshIntervalSeconds;

  return {
    ...DEFAULT_SETTINGS,
    ...restSettings,
    refreshIntervalSeconds: normalizedInterval,
    autoRefresh: settings.autoRefresh ?? DEFAULT_SETTINGS.autoRefresh,
    alertsEnabled: settings.alertsEnabled ?? DEFAULT_SETTINGS.alertsEnabled,
    changeAlertEnabled:
      settings.changeAlertEnabled ?? DEFAULT_SETTINGS.changeAlertEnabled,
    priceAlertEnabled:
      settings.priceAlertEnabled ?? DEFAULT_SETTINGS.priceAlertEnabled
  };
}

export function normalizeMeta(meta = {}) {
  const defaultStatus = createEmptyMarketStatus();
  const providedStatus = meta.marketStatus || {};

  return {
    ...clone(DEFAULT_META),
    ...meta,
    marketStatus: MARKETS.reduce((acc, market) => {
      acc[market] = {
        ...defaultStatus[market],
        ...(providedStatus[market] || {})
      };
      return acc;
    }, {})
  };
}

function normalizeRecord(value) {
  return value && typeof value === "object" ? value : {};
}

export async function ensureStorageState() {
  const current = await chrome.storage.local.get(STORAGE_KEYS);

  const next = {
    watchlist: normalizeWatchlist(current.watchlist),
    quotes: normalizeRecord(current.quotes),
    settings: normalizeSettings(current.settings),
    alertState: normalizeRecord(current.alertState),
    meta: normalizeMeta(current.meta)
  };

  const currentSnapshot = JSON.stringify({
    watchlist: current.watchlist || DEFAULT_WATCHLIST,
    quotes: current.quotes || {},
    settings: current.settings || DEFAULT_SETTINGS,
    alertState: current.alertState || {},
    meta: current.meta || DEFAULT_META
  });
  const nextSnapshot = JSON.stringify(next);

  if (currentSnapshot !== nextSnapshot) {
    await chrome.storage.local.set(next);
  }

  return next;
}

export async function getStorageState() {
  return ensureStorageState();
}

export async function setStoragePart(partial) {
  await chrome.storage.local.set(partial);
  return getStorageState();
}

export function collectWatchlistIds(watchlist) {
  const ids = new Set();
  MARKETS.forEach((market) => {
    (watchlist[market] || []).forEach((stock) => ids.add(stock.id));
  });
  return ids;
}

export function pruneObjectByIds(record, ids) {
  const next = {};
  Object.entries(record || {}).forEach(([key, value]) => {
    if (ids.has(key)) {
      next[key] = value;
    }
  });
  return next;
}

export async function upsertWatchlistStock(stock) {
  const state = await getStorageState();
  const nextWatchlist = normalizeWatchlist(state.watchlist);
  const item = prepareStockRecord(stock);
  const exists = nextWatchlist[item.market].some((entry) => entry.id === item.id);

  if (!exists) {
    nextWatchlist[item.market] = [item, ...nextWatchlist[item.market]];
    await chrome.storage.local.set({ watchlist: nextWatchlist });
  }

  return {
    added: !exists,
    stock: item
  };
}

export async function importSampleWatchlist(sampleWatchlist) {
  const state = await getStorageState();
  const nextWatchlist = normalizeWatchlist(state.watchlist);
  let addedCount = 0;

  MARKETS.forEach((market) => {
    (sampleWatchlist[market] || []).forEach((stock) => {
      const item = prepareStockRecord(stock);
      const exists = nextWatchlist[market].some((entry) => entry.id === item.id);
      if (!exists) {
        nextWatchlist[market].push(item);
        addedCount += 1;
      }
    });
  });

  if (addedCount > 0) {
    await chrome.storage.local.set({ watchlist: nextWatchlist });
  }

  return addedCount;
}

export async function removeWatchlistStock(market, stockId) {
  const state = await getStorageState();
  const nextWatchlist = normalizeWatchlist(state.watchlist);
  nextWatchlist[market] = nextWatchlist[market].filter((stock) => stock.id !== stockId);

  const nextQuotes = { ...state.quotes };
  const nextAlertState = { ...state.alertState };
  delete nextQuotes[stockId];
  delete nextAlertState[stockId];

  await chrome.storage.local.set({
    watchlist: nextWatchlist,
    quotes: nextQuotes,
    alertState: nextAlertState
  });
}

export async function updateStockAlerts(market, stockId, alerts) {
  const state = await getStorageState();
  const nextWatchlist = normalizeWatchlist(state.watchlist);
  nextWatchlist[market] = nextWatchlist[market].map((stock) => {
    if (stock.id !== stockId) {
      return stock;
    }
    return {
      ...stock,
      alerts: normalizeAlerts(alerts)
    };
  });

  const nextAlertState = { ...state.alertState };
  delete nextAlertState[stockId];

  await chrome.storage.local.set({
    watchlist: nextWatchlist,
    alertState: nextAlertState
  });
}

export async function updateSettings(settingsPatch) {
  const state = await getStorageState();
  const nextSettings = normalizeSettings({
    ...state.settings,
    ...settingsPatch
  });

  await chrome.storage.local.set({ settings: nextSettings });
  return nextSettings;
}
