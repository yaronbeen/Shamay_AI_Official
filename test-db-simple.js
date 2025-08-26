import { DatabaseClient } from './src/lib/database-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function testSimpleInsert() {
  const db = new DatabaseClient();
  
  try {
    await db.connect();
    
    // Simple test insert with minimal data
    const result = await db.client.query(`
      INSERT INTO land_registry_extracts_comprehensive (
        registration_office, gush, chelka, sub_chelka, document_filename
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, ['נתניה', 9905, 88, 8, 'test.pdf']);
    
    console.log('✅ Simple insert successful:', result.rows[0]);
    
    await db.disconnect();
  } catch (error) {
    console.error('❌ Simple insert failed:', error.message);
  }
}

testSimpleInsert();