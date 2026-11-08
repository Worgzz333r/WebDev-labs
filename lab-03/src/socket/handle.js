export class SocketError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const LIMIT = Number(process.env.WS_RATE_LIMIT ?? 30);        // подій
const WINDOW_MS = Number(process.env.WS_RATE_WINDOW_MS ?? 10_000); // за 10 с

// Реєструє обробник події: успіх і помилка повертаються через ack,
// а якщо клієнт не передав ack, помилка надходить подією 'app:error'
export function handle(socket, event, fn) {
  socket.on(event, async (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : null;
    try {
      const now = Date.now();
      const rl = (socket.data.rl ??= { start: now, count: 0 });
      if (now - rl.start > WINDOW_MS) { rl.start = now; rl.count = 0; }
      if (++rl.count > LIMIT) throw new SocketError('rate_limited');

      const result = (await fn(...args)) ?? {};
      ack?.({ ok: true, ...result });
    } catch (err) {
      const code = err instanceof SocketError ? err.code : 'internal';
      if (code === 'internal') console.error(`[socket] ${event}:`, err);
      if (ack) ack({ ok: false, error: code });
      else socket.emit('app:error', { event, error: code });
    }
  });
}