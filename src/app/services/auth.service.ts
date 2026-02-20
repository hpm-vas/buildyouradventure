import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

export type UserRole = 'player' | 'gamemaster';

export interface User {
  id: string;
  role: UserRole;
  name: string | null;
}

const STORAGE_KEY = 'plot-smithy-role';

/**
 * Auth service with simple role selection
 * No passwords - just choose Gamemaster or Player
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  
  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly isGamemaster = computed(() => this._user()?.role === 'gamemaster');
  readonly isPlayer = computed(() => this._user()?.role === 'player');

  constructor() {
    this.loadStoredRole();
  }

  /**
   * Load previously selected role from localStorage
   */
  private loadStoredRole(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'gamemaster' || stored === 'player') {
      this.setRole(stored, false);
    }
  }

  /**
   * Set user role and optionally navigate
   */
  setRole(role: UserRole, navigate: boolean = true): void {
    const user: User = {
      id: `local-${role}`,
      role,
      name: role === 'gamemaster' ? 'Game Master' : 'Player'
    };
    
    this._user.set(user);
    localStorage.setItem(STORAGE_KEY, role);
    
    if (navigate) {
      if (role === 'gamemaster') {
        this.router.navigate(['/gamemaster']);
      } else {
        this.router.navigate(['/player']);
      }
    }
  }

  /**
   * Clear role and return to role selection
   */
  logout(): void {
    this._user.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/']);
  }

  /**
   * Clear current error
   */
  clearError(): void {
    this._error.set(null);
  }
}

