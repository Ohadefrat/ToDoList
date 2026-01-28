import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { Task } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private clientId: string;
  
  private taskCreated$ = new Subject<Task>();
  private taskUpdated$ = new Subject<Task>();
  private taskDeleted$ = new Subject<string>();
  private taskToggled$ = new Subject<Task>();
  private taskLocked$ = new Subject<{ id: string; lockedBy: string }>();
  private taskUnlocked$ = new Subject<{ id: string }>();

  constructor(private ngZone: NgZone) {
    // Generate unique client ID
    this.clientId = this.generateClientId();
    
    // Connect to Socket.io server with optimized settings for real-time updates
    this.socket = io('http://localhost:3000', {
      transports: ['websocket'], // Use websocket first for faster updates
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    // Listen for events - run inside Angular zone for proper change detection
    this.socket.on('task:created', (task: Task) => {
      this.ngZone.run(() => {
        this.taskCreated$.next(task);
      });
    });

    this.socket.on('task:updated', (task: Task) => {
      this.ngZone.run(() => {
        this.taskUpdated$.next(task);
      });
    });

    this.socket.on('task:deleted', (data: { id: string }) => {
      this.ngZone.run(() => {
        this.taskDeleted$.next(data.id);
      });
    });

    this.socket.on('task:toggled', (task: Task) => {
      this.ngZone.run(() => {
        this.taskToggled$.next(task);
      });
    });

    this.socket.on('task:locked', (data: { id: string; lockedBy: string }) => {
      this.ngZone.run(() => {
        this.taskLocked$.next(data);
      });
    });

    this.socket.on('task:unlocked', (data: { id: string }) => {
      this.ngZone.run(() => {
        this.taskUnlocked$.next(data);
      });
    });

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        console.log('Connected to server:', this.socket.id);
      });
    });

    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        console.log('Disconnected from server');
      });
    });
  }

  getClientId(): string {
    return this.clientId;
  }

  onTaskCreated(): Observable<Task> {
    return this.taskCreated$.asObservable();
  }

  onTaskUpdated(): Observable<Task> {
    return this.taskUpdated$.asObservable();
  }

  onTaskDeleted(): Observable<string> {
    return this.taskDeleted$.asObservable();
  }

  onTaskToggled(): Observable<Task> {
    return this.taskToggled$.asObservable();
  }

  onTaskLocked(): Observable<{ id: string; lockedBy: string }> {
    return this.taskLocked$.asObservable();
  }

  onTaskUnlocked(): Observable<{ id: string }> {
    return this.taskUnlocked$.asObservable();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
