require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const groupRoutes = require('./routes/groupRoutes');
app.use('/api/groups', groupRoutes);

const subjectRoutes = require('./routes/subjectRoutes');
app.use('/api/subjects', subjectRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});