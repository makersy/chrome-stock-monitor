import { MARKETS, MARKET_INDICES } from "../config.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeQuoteResponse(buffer) {
  try {
    return new TextDecoder("gbk").decode(buffer);
  } catch (_error) {
    return new TextDecoder().decode(buffer);
  }
}

function extractTimestamp(fields) {
  const raw = [...fields].reverse().find((value) => /^\d{8,14}$/.test(value));

  if (!raw) {
    return null;
  }

  if (raw.length === 14) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(
      8,
      10
    )}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
  }

  return raw;
}

function parseQuoteLine(line) {
  const match = line.match(/v_([^=]+)="([^"]*)"/);
  if (!match) {
    return null;
  }

  const symbol = match[1];
  const payload = match[2];

  if (!payload || payload === "pv_none_match") {
    return {
      symbol,
      error: "未匹配到行情"
    };
  }

  const fields = payload.split("~");
  if (fields.length < 5) {
    return {
      symbol,
      error: "行情格式异常"
    };
  }

  const name = fields[1] || symbol;
  const rawNameEn = fields[46] || "";
  const nameEn = rawNameEn && /[a-zA-Z]/.test(rawNameEn) ? rawNameEn : ""; // 过滤掉纯数字/中文
  const code = fields[2] || symbol.replace(/^(sh|sz|hk|us)/i, "");
  const price = toNumber(fields[3]);
  const prevClose = toNumber(fields[4]);
  const open = toNumber(fields[5]);

  if (price === null || prevClose === null) {
    return {
      symbol,
      error: "行情数据缺失"
    };
  }

  const change = price - prevClose;
  const changePercent = prevClose === 0 ? 0 : (change / prevClose) * 100;

  return {
    symbol,
    quote: {
      name,
      nameEn,
      code,
      price,
      prevClose,
      open,
      change,
      changePercent,
      timestamp: extractTimestamp(fields),
      source: "Tencent Qt"
    }
  };
}

function parseQuoteResponse(text) {
  const result = {};

  text
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parsed = parseQuoteLine(line);
      if (parsed) {
        result[parsed.symbol] = parsed;
      }
    });

  return result;
}

export async function fetchMarketQuotes(_market, stocks) {
  if (!stocks.length) {
    return {};
  }

  const url = `https://qt.gtimg.cn/q=${stocks.map((stock) => stock.symbol).join(",")}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`接口返回 ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const text = decodeQuoteResponse(buffer);
  const parsed = parseQuoteResponse(text);
  const results = {};

  stocks.forEach((stock) => {
    const record = parsed[stock.symbol];
    results[stock.symbol] = record?.quote || {
      error: record?.error || "未返回有效行情"
    };
  });

  return results;
}

function parseIndexQuoteLine(line) {
  const match = line.match(/v_([^=]+)="([^"]*)"/);
  if (!match) {
    return null;
  }

  const symbol = match[1];
  const payload = match[2];

  if (!payload || payload === "pv_none_match") {
    return { symbol, error: "未匹配到行情" };
  }

  const fields = payload.split("~");
  if (fields.length < 6) {
    return { symbol, error: "行情格式异常" };
  }

  const name = fields[1] || symbol;
  const price = toNumber(fields[3]);
  if (price === null) {
    return { symbol, error: "行情数据缺失" };
  }

  let change;
  let changePercent;

  // Long format (HK, US): date-like field at index 30, change at 31, change% at 32
  if (fields.length > 32 && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(fields[30])) {
    change = toNumber(fields[31]);
    changePercent = toNumber(fields[32]);
  } else {
    // Short format (A-share): change at [4], change% at [5]
    change = toNumber(fields[4]);
    changePercent = toNumber(fields[5]);
  }

  if (change === null || changePercent === null) {
    return { symbol, name, price, error: "涨跌幅缺失" };
  }

  return { symbol, name, price, change, changePercent };
}

export async function fetchIndexQuotes() {
  const allSymbols = [];
  MARKETS.forEach((market) => {
    const indices = MARKET_INDICES[market] || [];
    indices.forEach((idx) => allSymbols.push(idx.symbol));
  });

  if (!allSymbols.length) {
    return {};
  }

  const url = `https://qt.gtimg.cn/q=${allSymbols.join(",")}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`指数接口返回 ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const text = decodeQuoteResponse(buffer);

  const result = {};
  text
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((l) => {
      const parsed = parseIndexQuoteLine(l);
      if (parsed) {
        result[parsed.symbol] = parsed;
      }
    });

  return result;
}

export async function fetchQuotesForWatchlist(watchlist) {
  const quotes = {};
  const marketStatus = {};
  const watchlistUpdates = {};
  const stocksByMarket = {};
  const allStocks = [];
  let indexQuotes = {};

  MARKETS.forEach((market) => {
    const stocks = watchlist[market] || [];
    stocksByMarket[market] = stocks;

    if (!stocks.length) {
      marketStatus[market] = {
        loading: false,
        error: "",
        lastUpdated: null
      };
      return;
    }

    allStocks.push(...stocks);
  });

  if (!allStocks.length) {
    try {
      indexQuotes = await fetchIndexQuotes();
    } catch (_error) {
      // Index fetch failure is non-blocking
    }
    return {
      quotes,
      marketStatus,
      watchlistUpdates,
      indexQuotes
    };
  }

  try {
    const aggregatedQuotes = await fetchMarketQuotes("all", allStocks);
    const fetchedAt = new Date().toISOString();

    MARKETS.forEach((market) => {
      const stocks = stocksByMarket[market] || [];
      if (!stocks.length) {
        return;
      }

      marketStatus[market] = {
        loading: false,
        error: "",
        lastUpdated: fetchedAt
      };

      stocks.forEach((stock) => {
        const quote = aggregatedQuotes[stock.symbol];
        if (quote.error) {
          quotes[stock.id] = {
            error: quote.error,
            market,
            symbol: stock.symbol,
            fetchedAt
          };
          return;
        }

        quotes[stock.id] = {
          ...quote,
          market,
          symbol: stock.symbol,
          fetchedAt
        };

        // 更新名称或英文名称
        if (quote.name && (quote.name !== stock.name || quote.nameEn !== stock.nameEn)) {
          watchlistUpdates[stock.id] = {
            name: quote.name,
            nameEn: quote.nameEn || "",
            code: quote.code || stock.code,
            isCustom: false
          };
        }
      });
    });
  } catch (error) {
    const fetchedAt = new Date().toISOString();
    const message = error.message || "获取失败";

    MARKETS.forEach((market) => {
      const stocks = stocksByMarket[market] || [];
      if (!stocks.length) {
        return;
      }

      marketStatus[market] = {
        loading: false,
        error: message,
        lastUpdated: null
      };

      stocks.forEach((stock) => {
        quotes[stock.id] = {
          error: message,
          market,
          symbol: stock.symbol,
          fetchedAt
        };
      });
    });
  }

  try {
    indexQuotes = await fetchIndexQuotes();
  } catch (_error) {
    // Index fetch failure is non-blocking
  }

  return {
    quotes,
    marketStatus,
    watchlistUpdates,
    indexQuotes
  };
}
