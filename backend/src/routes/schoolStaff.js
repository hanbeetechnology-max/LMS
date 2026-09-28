const express = require('express');
const router = express.Router();

router.get('/overview', (req, res) => {
  res.json({ tournament: {}, learning: {} });
});

module.exports = router;
