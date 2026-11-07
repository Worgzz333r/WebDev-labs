export class SocketError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// Реєструє обробник події: успіх і помилка повертаються через ack,
// а якщо клієнт не передав ack, помилка надходить подією 'app:error'
export function handle(socket, event, fn) {
  socket.on(event, async (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : null;
    try {
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