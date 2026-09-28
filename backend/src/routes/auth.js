const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  // Mock role based on email
  let role = 'student';
  if (email.includes('staff')) role = 'school_staff';
  else if (email.includes('hanbee')) role = 'hanbee_staff';
  else if (email.includes('manager')) role = 'manager';
  res.json({ success: true, role });
});

module.exports = router;
