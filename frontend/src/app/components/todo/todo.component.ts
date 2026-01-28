import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, Task } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { convertTaskDate } from '../../utils/task.utils';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css'
})
export class TodoComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  filteredTasks: Task[] = [];
  newTask: Partial<Task> = { 
    title: '', 
    description: '', 
    completed: false, 
    priority: 'medium',
    dueDate: null
  };
  editingTask: Task | null = null;
  clientId: string = '';
  selectedFilter: 'all' | 'completed' | 'pending' = 'all';
  selectedPriority: 'all' | 'low' | 'medium' | 'high' = 'all';
  priorities: { value: string; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#66bb6a' },
    { value: 'medium', label: 'Medium', color: '#ffa726' },
    { value: 'high', label: 'High', color: '#ef5350' }
  ];
  private subscriptions: Subscription[] = [];
  private unlockTimer: any = null; // Timer for auto-unlock
  private readonly AUTO_UNLOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private countdownInterval: any = null; // Interval for countdown updates

  constructor(
    private apiService: ApiService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.clientId = this.socketService.getClientId();
    
    // Check authentication
    if (!this.apiService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }

  ngOnInit() {
    this.loadTasks();
    this.setupSocketListeners();
    this.startCountdownTimer();
  }

  ngOnDestroy() {
    // Clear unlock timer
    this.clearUnlockTimer();
    // Clear countdown interval
    this.clearCountdownTimer();
    // Unsubscribe from all socket events
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Unlock all tasks locked by this user
    this.unlockAllUserTasks().catch(error => {
      console.error('Error unlocking tasks on destroy:', error);
    });
  }

  /**
   * Helper method to update task in array with proper date conversion and change detection
   */
  private updateTaskInArray(task: Task, addIfNotFound = false): void {
    const index = this.tasks.findIndex(t => t._id === task._id);
    const convertedTask = convertTaskDate(task);

    if (index !== -1) {
      this.tasks[index] = convertedTask;
    } else if (addIfNotFound) {
      this.tasks.push(convertedTask);
    }
    
    this.applyFilters();
    this.cdr.markForCheck();
  }

  /**
   * Helper method to add task to array with proper date conversion
   */
  private addTaskToArray(task: Task, atBeginning = false): void {
    const convertedTask = convertTaskDate(task);
    if (atBeginning) {
      this.tasks.unshift(convertedTask);
    } else {
      this.tasks.push(convertedTask);
    }
    this.applyFilters();
    this.cdr.markForCheck();
  }

  setupSocketListeners() {
    // Listen for task created - immediate update with change detection
    const createdSub = this.socketService.onTaskCreated().subscribe(task => {
      this.ngZone.run(() => {
        const existingIndex = this.tasks.findIndex(t => t._id === task._id);
        if (existingIndex === -1) {
          this.addTaskToArray(task, true); // Add at beginning for visibility
        } else {
          this.updateTaskInArray(task);
        }
      });
    });

    // Listen for task updated - immediate update with change detection
    const updatedSub = this.socketService.onTaskUpdated().subscribe(task => {
      this.ngZone.run(() => {
        this.updateTaskInArray(task, true); // Add if not found
        
        // If we were editing this task, stop editing
        if (this.editingTask && this.editingTask._id === task._id) {
          this.clearEditMode();
        }
      });
    });

    // Listen for task deleted - immediate update with change detection
    const deletedSub = this.socketService.onTaskDeleted().subscribe(taskId => {
      this.ngZone.run(() => {
        this.tasks = this.tasks.filter(t => t._id !== taskId);
        this.applyFilters();
        
        // If we were editing this task, stop editing
        if (this.editingTask && this.editingTask._id === taskId) {
          this.clearEditMode();
        }
        
        this.cdr.markForCheck();
      });
    });

    // Listen for task toggled - immediate update with change detection
    const toggledSub = this.socketService.onTaskToggled().subscribe(task => {
      this.ngZone.run(() => {
        this.updateTaskInArray(task);
      });
    });

    // Listen for task locked - immediate update with change detection
    const lockedSub = this.socketService.onTaskLocked().subscribe(data => {
      this.ngZone.run(() => {
        const index = this.tasks.findIndex(t => t._id === data.id);
        if (index !== -1) {
          this.tasks[index].lockedBy = data.lockedBy;
          // Set lockedAt timestamp if not already set (for countdown)
          if (!this.tasks[index].lockedAt) {
            this.tasks[index].lockedAt = new Date();
          }
          this.applyFilters(); // Refresh to show lock status
          if (data.lockedBy !== this.clientId) {
            this.snackBar.open('Task is being edited by another user', 'Close', { duration: 3000 });
          }
        }
        this.cdr.markForCheck(); // Trigger change detection
      });
    });

    // Listen for task unlocked - immediate update with change detection
    const unlockedSub = this.socketService.onTaskUnlocked().subscribe(data => {
      this.ngZone.run(() => {
        const index = this.tasks.findIndex(t => t._id === data.id);
        if (index !== -1) {
          this.tasks[index].lockedBy = null;
          this.tasks[index].lockedAt = null;
          this.applyFilters(); // Refresh to show unlock status
        }
        this.cdr.markForCheck(); // Trigger change detection
      });
    });

    this.subscriptions = [createdSub, updatedSub, deletedSub, toggledSub, lockedSub, unlockedSub];
  }

  loadTasks() {
    const filters: any = {};
    if (this.selectedFilter === 'completed') {
      filters.completed = true;
    } else if (this.selectedFilter === 'pending') {
      filters.completed = false;
    }
    if (this.selectedPriority !== 'all') {
      filters.priority = this.selectedPriority;
    }

    this.apiService.getTasks(filters).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.applyFilters();
        this.cdr.markForCheck(); // Trigger change detection to show tasks immediately
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        if (error.status === 401) {
          this.apiService.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  applyFilters() {
    this.filteredTasks = [...this.tasks];
    
    // Sort by priority and due date
    this.filteredTasks.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority || 'medium'] || 2) - (priorityOrder[a.priority || 'medium'] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }

  onFilterChange() {
    this.loadTasks();
  }

  createTask() {
    if (this.newTask.title?.trim()) {
      this.apiService.createTask({
        title: this.newTask.title.trim(),
        description: this.newTask.description?.trim() || '',
        priority: this.newTask.priority || 'medium',
        dueDate: this.newTask.dueDate || null,
        completed: false
      }).subscribe({
        next: () => {
          this.newTask = { 
            title: '', 
            description: '', 
            completed: false,
            priority: 'medium',
            dueDate: null
          };
          // Task will be added via socket event
        },
        error: (error) => {
          console.error('Error creating task:', error);
          if (error.status === 401) {
            this.apiService.logout();
            this.router.navigate(['/login']);
          } else {
            this.snackBar.open('Error creating task', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  editTask(task: Task) {
    // Check if task is locked by another client
    if (task.lockedBy && task.lockedBy !== this.clientId) {
      this.snackBar.open('This task is being edited by another user', 'Close', { duration: 3000 });
      return;
    }

    // Lock the task before editing
    if (task._id) {
      const taskId = task._id; // Store in variable to ensure it's defined
      this.apiService.lockTask(taskId, this.clientId).subscribe({
        next: (updatedTask) => {
          this.editingTask = { ...task };
          // Update task with lock info if returned
          const index = this.tasks.findIndex(t => t._id === taskId);
          if (index !== -1 && updatedTask) {
            this.tasks[index].lockedBy = updatedTask.lockedBy || this.clientId;
            this.tasks[index].lockedAt = updatedTask.lockedAt || new Date();
          } else if (index !== -1) {
            // Fallback: set lock info manually
            this.tasks[index].lockedBy = this.clientId;
            this.tasks[index].lockedAt = new Date();
          }
          // Start auto-unlock timer (5 minutes)
          this.startUnlockTimer(taskId);
          // Also set up beforeunload to unlock on page close
          window.addEventListener('beforeunload', this.handleBeforeUnload);
        },
        error: (error) => {
          if (error.status === 423) {
            this.snackBar.open('Task is already being edited by another user', 'Close', { duration: 3000 });
          } else {
            console.error('Error locking task:', error);
            this.snackBar.open('Error locking task', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  private startUnlockTimer(taskId: string) {
    // Clear any existing timer
    this.clearUnlockTimer();
    
    // Set new timer to auto-unlock after timeout
    this.unlockTimer = setTimeout(() => {
      if (this.editingTask && this.editingTask._id === taskId) {
        console.log('Auto-unlocking task due to timeout');
        this.apiService.unlockTask(taskId, this.clientId).subscribe({
          next: () => {
            this.snackBar.open('Task automatically unlocked due to inactivity', 'Close', { duration: 3000 });
            this.clearEditMode();
          },
          error: (error) => {
            console.error('Error auto-unlocking task:', error);
          }
        });
      }
    }, this.AUTO_UNLOCK_TIMEOUT);
  }

  private clearUnlockTimer() {
    if (this.unlockTimer) {
      clearTimeout(this.unlockTimer);
      this.unlockTimer = null;
    }
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  private handleBeforeUnload = () => {
    // Unlock all tasks locked by this user when user closes/navigates away
    const lockedTasks = this.tasks.filter(task => 
      task.lockedBy === this.clientId && task._id
    );

    // Use sendBeacon for reliable unlock on page close
    lockedTasks.forEach(task => {
      if (task._id) {
        const unlockUrl = `http://localhost:3000/api/tasks/${task._id}/unlock`;
        const data = JSON.stringify({ clientId: this.clientId });
        navigator.sendBeacon(unlockUrl, data);
      }
    });
  }

  private clearEditMode() {
    if (this.editingTask && this.editingTask._id) {
      this.apiService.unlockTask(this.editingTask._id, this.clientId).subscribe({
        error: (error) => {
          console.error('Error unlocking task:', error);
        }
      });
    }
    this.editingTask = null;
    this.clearUnlockTimer();
  }

  updateTask() {
    if (this.editingTask && this.editingTask._id && this.editingTask.title.trim()) {
      this.apiService.updateTask(this.editingTask._id, {
        title: this.editingTask.title.trim(),
        description: this.editingTask.description?.trim() || '',
        priority: this.editingTask.priority || 'medium',
        dueDate: this.editingTask.dueDate || null,
        completed: this.editingTask.completed
      }, this.clientId).subscribe({
        next: () => {
          // Clear edit mode (unlock happens automatically on server)
          this.clearEditMode();
          // Task will be updated via socket event immediately
        },
        error: (error) => {
          console.error('Error updating task:', error);
          if (error.status === 401) {
            this.apiService.logout();
            this.router.navigate(['/login']);
          } else if (error.status === 423) {
            this.snackBar.open('Task is being edited by another user', 'Close', { duration: 3000 });
            this.clearEditMode();
          } else {
            this.snackBar.open('Error updating task', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  cancelEdit() {
    // Clear edit mode (will unlock the task)
    this.clearEditMode();
  }

  toggleTask(task: Task) {
    // Check if task is locked
    if (task.lockedBy) {
      this.snackBar.open('Task is being edited', 'Close', { duration: 3000 });
      return;
    }

    if (task._id) {
      this.apiService.toggleTask(task._id).subscribe({
        next: () => {
          // Task will be updated via socket event
        },
        error: (error) => {
          console.error('Error toggling task:', error);
          if (error.status === 423) {
            this.snackBar.open('Task is being edited', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open('Error toggling task', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  deleteTask(id: string) {
    const task = this.tasks.find(t => t._id === id);
    
    // Check if task is locked
    if (task && task.lockedBy) {
      this.snackBar.open('Task is being edited', 'Close', { duration: 3000 });
      return;
    }

    if (confirm('Are you sure you want to delete this task?')) {
      this.apiService.deleteTask(id).subscribe({
        next: () => {
          // Task will be removed via socket event
        },
        error: (error) => {
          console.error('Error deleting task:', error);
          if (error.status === 423) {
            this.snackBar.open('Task is being edited', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open('Error deleting task', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  isTaskLocked(task: Task): boolean {
    return !!task.lockedBy && task.lockedBy !== this.clientId;
  }

  isTaskLockedByMe(task: Task): boolean {
    return task.lockedBy === this.clientId;
  }

  getPriorityColor(priority?: string): string {
    const p = this.priorities.find(pr => pr.value === priority);
    return p?.color || '#999';
  }

  getPriorityLabel(priority?: string): string {
    const p = this.priorities.find(pr => pr.value === priority);
    return p?.label || 'Medium';
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  }

  logout() {
    // Unlock all tasks locked by this user before logging out
    this.unlockAllUserTasks().then(() => {
      this.apiService.logout();
      this.router.navigate(['/login']);
    }).catch(() => {
      // Even if unlock fails, proceed with logout
      this.apiService.logout();
      this.router.navigate(['/login']);
    });
  }

  /**
   * Unlock all tasks locked by the current user
   */
  private async unlockAllUserTasks(): Promise<void> {
    const lockedTasks = this.tasks.filter(task => 
      task.lockedBy === this.clientId && task._id
    );

    if (lockedTasks.length === 0) {
      return Promise.resolve();
    }

    // Unlock all tasks in parallel
    const unlockPromises = lockedTasks.map(task => {
      if (task._id) {
        return new Promise<void>((resolve) => {
          this.apiService.unlockTask(task._id!, this.clientId).subscribe({
            next: () => {
              // Update local state
              const index = this.tasks.findIndex(t => t._id === task._id);
              if (index !== -1) {
                this.tasks[index].lockedBy = null;
                this.tasks[index].lockedAt = null;
              }
              resolve();
            },
            error: (error) => {
              console.error(`Error unlocking task ${task._id}:`, error);
              resolve(); // Continue even if one fails
            }
          });
        });
      }
      return Promise.resolve();
    });

    await Promise.all(unlockPromises);
    this.applyFilters(); // Refresh the list
  }

  getCurrentUser() {
    return this.apiService.getUser();
  }

  /**
   * Calculate remaining lock time in seconds
   */
  getRemainingLockTime(task: Task): number {
    if (!task.lockedAt || !this.isTaskLocked(task)) {
      return 0;
    }

    // Handle both Date objects and string dates
    const lockedAt = task.lockedAt instanceof Date 
      ? task.lockedAt 
      : new Date(task.lockedAt);
    
    // Check if date is valid
    if (isNaN(lockedAt.getTime())) {
      return 0;
    }

    const now = new Date();
    const elapsed = now.getTime() - lockedAt.getTime();
    const remaining = this.AUTO_UNLOCK_TIMEOUT - elapsed;

    return Math.max(0, Math.floor(remaining / 1000)); // Return seconds
  }

  /**
   * Format seconds to MM:SS format
   */
  formatCountdown(seconds: number): string {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Start countdown timer to update UI every second and auto-unlock expired tasks
   */
  private startCountdownTimer() {
    // Clear existing interval if any
    this.clearCountdownTimer();

    // Update countdown every second
    this.countdownInterval = setInterval(() => {
      // Check for tasks that have expired and unlock them
      this.checkAndUnlockExpiredTasks();
      // Trigger change detection for locked tasks
      this.cdr.markForCheck();
    }, 1000);
  }

  /**
   * Check for tasks that have exceeded lock timeout and unlock them
   */
  private checkAndUnlockExpiredTasks() {
    const now = new Date();
    const expiredTasks: Task[] = [];

    // Find all tasks that have exceeded the lock timeout
    this.tasks.forEach(task => {
      if (task.lockedBy && task.lockedAt && task._id) {
        const lockedAt = task.lockedAt instanceof Date 
          ? task.lockedAt 
          : new Date(task.lockedAt);
        
        if (!isNaN(lockedAt.getTime())) {
          const elapsed = now.getTime() - lockedAt.getTime();
          
          // If elapsed time exceeds timeout, mark for unlock
          if (elapsed >= this.AUTO_UNLOCK_TIMEOUT) {
            expiredTasks.push(task);
          }
        }
      }
    });

    // Unlock expired tasks
    if (expiredTasks.length > 0) {
      expiredTasks.forEach(task => {
        if (task._id) {
          // If locked by current user, unlock it
          if (task.lockedBy === this.clientId) {
            // If currently editing, clear edit mode first
            if (this.editingTask && this.editingTask._id === task._id) {
              this.clearEditMode();
            } else {
              // Unlock the task
              this.apiService.unlockTask(task._id, this.clientId).subscribe({
                next: () => {
                  // Update local state
                  const index = this.tasks.findIndex(t => t._id === task._id);
                  if (index !== -1) {
                    this.tasks[index].lockedBy = null;
                    this.tasks[index].lockedAt = null;
                  }
                  this.applyFilters();
                  console.log(`Auto-unlocked expired task (locked by me): ${task._id}`);
                },
                error: (error) => {
                  console.error(`Error auto-unlocking expired task ${task._id}:`, error);
                  // Update local state anyway (optimistic update)
                  const index = this.tasks.findIndex(t => t._id === task._id);
                  if (index !== -1) {
                    this.tasks[index].lockedBy = null;
                    this.tasks[index].lockedAt = null;
                  }
                  this.applyFilters();
                }
              });
            }
          } else {
            // If locked by another user, update local state optimistically
            // The backend periodic cleanup will handle the actual unlock and emit socket event
            const index = this.tasks.findIndex(t => t._id === task._id);
            if (index !== -1) {
              this.tasks[index].lockedBy = null;
              this.tasks[index].lockedAt = null;
            }
            this.applyFilters();
            console.log(`Marked expired task as unlocked (locked by another user): ${task._id}`);
          }
        }
      });
    }
  }

  /**
   * Clear countdown timer
   */
  private clearCountdownTimer() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
