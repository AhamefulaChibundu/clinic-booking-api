
const express = require('express');

const { createBooking, getBookings, getBookingById, cancelBooking, } = require('../controllers/booking.controller');

const bookingRateLimiter = require('../middleware/booking.rateLimiter');
const apiKeyAuth = require('../middleware/apiKeyAuth');

const router = express.Router();

router.use(apiKeyAuth);

router.post('/bookings', bookingRateLimiter, createBooking);
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBookingById);
router.delete('/bookings/:id', cancelBooking);

module.exports = router;
