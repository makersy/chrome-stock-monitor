const SEARCH_ENDPOINT = "https://smartbox.gtimg.cn/s3/";
const EASTMONEY_SEARCH_ENDPOINT = "https://searchapi.eastmoney.com/api/suggest/get";
const EASTMONEY_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";
const SEARCH_CACHE_KEY = "searchCache";
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const SEARCH_CACHE_LIMIT = 180;

const memoryCache = new Map();
let storageCachePromise = null;

function normalizeQuery(query) {
  return String(query || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

function normalizeUsTicker(raw) {
  const ticker = String(raw || "")
    .trim()
    .replace(/\.(?:n|ny|oq|ob|pk|ps|to|l|ax|ns|ss|sz|sh|hk)$/i, "")
    .replace(/[^a-z0-9.-]/gi, "");

  return ticker.toUpperCase();
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

function normalizeRemoteName(name) {
  return decodeEscapedText(name)
    .trim()
    .replace(/-?(?:sw|w|s)$/i, "")
    .replace(/\(adr\)$/i, "(ADR)")
    .trim();
}

function decodeSearchResponse(buffer) {
  try {
    return new TextDecoder("gbk").decode(buffer);
  } catch (_error) {
    return new TextDecoder().decode(buffer);
  }
}

function getRawHints(text) {
  const matches = [...String(text || "").matchAll(/v_hint="([^"]*)"/g)];
  if (!matches.length) {
    return "";
  }

  return matches
    .map((match) => match[1] || "")
    .filter(Boolean)
    .join("^");
}

function normalizeRemoteSuggestion(parts) {
  const prefix = String(parts[0] || "").trim().toLowerCase();
  const rawCode = String(parts[1] || "").trim();
  const name = normalizeRemoteName(parts[2] || parts[1] || "");

  if (!prefix || !rawCode || !name) {
    return null;
  }

  if (["sh", "sz", "bj"].includes(prefix) && /^\d{6}$/.test(rawCode)) {
    return {
      market: "a",
      symbol: `${prefix}${rawCode}`,
      code: rawCode,
      name
    };
  }

  if (prefix === "hk" && /^\d{1,5}$/.test(rawCode)) {
    const code = rawCode.padStart(5, "0");
    return {
      market: "hk",
      symbol: `hk${code}`,
      code,
      name
    };
  }

  if (prefix === "us") {
    const code = normalizeUsTicker(rawCode);
    if (!code) {
      return null;
    }

    return {
      market: "us",
      symbol: `us${code}`,
      code,
      name
    };
  }

  return null;
}

function mapEastmoneyRecord(record) {
  const code = String(record?.Code || record?.UnifiedCode || "").trim().toUpperCase();
  const name = normalizeRemoteName(record?.Name || "");
  const marketType = String(record?.MarketType || "").trim();
  const classify = String(record?.Classify || "").trim().toLowerCase();
  const securityTypeName = String(record?.SecurityTypeName || "").trim();

  if (!code || !name) {
    return null;
  }

  if (
    marketType === "5" ||
    classify === "hk" ||
    securityTypeName.includes("港股")
  ) {
    if (!/^\d{1,5}$/.test(code)) {
      return null;
    }

    const normalizedCode = code.padStart(5, "0");
    return {
      market: "hk",
      symbol: `hk${normalizedCode}`,
      code: normalizedCode,
      name
    };
  }

  if (
    marketType === "7" ||
    classify === "usstock" ||
    classify === "otcbb" ||
    securityTypeName.includes("美股") ||
    securityTypeName.includes("粉单")
  ) {
    const normalizedCode = normalizeUsTicker(code);
    if (!normalizedCode) {
      return null;
    }

    return {
      market: "us",
      symbol: `us${normalizedCode}`,
      code: normalizedCode,
      name
    };
  }

  if (
    ["0", "1", "2", "90"].includes(marketType) ||
    classify === "ashares" ||
    securityTypeName.includes("A股")
  ) {
    if (!/^\d{6}$/.test(code)) {
      return null;
    }

    const prefix =
      marketType === "1"
        ? "sh"
        : marketType === "2"
          ? "sz"
          : /^[569]/.test(code)
            ? "sh"
            : /^[48]/.test(code)
              ? "bj"
              : "sz";

    return {
      market: "a",
      symbol: `${prefix}${code}`,
      code,
      name
    };
  }

  return null;
}

function isSupportedType(type) {
  const normalized = String(type || "").trim().toUpperCase();
  return !normalized || normalized.startsWith("GP");
}

function dedupeSuggestions(items, existingIds = new Set(), limit = 8) {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.symbol || !item?.market) {
      return;
    }

    const id = `${item.market}:${item.symbol}`;
    if (existingIds.has(id) || map.has(item.symbol)) {
      return;
    }

    map.set(item.symbol, {
      market: item.market,
      symbol: item.symbol,
      code: item.code,
      name: normalizeRemoteName(item.name),
      label: item.label ? normalizeRemoteName(item.label) : "",
      isCustom: Boolean(item.isCustom)
    });
  });

  return Array.from(map.values()).slice(0, limit);
}

export function parseSuggestionResponse(text, preferredMarket = "") {
  const rawHints = getRawHints(text);
  if (!rawHints) {
    return [];
  }

  return dedupeSuggestions(
    rawHints
      .split("^")
      .map((row) => row.split("~"))
      .map((parts) => {
        const suggestion = normalizeRemoteSuggestion(parts);
        const type = parts[4] || "";

        if (
          !suggestion ||
          !suggestion.symbol ||
          !suggestion.market ||
          (preferredMarket && suggestion.market !== preferredMarket) ||
          !isSupportedType(type)
        ) {
          return null;
        }

        return {
          market: suggestion.market,
          symbol: suggestion.symbol,
          code: suggestion.code,
          name: suggestion.name
        };
      })
      .filter(Boolean)
  );
}

export function parseEastmoneySuggestionResponse(payload, preferredMarket = "") {
  const rows = payload?.QuotationCodeTable?.Data;
  if (!Array.isArray(rows) || !rows.length) {
    return [];
  }

  return dedupeSuggestions(
    rows
      .map((row) => mapEastmoneyRecord(row))
      .filter((item) => item && (!preferredMarket || item.market === preferredMarket))
  );
}

function getCacheEntryKey(market, query) {
  return `${market}:${normalizeQuery(query)}`;
}

function pruneCacheEntries(cache) {
  const entries = Object.entries(cache || {}).sort(
    (left, right) => (right[1]?.fetchedAt || 0) - (left[1]?.fetchedAt || 0)
  );

  return Object.fromEntries(entries.slice(0, SEARCH_CACHE_LIMIT));
}

async function loadStorageCache() {
  if (!storageCachePromise) {
    storageCachePromise = chrome.storage.local
      .get(SEARCH_CACHE_KEY)
      .then((record) => pruneCacheEntries(record?.[SEARCH_CACHE_KEY] || {}));
  }

  return storageCachePromise;
}

async function writeStorageCache(cache) {
  const next = pruneCacheEntries(cache);
  storageCachePromise = Promise.resolve(next);
  await chrome.storage.local.set({ [SEARCH_CACHE_KEY]: next });
}

async function readCachedSuggestions(market, query) {
  const key = getCacheEntryKey(market, query);
  const now = Date.now();

  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (now - cached.fetchedAt <= SEARCH_CACHE_TTL_MS) {
      return cached.items;
    }
    memoryCache.delete(key);
  }

  const storageCache = await loadStorageCache();
  const cached = storageCache[key];
  if (!cached) {
    return null;
  }

  memoryCache.set(key, cached);

  if (now - cached.fetchedAt > SEARCH_CACHE_TTL_MS) {
    return null;
  }

  return cached.items;
}

async function persistCachedSuggestions(market, query, items) {
  const key = getCacheEntryKey(market, query);
  const entry = {
    fetchedAt: Date.now(),
    items: dedupeSuggestions(items)
  };

  memoryCache.set(key, entry);
  const storageCache = await loadStorageCache();
  await writeStorageCache({
    ...storageCache,
    [key]: entry
  });
}

export function shouldUseRemoteSearch(market, query) {
  return ["a", "hk", "us"].includes(market) && Boolean(normalizeQuery(query));
}

async function fetchRemoteSuggestions(market, query) {
  const url = `${SEARCH_ENDPOINT}?v=2&q=${encodeURIComponent(query)}&t=all`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`搜索接口返回 ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return parseSuggestionResponse(decodeSearchResponse(buffer), market);
}

async function fetchEastmoneySuggestions(market, query) {
  const url = `${EASTMONEY_SEARCH_ENDPOINT}?input=${encodeURIComponent(query)}&type=14&token=${EASTMONEY_TOKEN}`;
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`东方财富搜索接口返回 ${response.status}`);
  }

  return parseEastmoneySuggestionResponse(await response.json(), market);
}

export async function searchMarketSuggestions(market, query, existingIds = new Set(), fallback = [], limit = 8) {
  const mergedFallback = dedupeSuggestions(fallback, existingIds, limit);

  if (!shouldUseRemoteSearch(market, query)) {
    return {
      items: mergedFallback,
      source: "local"
    };
  }

  const cached = await readCachedSuggestions(market, query);
  if (cached?.length) {
    return {
      items: dedupeSuggestions([...cached, ...mergedFallback], existingIds, limit),
      source: "cache"
    };
  }

  try {
    const [tencentItems, eastmoneyItems] = await Promise.allSettled([
      fetchRemoteSuggestions(market, query),
      fetchEastmoneySuggestions(market, query)
    ]);

    const remoteItems = [
      ...(eastmoneyItems.status === "fulfilled" ? eastmoneyItems.value : []),
      ...(tencentItems.status === "fulfilled" ? tencentItems.value : [])
    ];

    if (remoteItems.length) {
      await persistCachedSuggestions(market, query, remoteItems);
    }

    return {
      items: dedupeSuggestions([...remoteItems, ...mergedFallback], existingIds, limit),
      source: remoteItems.length ? "remote" : "local"
    };
  } catch (_error) {
    return {
      items: mergedFallback,
      source: "fallback"
    };
  }
}
