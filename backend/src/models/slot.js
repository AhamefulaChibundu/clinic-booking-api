const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        
        provider: {
            type: String,
            required: true,
            trim: true,
        },
        
        start: {
            type: Date,
            required: true,
        },
        
        end: {
            type: Date,
            required: true,
        },
    }, {timestamps: false,}
);

const Slot = mongoose.model('Slot', slotSchema);

module.exports = Slot;