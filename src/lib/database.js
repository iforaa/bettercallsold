import { Pool } from 'pg';
import { createClient } from 'redis';
import { config } from 'dotenv';

// Load environment variables from .env file for local development
config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bettercallsold',
  ssl: process.env.DB_SSLMODE === 'require' ? { rejectUnauthorized: false } : false
};

// Redis configuration - try URL first, fall back to individual config
const redisConfig = process.env.REDIS_URL ? {
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    connectTimeout: 3000,
    commandTimeout: 2000
  }
} : {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    tls: process.env.REDIS_TLS === 'true',
    connectTimeout: 3000, // 3 seconds timeout for connection
    commandTimeout: 2000  // 2 seconds timeout for commands
  },
  username: process.env.REDIS_USERNAME || undefined,
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
    
    // Always prioritize DATABASE_URL if it exists (for Neon DB)
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
      console.log('Using DATABASE_URL for connection (Neon DB)');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } else {
      console.log('Using individual DB config for connection (local/fallback)');
      pgPool = new Pool(dbConfig);
    }
  }
  return pgPool;
}

// Simple Redis caching - easily toggleable
const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';
let redisClient = null;

async function getRedisClient() {
  if (!CACHE_ENABLED) {
    return null;
  }
  
  if (!redisClient) {
    try {
      redisClient = createClient(redisConfig);
      
      // Set up error handler to prevent crashes
      redisClient.on('error', (error) => {
        console.error('❌ Redis client error:', error.message);
        redisClient = null;
      });
      
      // Connect with timeout
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 3s')), 3000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      if (redisClient) {
        try { await redisClient.disconnect(); } catch {} // Cleanup
      }
      redisClient = null;
      return null;
    }
  }
  
  // Check if connection is still alive
  try {
    if (redisClient && !redisClient.isOpen) {
      console.log('🔄 Redis connection closed, resetting...');
      redisClient = null;
      return null;
    }
  } catch (error) {
    console.error('❌ Redis connection check failed:', error.message);
    redisClient = null;
    return null;
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

// Get database client for transactions
export async function getClient() {
  const pool = getDbPool();
  return await pool.connect();
}

// Simple cache helpers - only for products data
export async function getCached(key) {
  if (!CACHE_ENABLED) {
    return null;
  }
  
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    // Add timeout to cache operations
    const getPromise = client.get(`bcs:${key}`);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cache get timeout')), 1000)
    );
    
    const cached = await Promise.race([getPromise, timeoutPromise]);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Cache get error:', error.message);
    if (error.message.includes('timeout')) {
      // Reset connection on timeout
      redisClient = null;
    }
  }
  
  return null;
}

export async function setCache(key, data, ttlSeconds = 300) {
  if (!CACHE_ENABLED || !data) {
    return false;
  }
  
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    // Add timeout to cache operations
    const setPromise = client.setEx(`bcs:${key}`, ttlSeconds, JSON.stringify(data));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cache set timeout')), 1000)
    );
    
    await Promise.race([setPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error('Cache set error:', error.message);
    if (error.message.includes('timeout')) {
      // Reset connection on timeout
      redisClient = null;
    }
    return false;
  }
}

export async function deleteCache(key) {
  if (!CACHE_ENABLED) {
    return false;
  }
  
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    // Add timeout to cache operations
    const deletePromise = client.del(`bcs:${key}`);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Cache delete timeout')), 1000)
    );
    
    const result = await Promise.race([deletePromise, timeoutPromise]);
    return result > 0; // Redis DEL returns number of keys deleted
  } catch (error) {
    console.error('Cache delete error:', error.message);
    if (error.message.includes('timeout')) {
      // Reset connection on timeout
      redisClient = null;
    }
    return false;
  }
}

// Legacy Redis helpers (kept for compatibility)
export async function redisGet(key) {
  return getCached(key);
}

export async function redisSet(key, value, ttl = 300) {
  return setCache(key, value, ttl);
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