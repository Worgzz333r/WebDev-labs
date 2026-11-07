import { handle, SocketError } from '../handle.js';
import { eventsSince } from '../events.js';

export function registerEventHandlers(io, socket) {
  handle(socket, 'events:since', async (lastSeq) => {
    if (!Number.isInteger(lastSeq) || lastSeq < 0) throw new SocketError('bad_request');
    const rooms = [...socket.rooms].filter((room) => room !== socket.id);
    return eventsSince(rooms, lastSeq);
  });
}