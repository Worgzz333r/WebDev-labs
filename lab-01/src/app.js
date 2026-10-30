import express from 'express';
import cors from 'cors';

import groupRoutes from './routes/groupRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import errorHandler from './utils/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/groups', groupRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
app.use(errorHandler);

export default app;