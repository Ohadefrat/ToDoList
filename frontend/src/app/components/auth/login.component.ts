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
 * LoginComponent
 * Handles user authentication/login
 */
@Component({
  selector: 'app-login',
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
        <mat-card-header class="auth-card-header">
          <mat-card-title>Login</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="email" name="email" required>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" [(ngModel)]="password" name="password" required>
            </mat-form-field>
            
            <button mat-raised-button color="primary" type="submit" [disabled]="loading" class="full-width">
              {{ loading ? 'Logging in...' : 'Login' }}
            </button>
          </form>
          
          <div class="auth-footer">
            <p>Don't have an account? <a routerLink="/register">Register</a></p>
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
      padding: 24px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      animation: fadeIn 0.5s ease-out;
      box-shadow: var(--shadow-lg) !important;
    }
    .auth-card-header {
      margin-bottom: 8px;
      padding: 24px 24px 16px 24px !important;
      background: linear-gradient(135deg, var(--primary-50), white) !important;
      border-bottom: 1px solid var(--gray-200);
    }
    .auth-card-header mat-card-title {
      font-size: 24px !important;
      font-weight: 600 !important;
      color: var(--gray-800) !important;
      text-align: center;
    }
    mat-card-content {
      padding: 32px 24px !important;
    }
    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }
    .auth-footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--gray-200);
    }
    .auth-footer p {
      margin: 0;
      color: var(--gray-600);
      font-size: 14px;
    }
    .auth-footer a {
      color: var(--primary-600);
      text-decoration: none;
      font-weight: 500;
      transition: color var(--transition-fast);
    }
    .auth-footer a:hover {
      color: var(--primary-700);
      text-decoration: underline;
    }
    button[type="submit"] {
      margin-top: 8px;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    @media (max-width: 480px) {
      .auth-container {
        padding: 16px;
      }
      .auth-card {
        max-width: 100%;
      }
      mat-card-content {
        padding: 24px 16px !important;
      }
      .auth-card-header {
        padding: 20px 16px 12px 16px !important;
      }
      .auth-card-header mat-card-title {
        font-size: 20px !important;
      }
    }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.snackBar.open('Please fill in all fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    this.apiService.login(this.email, this.password).subscribe({
      next: () => {
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/todo']);
      },
      error: (error) => {
        this.loading = false;
        const message = error.error?.error || 'Login failed';
        this.snackBar.open(message, 'Close', { duration: 3000 });
      }
    });
  }
}
