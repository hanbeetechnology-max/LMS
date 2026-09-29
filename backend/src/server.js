require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/landing', require('./routes/landing'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/hanbee', require('./routes/hanbee'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
