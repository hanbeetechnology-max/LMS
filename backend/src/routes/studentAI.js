const express = require('express');
const router = express.Router();

router.post('/chat', (req, res) => {
  res.json({ reply: 'AI response placeholder' });
});

module.exports = router;
