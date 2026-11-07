import { createServer } from 'node:http';
import app from './app.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);
app.set('io', initSocket(httpServer));

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});