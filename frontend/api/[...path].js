
module.exports = async (req, res) => {
    try {
        const backendUrl = process.env.BACKEND_URL;
        const apiKey = process.env.API_KEY;

        // Check proxy configuration.
        if (!backendUrl || !apiKey) {
            return res.status(500).json({
                error: 'Proxy configuration is missing.',
            });
        }

        // Extract the route from the request URL.
        const incomingUrl = new URL(req.url, 'http://localhost');

        const route = incomingUrl.pathname
            .replace(/^\/api\/?/, '')
            .replace(/\/+$/, '');

        // Allow only patient-facing API operations.
        const allowedRoutes =
            (route === 'slots' && req.method === 'GET') ||
            (route === 'bookings' &&
                ['GET', 'POST'].includes(req.method)) ||
            (/^bookings\/[A-Za-z0-9_-]+$/.test(route) &&
                ['GET', 'DELETE'].includes(req.method));

        if (!allowedRoutes) {
            return res.status(404).json({
                error: 'This API route is not available.',
            });
        }

        // Build the backend URL.
        const targetUrl = new URL(
            `${backendUrl.replace(/\/+$/, '')}/${route}`
        );

        // Forward query parameters, excluding Vercel's internal route parameter.
        incomingUrl.searchParams.forEach((value, key) => {
            if (key !== '...path') {
                targetUrl.searchParams.append(key, value);
            }
        });

        // Prepare the backend request.
        const options = {
            method: req.method,
            headers: {
                'X-API-Key': apiKey,
                Accept: 'application/json',
            },
        };

        // Forward the idempotency key when supplied.
        const idempotencyKey = req.headers['idempotency-key'];

        if (idempotencyKey) {
            options.headers['Idempotency-Key'] = idempotencyKey;
        }

        // Forward POST request bodies.
        if (req.method === 'POST') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(req.body || {});
        }

        // Send the request to Render.
        const backendResponse = await fetch(targetUrl, options);

        const responseBody = await backendResponse.text();

        // Preserve the backend response status.
        res.status(backendResponse.status);

        const contentType = backendResponse.headers.get('content-type');

        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        const retryAfter = backendResponse.headers.get('retry-after');

        if (retryAfter) {
            res.setHeader('Retry-After', retryAfter);
        }

        return res.send(responseBody);

    } catch (error) {
        console.error('Proxy error:', error);

        return res.status(502).json({
            error: 'Unable to communicate with the booking service.',
        });
    }
};
