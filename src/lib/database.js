import { Pool } from 'pg';
import { createClient } from 'redis';

// Note: dotenv not needed on Vercel - env vars are already available
// dotenv.config() would only be needed in local development

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bettercallsold',
  ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
};

// Redis configuration
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0')
};

// Create PostgreSQL connection pool
let pgPool;
function getDbPool() {
  if (!pgPool) {
    // Debug log
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'exists' : 'not found');
    console.log('DB_NAME:', process.env.DB_NAME);
    
    // If DATABASE_URL is provided, use it directly
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } else {
      console.log('Using individual DB config for connection');
      pgPool = new Pool(dbConfig);
    }
  }
  return pgPool;
}

// Redis completely disabled on Vercel - set to false by default
const REDIS_ENABLED = false;
let redisClient = null;

async function getRedisClient() {
  console.log('Redis is completely disabled');
  return null;
}

// Database query helper
export async function query(text, params = []) {
  const pool = getDbPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Redis helpers (completely disabled)
export async function redisGet(key) {
  console.log('Redis disabled - redisGet returning null for key:', key);
  return null;
}

export async function redisSet(key, value, ttl = null) {
  console.log('Redis disabled - redisSet skipped for key:', key);
  return true; // Pretend success
}

// Health check functions
export async function checkDatabaseHealth() {
  try {
    const result = await query('SELECT 1 as healthy');
    return result.rows[0].healthy === 1;
  } catch (error) {
    return false;
  }
}

export async function checkRedisHealth() {
  console.log('Redis disabled - health check returns true');
  return true; // Always healthy since disabled
}