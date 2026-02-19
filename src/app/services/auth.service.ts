import { Injectable, signal, computed } from '@angular/core';

export type UserRole = 'player' | 'reader' | 'gamemaster';

export interface User {
  id: string;
  role: UserRole;
  name: string | null;
}

/**
 * Simplified auth service - single gamemaster mode
 * No actual authentication, always returns admin user
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Hardcoded gamemaster user for single-user local mode
  private readonly _user = signal<User>({
    id: 'local-gamemaster',
    role: 'gamemaster',
    name: 'Game Master'
  });
  
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Always authenticated in local mode
  readonly isAuthenticated = signal(true).asReadonly();

  readonly role = computed(() => this._user()?.role ?? 'gamemaster');
  readonly isGamemaster = computed(() => true);

  constructor() {
    console.log('AuthService: Running in local gamemaster mode');
  }

  /**
   * Login is a no-op in local mode - always succeeds
   * @deprecated Not needed in local mode
   */
  async loginWithPin(_pin: string): Promise<boolean> {
    return true;
  }

  /**
   * Logout is a no-op in local mode
   * @deprecated Not needed in local mode  
   */
  logout(): void {
    // No-op - always authenticated in local mode
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this._error.set(null);
  }
}
