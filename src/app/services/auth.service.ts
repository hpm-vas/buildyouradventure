import { Injectable, signal } from '@angular/core';

export interface User {
  id: string;
  role: 'player' | 'reader' | 'admin';
  storyId?: string;
}

/**
 * Service for handling PIN-based authentication
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _loading = signal(false);

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isAuthenticated = () => this._token() !== null;

  constructor() {
    // Check for existing token on init
    this.loadStoredToken();
  }

  private loadStoredToken(): void {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      // TODO: Validate token expiry
      this._token.set(stored);
      console.log('Loaded stored auth token');
    }
  }

  /**
   * Authenticate with a 6-digit PIN
   */
  async loginWithPin(pin: string): Promise<boolean> {
    this._loading.set(true);
    try {
      // TODO: Call Netlify function -> Supabase Edge function
      console.log('Authenticating with PIN...');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Clear authentication state
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    this._user.set(null);
    this._token.set(null);
  }
}
