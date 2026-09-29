const express = require('express');
const router = express.Router();

router.get('/overview', (req, res) => res.json({ tournament: { teams: 12 }, learning: { students: 25 } }));
router.get('/announcements', (req, res) => res.json([{ id: 1, title: 'Welcome', date: '2026-09-20' }]));
router.get('/schedule', (req, res) => res.json([{ event: 'Staff Meeting', time: '09:00 AM' }]));

module.exports = router;
