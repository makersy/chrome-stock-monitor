import { MARKET_META, MARKETS, STORAGE_KEYS } from "./config.js";
import { searchMarketSuggestions, shouldUseRemoteSearch } from "./data/search-provider.js";
import {
  getStorageState,
  reorderWatchlistStocks,
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
  errorMessage: "",
  dragSort: {
    pending: null,
    active: null
  }
};

const searchRequestIds = {
  a: 0,
  hk: 0,
  us: 0
};

const MIN_REFRESH_INTERVAL_SECONDS = 1;
const MAX_REFRESH_INTERVAL_SECONDS = 30;
const LONG_PRESS_DELAY_MS = 150;
const LONG_PRESS_MOVE_THRESHOLD = 10;
const EDGE_AUTO_SCROLL_ZONE = 30;
const EDGE_AUTO_SCROLL_STEP = 8;

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

function normalizeRefreshIntervalSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return MAX_REFRESH_INTERVAL_SECONDS;
  }

  return Math.min(
    MAX_REFRESH_INTERVAL_SECONDS,
    Math.max(MIN_REFRESH_INTERVAL_SECONDS, Math.round(numeric))
  );
}

function formatCompactCount(value) {
  return value > 99 ? "99+" : String(value);
}

function getTriggeredStockCountByMarket(market) {
  const stocks = state.watchlist[market] || [];
  return stocks.reduce((total, stock) => {
    const alertState = state.alertState[stock.id];
    const triggered = Boolean(alertState?.change?.active || alertState?.price?.active);
    return total + (triggered ? 1 : 0);
  }, 0);
}

function renderStockBadges(quote, alertState) {
  return [
    alertState.change?.active
      ? '<span class="alert-chip change" title="涨跌幅提醒已触发">幅</span>'
      : "",
    alertState.price?.active
      ? '<span class="alert-chip price" title="目标价提醒已触发">价</span>'
      : "",
    quote.error ? `<span class="dot err"></span>` : ""
  ]
    .filter(Boolean)
    .join("");
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

function isDragSortBusy() {
  return Boolean(uiState.dragSort.pending || uiState.dragSort.active);
}

function releasePointerCaptureSafe(element, pointerId) {
  if (!(element instanceof HTMLElement) || !Number.isInteger(pointerId)) {
    return;
  }

  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch (_error) {
    // Ignore environments that do not support pointer capture.
  }
}

function clearPendingDragSort({ removePendingClass = true } = {}) {
  const pending = uiState.dragSort.pending;
  if (!pending) {
    return null;
  }

  if (Number.isInteger(pending.timerId)) {
    clearTimeout(pending.timerId);
  }
  if (removePendingClass && pending.lineEl instanceof HTMLElement) {
    pending.lineEl.classList.remove("reorder-pending");
  }
  releasePointerCaptureSafe(pending.lineEl, pending.pointerId);
  uiState.dragSort.pending = null;
  return pending;
}

function cleanupActiveDragSort(active) {
  if (!active) {
    return;
  }

  if (active.lineEl) {
    active.lineEl.classList.remove("drag-active", "reorder-pending");
    active.lineEl.style.position = "";
    active.lineEl.style.top = "";
    active.lineEl.style.left = "";
    active.lineEl.style.width = "";
    active.lineEl.style.zIndex = "";
    active.lineEl.style.pointerEvents = "";
  }

  if (active.placeholderEl) {
    active.placeholderEl.remove();
  }

  releasePointerCaptureSafe(active.lineEl, active.pointerId);
}

function updateDragSortPlaceholder(clientY) {
  const active = uiState.dragSort.active;
  if (!active) {
    return;
  }

  const bodyRect = active.bodyEl.getBoundingClientRect();
  if (clientY < bodyRect.top + EDGE_AUTO_SCROLL_ZONE) {
    active.bodyEl.scrollTop -= EDGE_AUTO_SCROLL_STEP;
  } else if (clientY > bodyRect.bottom - EDGE_AUTO_SCROLL_ZONE) {
    active.bodyEl.scrollTop += EDGE_AUTO_SCROLL_STEP;
  }

  const nextTop = clientY - active.offsetY;
  active.lineEl.style.top = `${nextTop}px`;

  const cards = Array.from(active.listEl.querySelectorAll(".stock-line")).filter(
    (card) => card !== active.lineEl
  );

  let insertBefore = null;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      insertBefore = card;
      break;
    }
  }

  if (insertBefore) {
    active.listEl.insertBefore(active.placeholderEl, insertBefore);
  } else {
    active.listEl.append(active.placeholderEl);
  }
}

function activatePendingDragSort(pointerId, clientY) {
  const pending = uiState.dragSort.pending;
  if (!pending || pending.pointerId !== pointerId) {
    return;
  }

  const lineEl = pending.lineEl;
  if (!(lineEl instanceof HTMLElement) || !lineEl.isConnected) {
    clearPendingDragSort();
    return;
  }

  const bodyEl = lineEl.closest("[data-market-body='1']");
  const listEl = lineEl.closest(".list");
  if (!(bodyEl instanceof HTMLElement) || !(listEl instanceof HTMLElement)) {
    clearPendingDragSort();
    return;
  }

  const rect = lineEl.getBoundingClientRect();
  const placeholderEl = document.createElement("div");
  placeholderEl.className = "stock-line drag-placeholder";
  placeholderEl.style.height = `${rect.height}px`;
  placeholderEl.setAttribute("aria-hidden", "true");

  listEl.insertBefore(placeholderEl, lineEl.nextElementSibling);
  lineEl.classList.remove("reorder-pending");
  lineEl.classList.add("drag-active");
  lineEl.style.position = "fixed";
  lineEl.style.left = `${rect.left}px`;
  lineEl.style.top = `${rect.top}px`;
  lineEl.style.width = `${rect.width}px`;
  lineEl.style.zIndex = "1000";
  lineEl.style.pointerEvents = "none";

  try {
    lineEl.setPointerCapture(pointerId);
  } catch (_error) {
    // Ignore environments that do not support pointer capture.
  }

  uiState.dragSort.active = {
    pointerId,
    market: pending.market,
    stockId: pending.stockId,
    lineEl,
    listEl,
    bodyEl,
    placeholderEl,
    offsetY: clientY - rect.top
  };

  clearPendingDragSort({ removePendingClass: false });
  updateDragSortPlaceholder(clientY);
}

async function finishActiveDragSort() {
  const active = uiState.dragSort.active;
  if (!active) {
    return;
  }

  const { lineEl, placeholderEl, listEl, market } = active;
  if (placeholderEl instanceof HTMLElement && placeholderEl.isConnected) {
    listEl.insertBefore(lineEl, placeholderEl);
  }

  cleanupActiveDragSort(active);
  uiState.dragSort.active = null;

  const orderedIds = Array.from(listEl.querySelectorAll(".stock-line"))
    .map((card) => card.dataset.stockCard)
    .filter(Boolean);

  try {
    const changed = await reorderWatchlistStocks(market, orderedIds);
    if (changed) {
      await sendMessage({ type: "SYNC_BADGE" }).catch((error) => {
        throw error;
      });
    }
  } catch (error) {
    uiState.errorMessage = error.message || "更新排序失败";
  }

  render();
}

function cancelDragSort() {
  clearPendingDragSort();
  const active = uiState.dragSort.active;
  if (!active) {
    return;
  }

  const { lineEl, placeholderEl, listEl } = active;
  if (placeholderEl instanceof HTMLElement && placeholderEl.isConnected) {
    listEl.insertBefore(lineEl, placeholderEl);
  }
  cleanupActiveDragSort(active);
  uiState.dragSort.active = null;
  render();
}

function renderMarketTabs() {
  return `
    <section class="market-tabs" role="tablist" aria-label="市场切换">
      ${MARKETS.map((market) => {
        const meta = MARKET_META[market];
        const active = market === uiState.activeMarket;
        const stockCount = (state.watchlist[market] || []).length;
        const triggeredCount = getTriggeredStockCountByMarket(market);
        const hasTriggered = triggeredCount > 0;
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
            <span class="market-tab-count" data-market-stock-count="${market}">${stockCount}</span>
            <span
              class="market-tab-alert-count ${hasTriggered ? "active" : ""}"
              data-market-alert-count="${market}"
              ${hasTriggered ? "" : 'style="display:none"'}
            >${formatCompactCount(triggeredCount)}</span>
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
          <div class="setting-number-wrap">
            <input
              class="setting-number"
              type="number"
              inputmode="numeric"
              min="${MIN_REFRESH_INTERVAL_SECONDS}"
              max="${MAX_REFRESH_INTERVAL_SECONDS}"
              step="1"
              data-setting-key="refreshIntervalSeconds"
              value="${normalizeRefreshIntervalSeconds(state.settings.refreshIntervalSeconds)}"
            />
            <span class="setting-unit">秒</span>
          </div>
        </div>
        <div class="setting-item">
          <span class="setting-icon">🔔</span>
          <span class="setting-label">角标提醒</span>
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
  const badges = renderStockBadges(quote, alertState);

  return `
    <article class="stock-line" data-stock-card="${stock.id}" data-market="${stock.market}">
      <span class="sl-grip" title="长按拖动排序" aria-hidden="true">⋮⋮</span>
      <div class="sl-name">
        <span class="sl-label" data-stock-name>${escapeHtml(stock.name)}</span>
        <span class="sl-code" data-stock-code>${escapeHtml(stock.code)}</span>
        <span class="sl-badges" data-stock-badges>${badges}</span>
      </div>
      <span class="sl-price ${priceClass}" data-stock-price>${formatCurrency(
        stock.market,
        quote.price
      )}</span>
      <span class="sl-change ${priceClass}" data-stock-change>${formatPercent(
        quote.changePercent
      )}</span>
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
  const statusClass = marketStatus.loading ? "loading" : marketStatus.error ? "error" : "";

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
          <span
            class="search-status ${statusClass}"
            data-market-status="${market}"
            ${statusIcon ? "" : 'style="display:none"'}
          >${statusIcon}</span>
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

function updateTrendClass(element, baseClass, changePercent) {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.className = `${baseClass} ${getPriceClass(changePercent)}`;
}

function patchMarketStatus(market) {
  const statusElement = app.querySelector(`[data-market-status="${market}"]`);
  if (!(statusElement instanceof HTMLElement)) {
    return;
  }

  const marketStatus = state.meta.marketStatus[market] || {};
  const statusIcon = marketStatus.loading ? "⟳" : marketStatus.error ? "!" : "";

  statusElement.textContent = statusIcon;
  statusElement.classList.remove("loading", "error");
  if (marketStatus.loading) {
    statusElement.classList.add("loading");
  } else if (marketStatus.error) {
    statusElement.classList.add("error");
  }
  statusElement.style.display = statusIcon ? "" : "none";
}

function patchVisibleStockCards() {
  const activeStocks = state.watchlist[uiState.activeMarket] || [];
  const stockById = new Map(activeStocks.map((stock) => [stock.id, stock]));
  const cards = app.querySelectorAll("[data-stock-card]");

  cards.forEach((card) => {
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const stockId = card.dataset.stockCard;
    if (!stockId || !stockById.has(stockId)) {
      return;
    }

    const stock = stockById.get(stockId);
    const quote = state.quotes[stockId] || {};
    const alertState = state.alertState[stockId] || {};

    const nameEl = card.querySelector("[data-stock-name]");
    if (nameEl instanceof HTMLElement) {
      nameEl.textContent = stock.name;
    }

    const codeEl = card.querySelector("[data-stock-code]");
    if (codeEl instanceof HTMLElement) {
      codeEl.textContent = stock.code;
    }

    const badgesEl = card.querySelector("[data-stock-badges]");
    if (badgesEl instanceof HTMLElement) {
      badgesEl.innerHTML = renderStockBadges(quote, alertState);
    }

    const priceEl = card.querySelector("[data-stock-price]");
    if (priceEl instanceof HTMLElement) {
      priceEl.textContent = formatCurrency(stock.market, quote.price);
      updateTrendClass(priceEl, "sl-price", quote.changePercent);
    }

    const changeEl = card.querySelector("[data-stock-change]");
    if (changeEl instanceof HTMLElement) {
      changeEl.textContent = formatPercent(quote.changePercent);
      updateTrendClass(changeEl, "sl-change", quote.changePercent);
    }
  });
}

function patchMarketTabs() {
  MARKETS.forEach((market) => {
    const stockCountEl = app.querySelector(`[data-market-stock-count="${market}"]`);
    if (stockCountEl instanceof HTMLElement) {
      stockCountEl.textContent = String((state.watchlist[market] || []).length);
    }

    const alertCountEl = app.querySelector(`[data-market-alert-count="${market}"]`);
    if (!(alertCountEl instanceof HTMLElement)) {
      return;
    }

    const triggeredCount = getTriggeredStockCountByMarket(market);
    alertCountEl.textContent = formatCompactCount(triggeredCount);
    if (triggeredCount > 0) {
      alertCountEl.classList.add("active");
      alertCountEl.style.display = "";
      return;
    }

    alertCountEl.classList.remove("active");
    alertCountEl.style.display = "none";
  });
}

function patchQuoteRelatedView() {
  if (!state || uiState.settingsOpen || isDragSortBusy()) {
    return;
  }

  patchMarketTabs();
  MARKETS.forEach((market) => patchMarketStatus(market));
  patchVisibleStockCards();
}

function getAlertSignature(alerts = {}) {
  return [
    alerts.changeThreshold || "",
    alerts.priceTarget || "",
    alerts.priceDirection === "lte" ? "lte" : "gte"
  ].join(":");
}

function getWatchlistStructureSignature(watchlist = {}) {
  return MARKETS.map((market) => {
    const items = Array.isArray(watchlist[market]) ? watchlist[market] : [];
    return items
      .map((stock) => {
        if (!stock) {
          return "";
        }
        return `${stock.id}|${stock.market}|${stock.symbol}|${getAlertSignature(stock.alerts)}`;
      })
      .join(",");
  }).join("||");
}

function hasWatchlistStructureChanged(previousWatchlist, nextWatchlist) {
  return (
    getWatchlistStructureSignature(previousWatchlist) !==
    getWatchlistStructureSignature(nextWatchlist)
  );
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
  let value = target.type === "checkbox" ? target.checked : Number(target.value || "1");

  if (key === "refreshIntervalSeconds") {
    value = normalizeRefreshIntervalSeconds(target.value);
    target.value = String(value);
  }

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

app.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (uiState.settingsOpen || uiState.openAlertEditorId) {
    return;
  }

  const grip = target.closest(".sl-grip");
  if (!(grip instanceof HTMLElement)) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  const lineEl = grip.closest(".stock-line");
  if (!(lineEl instanceof HTMLElement)) {
    return;
  }

  const market = lineEl.dataset.market;
  const stockId = lineEl.dataset.stockCard;
  if (!market || !MARKETS.includes(market) || !stockId) {
    return;
  }

  clearPendingDragSort();
  const pointerId = event.pointerId;
  const timerId = setTimeout(() => {
    activatePendingDragSort(pointerId, uiState.dragSort.pending?.lastY ?? event.clientY);
  }, LONG_PRESS_DELAY_MS);

  lineEl.classList.add("reorder-pending");
  uiState.dragSort.pending = {
    pointerId,
    market,
    stockId,
    lineEl,
    startX: event.clientX,
    startY: event.clientY,
    lastY: event.clientY,
    timerId
  };
});

app.addEventListener(
  "pointermove",
  (event) => {
    const active = uiState.dragSort.active;
    const pending = uiState.dragSort.pending;
    if (!active && !pending) {
      return;
    }

    if (active && active.pointerId === event.pointerId) {
      event.preventDefault();
      updateDragSortPlaceholder(event.clientY);
      return;
    }

    if (!pending || pending.pointerId !== event.pointerId) {
      return;
    }

    pending.lastY = event.clientY;
    const deltaX = Math.abs(event.clientX - pending.startX);
    const deltaY = Math.abs(event.clientY - pending.startY);
    if (deltaX > LONG_PRESS_MOVE_THRESHOLD || deltaY > LONG_PRESS_MOVE_THRESHOLD) {
      clearPendingDragSort();
    }
  },
  { passive: false }
);

app.addEventListener("pointerup", async (event) => {
  if (uiState.dragSort.pending?.pointerId === event.pointerId) {
    clearPendingDragSort();
    return;
  }

  if (uiState.dragSort.active?.pointerId === event.pointerId) {
    await finishActiveDragSort();
  }
});

app.addEventListener("pointercancel", (event) => {
  if (
    uiState.dragSort.pending?.pointerId === event.pointerId ||
    uiState.dragSort.active?.pointerId === event.pointerId
  ) {
    cancelDragSort();
  }
});

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

  if (uiState.settingsOpen) {
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

  const changedKeys = STORAGE_KEYS.filter((key) => Object.hasOwn(_changes, key));
  if (!changedKeys.length) {
    return;
  }

  if (!state) {
    void refreshState();
    return;
  }

  changedKeys.forEach((key) => {
    state[key] = _changes[key]?.newValue;
  });

  if (isDragSortBusy()) {
    return;
  }

  const watchlistStructureChanged = _changes.watchlist
    ? hasWatchlistStructureChanged(_changes.watchlist.oldValue, _changes.watchlist.newValue)
    : false;
  const shouldFullRender = changedKeys.some((key) => key === "settings") || watchlistStructureChanged;
  if (shouldFullRender) {
    render();
    return;
  }

  const shouldPatchQuotes = changedKeys.some(
    (key) => key === "watchlist" || key === "quotes" || key === "alertState" || key === "meta"
  );
  if (shouldPatchQuotes) {
    patchQuoteRelatedView();
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
