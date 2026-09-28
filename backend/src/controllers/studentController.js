exports.getOverview = (req, res) => {
  res.json({
    tournament: {
      nextTournament: { title: 'Robo Challenge', date: '2026-10-10', venue: 'Main Hall' },
      myTeam: { name: 'Alpha', status: 'Verified by HANBEE' },
      leaderboardTop3: [
        { rank: 1, team: 'Alpha', points: 120 },
        { rank: 2, team: 'Beta', points: 110 },
        { rank: 3, team: 'Gamma', points: 105 }
      ],
      announcements: ['Welcome back!', 'Tournament rules updated']
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
};
