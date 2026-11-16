import { io, type Socket } from 'socket.io-client';

// Адреса Socket.io — БЕЗ префікса /api: він належить лише REST-маршрутам,
// інакше Socket.io сприйме "/api" як назву простору імен (namespace).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

// Єдиний екземпляр на весь застосунок. З'єднання встановлюється лише після входу,
// але підписуватися на події (socket.on) компоненти можуть будь-коли.
export const socket: Socket = io(SOCKET_URL, { autoConnect: false });

export function connectSocket(token: string) {
  if (socket.active) socket.disconnect(); // токен змінився: перепідключаємося з новим
  socket.auth = { token }; // сервер перевіряє його в io.use(...) (лабораторна робота 3)
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
