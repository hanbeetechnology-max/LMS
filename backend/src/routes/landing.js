const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    title: 'Hanbee Learning Platform',
    tagline: 'Tournament and Learning in one place',
    features: ['Tournament Management', 'Learning Management', 'Chat & Announcements']
  });
});

module.exports = router;
