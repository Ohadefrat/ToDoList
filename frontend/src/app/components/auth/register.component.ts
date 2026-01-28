import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';

/**
 * RegisterComponent
 * Handles user registration
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Register</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput [(ngModel)]="username" name="username" required minlength="3">
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required minlength="6">
            </mat-form-field>
            
            <button mat-raised-button color="primary" type="submit" [disabled]="loading" class="full-width">
              {{ loading ? 'Registering...' : 'Register' }}
            </button>
          </form>
          
          <div class="auth-footer">
            <p>Already have an account? <a routerLink="/login">Login</a></p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 20px;
    }
    .auth-card {
      width: 100%;
      max-width: 400px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    .auth-footer {
      text-align: center;
      margin-top: 16px;
    }
  `]
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSubmit() {
    if (!this.username || !this.email || !this.password) {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.password.length < 6) {
      this.snackBar.open('Password must be at least 6 characters', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.apiService.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/todo']);
      },
      error: (error) => {
        this.loading = false;
        const message = error.error?.error || 'Registration failed';
        this.snackBar.open(message, 'Close', { duration: 3000 });
      }
    });
  }
}
