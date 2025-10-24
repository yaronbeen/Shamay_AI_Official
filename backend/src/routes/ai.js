// AI Processing Routes (Placeholder - will migrate full logic later)
const express = require('express');
const router = express.Router();

// For now, proxy to Next.js API routes
// TODO: Migrate full AI processing logic to Express

router.post('/land-registry-analysis', (req, res) => {
  res.json({ message: 'AI route - to be migrated from Next.js' });
});

router.post('/building-permit-analysis', (req, res) => {
  res.json({ message: 'AI route - to be migrated from Next.js' });
});

router.post('/shared-building-analysis', (req, res) => {
  res.json({ message: 'AI route - to be migrated from Next.js' });
});

router.post('/image-analysis', (req, res) => {
  res.json({ message: 'AI route - to be migrated from Next.js' });
});

module.exports = router;

