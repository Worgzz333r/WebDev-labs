// Кеш у пам'яті процесу з TTL та інвалідацією за префіксом ключа
const store = new Map(); // key → { value, expires }
const MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60_000;
const stats = { hits: 0, misses: 0 };
let generation = 0; // збільшується при інвалідації

export async function cached(key, loader, ttlMs = DEFAULT_TTL_MS) {
  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) {
    stats.hits += 1;
    return { value: entry.value, hit: true };
  }

  stats.misses += 1;
  const startedAt = generation;
  const value = await loader();

  // Якщо кеш скинули, поки йшов запит до БД, застарілий результат не зберігаємо
  if (startedAt === generation) {
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
    store.set(key, { value, expires: Date.now() + ttlMs });
  }
  return { value, hit: false };
}

export function invalidate(prefix) {
  generation += 1;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function clearCache() {
  generation += 1;
  store.clear();
}

export const cacheStats = () => ({ ...stats, size: store.size });