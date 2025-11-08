// Database connection pool configuration
const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise use individual env vars
const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require') 
    ? { rejectUnauthorized: false } 
    : false
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shamay_land_registry',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_HOST?.includes('neon.tech') ? { rejectUnauthorized: false } : false
};

const pool = new Pool({
  ...poolConfig,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    throw error;
  }
};

// Helper to get a client from pool
const getClient = async () => {
  const client = await pool.connect();
  const originalQuery = client.query;
  const originalRelease = client.release;

  // Set a timeout of 5 seconds for the query
  const timeout = setTimeout(() => {
    console.error('❌ Client checkout timeout');
  }, 5000);

  // Monkey patch the query method to track queries
  client.query = (...args) => {
    client.lastQuery = args;
    return originalQuery.apply(client, args);
  };

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease.apply(client);
  };

  return client;
};

module.exports = {
  pool,
  query,
  getClient,
};

