const express = require('express');
const router = express.Router();

// This Express backend is not used by the app: the frontend authenticates
// directly against Supabase (see frontend/lib/supabaseAuth.ts). This stub
// is kept only as a placeholder and must never hold real credentials.
router.post('/login', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'This endpoint is retired. Authentication is handled by Supabase.',
  });
});

module.exports = router;
