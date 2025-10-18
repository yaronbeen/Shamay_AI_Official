
import { PropertyAssessmentDatabaseClient } from './database-client.js';

async function saveAssessment() {
  try {
    const db = new PropertyAssessmentDatabaseClient();
    await db.connect();
    
    const result = await db.saveAssessment({
      session_id: '1760033053742',
      property_address: '',
      property_area: 0,
      final_valuation: 1475230,
      price_per_sqm: 32783,
      comparable_data: JSON.stringify(body.comparableData || []),
      analysis_data: JSON.stringify(body.analysisData || {}),
      created_at: new Date().toISOString()
    });
    
    await db.disconnect();
    
    console.log(JSON.stringify({
      success: true,
      data: result,
      message: 'Property assessment saved successfully'
    }));
    
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

saveAssessment();
    