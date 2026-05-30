/**
 * Rate Limiter — In-memory sliding window rate limiter
 * Prevents API abuse by limiting requests per IP address.
 */

const windowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = 100;

const requestCounts = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const timestamps = requestCounts.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  requestCounts.set(ip, timestamps);

  if (timestamps.length > maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000),
    });
  }

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - timestamps.length);
  next();
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestCounts.entries()) {
    const valid = timestamps.filter(t => now - t < windowMs);
    if (valid.length === 0) requestCounts.delete(ip);
    else requestCounts.set(ip, valid);
  }
}, 5 * 60 * 1000);

module.exports = { rateLimit };
