import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Create Redis client (optional - disabled on Vercel)
let redisClient;
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false' && process.env.REDIS_HOST;

async function getRedisClient() {
  if (!REDIS_ENABLED) {
    console.log('Redis is disabled - skipping connection');
    return null;
  }
  
  if (!redisClient) {
    try {
      redisClient = createClient(redisConfig);
      redisClient.on('error', (err) => console.error('Redis Client Error:', err));
      await redisClient.connect();
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed:', error);
      redisClient = null;
    }
  }
  return redisClient;
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

// Redis helpers (gracefully handle disabled Redis)
export async function redisGet(key) {
  try {
    if (!REDIS_ENABLED) {
      console.log('Redis disabled - redisGet returning null for key:', key);
      return null;
    }
    
    const client = await getRedisClient();
    if (!client) return null;
    
    return await client.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null; // Return null instead of throwing
  }
}

export async function redisSet(key, value, ttl = null) {
  try {
    if (!REDIS_ENABLED) {
      console.log('Redis disabled - redisSet skipped for key:', key);
      return true; // Pretend success
    }
    
    const client = await getRedisClient();
    if (!client) return false;
    
    if (ttl) {
      return await client.setEx(key, ttl, value);
    } else {
      return await client.set(key, value);
    }
  } catch (error) {
    console.error('Redis set error:', error);
    return false; // Return false instead of throwing
  }
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
  try {
    if (!REDIS_ENABLED) {
      console.log('Redis disabled - health check returns true');
      return true; // Consider healthy if disabled
    }
    
    const client = await getRedisClient();
    if (!client) return false;
    
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check error:', error);
    return false;
  }
}