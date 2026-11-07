import { canJoin } from '../rooms.js';
import { handle, SocketError } from '../handle.js';

export function registerRoomHandlers(io, socket) {
  handle(socket, 'room:join', async (room) => {
    if (!(await canJoin(socket.user, room))) throw new SocketError('forbidden');
    await socket.join(room);
  });

  handle(socket, 'room:leave', async (room) => {
    await socket.leave(room);
  });
}