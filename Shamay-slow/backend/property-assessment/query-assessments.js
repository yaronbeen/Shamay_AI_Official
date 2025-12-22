#!/usr/bin/env node

/**
 * Backend Script: Query Property Assessments
 * 
 * This script is called by the frontend API to query property assessments
 * using the backend database client
 */

import { PropertyAssessmentDatabaseClient } from './database-client.js';

async function queryPropertyAssessments() {
  try {
    console.log('🔍 Backend: Starting property assessments query...');
    
    const db = new PropertyAssessmentDatabaseClient();
    await db.connect();
    
    // Get query parameters from environment variables
    const sessionId = process.env.QUERY_SESSION_ID || '';
    const assessmentId = process.env.QUERY_ASSESSMENT_ID || '';
    
    console.log('📊 Query parameters:', { sessionId, assessmentId });
    
    let query = `
      SELECT 
        id,
        address,
        client_name,
        valuation_date,
        shamay_name,
        shamay_serial_number,
        rooms,
        floor,
        area,
        balcony,
        parking,
        elevator,
        final_valuation,
        price_per_sqm,
        property_analysis,
        market_analysis,
        risk_assessment,
        recommendations,
        selected_image_preview,
        selected_image_name,
        selected_image_index,
        total_images,
        signature_preview,
        status,
        created_at
      FROM property_assessments 
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    if (assessmentId) {
      query += ` AND id = $${paramCount}`;
      queryParams.push(parseInt(assessmentId));
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT 10`;
    
    console.log('📊 Executing query:', query);
    console.log('📊 Query params:', queryParams);
    
    const result = await db.client.query(query, queryParams);
    
    console.log('✅ Query successful:', result.rows.length, 'records found');
    
    await db.disconnect();
    
    // Return results in JSON format
    console.log(JSON.stringify({
      success: true,
      data: result.rows,
      count: result.rows.length
    }));
    
  } catch (error) {
    console.error('❌ Backend query error:', error);
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }));
    process.exit(1);
  }
}

// Run the query
queryPropertyAssessments();
