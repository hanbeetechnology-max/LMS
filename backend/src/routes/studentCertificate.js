const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => {
  res.json({ courseId: req.params.id, certificateUrl: '/certificates/sample.pdf' });
});

module.exports = router;
