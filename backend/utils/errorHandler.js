/**
 * Error Handler Utilities
 * Centralizes error handling to ensure consistency
 */

/**
 * Handle and send error response
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {Number} defaultStatus - Default status code (default: 500)
 * @param {String} defaultMessage - Default error message
 */
const handleError = (res, error, defaultStatus = 500, defaultMessage = 'An error occurred') => {
    console.error('Error:', error);
    
    const status = error.status || defaultStatus;
    const message = error.message || defaultMessage;
    
    res.status(status).json({ error: message });
};

/**
 * Handle validation errors
 * @param {Object} res - Express response object
 * @param {String} message - Validation error message
 */
const handleValidationError = (res, message) => {
    res.status(400).json({ error: message });
};

/**
 * Handle not found errors
 * @param {Object} res - Express response object
 * @param {String} resource - Resource name (e.g., 'Task')
 */
const handleNotFoundError = (res, resource = 'Resource') => {
    res.status(404).json({ error: `${resource} not found` });
};

/**
 * Handle locked resource errors
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 */
const handleLockedError = (res, message = 'Resource is currently locked') => {
    res.status(423).json({ error: message });
};

module.exports = {
    handleError,
    handleValidationError,
    handleNotFoundError,
    handleLockedError
};
