const { getCache, setCache } = require('../config/redis');

/**
 * Cache middleware generator.
 * @param {number} durationSeconds - Cache duration.
 */
const cacheMiddleware = (durationSeconds = 120) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a unique key based on URL and user id (if logged in, otherwise just URL)
    const userId = req.user ? req.user._id.toString() : 'guest';
    const key = `api-cache:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await getCache(key);

      if (cachedResponse) {
        // Serve from cache
        return res.json(cachedResponse);
      }

      // Override res.json to capture and cache response
      const originalJson = res.json;
      res.json = function (body) {
        // Cache the body if response was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(key, body, durationSeconds).catch((err) => {
            console.error('Async cache save error:', err);
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      console.error('Cache middleware error, passing through:', err);
      next();
    }
  };
};

module.exports = { cacheMiddleware };
