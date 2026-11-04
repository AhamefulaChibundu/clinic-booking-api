const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        
        slot_id: {
            type: String,
            required: true,
        },
        
        name: {
            type: String,
            required: true,
            trim: true,
        },
        
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        
        status: {
            type: String,
            enum: ['confirmed', 'cancelled'],
            default: 'confirmed',
        },
        
        idempotency_key: {type: String},
    }, {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: false,
        },
    });

// A slot can have only one confirmed booking at a time.
bookingSchema.index(
    {slot_id: 1},
    {
        unique: true,
        partialFilterExpression: {status: 'confirmed'},
    }
);

// An idempotency key can belong to only one booking.
bookingSchema.index(
    {idempotency_key: 1},
    {
        unique: true,
        sparse: true,
    }
);


const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;