/**
 * ServiceFactory
 * Factory Pattern implementation for creating service instances
 * Ensures singleton instances of repositories and services
 */
class ServiceFactory {
    constructor() {
        // Singleton pattern: store instances
        this._taskRepository = null;
        this._userRepository = null;
    }

    /**
     * Get TaskRepository instance (Singleton)
     * @returns {TaskRepository} TaskRepository instance
     */
    getTaskRepository() {
        if (!this._taskRepository) {
            const TaskRepository = require('../repositories/TaskRepository');
            this._taskRepository = new TaskRepository();
        }
        return this._taskRepository;
    }

    /**
     * Get UserRepository instance (Singleton)
     * @returns {UserRepository} UserRepository instance
     */
    getUserRepository() {
        if (!this._userRepository) {
            const UserRepository = require('../repositories/UserRepository');
            this._userRepository = new UserRepository();
        }
        return this._userRepository;
    }
}

// Export singleton instance
module.exports = new ServiceFactory();
