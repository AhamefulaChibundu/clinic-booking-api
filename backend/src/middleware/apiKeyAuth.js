
const crypto = require('node:crypto');

const apiKeyAuth = (req, res, next) => {
    const configuredApiKey = process.env.API_KEY;
    const providedApiKey = req.get('X-API-Key');

    // Do not allow requests if the server has no API key configured.
    if (!configuredApiKey) {
        return res.status(500).json({
            error: 'API authentication is not configured.',
        });
    }

    // Reject requests that do not provide an API key.
    if (!providedApiKey) {
        return res.status(401).json({
            error: 'API key is required.',
        });
    }

    const configuredBuffer = Buffer.from(configuredApiKey);
    const providedBuffer = Buffer.from(providedApiKey);

    // Check the lengths before comparing the keys.
    if (configuredBuffer.length !== providedBuffer.length) {
        return res.status(401).json({
            error: 'Invalid API key.',
        });
    }

    // Compare the keys using a timing-safe comparison.
    const isValidApiKey = crypto.timingSafeEqual(
        configuredBuffer,
        providedBuffer
    );

    if (!isValidApiKey) {
        return res.status(401).json({
            error: 'Invalid API key.',
        });
    }

    next();
};

module.exports = apiKeyAuth;
