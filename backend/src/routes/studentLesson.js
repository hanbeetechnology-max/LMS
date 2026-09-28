const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    courseId: id,
    video: 'https://example.com/video.mp4',
    content: 'Lesson content here',
    quiz: [{ question: 'What is 2+2?', options: ['3','4','5'], answer: 1 }]
  });
});

module.exports = router;
