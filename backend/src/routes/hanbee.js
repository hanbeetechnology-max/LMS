const express = require('express');
const router = express.Router();

// Helper function to generate mock data
const generateHanbeeData = () => {
  const statuses = ['Clocked In', 'On Break', 'In Meeting', 'Available'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  const last7Days = Array.from({ length: 7 }, () => 
    Math.round((Math.random() * 4 + 4) * 2) / 2 // Random between 4-8 hours in 0.5 increments
  );
  
  const totalHours = last7Days.reduce((sum, day) => sum + day, 0);
  
  return {
    status,
    hoursWorked: {
      today: Math.round((Math.random() * 4 + 4) * 2) / 2, // 4-8 hours
      last7Days,
      totalHours
    },
    personalTasks: [
      { 
        id: 1, 
        title: 'Verify Tournament Teams', 
        priority: Math.random() > 0.5 ? 'High' : 'Medium', 
        status: Math.random() > 0.5 ? 'In Progress' : 'Pending'
      },
      { 
        id: 2, 
        title: 'Review School Applications', 
        priority: Math.random() > 0.5 ? 'Medium' : 'Low', 
        status: Math.random() > 0.5 ? 'Completed' : 'In Progress'
      },
      { 
        id: 3, 
        title: 'Update Course Materials', 
        priority: 'Low', 
        status: Math.random() > 0.7 ? 'Completed' : 'Pending'
      }
    ],
    needsAttention: [
      { 
        id: 1, 
        message: '3 Schools pending verification', 
        action: 'Go to Verifications' 
      },
      { 
        id: 2, 
        message: '2 Tournament teams need approval', 
        action: 'Review Applications' 
      }
    ]
  };
};

router.get('/my-space', (req, res) => {
  try {
    // Simulate API delay for realism
    setTimeout(() => {
      const data = generateHanbeeData();
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    }, 500); // 500ms delay to simulate network/API latency
  } catch (error) {
    console.error('Error in hanbee/my-space endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;