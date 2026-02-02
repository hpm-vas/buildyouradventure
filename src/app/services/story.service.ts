import { Injectable, signal } from '@angular/core';
import { StoryNode, StoryEvent, Story } from '../models/story.model';

/**
 * Service for managing story state and progression
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class StoryService {
  // Current story state
  private _currentStory = signal<Story | null>(null);
  private _currentNode = signal<StoryNode | null>(null);
  private _storyHistory = signal<StoryEvent[]>([]);
  private _loading = signal(false);

  // Public readonly signals
  readonly currentStory = this._currentStory.asReadonly();
  readonly currentNode = this._currentNode.asReadonly();
  readonly storyHistory = this._storyHistory.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor() {
    console.log('StoryService initialized');
  }

  /**
   * Load a story by ID
   */
  async loadStory(storyId: string): Promise<void> {
    this._loading.set(true);
    try {
      // TODO: Fetch from Supabase
      console.log('Loading story:', storyId);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Navigate to a story node
   */
  async goToNode(nodeId: string): Promise<void> {
    // TODO: Fetch node and update state
    console.log('Navigating to node:', nodeId);
  }

  /**
   * Record a player choice
   */
  async recordChoice(choiceId: string, answer?: string): Promise<void> {
    // TODO: Save event to Supabase
    console.log('Recording choice:', choiceId, answer);
  }
}
