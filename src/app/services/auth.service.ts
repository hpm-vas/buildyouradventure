import { Injectable, signal, computed, inject } from '@angular/core';
import { PocketBaseService } from './pocketbase.service';
import type { UserRole } from './pocketbase.service';

export type { UserRole } from './pocketbase.service';

export interface User {
  id: string;
  role: UserRole;
  name: string | null;
}

/**
 * Service for handling PIN-based authentication
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly pb = inject(PocketBaseService);

  private _user = signal<User | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Delegate auth state to PocketBase service
  readonly isAuthenticated = this.pb.isAuthenticated;

  readonly role = computed(() => this._user()?.role ?? null);
  readonly isAdmin = computed(() => {
    const role = this._user()?.role;
    return role === 'admin' || role === 'gamemaster';
  });

  constructor() {
    // Try to restore session on init
    this.restoreSession();
  }

  /**
   * Restore user session from stored token
   */
  private restoreSession(): void {
    const token = this.pb.token();

    if (token && this.pb.isAuthenticated()) {
      // Decode user from token payload (base64)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this._user.set({
          id: payload.id || payload.sub,
          role: payload.role,
          name: payload.name
        });
        console.log('Session restored for:', payload.name || payload.id);
      } catch (e) {
        console.error('Failed to restore session:', e);
        this.logout();
      }
    }
  }

  /**
   * Authenticate with a 6-digit PIN
   */
  async loginWithPin(pin: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await this.pb.loginWithPin(pin);

      // Set user state
      this._user.set({
        id: response.user.id,
        role: response.user.role,
        name: response.user.name
      });

      console.log('Login successful:', response.user.name || response.user.id);
      return true;

    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      this._error.set(message);
      console.error('Login failed:', message);
      return false;

    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Clear authentication state
   */
  logout(): void {
    this.pb.logout();
    this._user.set(null);
    this._error.set(null);
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this._error.set(null);
  }
}
