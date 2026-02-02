import { Injectable, signal } from '@angular/core';

/**
 * Service for calling Netlify functions (which proxy to Supabase)
 * Handles authentication token management for API calls
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly TOKEN_KEY = 'plotsmithy.auth.token';
  private _token = signal<string | null>(null);

  readonly token = this._token.asReadonly();

  constructor() {
    // Load token from storage on init
    const stored = localStorage.getItem(this.TOKEN_KEY);
    if (stored) {
      this._token.set(stored);
    }
  }

  /**
   * Store authentication token
   */
  setToken(token: string | null): void {
    this._token.set(token);
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this._token();
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.setToken(null);
  }

  /**
   * Call a Netlify function
   * @param name Function name (e.g., 'pin-login')
   * @param body Request body
   * @param options Additional fetch options
   */
  async callFunction<T>(
    name: string,
    body?: unknown,
    options?: { method?: string; includeAuth?: boolean }
  ): Promise<T> {
    const { method = 'POST', includeAuth = false } = options || {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Include auth token if requested and available
    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`/.netlify/functions/${name}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data as T;
  }
}
