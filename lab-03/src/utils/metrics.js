import client from 'prom-client';
import { cacheStats } from './cache.js';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Тривалість HTTP-запитів',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3],
  registers: [register],
});

export const wsConnections = new client.Gauge({
  name: 'ws_connections',
  help: 'Активні WebSocket-з\'єднання',
  registers: [register],
});

new client.Gauge({
  name: 'cache_hits_total',
  help: 'Влучання в кеш',
  registers: [register],
  collect() { this.set(cacheStats().hits); },
});

new client.Gauge({
  name: 'cache_misses_total',
  help: 'Промахи кешу',
  registers: [register],
  collect() { this.set(cacheStats().misses); },
});

export function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path ? req.baseUrl + req.route.path : 'unmatched';
    end({ method: req.method, route, status: res.statusCode });
  });
  next();
}