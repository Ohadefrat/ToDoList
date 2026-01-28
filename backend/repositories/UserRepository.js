const User = require('../models/User');

/**
 * UserRepository
 * Repository Pattern implementation for User data access
 * Encapsulates all database operations for users
 */
class UserRepository {
    /**
     * Find user by email
     * @param {String} email - User email
     * @returns {Promise<Object|null>} User or null if not found
     */
    async findByEmail(email) {
        return await User.findOne({ email: email.toLowerCase() }).exec();
    }

    /**
     * Find user by username
     * @param {String} username - Username
     * @returns {Promise<Object|null>} User or null if not found
     */
    async findByUsername(username) {
        return await User.findOne({ username }).exec();
    }

    /**
     * Find user by ID
     * @param {String} id - User ID
     * @returns {Promise<Object|null>} User or null if not found
     */
    async findById(id) {
        return await User.findById(id).exec();
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    /**
     * Update user
     * @param {String} id - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>} Updated user or null if not found
     */
    async update(id, updateData) {
        return await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).exec();
    }
}

module.exports = UserRepository;
