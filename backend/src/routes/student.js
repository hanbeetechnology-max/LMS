const express = require('express');
const router = express.Router();

router.get('/overview', (req, res) => {
  res.json({
    tournament: {
      nextTournament: { title: 'Robo Challenge', date: '2026-10-10', venue: 'Main Hall', countdown: '12d 04h' },
      myTeam: { name: 'Alpha', status: 'Verified by HANBEE' },
      leaderboardTop3: [
        { rank: 1, team: 'Alpha', points: 120 },
        { rank: 2, team: 'Beta', points: 110 },
        { rank: 3, team: 'Gamma', points: 105 }
      ],
      announcements: ['Welcome back!', 'Tournament rules updated'],
      schoolName: 'Springfield High'
    },
    learning: {
      courses: [
        { id: 1, name: 'Math 101', progress: 60 },
        { id: 2, name: 'Science 101', progress: 100 }
      ],
      certificate: { course: 'Science 101', link: '/certificate/2' },
      announcements: ['New lessons added']
    }
  });
});

router.get('/leaderboard', (req, res) => {
  res.json({
    tournament: 'Robo Challenge',
    rankings: [
      { rank: 1, team: 'Alpha', school: 'Springfield High', points: 120 },
      { rank: 2, team: 'Beta', school: 'Riverside', points: 110 },
      { rank: 3, team: 'Gamma', school: 'Hillview', points: 105 }
    ]
  });
});

router.get('/team', (req, res) => {
  res.json({
    teamName: 'Alpha',
    members: ['Alice', 'Bob', 'Charlie'],
    status: 'Verified by HANBEE'
  });
});

module.exports = router;
