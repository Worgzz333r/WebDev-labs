import { createClient } from 'redis';

const store = new Map(); // запасний кеш у пам'яті, коли Redis недоступний
const MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60_000;
const stats = { hits: 0, misses: 0 };
const PREFIX = 'cache:';
const GEN_KEY = 'cache:gen';
let generation = 0;

let redis = null;
if (process.env.REDIS_URL) {
  redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', () => {}); // помилки не валять сервер, працюємо без кешу
  redis.connect().catch(() => { redis = null; });
}
const redisReady = () => redis?.isReady;

export async function cached(key, loader, ttlMs = DEFAULT_TTL_MS) {
  if (redisReady()) {
    try {
      const raw = await redis.get(PREFIX + key);
      if (raw !== null) {
        stats.hits += 1;
        return { value: JSON.parse(raw), hit: true };
      }
      stats.misses += 1;
      const startedAt = await redis.get(GEN_KEY);
      const value = await loader();
      // якщо кеш скинули, поки йшов запит до БД, застарілий результат не зберігаємо
      if ((await redis.get(GEN_KEY)) === startedAt) {
        await redis.set(PREFIX + key, JSON.stringify(value), { PX: ttlMs });
      }
      return { value, hit: false };
    } catch {
      // Redis відвалився посеред запиту: падаємо на кеш у пам'яті нижче
    }
  }

  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) {
    stats.hits += 1;
    return { value: entry.value, hit: true };
  }
  stats.misses += 1;
  const startedAt = generation;
  const value = await loader();
  if (startedAt === generation) {
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value);
    store.set(key, { value, expires: Date.now() + ttlMs });
  }
  return { value, hit: false };
}

export async function invalidate(prefix) {
  generation += 1;
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
  if (!redisReady()) return;
  try {
    await redis.incr(GEN_KEY);
    for await (const chunk of redis.scanIterator({ MATCH: `${PREFIX}${prefix}*`, COUNT: 100 })) {
      const keys = Array.isArray(chunk) ? chunk : [chunk];
      if (keys.length) await redis.del(keys);
    }
  } catch {}
}

export async function clearCache() {
  generation += 1;
  store.clear();
  if (!redisReady()) return;
  try {
    await redis.incr(GEN_KEY);
    for await (const chunk of redis.scanIterator({ MATCH: `${PREFIX}*`, COUNT: 100 })) {
      const keys = (Array.isArray(chunk) ? chunk : [chunk]).filter((k) => k !== GEN_KEY);
      if (keys.length) await redis.del(keys);
    }
  } catch {}
}

export const cacheStats = () => ({ ...stats, size: store.size });