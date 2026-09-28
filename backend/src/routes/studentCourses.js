const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    courses: [
      { id: 1, name: 'Math 101', progress: 60 },
      { id: 2, name: 'Science 101', progress: 100 }
    ],
    published: [
      { id: 3, name: 'History 101' }
    ]
  });
});

module.exports = router;
