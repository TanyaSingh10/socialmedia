const { createClient } = require('redis');

let redisClient = null;
let isRedisConnected = false;

// Local in-memory fallback cache
const memoryCache = new Map();

const connectRedis = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.warn('Redis client error, falling back to memory cache:', err.message);
      isRedisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connecting...');
    });

    redisClient.on('ready', () => {
      console.log('Redis connected and ready!');
      isRedisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn('Failed to initialize Redis. Using in-memory fallback cache.', error.message);
    isRedisConnected = false;
  }
};

const getCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Redis get error:', err);
    }
  }
  // In-memory fallback
  const item = memoryCache.get(key);
  if (item) {
    if (item.expiry && item.expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  }
  return null;
};

const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
      return;
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }
  // In-memory fallback
  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttlSeconds * 1000
  });
};

const delCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.error('Redis del error:', err);
    }
  }
  // In-memory fallback
  memoryCache.delete(key);
};

module.exports = {
  connectRedis,
  getCache,
  setCache,
  delCache,
  get client() {
    return isRedisConnected ? redisClient : null;
  }
};
