
const express = require('express');
const cors = require('cors');

const slotRoutes = require('./routes/slot.routes');
const bookingRoutes = require('./routes/booking.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());

// Public health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Clinic Booking API is healthy',
    });
});

// API routes
app.use('/', slotRoutes);
app.use('/', bookingRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;
