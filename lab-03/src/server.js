import { createServer } from 'node:http';
import app from './app.js';
import { initSocket } from './socket/index.js';
import { startNotificationQueue } from './queue/notifications.js';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
const io = await initSocket(httpServer);
app.set('io', io);

startNotificationQueue(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});