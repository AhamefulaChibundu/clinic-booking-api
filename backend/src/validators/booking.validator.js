const Joi = require('joi');

const createBookingSchema = Joi.object({
    slot_id: Joi.string().trim().min(1).required(),
    name: Joi.string().trim().min(1).required(),
    email: Joi.string().trim().lowercase().email().required(),
});

const getBookingsQuerySchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    cursor: Joi.string().optional(),
});

module.exports = {
    createBookingSchema,
    getBookingsQuerySchema,
};