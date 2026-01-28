const Task = require('../models/Task');

/**
 * TaskRepository
 * Repository Pattern implementation for Task data access
 * Encapsulates all database operations for tasks, providing a clean interface
 * and separation of concerns between routes and database logic
 */
class TaskRepository {
    /**
     * Find all tasks (shared list - all users see the same tasks)
     * @param {Object} filters - Optional filters (completed, priority)
     * @returns {Promise<Array>} Array of tasks
     */
    async findAll(filters = {}) {
        const query = {}; // No userId filter - all users see all tasks
        
        if (filters.completed !== undefined) {
            query.completed = filters.completed;
        }
        
        if (filters.priority) {
            query.priority = filters.priority;
        }
        
        return await Task.find(query)
            .sort({ priority: -1, createdAt: -1 })
            .exec();
    }

    /**
     * Find a task by ID (shared list - all users can access)
     * @param {String} id - Task ID
     * @returns {Promise<Object|null>} Task or null if not found
     */
    async findById(id) {
        return await Task.findById(id).exec();
    }

    /**
     * Create a new task
     * @param {Object} taskData - Task data
     * @returns {Promise<Object>} Created task
     */
    async create(taskData) {
        const task = new Task(taskData);
        return await task.save();
    }

    /**
     * Update a task (shared list - all users can update)
     * @param {String} id - Task ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} Updated task or null if not found
     */
    async update(id, updateData) {
        return await Task.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: Date.now() },
            { new: true, runValidators: true }
        ).exec();
    }

    /**
     * Delete a task (shared list - all users can delete)
     * @param {String} id - Task ID
     * @returns {Promise<Object|null>} Deleted task or null if not found
     */
    async delete(id) {
        return await Task.findByIdAndDelete(id).exec();
    }

    /**
     * Lock a task for editing (shared list - all users can lock)
     * Auto-unlocks old locks if they're older than 5 minutes
     * @param {String} id - Task ID
     * @param {String} clientId - Client ID locking the task
     * @returns {Promise<Object|null>} Task or null if not found
     */
    async lock(id, clientId) {
        const task = await Task.findById(id).exec();
        if (!task) return null;
        
        // Auto-unlock if lock is older than 5 minutes
        const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        if (task.lockedBy && task.lockedAt) {
            const lockAge = Date.now() - new Date(task.lockedAt).getTime();
            if (lockAge > LOCK_TIMEOUT) {
                // Auto-unlock expired lock
                task.lockedBy = null;
                task.lockedAt = null;
            } else if (task.lockedBy !== clientId) {
                throw new Error('Task is already locked by another client');
            }
        }
        
        task.lockedBy = clientId;
        task.lockedAt = Date.now();
        return await task.save();
    }

    /**
     * Unlock a task (shared list - all users can unlock)
     * @param {String} id - Task ID
     * @param {String} clientId - Client ID unlocking the task
     * @returns {Promise<Object|null>} Task or null if not found
     */
    async unlock(id, clientId) {
        const task = await Task.findById(id).exec();
        if (!task) return null;
        
        if (task.lockedBy === clientId) {
            task.lockedBy = null;
            task.lockedAt = null;
            return await task.save();
        }
        
        return task;
    }

    /**
     * Toggle task completion status (shared list - all users can toggle)
     * @param {String} id - Task ID
     * @returns {Promise<Object|null>} Updated task or null if not found
     */
    async toggleComplete(id) {
        const task = await Task.findById(id).exec();
        if (!task) return null;
        
        task.completed = !task.completed;
        task.updatedAt = Date.now();
        return await task.save();
    }

    /**
     * Get tasks with due date approaching (for notifications) - shared list
     * @param {Number} daysAhead - Number of days ahead to check
     * @returns {Promise<Array>} Array of tasks
     */
    async findUpcomingTasks(daysAhead = 7) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        
        return await Task.find({
            completed: false,
            dueDate: {
                $gte: today,
                $lte: futureDate
            }
        }).sort({ dueDate: 1 }).exec();
    }
}

module.exports = TaskRepository;
