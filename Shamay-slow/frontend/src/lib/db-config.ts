/**
 * Database configuration for Vercel deployment
 * This file ensures environment variables are read at runtime, not build time
 */

export function getDatabaseConfig() {
  const DATABASE_URL = process.env.DATABASE_URL
  const POSTGRES_URL = process.env.POSTGRES_URL
  const POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL_NON_POOLING
  
  console.log('🔍 DB Config: Checking environment variables...')
  console.log('🔍 DATABASE_URL:', DATABASE_URL ? 'SET ✅' : 'NOT SET ❌')
  console.log('🔍 POSTGRES_URL:', POSTGRES_URL ? 'SET ✅' : 'NOT SET ❌')
  console.log('🔍 VERCEL:', process.env.VERCEL ? 'YES' : 'NO')
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV)
  
  // Prefer DATABASE_URL, then POSTGRES_URL, then fallback to local
  const connectionString = DATABASE_URL || POSTGRES_URL || POSTGRES_URL_NON_POOLING
  
  if (connectionString) {
    console.log('✅ Using connection string from env')
    return {
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  }
  
  console.log('⚠️ No connection string found, using fallback config')
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'shamay_land_registry',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
  }
}

