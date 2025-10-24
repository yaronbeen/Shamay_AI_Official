// GIS Routes (Placeholder - keeping in Next.js for now)
const express = require('express');
const router = express.Router();

// GIS routes will stay in Next.js for now since they use browser-based screenshot capture
// These are just placeholders

router.post('/analysis', (req, res) => {
  res.json({ message: 'GIS route - handled by Next.js frontend' });
});

router.post('/screenshot', (req, res) => {
  res.json({ message: 'GIS route - handled by Next.js frontend' });
});

module.exports = router;

