import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../services/api.service';

/**
 * AuthInterceptor
 * HTTP Interceptor to automatically add JWT token to all authenticated requests
 * Implements the Interceptor pattern for cross-cutting concerns
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private apiService: ApiService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding token for auth endpoints
    if (req.url.includes('/auth/')) {
      return next.handle(req);
    }

    // Get token from storage
    const token = this.apiService.getToken();

    // Clone request and add authorization header if token exists
    if (token) {
      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(clonedReq);
    }

    return next.handle(req);
  }
}
