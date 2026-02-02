import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/**
 * Service for Supabase database operations
 * Currently a stub - will be wired up when Supabase is configured
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabaseUrl = environment.supabaseUrl;
  private supabaseKey = environment.supabaseKey;

  constructor() {
    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('Supabase not configured - running in stub mode');
    } else {
      console.log('SupabaseService initialized');
    }
  }

  /**
   * Check if Supabase is configured
   */
  isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseKey);
  }

  /**
   * Generic query method - stub for now
   */
  async query<T>(table: string, options?: { select?: string; filter?: Record<string, unknown> }): Promise<T[]> {
    console.log('Supabase query:', table, options);
    // TODO: Implement actual Supabase query
    return [];
  }

  /**
   * Insert data - stub for now
   */
  async insert<T>(table: string, data: Partial<T>): Promise<T | null> {
    console.log('Supabase insert:', table, data);
    // TODO: Implement actual Supabase insert
    return null;
  }
}
