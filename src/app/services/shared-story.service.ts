import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalStorageService, StoredStory } from './local-storage.service';

/**
 * Shared story state service - manages the currently selected story
 * across all views (Builder and Story so far).
 */
@Injectable({
  providedIn: 'root'
})
export class SharedStoryService {
  private readonly localStorage = inject(LocalStorageService);

  // Current story state
  private readonly _currentStory = signal<StoredStory | null>(null);
  readonly currentStory = this._currentStory.asReadonly();

  // Computed: story name for display
  readonly currentStoryName = computed(() => this._currentStory()?.name ?? null);

  // Computed: whether a story is selected
  readonly hasStorySelected = computed(() => this._currentStory() !== null);

  /**
   * Select a story by ID
   */
  async selectStory(storyId: string): Promise<void> {
    const story = this.localStorage.getStoryById(storyId);
    if (story) {
      this._currentStory.set(story);
    } else {
      console.error('SharedStoryService: Story not found:', storyId);
      throw new Error(`Story not found: ${storyId}`);
    }
  }

  /**
   * Select a story directly from a StoredStory object
   */
  selectStoryDirect(story: StoredStory): void {
    this._currentStory.set(story);
  }

  /**
   * Clear the current story selection
   */
  clearStory(): void {
    this._currentStory.set(null);
  }

  /**
   * Get the current story ID (for convenience)
   */
  getCurrentStoryId(): string | null {
    return this._currentStory()?.id ?? null;
  }
}
