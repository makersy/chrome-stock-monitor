import { MARKETS } from "./config.js";

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateAlerts({
  watchlist,
  quotes,
  settings,
  previousAlertState = {}
}) {
  const nextAlertState = {};
  let activeCount = 0;
  const now = new Date().toISOString();

  MARKETS.forEach((market) => {
    (watchlist[market] || []).forEach((stock) => {
      const previous = previousAlertState[stock.id] || {};
      const quote = quotes[stock.id];
      const itemState = {
        change: {
          active: false,
          lastTriggeredAt: previous.change?.lastTriggeredAt || null
        },
        price: {
          active: false,
          lastTriggeredAt: previous.price?.lastTriggeredAt || null
        }
      };
      let stockTriggered = false;

      if (settings.alertsEnabled && quote && !quote.error) {
        const changeThreshold = toNumber(stock.alerts?.changeThreshold);
        const priceTarget = toNumber(stock.alerts?.priceTarget);
        const priceDirection = stock.alerts?.priceDirection === "lte" ? "lte" : "gte";

        if (
          settings.changeAlertEnabled &&
          changeThreshold !== null &&
          changeThreshold > 0 &&
          Math.abs(Number(quote.changePercent || 0)) >= changeThreshold
        ) {
          itemState.change.active = true;
          if (!previous.change?.active) {
            itemState.change.lastTriggeredAt = now;
          }
          stockTriggered = true;
        }

        if (settings.priceAlertEnabled && priceTarget !== null) {
          const currentPrice = Number(quote.price);
          const matched =
            priceDirection === "lte"
              ? currentPrice <= priceTarget
              : currentPrice >= priceTarget;

          if (matched) {
            itemState.price.active = true;
            if (!previous.price?.active) {
              itemState.price.lastTriggeredAt = now;
            }
            stockTriggered = true;
          }
        }
      }

      if (stockTriggered) {
        activeCount += 1;
      }

      nextAlertState[stock.id] = itemState;
    });
  });

  return {
    alertState: nextAlertState,
    activeCount
  };
}

export function countActiveAlerts(alertState = {}) {
  return Object.values(alertState).reduce((total, state) => {
    return total + (state.change?.active || state.price?.active ? 1 : 0);
  }, 0);
}
