/**
 * Reports API Routes
 * Handles CRUD operations for valuation reports per the TA_ID specification
 */

const express = require('express');
const router = express.Router();
const { ShumaDB } = require('../models/ShumaDB');
const { parseTabuPDF } = require('../services/tabu-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// File upload configuration
const upload = multer({
  dest: path.join(__dirname, '../../../frontend/uploads/reports/'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/reports
 * Create a new report with auto-generated reference code
 */
router.post('/', async (req, res) => {
  try {
    const {
      client_name,
      address_street,
      address_building_no,
      address_city,
      address_neighborhood,
      visit_date,
      essence_text,
      created_by_user_id,
      organization_id
    } = req.body;
    
    // Validation
    if (!client_name || client_name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'client_name is required (min 3 chars)',
        taId: 'TA10'
      });
    }
    
    if (!address_street || !address_building_no || !address_city) {
      return res.status(400).json({
        success: false,
        error: 'Address fields are required (street, building_no, city)',
        taIds: ['TA3', 'TA4', 'TA6']
      });
    }
    
    if (!visit_date) {
      return res.status(400).json({
        success: false,
        error: 'visit_date is required',
        taId: 'TA20'
      });
    }
    
    // Auto-generate reference code (TA12)
    const addressSlug = `${address_street}_${address_building_no}`.replace(/[^א-ת0-9]/g, '').substring(0, 10);
    const reference_code = `1000_${addressSlug}`;
    
    const reportId = uuidv4();
    
    const db = new ShumaDB();
    await db.connect();
    
    // Insert report
    await db.query(
      `INSERT INTO report (
        id, client_name, reference_code,
        address_street, address_building_no, address_neighborhood, address_city,
        visit_date, determining_date, essence_text,
        created_by_user_id, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        reportId,
        client_name,
        reference_code,
        address_street,
        address_building_no,
        address_neighborhood || null,
        address_city,
        visit_date,
        visit_date, // Default determining_date = visit_date
        essence_text || 'דירת מגורים',
        created_by_user_id || 'system',
        organization_id || null
      ]
    );
    
    // Create audit log entry
    await db.query(
      `INSERT INTO audit_log (report_id, field_path, old_value, new_value, changed_by, source)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reportId,
        'report.created',
        JSON.stringify(null),
        JSON.stringify({ client_name, reference_code, visit_date }),
        created_by_user_id || 'system',
        JSON.stringify({ source: 'manual', file_id: null, page: null, low_confidence: false })
      ]
    );
    
    await db.disconnect();
    
    res.status(201).json({
      success: true,
      reportId,
      reference_code
    });
    
  } catch (error) {
    console.error('❌ Error creating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports/:id
 * Fetch complete report data
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = new ShumaDB();
    await db.connect();
    
    // Fetch all report data
    const report = await db.query('SELECT * FROM report WHERE id = $1', [id]);
    
    if (!report.rows || report.rows.length === 0) {
      await db.disconnect();
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    const reportData = report.rows[0];
    
    // Fetch related data
    const [parcel, subparcel, rights, attachments, ownerships, mortgages, notes, tabuMeta, condo, permits, aiTexts, comps, calc] = await Promise.all([
      db.query('SELECT * FROM parcel WHERE report_id = $1', [id]),
      db.query('SELECT * FROM subparcel WHERE report_id = $1', [id]),
      db.query('SELECT * FROM rights WHERE report_id = $1', [id]),
      db.query('SELECT * FROM attachment WHERE report_id = $1 ORDER BY type', [id]),
      db.query('SELECT * FROM ownership WHERE report_id = $1', [id]),
      db.query('SELECT * FROM mortgage WHERE report_id = $1 ORDER BY rank', [id]),
      db.query('SELECT * FROM note WHERE report_id = $1', [id]),
      db.query('SELECT * FROM tabu_meta WHERE report_id = $1', [id]),
      db.query('SELECT * FROM condo WHERE report_id = $1', [id]),
      db.query('SELECT * FROM permit WHERE report_id = $1 ORDER BY date DESC', [id]),
      db.query('SELECT * FROM ai_text WHERE report_id = $1', [id]),
      db.query('SELECT * FROM comp WHERE report_id = $1 ORDER BY sale_date DESC', [id]),
      db.query('SELECT * FROM calc WHERE report_id = $1', [id])
    ]);
    
    await db.disconnect();
    
    res.json({
      success: true,
      data: {
        ...reportData,
        parcel: parcel.rows[0] || null,
        subparcel: subparcel.rows[0] || null,
        rights: rights.rows[0] || null,
        attachments: attachments.rows || [],
        ownerships: ownerships.rows || [],
        mortgages: mortgages.rows || [],
        notes: notes.rows || [],
        tabu_meta: tabuMeta.rows[0] || null,
        condo: condo.rows[0] || null,
        permits: permits.rows || [],
        ai_texts: aiTexts.rows.reduce((acc, row) => {
          acc[row.key] = row.content;
          return acc;
        }, {}),
        comps: comps.rows || [],
        calc: calc.rows[0] || null
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:id/parse/tabu
 * Parse uploaded Tabu PDF and extract structured data
 */
router.post('/:id/parse/tabu', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const fileId = uuidv4();
    
    // Parse the PDF
    const parseResult = await parseTabuPDF(file.path, fileId);
    
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error,
        validation: parseResult.validation
      });
    }
    
    const db = new ShumaDB();
    await db.connect();
    
    const { data } = parseResult;
    
    // Store tabu_meta
    if (data.metadata.registrar_office.value || data.metadata.extract_date.value) {
      await db.query(
        `INSERT INTO tabu_meta (report_id, registrar_office, extract_date, file_id, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (report_id) DO UPDATE SET
           registrar_office = EXCLUDED.registrar_office,
           extract_date = EXCLUDED.extract_date,
           file_id = EXCLUDED.file_id,
           source = EXCLUDED.source`,
        [
          id,
          data.metadata.registrar_office.value,
          data.metadata.extract_date.value,
          fileId,
          JSON.stringify(data.metadata.extract_date.source)
        ]
      );
    }
    
    // Store parcel
    if (data.parcel.block.value && data.parcel.number.value) {
      await db.query(
        `INSERT INTO parcel (report_id, block, number, area_sqm)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (report_id) DO UPDATE SET
           block = EXCLUDED.block,
           number = EXCLUDED.number,
           area_sqm = EXCLUDED.area_sqm`,
        [
          id,
          data.parcel.block.value,
          data.parcel.number.value,
          data.parcel.area_sqm.value || 0
        ]
      );
    }
    
    // Store subparcel
    if (data.subparcel.number.value) {
      await db.query(
        `INSERT INTO subparcel (report_id, number, floor, building_number, registered_area_sqm, common_parts)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (report_id) DO UPDATE SET
           number = EXCLUDED.number,
           floor = EXCLUDED.floor,
           building_number = EXCLUDED.building_number,
           registered_area_sqm = EXCLUDED.registered_area_sqm,
           common_parts = EXCLUDED.common_parts`,
        [
          id,
          data.subparcel.number.value,
          data.subparcel.floor.value || 0,
          data.subparcel.building_number.value,
          data.subparcel.registered_area_sqm.value || 0,
          data.subparcel.common_parts.value
        ]
      );
    }
    
    // Store ownerships
    await db.query('DELETE FROM ownership WHERE report_id = $1', [id]);
    for (const ownership of data.ownerships) {
      await db.query(
        `INSERT INTO ownership (report_id, owner_name, id_type, id_number, fraction, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          ownership.owner_name,
          ownership.id_type,
          ownership.id_number,
          ownership.fraction,
          JSON.stringify(ownership.source)
        ]
      );
    }
    
    // Store attachments
    await db.query('DELETE FROM attachment WHERE report_id = $1', [id]);
    for (const attachment of data.attachments) {
      await db.query(
        `INSERT INTO attachment (report_id, type, size_sqm, symbol, color, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          attachment.type,
          attachment.size_sqm,
          attachment.symbol,
          attachment.color,
          JSON.stringify(attachment.source)
        ]
      );
    }
    
    // Store mortgages
    await db.query('DELETE FROM mortgage WHERE report_id = $1', [id]);
    for (const mortgage of data.mortgages) {
      await db.query(
        `INSERT INTO mortgage (report_id, rank, beneficiary, amount_nis, source)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          mortgage.rank,
          mortgage.beneficiary,
          mortgage.amount_nis,
          JSON.stringify(mortgage.source)
        ]
      );
    }
    
    // Store notes
    await db.query('DELETE FROM note WHERE report_id = $1', [id]);
    for (const note of data.notes) {
      await db.query(
        `INSERT INTO note (report_id, action_type, extra, source)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          note.action_type,
          note.extra,
          JSON.stringify(note.source)
        ]
      );
    }
    
    await db.disconnect();
    
    res.json({
      success: true,
      data: parseResult.data,
      validation: parseResult.validation,
      stats: parseResult.stats
    });
    
  } catch (error) {
    console.error('❌ Error parsing Tabu:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/reports/:id
 * Update report fields with audit logging
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.body._userId || 'system';
    
    const db = new ShumaDB();
    await db.connect();
    
    // Fetch current values for audit
    const current = await db.query('SELECT * FROM report WHERE id = $1', [id]);
    
    if (!current.rows || current.rows.length === 0) {
      await db.disconnect();
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }
    
    const oldValues = current.rows[0];
    
    // Build update query dynamically
    const allowedFields = [
      'client_name', 'visit_date', 'determining_date', 'determining_date_reason',
      'address_street', 'address_building_no', 'address_neighborhood', 'address_city',
      'essence_text'
    ];
    
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(updates[field]);
        paramIndex++;
        
        // Create audit log for each changed field
        if (oldValues[field] !== updates[field]) {
          await db.query(
            `INSERT INTO audit_log (report_id, field_path, old_value, new_value, changed_by, source)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              `report.${field}`,
              JSON.stringify(oldValues[field]),
              JSON.stringify(updates[field]),
              userId,
              JSON.stringify({ source: 'manual', file_id: null, page: null, low_confidence: false })
            ]
          );
        }
      }
    }
    
    if (updateFields.length > 0) {
      updateValues.push(id);
      await db.query(
        `UPDATE report SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      );
    }
    
    await db.disconnect();
    
    res.json({
      success: true,
      updated: updateFields.length
    });
    
  } catch (error) {
    console.error('❌ Error updating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/reports/:id/calc
 * Compute and store valuation calculations (TA92-97)
 */
router.post('/:id/calc', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = new ShumaDB();
    await db.connect();
    
    // Get included comps
    const compsResult = await db.query(
      'SELECT * FROM comp WHERE report_id = $1 AND included = TRUE',
      [id]
    );
    
    const comps = compsResult.rows || [];
    
    if (comps.length < 3) {
      await db.disconnect();
      return res.status(400).json({
        success: false,
        error: 'Minimum 3 included comparables required',
        taId: 'TA90',
        current: comps.length
      });
    }
    
    // Calculate statistics (TA91)
    const prices = comps.map(c => parseFloat(c.price_psm));
    const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - average, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Use median as eq_psm (TA92)
    const eq_psm = Math.round(median);
    
    // Get area data
    const subparcel = await db.query('SELECT * FROM subparcel WHERE report_id = $1', [id]);
    const area_built = parseFloat(subparcel.rows[0]?.registered_area_sqm || 0);
    
    // For now, assume balcony = 0 (should come from attachments)
    const area_balcony = 0;
    const eq_coefficient = 0.5;
    
    // Calculate (TA94-95)
    const eq_area = area_built + (area_balcony * eq_coefficient);
    const raw_value = eq_area * eq_psm;
    const asset_value = Math.ceil(raw_value / 1000) * 1000; // Round to thousands upward
    
    // Store calculation
    await db.query(
      `INSERT INTO calc (report_id, area_built, area_balcony, eq_psm, eq_coefficient, eq_area, asset_value, eq_psm_source, vat_included)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (report_id) DO UPDATE SET
         area_built = EXCLUDED.area_built,
         area_balcony = EXCLUDED.area_balcony,
         eq_psm = EXCLUDED.eq_psm,
         eq_coefficient = EXCLUDED.eq_coefficient,
         eq_area = EXCLUDED.eq_area,
         asset_value = EXCLUDED.asset_value,
         eq_psm_source = EXCLUDED.eq_psm_source,
         vat_included = EXCLUDED.vat_included`,
      [id, area_built, area_balcony, eq_psm, eq_coefficient, eq_area, asset_value, 'median', true]
    );
    
    await db.disconnect();
    
    res.json({
      success: true,
      calc: {
        area_built,
        area_balcony,
        eq_psm,
        eq_area,
        asset_value,
        vat_included: true
      },
      analytics: {
        count: comps.length,
        average: Math.round(average),
        median: Math.round(median),
        stdDev: Math.round(stdDev),
        min: Math.min(...prices),
        max: Math.max(...prices)
      }
    });
    
  } catch (error) {
    console.error('❌ Error computing calc:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

