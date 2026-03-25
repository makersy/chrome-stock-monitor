import { MARKET_META, MARKETS, STORAGE_KEYS } from "./config.js";
import { searchMarketSuggestions, shouldUseRemoteSearch } from "./data/search-provider.js";
import {
  getStorageState,
  removeWatchlistStock,
  updateSettings,
  updateStockAlerts,
  upsertWatchlistStock
} from "./storage.js";

const app = document.querySelector("#app");

const uiState = {
  activeMarket: "a",
  search: {
    a: "",
    hk: "",
    us: ""
  },
  searchResults: {
    a: [],
    hk: [],
    us: []
  },
  searchLoading: {
    a: false,
    hk: false,
    us: false
  },
  searchSource: {
    a: "local",
    hk: "local",
    us: "local"
  },
  isComposing: {
    a: false,
    hk: false,
    us: false
  },
  marketScroll: {
    a: 0,
    hk: 0,
    us: 0
  },
  settingsOpen: false,
  openAlertEditorId: null,
  errorMessage: ""
};

const searchRequestIds = {
  a: 0,
  hk: 0,
  us: 0
};

let state = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(_market, value) {
  if (!Number.isFinite(Number(value))) {
    return "--";
  }

  return Number(value).toFixed(2);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function getPriceClass(changePercent) {
  const value = Number(changePercent);
  if (value > 0) {
    return "up";
  }
  if (value < 0) {
    return "down";
  }
  return "flat";
}

function getExistingIds(market) {
  return new Set((state.watchlist[market] || []).map((stock) => stock.id));
}

function getSuggestions(market) {
  return uiState.searchResults[market] || [];
}

function resetSearchState(market) {
  searchRequestIds[market] += 1;
  uiState.searchResults[market] = [];
  uiState.searchLoading[market] = false;
  uiState.searchSource[market] = "local";
}

async function loadSuggestionsForMarket(market, query, cursorPosition = null) {
  uiState.searchResults[market] = [];
  uiState.searchSource[market] = "local";

  const hasQuery = Boolean(String(query || "").trim());
  if (!hasQuery) {
    uiState.searchLoading[market] = false;
    render();
    if (cursorPosition !== null && !uiState.isComposing[market]) {
      focusSearchInput(market, cursorPosition);
    }
    return;
  }

  const useRemote = shouldUseRemoteSearch(market, query);
  const requestId = ++searchRequestIds[market];
  uiState.searchLoading[market] = useRemote;
  render();
  if (cursorPosition !== null && !uiState.isComposing[market]) {
    focusSearchInput(market, cursorPosition);
  }

  if (!useRemote) {
    return;
  }

  const { items, source } = await searchMarketSuggestions(
    market,
    query,
    getExistingIds(market),
    [],
    8
  );

  if (requestId !== searchRequestIds[market] || uiState.search[market] !== query) {
    return;
  }

  uiState.searchResults[market] = items;
  uiState.searchLoading[market] = false;
  uiState.searchSource[market] = source;
  render();
  if (cursorPosition !== null && !uiState.isComposing[market]) {
    focusSearchInput(market, cursorPosition);
  }
}

function captureActiveMarketScroll() {
  const body = app.querySelector("[data-market-body='1']");
  if (!(body instanceof HTMLElement)) {
    return;
  }

  uiState.marketScroll[uiState.activeMarket] = body.scrollTop;
}

function restoreActiveMarketScroll() {
  const body = app.querySelector("[data-market-body='1']");
  if (!(body instanceof HTMLElement)) {
    return;
  }

  body.scrollTop = uiState.marketScroll[uiState.activeMarket] || 0;
}

function renderMarketTabs() {
  return `
    <section class="market-tabs" role="tablist" aria-label="市场切换">
      ${MARKETS.map((market) => {
        const meta = MARKET_META[market];
        const active = market === uiState.activeMarket;
        return `
          <button
            type="button"
            class="market-tab ${active ? "active" : ""}"
            data-action="switch-market"
            data-market="${market}"
            data-accent="${meta.accent}"
            role="tab"
            aria-selected="${active ? "true" : "false"}"
            title="切换市场"
          >
            <span class="market-tab-flag" aria-hidden="true">${meta.badge}</span>
            <span class="market-tab-count">${(state.watchlist[market] || []).length}</span>
            <span class="sr-only">${meta.title}</span>
          </button>
        `;
      }).join("")}
    </section>
  `;
}

function renderControlRow() {
  return `
    <section class="control-row">
      ${renderMarketTabs()}
      <button
        type="button"
        class="market-tab settings-btn"
        data-action="toggle-settings"
        title="设置"
        aria-label="设置"
      >⚙</button>
    </section>
  `;
}

function renderSettingsPage() {
  return `
    <div class="shell">
      <div class="page-header">
        <button type="button" class="icon-action-sm" data-action="toggle-settings" title="返回" aria-label="返回">←</button>
        <span class="page-title">设置</span>
      </div>
      <div class="settings-list">
        <div class="setting-item">
          <span class="setting-icon">⟳</span>
          <span class="setting-label">自动刷新</span>
          <label class="switch">
            <input type="checkbox" data-setting-key="autoRefresh" ${
              state.settings.autoRefresh ? "checked" : ""
            } />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <span class="setting-icon">⏱</span>
          <span class="setting-label">频率</span>
          <select class="setting-select" data-setting-key="refreshIntervalMinutes">
            <option value="1" ${
              state.settings.refreshIntervalMinutes === 1 ? "selected" : ""
            }>1m</option>
            <option value="3" ${
              state.settings.refreshIntervalMinutes === 3 ? "selected" : ""
            }>3m</option>
            <option value="5" ${
              state.settings.refreshIntervalMinutes === 5 ? "selected" : ""
            }>5m</option>
          </select>
        </div>
        <div class="setting-item">
          <span class="setting-icon">🔔</span>
          <span class="setting-label">Badge</span>
          <label class="switch">
            <input type="checkbox" data-setting-key="alertsEnabled" ${
              state.settings.alertsEnabled ? "checked" : ""
            } />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <span class="setting-icon">%</span>
          <span class="setting-label">涨跌幅</span>
          <label class="switch">
            <input type="checkbox" data-setting-key="changeAlertEnabled" ${
              state.settings.changeAlertEnabled ? "checked" : ""
            } />
            <span class="slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <span class="setting-icon">¥</span>
          <span class="setting-label">目标价</span>
          <label class="switch">
            <input type="checkbox" data-setting-key="priceAlertEnabled" ${
              state.settings.priceAlertEnabled ? "checked" : ""
            } />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  `;
}

function renderSuggestions(market) {
  const suggestions = getSuggestions(market);
  const isLoading = uiState.searchLoading[market];

  if (!uiState.search[market] || (!suggestions.length && !isLoading)) {
    return "";
  }

  return `
    <div class="suggestions">
      ${suggestions
        .map((stock) => {
          const label = stock.label || stock.name;
          return `
            <button
              class="suggestion"
              type="button"
              data-action="add-suggestion"
              data-market="${market}"
              data-symbol="${escapeHtml(stock.symbol)}"
              data-code="${escapeHtml(stock.code)}"
              data-name="${escapeHtml(stock.name)}"
              data-custom="${stock.isCustom ? "1" : "0"}"
              title="添加 ${escapeHtml(label)}"
            >
              <div class="suggestion-copy">
                <div class="suggestion-name">${escapeHtml(label)}</div>
                <div class="suggestion-meta">${escapeHtml(stock.code)} · ${escapeHtml(
                  stock.symbol
                )}</div>
              </div>
              <span class="suggestion-add">＋</span>
            </button>
          `;
        })
        .join("")}
      ${
        isLoading
          ? '<div class="suggestion-state">正在补全更多全市场结果…</div>'
          : ""
      }
    </div>
  `;
}

function renderAlertEditor(stock) {
  if (uiState.openAlertEditorId !== stock.id) {
    return "";
  }

  const alerts = stock.alerts || {};
  return `
    <form class="alert-editor" data-alert-form="1" data-market="${stock.market}" data-stock-id="${
      stock.id
    }">
      <div class="alert-grid">
        <input type="number" step="0.1" min="0" name="changeThreshold" value="${escapeHtml(alerts.changeThreshold || "")}" placeholder="涨跌幅 %" />
        <input type="number" step="0.01" name="priceTarget" value="${escapeHtml(alerts.priceTarget || "")}" placeholder="目标价" />
        <select name="priceDirection">
          <option value="gte" ${alerts.priceDirection !== "lte" ? "selected" : ""}>≥</option>
          <option value="lte" ${alerts.priceDirection === "lte" ? "selected" : ""}>≤</option>
        </select>
      </div>
      <div class="editor-actions">
        <button type="button" class="ghost" data-action="reset-alerts" data-market="${
          stock.market
        }" data-stock-id="${stock.id}">清空</button>
        <button type="submit" class="save">保存</button>
      </div>
    </form>
  `;
}

function renderStockCard(stock) {
  const quote = state.quotes[stock.id] || {};
  const alertState = state.alertState[stock.id] || {};
  const priceClass = getPriceClass(quote.changePercent);
  const hasAlert = Boolean(stock.alerts.changeThreshold || stock.alerts.priceTarget);

  const badges = [
    alertState.change?.active ? `<span class="dot warn"></span>` : "",
    alertState.price?.active ? `<span class="dot warn"></span>` : "",
    quote.error ? `<span class="dot err"></span>` : ""
  ].filter(Boolean).join("");

  return `
    <article class="stock-line">
      <div class="sl-name">
        <span class="sl-label">${escapeHtml(stock.name)}</span>
        <span class="sl-code">${escapeHtml(stock.code)}</span>
        ${badges}
      </div>
      <span class="sl-price ${priceClass}">${formatCurrency(stock.market, quote.price)}</span>
      <span class="sl-change ${priceClass}">${formatPercent(quote.changePercent)}</span>
      <div class="sl-actions">
        <button type="button" class="icon-action-sm ${hasAlert ? "active" : ""}" data-action="toggle-alert-editor" data-stock-id="${stock.id}" title="提醒" aria-label="提醒">🔔</button>
        <button type="button" class="icon-action-sm danger" data-action="delete-stock" data-market="${stock.market}" data-stock-id="${stock.id}" title="删除" aria-label="删除">✕</button>
      </div>
    </article>
    ${renderAlertEditor(stock)}
  `;
}

function renderMarketColumn(market) {
  const meta = MARKET_META[market];
  const stocks = state.watchlist[market] || [];
  const marketStatus = state.meta.marketStatus[market] || {};

  const statusIcon = marketStatus.loading ? "⟳" : marketStatus.error ? "!" : "";

  return `
    <section class="market">
      <div class="add-panel">
        <div class="search-shell">
          <span class="search-icon">⌕</span>
          <input
            class="search-input"
            data-search-input="${market}"
            data-market="${market}"
            value="${escapeHtml(uiState.search[market])}"
            placeholder="${meta.hint}"
          />
          ${statusIcon ? `<span class="search-status ${marketStatus.error ? "error" : "loading"}">${statusIcon}</span>` : ""}
        </div>
        ${renderSuggestions(market)}
      </div>
      <div class="market-body" data-market-body="1">
        <div class="list">
          ${
            stocks.length
              ? stocks.map((stock) => renderStockCard(stock)).join("")
              : `<div class="empty">搜索添加股票</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function render() {
  if (uiState.settingsOpen) {
    app.innerHTML = renderSettingsPage();
    return;
  }

  captureActiveMarketScroll();

  app.innerHTML = `
    <div class="shell">
      ${renderControlRow()}
      ${uiState.errorMessage ? `<div class="error-banner">${escapeHtml(uiState.errorMessage)}</div>` : ""}
      <section class="market-stage">
        ${renderMarketColumn(uiState.activeMarket)}
      </section>
    </div>
  `;

  restoreActiveMarketScroll();
}

function focusSearchInput(market, cursorPosition) {
  const input = app.querySelector(`[data-search-input="${market}"]`);
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  input.focus();
  const position = Number.isInteger(cursorPosition) ? cursorPosition : input.value.length;
  input.setSelectionRange(position, position);
}

async function refreshState() {
  state = await getStorageState();
  render();
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.ok === false) {
        reject(new Error(response.error || "请求失败"));
        return;
      }

      resolve(response);
    });
  });
}

async function manualRefresh(reason) {
  uiState.errorMessage = "";
  render();

  try {
    await sendMessage({
      type: "REFRESH_QUOTES",
      reason
    });
  } catch (error) {
    uiState.errorMessage = error.message || "刷新失败";
    render();
  }
}

async function addStockCandidate(stock) {
  const { added } = await upsertWatchlistStock(stock);
  uiState.search[stock.market] = "";
  resetSearchState(stock.market);
  uiState.errorMessage = added ? "" : "股票已存在，无需重复添加。";
  await refreshState();

  if (added) {
    await manualRefresh("add-stock");
  }
}

async function handleAddSuggestion(button) {
  await addStockCandidate({
    market: button.dataset.market,
    symbol: button.dataset.symbol,
    code: button.dataset.code,
    name: button.dataset.name,
    isCustom: button.dataset.custom === "1"
  });
}

async function handleDeleteStock(button) {
  await removeWatchlistStock(button.dataset.market, button.dataset.stockId);
  uiState.openAlertEditorId =
    uiState.openAlertEditorId === button.dataset.stockId ? null : uiState.openAlertEditorId;
  await refreshState();
  await sendMessage({ type: "SYNC_BADGE" });
}

async function handleSettingChange(target) {
  const key = target.dataset.settingKey;
  const value =
    target.type === "checkbox" ? target.checked : Number(target.value || "1");

  await updateSettings({ [key]: value });
  await refreshState();
  await sendMessage({ type: "SYNC_BADGE" });
}

function getFirstSuggestionForMarket(market) {
  const suggestions = getSuggestions(market);
  return suggestions[0] || null;
}

async function handleAlertSubmit(form) {
  const formData = new FormData(form);
  await updateStockAlerts(form.dataset.market, form.dataset.stockId, {
    changeThreshold: formData.get("changeThreshold"),
    priceTarget: formData.get("priceTarget"),
    priceDirection: formData.get("priceDirection")
  });
  uiState.openAlertEditorId = null;
  await refreshState();
  await sendMessage({ type: "SYNC_BADGE" });
}

async function resetAlerts(button) {
  await updateStockAlerts(button.dataset.market, button.dataset.stockId, {
    changeThreshold: "",
    priceTarget: "",
    priceDirection: "gte"
  });
  uiState.openAlertEditorId = null;
  await refreshState();
  await sendMessage({ type: "SYNC_BADGE" });
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === "toggle-settings") {
    uiState.settingsOpen = !uiState.settingsOpen;
    render();
    return;
  }

  if (action === "switch-market") {
    const nextMarket = target.dataset.market;
    if (nextMarket && MARKETS.includes(nextMarket) && nextMarket !== uiState.activeMarket) {
      captureActiveMarketScroll();
      uiState.activeMarket = nextMarket;
      render();
    }
    return;
  }

  if (action === "add-suggestion") {
    await handleAddSuggestion(target);
    return;
  }

  if (action === "delete-stock") {
    await handleDeleteStock(target);
    return;
  }

  if (action === "toggle-alert-editor") {
    uiState.openAlertEditorId =
      uiState.openAlertEditorId === target.dataset.stockId
        ? null
        : target.dataset.stockId;
    render();
    return;
  }

  if (action === "close-alert-editor") {
    uiState.openAlertEditorId = null;
    render();
    return;
  }

  if (action === "reset-alerts") {
    await resetAlerts(target);
  }
});

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const market = target.dataset.searchInput;
  if (market && MARKETS.includes(market)) {
    uiState.search[market] = target.value;
    if (target.isComposing || uiState.isComposing[market]) {
      return;
    }
    const cursorPosition = target.selectionStart ?? target.value.length;
    void loadSuggestionsForMarket(market, target.value, cursorPosition);
  }
});

app.addEventListener("compositionstart", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const market = target.dataset.searchInput;
  if (market && MARKETS.includes(market)) {
    uiState.isComposing[market] = true;
  }
});

app.addEventListener("compositionend", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const market = target.dataset.searchInput;
  if (market && MARKETS.includes(market)) {
    uiState.isComposing[market] = false;
    uiState.search[market] = target.value;
    const cursorPosition = target.selectionStart ?? target.value.length;
    void loadSuggestionsForMarket(market, target.value, cursorPosition);
  }
});

app.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.dataset.settingKey) {
    await handleSettingChange(target);
  }
});

app.addEventListener("keydown", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const market = target.dataset.searchInput;
  if (market && event.key === "Enter" && !event.isComposing && !uiState.isComposing[market]) {
    event.preventDefault();
    const suggestion = getFirstSuggestionForMarket(market);

    if (suggestion) {
      await addStockCandidate(suggestion);
    }
  }
});

app.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.alertForm) {
    return;
  }

  event.preventDefault();
  await handleAlertSubmit(form);
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.closest(".add-panel")) {
    let changed = false;
    MARKETS.forEach((market) => {
      if (uiState.search[market]) {
        uiState.search[market] = "";
        resetSearchState(market);
        changed = true;
      }
    });
    if (changed) {
      render();
    }
  }
});

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const shouldRefresh = STORAGE_KEYS.some((key) => Object.hasOwn(_changes, key));
  if (shouldRefresh) {
    void refreshState();
  }
});

app.addEventListener(
  "scroll",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.dataset.marketBody !== "1") {
      return;
    }

    uiState.marketScroll[uiState.activeMarket] = target.scrollTop;
  },
  true
);

async function boot() {
  await refreshState();

  const hasItems = MARKETS.some((market) => (state.watchlist[market] || []).length > 0);
  const shouldRefresh = hasItems && !state.meta.lastRefreshAt;

  if (shouldRefresh) {
    await manualRefresh("popup-boot");
  }
}

void boot();
