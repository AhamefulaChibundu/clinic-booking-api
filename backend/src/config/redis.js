const Redis = require('ioredis');

let redisClient;

const getRedisClient = () => {
    if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL is not defined in environment variables');
    }

    if (!redisClient) {
        redisClient = new Redis(process.env.REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
            retryStrategy(times) {
                return Math.min(times * 500, 5000);
            },
        });

        redisClient.on('error', (error) => {
            console.error('Redis connection error:', error.message);
        });
    }

    return redisClient;
};

const connectRedis = async () => {
    const client = getRedisClient();

    if (client.status === 'wait') {
        await client.connect();
    }

    await client.ping();

    console.log('Redis connected successfully');
};

module.exports = {
    getRedisClient,
    connectRedis,
};