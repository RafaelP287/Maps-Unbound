const DEFAULT_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export const getCachedValue = (key, ttlMs = DEFAULT_TTL_MS) => {
  if (!key) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

export const setCachedValue = (key, value) => {
  if (!key) return;
  cache.set(key, {
    value,
    cachedAt: Date.now(),
  });
};

export const removeCachedValue = (key) => {
  if (!key) return;
  cache.delete(key);
};

export const clearCachePrefix = (prefix) => {
  if (!prefix) return;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};
