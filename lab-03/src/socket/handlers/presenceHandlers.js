import { handle } from '../handle.js';
import { listOnline } from '../presence.js';

export function registerPresenceHandlers(io, socket) {
  // Клієнт запитує, хто зараз онлайн (наприклад, одразу після підключення)
  handle(socket, 'presence:list', async () => ({
    online: await listOnline(io, { role: socket.user.role, groupId: socket.data.groupId }),
  }));
}