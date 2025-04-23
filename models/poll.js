// filepath: c:\Users\lappify\OneDrive\Desktop\KYUBANE CROREPATI\models\poll.js
const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: Map, of: Number, required: true }, // Store options as key-value pairs
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Poll', pollSchema);