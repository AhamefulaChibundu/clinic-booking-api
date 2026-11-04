const errorHandler = (error, req, res, next) => {
    console.error(error);

    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            error: 'Invalid JSON request body',
        });
    }

    return res.status(error.status || 500).json({
        error: error.status && error.status < 500
            ? error.message
            : 'Internal server error',
    });
};

module.exports = errorHandler;