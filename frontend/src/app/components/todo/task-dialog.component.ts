import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Task } from '../../services/api.service';

export interface TaskDialogData {
  task: Partial<Task>;
  isEditMode: boolean;
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.isEditMode ? 'Edit Task' : 'Add New Task' }}</h2>
    <mat-dialog-content>
      <div class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Task Title</mat-label>
          <input matInput [(ngModel)]="taskData.title" placeholder="Enter task title" required>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (Optional)</mat-label>
          <input matInput [(ngModel)]="taskData.description" placeholder="Enter description">
        </mat-form-field>
        
        <div class="form-row">
          <mat-form-field appearance="outline" class="priority-field">
            <mat-label>Priority</mat-label>
            <mat-select [(ngModel)]="taskData.priority">
              <mat-option value="low">Low</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="high">High</mat-option>
            </mat-select>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Due Date</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="taskData.dueDate" placeholder="Select due date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        <mat-icon>close</mat-icon>
        Cancel
      </button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!taskData.title?.trim()">
        <mat-icon>{{ data.isEditMode ? 'save' : 'add' }}</mat-icon>
        {{ data.isEditMode ? 'Save' : 'Add Task' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    h2[mat-dialog-title] {
      margin: 0 0 20px 0;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--gray-200);
      font-size: 20px;
      font-weight: 600;
      color: var(--gray-800);
    }
    
    mat-dialog-content {
      padding: 24px !important;
      min-height: 200px;
    }
    
    .dialog-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    
    .priority-field {
      flex: 1;
      min-width: 150px;
    }
    
    .date-field {
      flex: 1;
      min-width: 200px;
    }
    
    mat-dialog-actions {
      padding: 16px 24px;
      margin: 0;
      border-top: 1px solid var(--gray-200);
      background: var(--gray-50);
    }
    
    mat-dialog-actions button {
      margin-left: 8px;
      border-radius: var(--radius-md);
    }
    
    mat-dialog-actions button mat-icon {
      margin-right: 4px;
    }
    
    @media (max-width: 600px) {
      h2[mat-dialog-title] {
        padding: 16px 20px 12px 20px;
        margin: -24px -24px 16px -24px;
        font-size: 18px;
      }
      
      mat-dialog-content {
        padding: 20px !important;
      }
      
      .form-row {
        flex-direction: column;
      }
      
      .priority-field,
      .date-field {
        width: 100%;
        min-width: unset;
      }
      
      mat-dialog-actions {
        padding: 12px 20px;
        flex-direction: column-reverse;
        gap: 8px;
      }
      
      mat-dialog-actions button {
        width: 100%;
        margin-left: 0;
      }
    }
  `]
})
export class TaskDialogComponent {
  taskData: Partial<Task>;

  constructor(
    public dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData
  ) {
    this.taskData = { ...data.task };
  }

  onSave() {
    if (this.taskData.title?.trim()) {
      this.dialogRef.close(this.taskData);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
