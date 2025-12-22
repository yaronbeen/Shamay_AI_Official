/**
 * Apply Field Provenance Table Migration
 * Creates the field_provenance table in PostgreSQL
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import db from '../../backend/src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

async function applyMigration() {
  const client = await db.getClient();
  
  try {
    console.log('🔄 Applying field_provenance table migration...');
    console.log('');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '004_add_field_provenance_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Reading migration file:', migrationPath);
    console.log('📊 SQL file size:', sql.length, 'characters');
    console.log('');
    
    // Execute the migration
    console.log('🚀 Executing migration...');
    await client.query(sql);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    
    // Verify table was created
    console.log('🔍 Verifying table structure...');
    const tableCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'field_provenance'
      ORDER BY ordinal_position
    `);
    
    console.log(`✅ Table 'field_provenance' exists with ${tableCheck.rows.length} columns:`);
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    console.log('');
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'field_provenance'
      ORDER BY indexname
    `);
    
    console.log(`✅ Created ${indexCheck.rows.length} indexes:`);
    indexCheck.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log('');
    
    // Check constraints
    const constraintCheck = await client.query(`
      SELECT 
        conname,
        contype
      FROM pg_constraint 
      WHERE conrelid = 'field_provenance'::regclass
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log(`✅ Constraints:`);
      constraintCheck.rows.forEach(con => {
        const type = con.contype === 'p' ? 'PRIMARY KEY' : 
                     con.contype === 'f' ? 'FOREIGN KEY' : 
                     con.contype === 'u' ? 'UNIQUE' : 'OTHER';
        console.log(`   - ${con.conname} (${type})`);
      });
      console.log('');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('');
    console.error('❌ Migration failed:');
    console.error('   Error:', error.message);
    if (error.position) {
      console.error('   Position:', error.position);
    }
    console.error('');
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run migration
applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

