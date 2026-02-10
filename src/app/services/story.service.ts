import { Injectable, signal, inject, computed } from '@angular/core';
import { 
  StoryNode, StoryEvent, Story, Choice, Media, 
  EmotionCard, CardDeck, DiceConfig, DiceResult, InteractionType 
} from '../models/story.model';
import { PocketBaseService } from './pocketbase.service';

/** Response from GET /api/story-context */
interface StoryContextResponse {
  story: {
    id: string;
    name: string;
    description: string | null;
  };
  currentNode: {
    id: string;
    nodeKey: string;
    title: string | null;
    text: string;
    media: Media | null;
    pending: boolean;
    interactionType: InteractionType | null;
    diceConfig: DiceConfig | null;
    cardDeckId: string | null;
    isStart: boolean;
  };
  choices: {
    id: string;
    text: string;
    nextNode: string;
  }[];
  cards: {
    id: string;
    label: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    sortOrder: number;
  }[];
  events: {
    id: string;
    nodeKey: string;
    choiceId: string | null;
    choiceText: string | null;
    selectedCards: string[] | null;
    freeText: string | null;
    diceResult: DiceResult | null;
    created: string;
  }[];
}

/** Request body for POST /api/record-event */
interface RecordEventRequest {
  choiceId?: string;
  selectedCards?: string[];
  freeText?: string;
  diceResult?: DiceResult;
}

/** Response from POST /api/record-event */
interface RecordEventResponse {
  success: boolean;
  event: {
    id: string;
    nodeKey: string;
    choiceId: string | null;
    choiceText: string | null;
  };
  nextNodeKey: string;
}

/**
 * Service for managing story state and progression
 * Supports multi-story, emotion cards, dice rolls, and free-text interactions
 */
@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private pb = inject(PocketBaseService);

  // Current story context
  private _currentStory = signal<Story | null>(null);
  private _currentNode = signal<StoryNode | null>(null);
  private _availableCards = signal<EmotionCard[]>([]);
  private _storyHistory = signal<StoryEvent[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // Pending interaction state (before submission)
  private _selectedCards = signal<string[]>([]);
  private _freeText = signal<string>('');
  private _diceResult = signal<DiceResult | null>(null);

  // Public readonly signals
  readonly currentStory = this._currentStory.asReadonly();
  readonly currentNode = this._currentNode.asReadonly();
  readonly availableCards = this._availableCards.asReadonly();
  readonly storyHistory = this._storyHistory.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Interaction state
  readonly selectedCards = this._selectedCards.asReadonly();
  readonly freeText = this._freeText.asReadonly();
  readonly diceResult = this._diceResult.asReadonly();

  // Computed helpers
  readonly interactionType = computed(() => this._currentNode()?.interactionType ?? 'choice');
  readonly requiresCards = computed(() => {
    const type = this.interactionType();
    return type.startsWith('card_');
  });
  readonly requiresDice = computed(() => {
    const type = this.interactionType();
    return type.includes('roll');
  });
  readonly requiresText = computed(() => {
    const type = this.interactionType();
    return type.includes('text') || type === 'text';
  });
  readonly hasChoices = computed(() => {
    const type = this.interactionType();
    return type.includes('choice');
  });

  /** Check if current interaction requirements are met */
  readonly canSubmit = computed(() => {
    const type = this.interactionType();
    const cards = this._selectedCards();
    const text = this._freeText();
    const dice = this._diceResult();

    // Check card requirement
    if (this.requiresCards() && cards.length === 0) return false;

    // Check dice requirement
    if (this.requiresDice() && !dice) return false;

    // Check text requirement (only for card_text and text modes)
    if ((type === 'card_text' || type === 'text') && !text.trim()) return false;

    return true;
  });

  constructor() {
    console.log('StoryService initialized');
  }

  /**
   * Load story context for a specific story
   * @param storyId The ID of the story to load
   */
  async loadStoryContext(storyId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    this.resetInteractionState();

    try {
      const response = await this.pb.client.send<StoryContextResponse>('/api/story-context', {
        method: 'GET',
        query: { storyId }
      });

      // Map story
      this._currentStory.set({
        id: response.story.id,
        name: response.story.name,
        description: response.story.description ?? undefined,
        ownerId: '',
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Map response to StoryNode
      const node: StoryNode = {
        id: response.currentNode.id,
        storyId: storyId,
        nodeKey: response.currentNode.nodeKey,
        title: response.currentNode.title ?? undefined,
        text: response.currentNode.text,
        interactionType: response.currentNode.interactionType ?? 'choice',
        choices: response.choices.map(c => ({
          id: c.id,
          text: c.text,
          nextNode: c.nextNode
        })),
        cardDeckId: response.currentNode.cardDeckId ?? undefined,
        diceConfig: response.currentNode.diceConfig ?? undefined,
        media: response.currentNode.media ?? undefined,
        pending: response.currentNode.pending,
        isStart: response.currentNode.isStart
      };
      this._currentNode.set(node);

      // Map emotion cards
      this._availableCards.set(response.cards.map(c => ({
        id: c.id,
        deckId: response.currentNode.cardDeckId ?? '',
        label: c.label,
        description: c.description ?? undefined,
        icon: c.icon ?? undefined,
        color: c.color ?? undefined,
        sortOrder: c.sortOrder
      })));

      // Map events
      const events: StoryEvent[] = response.events.map(ev => ({
        id: ev.id,
        storyId: storyId,
        userId: '',
        nodeKey: ev.nodeKey,
        choiceId: ev.choiceId ?? undefined,
        choiceText: ev.choiceText ?? undefined,
        selectedCards: ev.selectedCards ?? undefined,
        freeText: ev.freeText ?? undefined,
        diceResult: ev.diceResult ?? undefined,
        timestamp: new Date(ev.created)
      }));
      this._storyHistory.set(events);

      console.log('Story context loaded:', node.nodeKey);
    } catch (err: any) {
      const message = err?.message || 'Failed to load story';
      this._error.set(message);
      console.error('Failed to load story context:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Legacy method - load current node without story selection
   * @deprecated Use loadStoryContext(storyId) instead
   */
  async loadCurrentNode(): Promise<void> {
    // For backward compatibility, try to load without story ID
    const storyId = this._currentStory()?.id;
    if (storyId) {
      await this.loadStoryContext(storyId);
    } else {
      this._error.set('No story selected');
    }
  }

  /** Update selected emotion cards */
  setSelectedCards(cardIds: string[]): void {
    this._selectedCards.set(cardIds);
  }

  /** Update free text input */
  setFreeText(text: string): void {
    this._freeText.set(text);
  }

  /** Record dice roll result */
  setDiceResult(result: DiceResult): void {
    this._diceResult.set(result);
  }

  /** Reset all interaction state */
  resetInteractionState(): void {
    this._selectedCards.set([]);
    this._freeText.set('');
    this._diceResult.set(null);
  }

  /**
   * Submit interaction and progress the story
   * @param choiceId Optional choice ID when selecting a choice
   */
  async submitInteraction(choiceId?: string): Promise<void> {
    const storyId = this._currentStory()?.id;
    if (!storyId) {
      this._error.set('No story selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const body: RecordEventRequest = {};

      if (choiceId) body.choiceId = choiceId;
      if (this._selectedCards().length > 0) body.selectedCards = this._selectedCards();
      if (this._freeText().trim()) body.freeText = this._freeText().trim();
      if (this._diceResult()) body.diceResult = this._diceResult()!;

      await this.pb.client.send<RecordEventResponse>('/api/record-event', {
        method: 'POST',
        query: { storyId },
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });

      // Reload the context to get new state
      await this.loadStoryContext(storyId);

      console.log('Interaction recorded');
    } catch (err: any) {
      const message = err?.message || 'Failed to record interaction';
      this._error.set(message);
      console.error('Failed to record interaction:', err);
      this._loading.set(false);
    }
  }

  /**
   * Select a choice and progress the story
   * Convenience method that wraps submitInteraction
   */
  async selectChoice(choiceId: string): Promise<void> {
    await this.submitInteraction(choiceId);
  }

  /**
   * Reset story state (for development/testing)
   */
  async resetStory(): Promise<void> {
    const storyId = this._currentStory()?.id;
    if (!storyId) return;

    try {
      await this.pb.client.send('/api/reset-story', {
        method: 'POST',
        query: { storyId }
      });
      await this.loadStoryContext(storyId);
    } catch (err: any) {
      console.error('Reset story failed:', err);
    }
  }
}
