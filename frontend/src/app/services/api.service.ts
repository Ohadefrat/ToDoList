import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { convertTaskDate, convertTasksDates } from '../utils/task.utils';

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | null;
  userId?: string;
  createdBy?: string; // Username of who created the task
  createdAt?: Date;
  updatedAt?: Date;
  lockedBy?: string | null;
  lockedAt?: Date | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Health check
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  // Authentication operations
  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      username,
      email,
      password
    }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): AuthUser | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Task operations with enhanced RxJS and filtering
  getTasks(filters?: { completed?: boolean; priority?: string }): Observable<Task[]> {
    let params = new HttpParams();
    if (filters?.completed !== undefined) {
      params = params.set('completed', filters.completed.toString());
    }
    if (filters?.priority) {
      params = params.set('priority', filters.priority);
    }

    return this.http.get<Task[]>(`${this.apiUrl}/tasks`, { params }).pipe(
      map(tasks => convertTasksDates(tasks)),
      catchError(error => {
        console.error('Error fetching tasks:', error);
        return throwError(() => error);
      })
    );
  }

  getTask(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.apiUrl}/tasks/${id}`).pipe(
      map(task => convertTaskDate(task)),
      catchError(error => {
        console.error('Error fetching task:', error);
        return throwError(() => error);
      })
    );
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/tasks`, task).pipe(
      map(newTask => convertTaskDate(newTask)),
      catchError(error => {
        console.error('Error creating task:', error);
        return throwError(() => error);
      })
    );
  }

  updateTask(id: string, task: Partial<Task>, clientId?: string): Observable<Task> {
    const body = clientId ? { ...task, clientId } : task;
    return this.http.put<Task>(`${this.apiUrl}/tasks/${id}`, body).pipe(
      map(updatedTask => convertTaskDate(updatedTask)),
      catchError(error => {
        console.error('Error updating task:', error);
        return throwError(() => error);
      })
    );
  }

  toggleTask(id: string): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/tasks/${id}/toggle`, {}).pipe(
      catchError(error => {
        console.error('Error toggling task:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting task:', error);
        return throwError(() => error);
      })
    );
  }

  lockTask(id: string, clientId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tasks/${id}/lock`, { clientId }).pipe(
      catchError(error => {
        console.error('Error locking task:', error);
        return throwError(() => error);
      })
    );
  }

  unlockTask(id: string, clientId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/tasks/${id}/unlock`, { clientId }).pipe(
      catchError(error => {
        console.error('Error unlocking task:', error);
        return throwError(() => error);
      })
    );
  }
}
