import { Task } from '../services/api.service';

/**
 * Utility functions for Task operations
 * Centralizes common operations to avoid code duplication
 */

/**
 * Converts task dueDate string to Date object
 * @param task - Task object
 * @returns Task with converted dueDate
 */
export function convertTaskDate(task: Task): Task {
  return {
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate) : null
  };
}

/**
 * Converts array of tasks dueDate strings to Date objects
 * @param tasks - Array of tasks
 * @returns Array of tasks with converted dueDates
 */
export function convertTasksDates(tasks: Task[]): Task[] {
  return tasks.map(task => convertTaskDate(task));
}
