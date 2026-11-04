
const Joi = require('joi');

const slotSchema = Joi.object({
    id: Joi.string().trim().min(1).required(),
    provider: Joi.string().trim().min(1).required(),
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required(),
}).custom((slot, helpers) => {
    if (slot.end <= slot.start) {
        return helpers.error('any.invalid');
    }

    return slot;
}, 'Slot date validation');

const resetSlotsSchema = Joi.object({
    slots: Joi.array()
        .items(slotSchema)
        .unique('id')
        .required(),
});

module.exports = {
    resetSlotsSchema,
};
