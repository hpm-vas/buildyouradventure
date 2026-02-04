import { Injectable, signal, inject } from '@angular/core';
import { StoryNode, StoryEvent, Story, Choice, Media } from '../models/story.model';
import { PocketBaseService } from './pocketbase.service';

/** Response from GET /api/story-context */
interface StoryContextResponse {
  currentNode: {
    id: string;
    nodeKey: string;
    title: string | null;
    text: string;
    media: Media | null;
    pending: boolean;
  };
  choices: {
    id: string;
    text: string;
    nextNode: string;
  }[];
  events: {
    id: string;
    nodeKey: string;
    choiceId: string | null;
    choiceText: string | null;
    created: string;
  }[];
}

/** Response from POST /api/record-event */
interface RecordEventResponse {
  success: boolean;
  event: {
    id: string;
    nodeKey: string;
    choiceId: string;
    choiceText: string;
  };
  nextNodeKey: string;
}

/**
 * Service for managing story state and progression
 * Uses Angular Signals for reactive state management
 */
@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private pb = inject(PocketBaseService);

  // Current story state
  private _currentNode = signal<StoryNode | null>(null);
  private _storyHistory = signal<StoryEvent[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly currentNode = this._currentNode.asReadonly();
  readonly storyHistory = this._storyHistory.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() {
    console.log('StoryService initialized');
  }

  /**
   * Load current story context (node, choices, events)
   * Called after authentication to initialize story state
   */
  async loadCurrentNode(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await this.pb.client.send<StoryContextResponse>('/api/story-context', {
        method: 'GET'
      });

      // Map response to StoryNode
      const node: StoryNode = {
        id: response.currentNode.nodeKey,
        title: response.currentNode.title ?? undefined,
        text: response.currentNode.text,
        choices: response.choices.map(c => ({
          id: c.id,
          text: c.text,
          nextNode: c.nextNode
        })),
        media: response.currentNode.media ?? undefined
      };

      this._currentNode.set(node);

      // Map events
      const events: StoryEvent[] = response.events.map(ev => ({
        id: parseInt(ev.id, 36), // Convert PocketBase ID to number
        storyId: 'default',
        nodeId: ev.nodeKey,
        choiceId: ev.choiceId ?? undefined,
        choiceText: ev.choiceText ?? undefined,
        timestamp: new Date(ev.created)
      }));

      this._storyHistory.set(events);

      console.log('Story context loaded:', node.id);
    } catch (err: any) {
      const message = err?.message || 'Failed to load story';
      this._error.set(message);
      console.error('Failed to load story context:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Select a choice and progress the story
   */
  async selectChoice(choiceId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await this.pb.client.send<RecordEventResponse>('/api/record-event', {
        method: 'POST',
        body: JSON.stringify({ choiceId }),
        headers: { 'Content-Type': 'application/json' }
      });

      // Reload the current node to get new state
      await this.loadCurrentNode();

      console.log('Choice recorded:', choiceId);
    } catch (err: any) {
      const message = err?.message || 'Failed to record choice';
      this._error.set(message);
      console.error('Failed to record choice:', err);
      this._loading.set(false);
    }
  }

  /**
   * Reset story state (for development/testing)
   */
  async resetStory(): Promise<void> {
    // TODO: Add reset endpoint in PocketBase
    console.log('Reset story - not implemented yet');
  }
}
