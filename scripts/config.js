export const MARKETS = ["a", "hk", "us"];

export const MARKET_META = {
  a: {
    titleKey: "market.a",
    subtitleKey: "search.a.subtitle",
    hintKey: "search.a.hint",
    badge: "🇨🇳",
    accent: "#d65d34",
    currency: "CNY"
  },
  hk: {
    titleKey: "market.hk",
    subtitleKey: "search.hk.subtitle",
    hintKey: "search.hk.hint",
    badge: "🇭🇰",
    accent: "#0f8057",
    currency: "HKD"
  },
  us: {
    titleKey: "market.us",
    subtitleKey: "search.us.subtitle",
    hintKey: "search.us.hint",
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
  priceAlertEnabled: true,
  language: "zh"
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

export const MARKET_INDICES = {
  a: [
    { symbol: "s_sh000001", nameKey: "index.sh" },
    { symbol: "s_sz399001", nameKey: "index.sz" }
  ],
  hk: [
    { symbol: "r_hkHSI", nameKey: "index.hsi" },
    { symbol: "r_hkHSTECH", nameKey: "index.hstech" }
  ],
  us: [
    { symbol: "usINX", nameKey: "index.spx" },
    { symbol: "usIXIC", nameKey: "index.ixic" }
  ]
};

export const DEFAULT_META = Object.freeze({
  lastRefreshAt: null,
  marketStatus: createEmptyMarketStatus()
});

export const STORAGE_KEYS = ["watchlist", "quotes", "settings", "alertState", "meta", "indexQuotes", "uiState"];
