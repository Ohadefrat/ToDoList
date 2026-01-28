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
    { value: 'low', label: 'Low', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'high', label: 'High', color: '#f44336' }
  ];
  private subscriptions: Subscription[] = [];
  private unlockTimer: any = null; // Timer for auto-unlock
  private readonly AUTO_UNLOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
  }

  ngOnDestroy() {
    // Clear unlock timer
    this.clearUnlockTimer();
    // Unsubscribe from all socket events
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Unlock any task being edited
    this.clearEditMode();
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
        next: () => {
          this.editingTask = { ...task };
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
    // Unlock task when user closes/navigates away
    if (this.editingTask && this.editingTask._id) {
      // Use sendBeacon for reliable unlock on page close
      const unlockUrl = `http://localhost:3000/api/tasks/${this.editingTask._id}/unlock`;
      navigator.sendBeacon(unlockUrl, JSON.stringify({ clientId: this.clientId }));
    }
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
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  getCurrentUser() {
    return this.apiService.getUser();
  }
}
