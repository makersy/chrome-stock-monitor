export const MARKETS = ["a", "hk", "us"];

export const MARKET_META = {
  a: {
    title: "A股",
    subtitle: "沪深代码 / 中文名 / 拼音",
    hint: "例如 600519、茅台、gzmt",
    badge: "🇨🇳",
    accent: "#d65d34",
    currency: "CNY"
  },
  hk: {
    title: "港股",
    subtitle: "港股代码 / 中文名 / 拼音",
    hint: "例如 00700、腾讯、txkg",
    badge: "🇭🇰",
    accent: "#0f8057",
    currency: "HKD"
  },
  us: {
    title: "美股",
    subtitle: "股票代码 / 英文名",
    hint: "例如 AAPL、Apple、NVDA",
    badge: "🇺🇸",
    accent: "#1d6bd6",
    currency: "USD"
  }
};

export const DEFAULT_SETTINGS = Object.freeze({
  autoRefresh: true,
  refreshIntervalSeconds: 30,
  alertsEnabled: true,
  changeAlertEnabled: true,
  priceAlertEnabled: true
});

export const DEFAULT_ALERTS = Object.freeze({
  changeThreshold: "",
  priceTarget: "",
  priceDirection: "gte"
});

export const DEFAULT_WATCHLIST = Object.freeze({
  a: [],
  hk: [],
  us: []
});

function createEmptyStatus() {
  return {
    loading: false,
    error: "",
    lastUpdated: null
  };
}

export function createEmptyMarketStatus() {
  return {
    a: createEmptyStatus(),
    hk: createEmptyStatus(),
    us: createEmptyStatus()
  };
}

export const DEFAULT_META = Object.freeze({
  lastRefreshAt: null,
  marketStatus: createEmptyMarketStatus()
});

export const STORAGE_KEYS = ["watchlist", "quotes", "settings", "alertState", "meta"];
