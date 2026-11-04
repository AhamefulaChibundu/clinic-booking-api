const crypto = require('node:crypto');
const { getRedisClient } = require('../config/redis');

const WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Redis executes this script atomically.
const rateLimitScript = `
    local key = KEYS[1]

    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local maxAttempts = tonumber(ARGV[3])
    local member = ARGV[4]

    -- Remove attempts older than 60 seconds.
    redis.call(
        'ZREMRANGEBYSCORE',
        key,
        '-inf',
        now - window
    )

    -- Count the remaining attempts.
    local count = redis.call('ZCARD', key)

    -- Block the request if the limit has been reached.
    if count >= maxAttempts then
        local oldest = redis.call(
            'ZRANGE',
            key,
            0,
            0,
            'WITHSCORES'
        )

        local retryAfterMs = tonumber(oldest[2]) + window - now
        local retryAfter = math.ceil(retryAfterMs / 1000)

        return {0, math.max(1, retryAfter)}
    end

    -- Record this new attempt.
    redis.call('ZADD', key, now, member)

    -- Automatically remove the key after the window expires.
    redis.call('PEXPIRE', key, window)

    return {1, 0}
`;

const bookingRateLimiter = async (req, res, next) => {
    try {
        const email =
            typeof req.body?.email === 'string'
                ? req.body.email.trim().toLowerCase()
                : '';

        // Let the booking validator handle missing or empty emails.
        if (!email) {
            return next();
        }

        // Hash the email so the actual email isn't stored in the Redis key.
        const emailHash = crypto
            .createHash('sha256')
            .update(email)
            .digest('hex');

        const redisKey = `koya:booking-rate-limit:${emailHash}`;

        const now = Date.now();
        const requestId = crypto.randomUUID();

        const result = await getRedisClient().eval(
            rateLimitScript,
            1,
            redisKey,
            now,
            WINDOW_MS,
            MAX_ATTEMPTS,
            requestId
        );

        const allowed = Number(result[0]) === 1;

        if (!allowed) {
            const retryAfter = Number(result[1]);

            res.set('Retry-After', String(retryAfter));

            return res.status(429).json({
                error: 'Too many booking attempts. Please try again later.',
            });
        }

        return next();

    } catch (error) {
        console.error('Booking rate limiter error:', error.message);

        // Fail closed: do not allow booking attempts when Redis is unavailable.
        return res.status(503).json({
            error: 'Booking service is temporarily unavailable. Please try again later.',
        });
    }
};

module.exports = bookingRateLimiter;