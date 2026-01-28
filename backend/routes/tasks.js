const express = require('express');
const router = express.Router();
const ServiceFactory = require('../factories/ServiceFactory');
const { authenticate } = require('../middleware/auth');

/**
 * Task Routes
 * All routes require authentication middleware
 * Uses Repository pattern for database operations
 */

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * Helper function to get Socket.io instance and emit event
 * Centralizes Socket.io operations to avoid code duplication
 * @param {Object} req - Express request object
 * @param {String} event - Event name to emit
 * @param {*} data - Data to emit
 */
const getIO = (req) => {
    return req.app.get('io');
};

const emitSocketEvent = (req, event, data) => {
    const io = getIO(req);
    if (io) {
        io.emit(event, data);
    }
};

/**
 * GET /api/tasks
 * Get all tasks (shared list - all users see the same tasks)
 * Query params: ?completed=true/false&priority=low/medium/high
 */
router.get('/', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();
        const filters = {
            completed: req.query.completed !== undefined ? req.query.completed === 'true' : undefined,
            priority: req.query.priority
        };

        const tasks = await taskRepository.findAll(filters);
        res.json(tasks);
    } catch (error) {
        handleError(res, error, 500, 'Error fetching tasks');
    }
});

/**
 * GET /api/tasks/:id
 * Get a specific task by ID (shared list)
 */
router.get('/:id', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();
        const task = await taskRepository.findById(req.params.id);

        if (!task) {
            return handleNotFoundError(res, 'Task');
        }

        res.json(task);
    } catch (error) {
        handleError(res, error, 500, 'Error fetching task');
    }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
    try {
        const { title, description, priority, dueDate } = req.body;

        if (!title || !title.trim()) {
            return handleValidationError(res, 'Title is required');
        }

        const taskRepository = ServiceFactory.getTaskRepository();
        const task = await taskRepository.create({
            title: title.trim(),
            description: description?.trim() || '',
            priority: priority || 'medium',
            dueDate: dueDate || null,
            userId: req.userId, // Optional - tracks creator
            createdBy: req.user?.username || 'Unknown', // Track who created it
            completed: false
        });

        // Emit real-time event
        emitSocketEvent(req, 'task:created', task);

        res.status(201).json(task);
    } catch (error) {
        handleError(res, error, 400, 'Error creating task');
    }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();

        // Check if task exists (shared list - all users can edit)
        const existingTask = await taskRepository.findById(req.params.id);
        if (!existingTask) {
            return handleNotFoundError(res, 'Task');
        }

        // Check if task is locked by another client
        if (existingTask.lockedBy && existingTask.lockedBy !== req.body.clientId) {
            return handleLockedError(res, 'Task is currently being edited by another user');
        }

        // Prepare update data
        const updateData = {
            title: req.body.title?.trim(),
            description: req.body.description?.trim() || '',
            priority: req.body.priority || existingTask.priority,
            dueDate: req.body.dueDate || null,
            completed: req.body.completed !== undefined ? req.body.completed : existingTask.completed,
            lockedBy: null,
            lockedAt: null
        };

        const updatedTask = await taskRepository.update(
            req.params.id,
            updateData
        );

        // Emit real-time event
        emitSocketEvent(req, 'task:updated', updatedTask);

        res.json(updatedTask);
    } catch (error) {
        handleError(res, error, 400, 'Error updating task');
    }
});

/**
 * PATCH /api/tasks/:id/toggle
 * Toggle task completion status
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();

        // Check if task exists (shared list - all users can toggle)
        const existingTask = await taskRepository.findById(req.params.id);
        if (!existingTask) {
            return handleNotFoundError(res, 'Task');
        }

        // Check if task is locked
        if (existingTask.lockedBy) {
            return handleLockedError(res, 'Task is currently being edited');
        }

        const task = await taskRepository.toggleComplete(req.params.id);

        // Emit real-time event
        emitSocketEvent(req, 'task:toggled', task);

        res.json(task);
    } catch (error) {
        handleError(res, error, 400, 'Error toggling task');
    }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();

        // Check if task exists (shared list - all users can delete)
        const existingTask = await taskRepository.findById(req.params.id);
        if (!existingTask) {
            return handleNotFoundError(res, 'Task');
        }

        // Check if task is locked
        if (existingTask.lockedBy) {
            return handleLockedError(res, 'Task is currently being edited');
        }

        await taskRepository.delete(req.params.id);

        // Emit real-time event
        emitSocketEvent(req, 'task:deleted', { id: req.params.id });

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        handleError(res, error, 500, 'Error deleting task');
    }
});

/**
 * POST /api/tasks/:id/lock
 * Lock a task for editing
 */
router.post('/:id/lock', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();
        const { clientId } = req.body;

        if (!clientId) {
            return handleValidationError(res, 'Client ID is required');
        }

        const task = await taskRepository.lock(req.params.id, clientId);

        if (!task) {
            return handleNotFoundError(res, 'Task');
        }

        // Emit real-time event immediately
        emitSocketEvent(req, 'task:locked', { id: task._id, lockedBy: task.lockedBy });

        res.json({ message: 'Task locked successfully', task });
    } catch (error) {
        if (error.message === 'Task is already locked by another client') {
            return handleLockedError(res, error.message);
        }
        handleError(res, error, 400, 'Error locking task');
    }
});

/**
 * POST /api/tasks/:id/unlock
 * Unlock a task
 */
router.post('/:id/unlock', async (req, res) => {
    try {
        const taskRepository = ServiceFactory.getTaskRepository();
        const { clientId } = req.body;

        if (!clientId) {
            return handleValidationError(res, 'Client ID is required');
        }

        const task = await taskRepository.unlock(req.params.id, clientId);

        if (!task) {
            return handleNotFoundError(res, 'Task');
        }

        // Emit real-time event
        emitSocketEvent(req, 'task:unlocked', { id: task._id });

        res.json({ message: 'Task unlocked successfully' });
    } catch (error) {
        handleError(res, error, 400, 'Error unlocking task');
    }
});

module.exports = router;
