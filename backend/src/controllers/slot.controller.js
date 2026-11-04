
const mongoose = require('mongoose');
const Slot = require('../models/slot');
const Booking = require('../models/booking');
const { resetSlotsSchema } = require('../validators/slot.validator');

const resetSlots = async (req, res, next) => {
    let session;

    try {
        const { error, value } = resetSlotsSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: error.details[0].message,
            });
        }

        const { slots } = value;

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            await Booking.deleteMany({}, { session });
            await Slot.deleteMany({}, { session });

            if (slots.length > 0) {
                await Slot.insertMany(slots, { session });
            }
        });

        return res.status(200).json({
            message: 'Slots reset successfully',
        });

    } catch (error) {
        next(error);
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

const getSlots = async (req, res, next) => {
    try {
        const filter = {};

        if (req.query.provider) {
            filter.provider = req.query.provider;
        }

        const slots = await Slot.find(filter).sort({ start: 1 });

        const slotIds = slots.map((slot) => slot.id);

        const confirmedBookings = await Booking.find({
            slot_id: { $in: slotIds },
            status: 'confirmed',
        }).select('slot_id');

        const bookedSlotIds = new Set(
            confirmedBookings.map((booking) => booking.slot_id)
        );

        const formattedSlots = slots.map((slot) => ({
            id: slot.id,
            provider: slot.provider,
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            available: !bookedSlotIds.has(slot.id),
        }));

        return res.status(200).json({
            slots: formattedSlots,
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    resetSlots,
    getSlots,
};
