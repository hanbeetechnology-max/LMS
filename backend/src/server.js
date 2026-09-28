require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hanbee Backend is running' });
});

const landingRouter = require('./routes/landing');
app.use('/api/landing', landingRouter);

const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

const studentRouter = require('./routes/student');
app.use('/api/student', studentRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
