const mongoose = require('mongoose');

/**
 * Task Schema
 * Represents a task in the todo list application
 * 
 * @property {String} title - Task title (required)
 * @property {String} description - Task description (optional)
 * @property {Boolean} completed - Completion status (default: false)
 * @property {String} priority - Task priority: 'low', 'medium', 'high' (default: 'medium')
 * @property {Date} dueDate - Task due date (optional)
 * @property {String} userId - ID of the user who owns the task (required for authentication)
 * @property {Date} createdAt - Task creation timestamp
 * @property {Date} updatedAt - Task last update timestamp
 * @property {String} lockedBy - Client ID currently editing the task (for real-time locking)
 * @property {Date} lockedAt - Timestamp when task was locked
 */
const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: 1000
    },
    completed: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        default: null
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional - tracks who created the task but all users see all tasks
    },
    createdBy: {
        type: String, // Username of creator (for display purposes)
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lockedBy: {
        type: String,
        default: null
    },
    lockedAt: {
        type: Date,
        default: null
    }
});

// Update the updatedAt field before saving
taskSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Index for efficient queries (removed userId indexes since all users see all tasks)
taskSchema.index({ createdAt: -1 });
taskSchema.index({ completed: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
