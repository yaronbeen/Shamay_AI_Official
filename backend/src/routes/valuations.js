// Valuations CRUD Routes
const express = require('express');
const router = express.Router();
const ShumaDB = require('../models/ShumaDB');
const logger = require('../config/logger');

// GET /api/valuations - List/Search valuations
router.get('/', async (req, res) => {
  try {
    const { organizationId, search, status, page = 1, limit = 20 } = req.query;

    const result = await ShumaDB.searchShumas(
      organizationId || 'default-org',
      search,
      status
    );

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedShumas = result.shumas.slice(startIndex, endIndex);

    res.json({
      success: true,
      shumas: paginatedShumas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.shumas.length,
        totalPages: Math.ceil(result.shumas.length / limit)
      }
    });
  } catch (error) {
    logger.error('List valuations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/valuations/:id - Get single valuation
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await ShumaDB.getShumaById(id);

    if (result.error) {
      return res.status(404).json({ error: result.error });
    }

    res.json({
      success: true,
      shuma: result.shuma
    });
  } catch (error) {
    logger.error('Get valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/valuations - Create new valuation
router.post('/', async (req, res) => {
  try {
    const { organizationId, userId, valuationData } = req.body;

    if (!valuationData || !valuationData.sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await ShumaDB.saveShumaFromSession(
      valuationData.sessionId,
      organizationId || 'default-org',
      userId || 'system',
      valuationData
    );

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      shumaId: result.shumaId
    });
  } catch (error) {
    logger.error('Create valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/valuations/:id - Update valuation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId, userId, valuationData } = req.body;

    // Get existing valuation
    const existing = await ShumaDB.getShumaById(id);
    if (existing.error) {
      return res.status(404).json({ error: 'Valuation not found' });
    }

    // Update with session ID from existing record
    const sessionId = existing.shuma.sessionId;

    const result = await ShumaDB.saveShumaFromSession(
      sessionId,
      organizationId || existing.shuma.organization_id,
      userId || existing.shuma.user_id,
      valuationData
    );

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      shumaId: result.shumaId
    });
  } catch (error) {
    logger.error('Update valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/valuations/:id - Delete valuation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/database');

    const result = await query('DELETE FROM shuma WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Valuation not found' });
    }

    res.json({
      success: true,
      message: 'Valuation deleted successfully'
    });
  } catch (error) {
    logger.error('Delete valuation error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

