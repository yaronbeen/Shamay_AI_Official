/**
 * Database Client
 *
 * Shared database connection pool and utilities for all services.
 * Handles both local PostgreSQL (pg) and Neon serverless connections.
 *
 * @module services/DatabaseClient
 */

// Import based on environment
let Pool, neonConfig;
const isDev = process.env.NODE_ENV !== "production";
const isVercel =
  process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
const hasDatabaseURL = !!(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING
);
const useLocalDB =
  isDev &&
  !isVercel &&
  (!hasDatabaseURL || process.env.USE_LOCAL_DB === "true");

if (useLocalDB) {
  try {
    const pg = require("pg");
    Pool = pg.Pool;
    console.log("✅ [DatabaseClient] Using pg (local PostgreSQL)");
  } catch (e) {
    console.error("❌ [DatabaseClient] Failed to import pg:", e.message);
    throw new Error("pg module is required for local development");
  }
} else {
  try {
    const neonModule = require("@neondatabase/serverless");
    neonConfig = neonModule.neonConfig;
    Pool = neonModule.Pool;
    console.log("✅ [DatabaseClient] Using @neondatabase/serverless");
  } catch (e) {
    try {
      const pg = require("pg");
      Pool = pg.Pool;
      console.log("⚠️ [DatabaseClient] Neon not available, falling back to pg");
    } catch (pgError) {
      console.error(
        "❌ [DatabaseClient] Failed to import both Neon and pg:",
        pgError.message,
      );
      throw new Error("Database driver is not available");
    }
  }
}

// Lazy pool initialization
let pool = null;

/**
 * Get database configuration based on environment
 * @returns {Object} Database configuration object
 */
function getDatabaseConfig() {
  const DATABASE_URL = process.env.DATABASE_URL;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL_NON_POOLING;
  const connectionString =
    DATABASE_URL || POSTGRES_URL || POSTGRES_URL_NON_POOLING;

  if (connectionString) {
    if (isDev && !isVercel && process.env.USE_LOCAL_DB === "true") {
      return {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "shamay_land_registry",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "postgres123",
      };
    }
    return { connectionString };
  }

  // Fallback to individual parameters
  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "shamay_land_registry",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres123",
  };
}

/**
 * Get or create the database pool
 * @returns {Pool} Database connection pool
 */
function getPool() {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);
    pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err);
    });
  }
  return pool;
}

/**
 * Database client wrapper with common operations
 */
const db = {
  /**
   * Execute a query
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params) {
    const pool = getPool();
    return pool.query(text, params);
  },

  /**
   * Get a client from the pool for transactions
   * @returns {Promise<Object>} Database client
   */
  async client() {
    const pool = getPool();
    return pool.connect();
  },

  /**
   * Close the pool (for cleanup)
   */
  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
};

/**
 * Safely parse JSON, handling both strings and already-parsed objects
 * @param {string|Object} value - Value to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed value or default
 */
function safeParseJSON(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  }
  return value;
}

// In-memory cache for loadShumaForWizard
const shumaCache = new Map();
const CACHE_TTL_MS = 5000; // 5 seconds

/**
 * Cache operations
 */
const cache = {
  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const cached = shumaCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    return undefined;
  },

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(key, data) {
    shumaCache.set(key, { data, timestamp: Date.now() });
  },

  /**
   * Delete cached value
   * @param {string} key - Cache key (optional, clears all if not provided)
   */
  delete(key) {
    if (key) {
      shumaCache.delete(key);
    } else {
      shumaCache.clear();
    }
  },

  /**
   * Clear all cache
   */
  clear() {
    shumaCache.clear();
  },
};

module.exports = {
  db,
  cache,
  safeParseJSON,
  getPool,
  getDatabaseConfig,
  CACHE_TTL_MS,
};
