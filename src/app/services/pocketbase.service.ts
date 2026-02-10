import { Injectable, signal, computed } from '@angular/core';
import PocketBase, { RecordModel } from 'pocketbase';
import { environment } from '../../environments/environment';

export type UserRole = 'player' | 'reader' | 'admin' | 'gamemaster';

export interface UserRecord extends RecordModel {
  pin: string;
  role: UserRole;
  name: string;
}

export interface PinLoginResponse {
  token: string;
  user: {
    id: string;
    role: UserRole;
    name: string;
  };
}

/**
 * Service for PocketBase database and authentication operations
 * Wraps the PocketBase SDK with Angular Signals
 */
@Injectable({
  providedIn: 'root'
})
export class PocketBaseService {
  private pb: PocketBase;

  // Reactive signals for auth state
  private _token = signal<string | null>(null);
  private _isValid = signal(false);

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => this._token() !== null && this._isValid());

  constructor() {
    this.pb = new PocketBase(environment.pocketbaseUrl);

    // Initialize from stored auth
    this._token.set(this.pb.authStore.token || null);
    this._isValid.set(this.pb.authStore.isValid);

    // Subscribe to auth changes
    this.pb.authStore.onChange((token, model) => {
      this._token.set(token || null);
      this._isValid.set(this.pb.authStore.isValid);
    });
  }

  /**
   * Login with 6-digit PIN via custom endpoint
   */
  async loginWithPin(pin: string): Promise<PinLoginResponse> {
    // Call custom hook endpoint
    const response = await this.pb.send<PinLoginResponse>('/api/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
      headers: { 'Content-Type': 'application/json' }
    });

    // Save auth to store (persists to localStorage automatically)
    // Include role for PocketBase auth rules (@request.auth.role)
    this.pb.authStore.save(response.token, {
      id: response.user.id,
      collectionId: 'users',
      collectionName: 'users',
      role: response.user.role,
      name: response.user.name
    } as RecordModel);

    return response;
  }

  /**
   * Clear authentication
   */
  logout(): void {
    this.pb.authStore.clear();
  }

  /**
   * Get the underlying PocketBase client
   * Use for direct collection access
   */
  get client(): PocketBase {
    return this.pb;
  }

  /**
   * Shorthand for accessing a collection
   */
  collection<T extends RecordModel = RecordModel>(name: string) {
    return this.pb.collection<T>(name);
  }

  /**
   * Check if PocketBase server is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pb.health.check();
      return true;
    } catch {
      return false;
    }
  }
}
