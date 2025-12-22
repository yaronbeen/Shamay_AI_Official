import { Pool } from 'pg'
import { spawn } from 'child_process'

// Use DATABASE_URL from environment (Vercel Postgres) or fall back to local config
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'shamay_land_registry',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT || '5432'),
      }
)

export async function setupDatabase() {
  try {
    console.log('🚀 Setting up database tables...')
    
    // Create comparable_data table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comparable_data (
        id SERIAL PRIMARY KEY,
        address VARCHAR(255) NOT NULL,
        neighborhood VARCHAR(100),
        city VARCHAR(100),
        rooms INTEGER,
        floor INTEGER,
        area DECIMAL(10,2),
        price DECIMAL(15,2),
        price_per_sqm DECIMAL(10,2),
        sale_date DATE,
        building_year VARCHAR(100),
        parking BOOLEAN DEFAULT FALSE,
        elevator BOOLEAN DEFAULT FALSE,
        balcony DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Create property_assessments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_assessments (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        property_address VARCHAR(255),
        client_name VARCHAR(255),
        valuation_date DATE,
        rooms INTEGER,
        floor INTEGER,
        area DECIMAL(10,2),
        balcony DECIMAL(5,2) DEFAULT 0,
        parking BOOLEAN DEFAULT FALSE,
        elevator BOOLEAN DEFAULT FALSE,
        final_valuation DECIMAL(15,2),
        price_per_sqm DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('✅ Database tables created successfully')
    
    // Insert some sample comparable data
    await pool.query(`
      INSERT INTO comparable_data (address, neighborhood, city, rooms, floor, area, price, price_per_sqm, sale_date, building_year, parking, elevator, balcony) VALUES
      ('רחוב הרצל 12, תל אביב', 'הרצל', 'תל אביב', 3, 2, 85.5, 2500000, 29240, '2024-01-15', 2010, true, true, 8.5),
      ('רחוב דיזנגוף 45, תל אביב', 'דיזנגוף', 'תל אביב', 4, 3, 95.0, 2800000, 29474, '2024-01-10', 2015, true, true, 12.0),
      ('רחוב אלנבי 78, תל אביב', 'אלנבי', 'תל אביב', 3, 1, 80.0, 2200000, 27500, '2024-01-05', 2008, false, true, 6.0),
      ('רחוב בן יהודה 23, תל אביב', 'בן יהודה', 'תל אביב', 2, 4, 65.0, 1800000, 27692, '2023-12-20', 2012, true, false, 4.0),
      ('רחוב רוטשילד 56, תל אביב', 'רוטשילד', 'תל אביב', 4, 2, 110.0, 3200000, 29091, '2023-12-15', 2018, true, true, 15.0)
      ON CONFLICT DO NOTHING
    `)
    
    console.log('✅ Sample data inserted')
    
  } catch (error) {
    console.error('❌ Database setup error:', error)
    throw error
  }
}

export { pool }

export async function checkDatabaseConnection() {
  try {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn('psql' as any, [
        '-U', 'postgres',
        '-d', 'shamay_land_registry',
        '-c', 'SELECT 1;'
      ])
      
      checkProcess.on('close', (code: any) => {
        if (code === 0) {
          resolve({ connected: true })
        } else {
          reject(new Error('Database connection failed'))
        }
      })
    })
  } catch (error) {
    throw error
  }
}
