#!/usr/bin/env node

/**
 * Setup script for Vercel Postgres database
 * Run this after creating your Vercel Postgres database
 * 
 * Usage:
 * node scripts/setup-vercel-db.js
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function setupDatabase() {
  console.log('🔧 Setting up Vercel Postgres database...')
  
  // Use Vercel's non-pooling connection for migrations
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL
  
  if (!connectionString) {
    console.error('❌ Error: POSTGRES_URL_NON_POOLING or DATABASE_URL environment variable not set')
    console.log('💡 Get your connection string from Vercel Dashboard > Storage > Your Database > .env.local')
    process.exit(1)
  }
  
  console.log('🔌 Connecting to database...')
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Required for Neon/Vercel Postgres
    }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    // Read and execute the initialization SQL
    console.log('📄 Reading initialization SQL...')
    const sqlPath = path.join(__dirname, '../database/init_complete_database.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('⚙️ Executing SQL script (main tables)...')
    await client.query(sql)
    
    console.log('✅ Main database schema initialized!')
    
    // Add AI extractions table if not already in main script
    console.log('📄 Adding AI extractions table...')
    const aiExtractionsPath = path.join(__dirname, '../database/migrations/002_add_ai_extractions_table.sql')
    
    if (fs.existsSync(aiExtractionsPath)) {
      const aiExtractionsSQL = fs.readFileSync(aiExtractionsPath, 'utf8')
      await client.query(aiExtractionsSQL)
      console.log('✅ AI extractions table created!')
    }
    
    console.log('📊 Tables created:')
    console.log('   - users, organizations, organization_memberships')
    console.log('   - shuma (main valuation table)')
    console.log('   - land_registry_extracts')
    console.log('   - building_permit_extracts')
    console.log('   - shared_building_order')
    console.log('   - garmushka')
    console.log('   - images')
    console.log('   - ai_extractions')
    console.log('   - + other tables')
    
    // Create default admin user
    console.log('👤 Checking for admin user...')
    const userCheck = await client.query(
      "SELECT email FROM users WHERE email = 'admin@shamay.ai'"
    )
    
    if (userCheck.rows.length === 0) {
      console.log('👤 Creating default admin user...')
      // Password: admin123 (hashed)
      await client.query(`
        INSERT INTO users (email, name, password_hash, role, is_active)
        VALUES (
          'admin@shamay.ai',
          'Admin User',
          '$2a$10$YourHashedPasswordHere',
          'admin',
          true
        )
        ON CONFLICT (email) DO NOTHING
      `)
      console.log('✅ Admin user created: admin@shamay.ai / admin123')
    } else {
      console.log('✅ Admin user already exists')
    }
    
    console.log('\n🎉 Database setup complete!')
    console.log('💡 You can now deploy your app to Vercel')
    
  } catch (error) {
    console.error('❌ Error setting up database:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

setupDatabase()

