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
  const tencentSymbols = [];
  ["a", "us"].forEach((market) => {
    (MARKET_INDICES[market] || []).forEach((idx) => tencentSymbols.push(idx.symbol));
  });

  const [tencentResult, hkResult] = await Promise.allSettled([
    tencentSymbols.length
      ? (async () => {
          const url = `https://qt.gtimg.cn/q=${tencentSymbols.join(",")}`;
          const response = await fetch(url, { method: "GET", cache: "no-store" });
          if (!response.ok) {
            throw new Error(`指数接口返回 ${response.status}`);
          }
          const buffer = await response.arrayBuffer();
          const text = decodeQuoteResponse(buffer);
          const parsed = {};
          text
            .split(";")
            .map((l) => l.trim())
            .filter(Boolean)
            .forEach((l) => {
              const p = parseIndexQuoteLine(l);
              if (p) {
                parsed[p.symbol] = p;
              }
            });
          return parsed;
        })()
      : Promise.resolve({}),
    fetchEastmoneyHkIndices()
  ]);

  return {
    ...(tencentResult.status === "fulfilled" ? tencentResult.value : {}),
    ...(hkResult.status === "fulfilled" ? hkResult.value : {})
  };
}

const EASTMONEY_HK_QUOTE_FIELDS = "f12,f14,f2,f3,f4,f17,f18";
const EASTMONEY_HK_QUOTE_DIVISOR = 1000;
const EASTMONEY_HK_INDICES = {
  r_hkHSI: "100.HSI",
  r_hkHSTECH: "124.HSTECH"
};

function eastmoneySecidForHk(symbol) {
  const code = symbol.replace(/^hk/i, "");
  return `116.${code}`;
}

function parseEastmoneyHkQuote(fields) {
  const code = String(fields.f12 || "");
  const name = String(fields.f14 || "");
  const price = toNumber(fields.f2);
  const prevClose = toNumber(fields.f18);

  if (!code || price === null || prevClose === null) {
    return null;
  }

  const open = toNumber(fields.f17);
  const change = toNumber(fields.f4);
  const changePercent = toNumber(fields.f3);

  return {
    symbol: `hk${code}`,
    quote: {
      name,
      nameEn: "",
      code,
      price: price / EASTMONEY_HK_QUOTE_DIVISOR,
      prevClose: prevClose / EASTMONEY_HK_QUOTE_DIVISOR,
      open: open !== null ? open / EASTMONEY_HK_QUOTE_DIVISOR : null,
      change: change !== null ? change / EASTMONEY_HK_QUOTE_DIVISOR : null,
      changePercent: changePercent !== null ? changePercent / 100 : null,
      timestamp: null,
      source: "Eastmoney"
    }
  };
}

async function fetchEastmoneyHkQuotes(stocks) {
  if (!stocks.length) {
    return {};
  }

  const secids = stocks.map((s) => eastmoneySecidForHk(s.symbol)).join(",");
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids}&fields=${EASTMONEY_HK_QUOTE_FIELDS}`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });

  if (!response.ok) {
    throw new Error(`东财港股接口返回 ${response.status}`);
  }

  const json = await response.json();
  const rows = json?.data?.diff;
  const results = {};

  if (Array.isArray(rows)) {
    rows.forEach((fields) => {
      const parsed = parseEastmoneyHkQuote(fields);
      if (parsed) {
        results[parsed.symbol] = parsed;
      }
    });
  }

  const output = {};
  stocks.forEach((stock) => {
    const record = results[stock.symbol];
    output[stock.symbol] = record?.quote || { error: "东财港股未返回有效行情" };
  });

  return output;
}

async function fetchEastmoneyHkIndices() {
  const entries = Object.entries(EASTMONEY_HK_INDICES);
  if (!entries.length) {
    return {};
  }

  const secids = entries.map(([, secid]) => secid).join(",");
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids}&fields=f12,f14,f2,f3,f4,f18`;
  const response = await fetch(url, { method: "GET", cache: "no-store" });

  if (!response.ok) {
    throw new Error(`东财港股指数接口返回 ${response.status}`);
  }

  const json = await response.json();
  const rows = json?.data?.diff;
  const result = {};

  if (Array.isArray(rows)) {
    const codeToSymbol = Object.fromEntries(
      entries.map(([symbol, secid]) => [secid.split(".")[1], symbol])
    );
    rows.forEach((fields) => {
      const symbol = codeToSymbol[fields.f12];
      if (!symbol) {
        return;
      }

      const name = String(fields.f14 || "");
      const price = toNumber(fields.f2);
      if (price === null) {
        return;
      }

      const changePercent = toNumber(fields.f3);
      const change = toNumber(fields.f4);

      result[symbol] = {
        symbol,
        name,
        price: price / 100,
        change: change !== null ? change / 100 : null,
        changePercent: changePercent !== null ? changePercent / 100 : null
      };
    });
  }

  return result;
}

export async function fetchQuotesForWatchlist(watchlist) {
  const quotes = {};
  const marketStatus = {};
  const watchlistUpdates = {};
  let indexQuotes = {};

  const hkStocks = watchlist.hk || [];
  const tencentStocks = (watchlist.a || []).concat(watchlist.us || []);
  const hasAnyStocks = hkStocks.length > 0 || tencentStocks.length > 0;

  if (!hasAnyStocks) {
    MARKETS.forEach((market) => {
      marketStatus[market] = { loading: false, error: "", lastUpdated: null };
    });
    try {
      indexQuotes = await fetchIndexQuotes();
    } catch (_error) {
      // Index fetch failure is non-blocking
    }
    return { quotes, marketStatus, watchlistUpdates, indexQuotes };
  }

  const [tencentResult, eastmoneyResult] = await Promise.allSettled([
    tencentStocks.length
      ? fetchMarketQuotes("all", tencentStocks)
      : Promise.resolve({}),
    hkStocks.length
      ? fetchEastmoneyHkQuotes(hkStocks)
      : Promise.resolve({})
  ]);

  const fetchedAt = new Date().toISOString();
  const tencentQuotes =
    tencentResult.status === "fulfilled" ? tencentResult.value : {};
  const eastmoneyQuotes =
    eastmoneyResult.status === "fulfilled" ? eastmoneyResult.value : {};
  const tencentError =
    tencentResult.status === "rejected"
      ? tencentResult.reason?.message || "获取失败"
      : "";
  const eastmoneyError =
    eastmoneyResult.status === "rejected"
      ? eastmoneyResult.reason?.message || "获取失败"
      : "";

  // A 股 / 美股（Tencent）
  ["a", "us"].forEach((market) => {
    const stocks = watchlist[market] || [];
    if (!stocks.length) {
      marketStatus[market] = { loading: false, error: "", lastUpdated: null };
      return;
    }
    marketStatus[market] = {
      loading: false,
      error: tencentError,
      lastUpdated: tencentError ? null : fetchedAt
    };
    if (tencentError) {
      stocks.forEach((stock) => {
        quotes[stock.id] = {
          error: tencentError,
          market,
          symbol: stock.symbol,
          fetchedAt
        };
      });
      return;
    }
    stocks.forEach((stock) => {
      const quote = tencentQuotes[stock.symbol];
      if (!quote || quote.error) {
        quotes[stock.id] = {
          error: quote?.error || "未返回有效行情",
          market,
          symbol: stock.symbol,
          fetchedAt
        };
        return;
      }
      quotes[stock.id] = { ...quote, market, symbol: stock.symbol, fetchedAt };
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

  // 港股（Eastmoney）
  if (hkStocks.length) {
    marketStatus.hk = {
      loading: false,
      error: eastmoneyError,
      lastUpdated: eastmoneyError ? null : fetchedAt
    };
    if (eastmoneyError) {
      hkStocks.forEach((stock) => {
        quotes[stock.id] = {
          error: eastmoneyError,
          market: "hk",
          symbol: stock.symbol,
          fetchedAt
        };
      });
    } else {
      hkStocks.forEach((stock) => {
        const quote = eastmoneyQuotes[stock.symbol];
        if (!quote || quote.error) {
          quotes[stock.id] = {
            error: quote?.error || "未返回有效行情",
            market: "hk",
            symbol: stock.symbol,
            fetchedAt
          };
          return;
        }
        quotes[stock.id] = { ...quote, market: "hk", symbol: stock.symbol, fetchedAt };
        if (quote.name && quote.name !== stock.name) {
          watchlistUpdates[stock.id] = {
            name: quote.name,
            nameEn: "",
            code: quote.code || stock.code,
            isCustom: false
          };
        }
      });
    }
  } else {
    marketStatus.hk = { loading: false, error: "", lastUpdated: null };
  }

  try {
    indexQuotes = await fetchIndexQuotes();
  } catch (_error) {
    // Index fetch failure is non-blocking
  }

  return { quotes, marketStatus, watchlistUpdates, indexQuotes };
}
