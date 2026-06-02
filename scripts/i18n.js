const messages = {
  zh: {
    "market.a": "A股",
    "market.hk": "港股",
    "market.us": "美股",
    "market.switch": "切换市场",
    "search.a.subtitle": "沪深代码 / 中文名 / 拼音",
    "search.a.hint": "例如 600519、茅台、gzmt",
    "search.hk.subtitle": "港股代码 / 中文名 / 拼音",
    "search.hk.hint": "例如 00700、腾讯、txkg",
    "search.us.subtitle": "股票代码 / 英文名",
    "search.us.hint": "例如 AAPL、Apple、NVDA",
    "search.loading": "正在补全更多全市场结果…",
    "search.empty": "搜索添加股票",
    "settings.title": "设置",
    "settings.autoRefresh": "自动刷新",
    "settings.refreshInterval": "刷新间隔",
    "settings.frequency": "频率",
    "settings.seconds": "秒",
    "settings.alerts": "提醒设置",
    "settings.badgeAlert": "角标提醒",
    "settings.changeAlert": "涨跌幅提醒",
    "settings.priceAlert": "目标价提醒",
    "settings.language": "语言",
    "settings.back": "返回",
    "alert.change.title": "涨跌幅提醒",
    "alert.change.threshold": "涨跌幅 %",
    "alert.change.percent": "%",
    "alert.price.title": "目标价提醒",
    "alert.price.direction.gte": "≥",
    "alert.price.direction.lte": "≤",
    "alert.price.target": "目标价",
    "alert.clear": "清空",
    "alert.save": "保存",
    "alert.cancel": "取消",
    "stock.add": "添加",
    "stock.remove": "删除",
    "stock.alert": "提醒",
    "stock.noData": "暂无数据",
    "stock.lastUpdated": "最后更新",
    "stock.dragHint": "按住拖动排序",
    "error.loadFailed": "加载失败",
    "error.searchFailed": "搜索失败",
    "error.sortFailed": "更新排序失败",
    "error.refreshFailed": "刷新失败",
    "error.requestFailed": "请求失败",
    "error.stockExists": "股票已存在，无需重复添加。",
    "lang.zh": "中文",
    "lang.en": "English"
  },
  en: {
    "market.a": "A-Share",
    "market.hk": "HK",
    "market.us": "US",
    "market.switch": "Switch Market",
    "search.a.subtitle": "Code / Name / Pinyin",
    "search.a.hint": "e.g. 600519, Maotai, gzmt",
    "search.hk.subtitle": "Code / Name / Pinyin",
    "search.hk.hint": "e.g. 00700, Tencent, txkg",
    "search.us.subtitle": "Ticker / Company",
    "search.us.hint": "e.g. AAPL, Apple, NVDA",
    "search.loading": "Loading more results…",
    "search.empty": "Search to add stocks",
    "settings.title": "Settings",
    "settings.autoRefresh": "Auto Refresh",
    "settings.refreshInterval": "Refresh Interval",
    "settings.frequency": "Frequency",
    "settings.seconds": "sec",
    "settings.alerts": "Alerts",
    "settings.badgeAlert": "Badge Alert",
    "settings.changeAlert": "Change Alert",
    "settings.priceAlert": "Price Alert",
    "settings.language": "Language",
    "settings.back": "Back",
    "alert.change.title": "Change Alert",
    "alert.change.threshold": "Change %",
    "alert.change.percent": "%",
    "alert.price.title": "Price Alert",
    "alert.price.direction.gte": "≥",
    "alert.price.direction.lte": "≤",
    "alert.price.target": "Target Price",
    "alert.clear": "Clear",
    "alert.save": "Save",
    "alert.cancel": "Cancel",
    "stock.add": "Add",
    "stock.remove": "Remove",
    "stock.alert": "Alert",
    "stock.noData": "No Data",
    "stock.lastUpdated": "Last Updated",
    "stock.dragHint": "Hold to drag",
    "error.loadFailed": "Load Failed",
    "error.searchFailed": "Search Failed",
    "error.sortFailed": "Sort failed",
    "error.refreshFailed": "Refresh failed",
    "error.requestFailed": "Request failed",
    "error.stockExists": "Stock already exists.",
    "lang.zh": "中文",
    "lang.en": "English"
  }
};

let currentLang = "zh";

export async function initI18n() {
  try {
    const { settings } = await chrome.storage.local.get("settings");
    currentLang = settings?.language || "zh";
  } catch {
    // Use default zh
  }
}

export function t(key) {
  return messages[currentLang]?.[key] || messages.zh[key] || key;
}

export function getLang() {
  return currentLang;
}

export async function setLang(lang) {
  currentLang = lang;
  const { settings } = await chrome.storage.local.get("settings");
  await chrome.storage.local.set({ settings: { ...settings, language: lang } });
}
