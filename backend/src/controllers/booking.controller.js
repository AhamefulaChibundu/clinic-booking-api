const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Slot = require('../models/slot');
const Booking = require('../models/booking');
const { createBookingSchema, getBookingsQuerySchema, } = require('../validators/booking.validator');

// Reusable booking response
const sendBookingResponse = (res, booking) => {
    return res.status(201).json({
        id: booking.id,
        slot_id: booking.slot_id,
        name: booking.name,
        email: booking.email,
        status: booking.status,
        created_at: booking.created_at,
    });
};

// Create a booking
const createBooking = async (req, res, next) => {
    try {
        const { error, value } = createBookingSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: error.details[0].message,
            });
        }

        const { slot_id, name, email } = value;
        const idempotencyKey = req.get('Idempotency-Key');

        // Check whether this request has already been processed.
        if (idempotencyKey) {
            const existingRequest = await Booking.findOne({
                idempotency_key: idempotencyKey,
            });

            if (existingRequest) {
                const sameRequest =
                    existingRequest.slot_id === slot_id &&
                    existingRequest.name === name &&
                    existingRequest.email === email;

                if (!sameRequest) {
                    return res.status(422).json({
                        error: 'Idempotency key has already been used with a different request.',
                    });
                }

                return sendBookingResponse(res, existingRequest);
            }
        }

        // Check whether the requested slot exists.
        const slot = await Slot.findOne({ id: slot_id });

        if (!slot) {
            return res.status(404).json({
                error: 'Slot not found.',
            });
        }

        // A booking cannot be made for a slot that has already started.
        if (slot.start <= new Date()) {
            return res.status(400).json({
                error: 'Cannot book a slot that has already started.',
            });
        }

        // Check whether another confirmed booking already occupies the slot.
        const existingBooking = await Booking.findOne({
            slot_id,
            status: 'confirmed',
        });

        if (existingBooking) {
            return res.status(409).json({
                error: 'This slot has already been booked.',
            });
        }

        // Create the booking.
        const booking = await Booking.create({
            id: crypto.randomUUID(),
            slot_id,
            name,
            email,
            status: 'confirmed',
            ...(idempotencyKey && {
                idempotency_key: idempotencyKey,
            }),
        });

        return sendBookingResponse(res, booking);

    } catch (error) {
        // Handle duplicate-key errors caused by concurrent requests.
        if (error.code === 11000) {
            const idempotencyKey = req.get('Idempotency-Key');

            if (idempotencyKey) {
                const existingRequest = await Booking.findOne({
                    idempotency_key: idempotencyKey,
                });

                if (existingRequest) {
                    const { error: validationError, value } =
                        createBookingSchema.validate(req.body);

                    if (validationError) {
                        return res.status(400).json({
                            error: validationError.details[0].message,
                        });
                    }

                    const sameRequest =
                        existingRequest.slot_id === value.slot_id &&
                        existingRequest.name === value.name &&
                        existingRequest.email === value.email;

                    if (!sameRequest) {
                        return res.status(422).json({
                            error: 'Idempotency key has already been used with a different request.',
                        });
                    }

                    return sendBookingResponse(res, existingRequest);
                }
            }

            return res.status(409).json({
                error: 'This slot has already been booked.',
            });
        }

        return next(error);
    }
};

// Get bookings belonging to an email address, with cursor pagination.
const getBookings = async (req, res, next) => {
    try {
        const { error, value } = getBookingsQuerySchema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: error.details[0].message,
            });
        }

        const { email, limit, cursor } = value;

        const filter = { email };

        // Decode and validate the pagination cursor.
        if (cursor) {
            let decodedCursor;

            try {
                decodedCursor = JSON.parse(
                    Buffer.from(cursor, 'base64url').toString('utf8')
                );
            } catch {
                return res.status(400).json({
                    error: 'Invalid pagination cursor.',
                });
            }

            const validCursor =
                decodedCursor &&
                typeof decodedCursor.created_at === 'string' &&
                !Number.isNaN(Date.parse(decodedCursor.created_at)) &&
                typeof decodedCursor.id === 'string' &&
                /^[0-9a-fA-F]{24}$/.test(decodedCursor.id);

            if (!validCursor) {
                return res.status(400).json({
                    error: 'Invalid pagination cursor.',
                });
            }

            const cursorDate = new Date(decodedCursor.created_at);
            const cursorId = new mongoose.Types.ObjectId(decodedCursor.id);

            filter.$or = [
                {
                    created_at: { $gt: cursorDate },
                },
                {
                    created_at: cursorDate,
                    _id: { $gt: cursorId },
                },
            ];
        }

        // Fetch one extra record to determine whether another page exists.
        const bookings = await Booking.find(filter)
            .sort({ created_at: 1, _id: 1 })
            .limit(limit + 1);

        const hasNextPage = bookings.length > limit;

        if (hasNextPage) {
            bookings.pop();
        }

        const formattedBookings = bookings.map((booking) => ({
            id: booking.id,
            slot_id: booking.slot_id,
            name: booking.name,
            email: booking.email,
            status: booking.status,
            created_at: booking.created_at,
        }));

        let nextCursor = null;

        if (hasNextPage && bookings.length > 0) {
            const lastBooking = bookings[bookings.length - 1];

            nextCursor = Buffer.from(
                JSON.stringify({
                    created_at: lastBooking.created_at.toISOString(),
                    id: lastBooking._id.toString(),
                })
            ).toString('base64url');
        }

        return res.status(200).json({
            bookings: formattedBookings,
            next_cursor: nextCursor,
        });

    } catch (error) {
        return next(error);
    }
};

// Get one booking using its public booking ID.
const getBookingById = async (req, res, next) => {
    try {
        const booking = await Booking.findOne({
            id: req.params.id,
        });

        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found.',
            });
        }

        return res.status(200).json({
            id: booking.id,
            slot_id: booking.slot_id,
            name: booking.name,
            email: booking.email,
            status: booking.status,
            created_at: booking.created_at,
        });

    } catch (error) {
        return next(error);
    }
};

// Cancel a booking.
const cancelBooking = async (req, res, next) => {
    try {
        // Only update a booking that is currently confirmed.
        const booking = await Booking.findOneAndUpdate(
            {
                id: req.params.id,
                status: 'confirmed',
            },
            {
                $set: { status: 'cancelled' },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!booking) {
            const existingBooking = await Booking.findOne({
                id: req.params.id,
            });

            if (!existingBooking) {
                return res.status(404).json({
                    error: 'Booking not found.',
                });
            }

            return res.status(409).json({
                error: 'This booking has already been cancelled.',
            });
        }

        return res.status(200).json({
            id: booking.id,
            slot_id: booking.slot_id,
            name: booking.name,
            email: booking.email,
            status: booking.status,
            created_at: booking.created_at,
        });

    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createBooking,
    getBookings,
    getBookingById,
    cancelBooking,
};