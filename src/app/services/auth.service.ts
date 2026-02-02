import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type UserRole = 'player' | 'reader' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string | null;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: number;
}

/**
 * Service for handling PIN-based authentication
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly EXPIRY_KEY = 'plotsmithy.auth.expiry';

  private _user = signal<User | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  readonly isAuthenticated = computed(() => {
    const token = this.supabase.token();
    const expiry = this.getStoredExpiry();
    return token !== null && expiry > Date.now();
  });

  readonly role = computed(() => this._user()?.role ?? null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  constructor() {
    // Try to restore session on init
    this.restoreSession();
  }

  /**
   * Restore user session from stored token
   */
  private restoreSession(): void {
    const token = this.supabase.getToken();
    const expiry = this.getStoredExpiry();

    if (token && expiry > Date.now()) {
      // Decode user from token payload (base64)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this._user.set({
          id: payload.sub,
          role: payload.role,
          name: payload.name
        });
        console.log('Session restored for:', payload.name || payload.sub);
      } catch (e) {
        console.error('Failed to restore session:', e);
        this.logout();
      }
    } else if (token) {
      // Token expired
      console.log('Token expired, clearing session');
      this.logout();
    }
  }

  private getStoredExpiry(): number {
    const stored = localStorage.getItem(this.EXPIRY_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  private setStoredExpiry(expiry: number): void {
    localStorage.setItem(this.EXPIRY_KEY, expiry.toString());
  }

  /**
   * Authenticate with a 6-digit PIN
   */
  async loginWithPin(pin: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await this.supabase.callFunction<LoginResponse>('pin-login', { pin });

      // Store token and expiry
      this.supabase.setToken(response.token);
      this.setStoredExpiry(response.expiresAt);

      // Set user state
      this._user.set(response.user);

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
    this.supabase.clearToken();
    localStorage.removeItem(this.EXPIRY_KEY);
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
