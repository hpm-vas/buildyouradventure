import { Injectable, signal, inject, computed } from '@angular/core';
import { 
  StoryNode, StoryEvent, Story, Choice, Media, 
  EmotionCard, CardDeck, DiceConfig, DiceResult, InteractionType 
} from '../models/story.model';
import { LocalStorageService } from './local-storage.service';

/**
 * Service for managing story state and progression
 * Uses LocalStorage for persistence (no backend required)
 */
@Injectable({
  providedIn: 'root'
})
export class StoryService {
  private storage = inject(LocalStorageService);

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
    console.log('StoryService initialized (LocalStorage mode)');
  }

  /**
   * Determine current node based on events history
   * If no events, return start node. Otherwise, follow the last choice's nextNode.
   */
  private getCurrentNodeKey(storyId: string): string {
    const events = this.storage.getEventsByStoryId(storyId);
    if (events.length === 0) {
      return 'start';
    }

    // Get the last event that has a choice
    const lastChoiceEvent = [...events].reverse().find(e => e.choiceId);
    if (lastChoiceEvent) {
      const choice = this.storage.getChoiceById(lastChoiceEvent.choiceId!);
      if (choice) {
        return choice.nextNode;
      }
    }

    // If no choice events, still on start
    return 'start';
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
      // Get story
      const storedStory = this.storage.getStoryById(storyId);
      if (!storedStory) {
        throw new Error('Story not found');
      }

      this._currentStory.set({
        id: storedStory.id,
        name: storedStory.name,
        description: storedStory.description || undefined,
        ownerId: 'local-gamemaster',
        isPublished: storedStory.isPublished,
        createdAt: new Date(storedStory.created),
        updatedAt: new Date(storedStory.updated)
      });

      // Get current node key
      const currentNodeKey = this.getCurrentNodeKey(storyId);
      const storedNode = this.storage.getNodeByKey(storyId, currentNodeKey);
      
      if (!storedNode) {
        throw new Error(`Node "${currentNodeKey}" not found`);
      }

      // Get choices for this node
      const storedChoices = this.storage.getChoicesByNodeId(storedNode.id);

      // Map to StoryNode
      const node: StoryNode = {
        id: storedNode.id,
        storyId: storyId,
        nodeKey: storedNode.nodeKey,
        title: storedNode.title || undefined,
        text: storedNode.text,
        interactionType: storedNode.interactionType ?? 'choice',
        choices: storedChoices.map(c => ({
          id: c.id,
          text: c.text,
          nextNode: c.nextNode
        })),
        cardDeckId: storedNode.cardDeckId || undefined,
        diceConfig: storedNode.diceConfig || undefined,
        media: storedNode.media || undefined,
        isStart: storedNode.isStart
      };
      this._currentNode.set(node);

      // Get emotion cards if node has a card deck
      if (storedNode.cardDeckId) {
        const cards = this.storage.getEmotionCardsByDeckId(storedNode.cardDeckId);
        this._availableCards.set(cards.map(c => ({
          id: c.id,
          deckId: c.deckId,
          label: c.label,
          description: c.description || undefined,
          icon: c.icon || undefined,
          color: c.color || undefined,
          sortOrder: c.sortOrder
        })));
      } else {
        // Use global deck if no specific deck
        const globalDeck = this.storage.getGlobalDeck();
        if (globalDeck) {
          const cards = this.storage.getEmotionCardsByDeckId(globalDeck.id);
          this._availableCards.set(cards.map(c => ({
            id: c.id,
            deckId: c.deckId,
            label: c.label,
            description: c.description || undefined,
            icon: c.icon || undefined,
            color: c.color || undefined,
            sortOrder: c.sortOrder
          })));
        } else {
          this._availableCards.set([]);
        }
      }

      // Get events history
      const storedEvents = this.storage.getEventsByStoryId(storyId);
      const events: StoryEvent[] = storedEvents.map(ev => {
        // Get choice text if choice was made
        let choiceText: string | undefined;
        if (ev.choiceId) {
          const choice = this.storage.getChoiceById(ev.choiceId);
          choiceText = choice?.text;
        }
        return {
          id: ev.id,
          storyId: storyId,
          userId: 'local-gamemaster',
          nodeKey: ev.nodeKey,
          choiceId: ev.choiceId || undefined,
          choiceText: choiceText || ev.choiceText || undefined,
          selectedCards: ev.selectedCards || undefined,
          freeText: ev.freeText || undefined,
          diceResult: ev.diceResult || undefined,
          timestamp: new Date(ev.created)
        };
      });
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
    const currentNode = this._currentNode();
    
    if (!storyId || !currentNode) {
      this._error.set('No story or node selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      // Get choice text if choice was selected
      let choiceText: string | null = null;
      if (choiceId) {
        const choice = currentNode.choices.find(c => c.id === choiceId);
        choiceText = choice?.text || null;
      }

      // Create event
      this.storage.createEvent({
        storyId: storyId,
        nodeKey: currentNode.nodeKey,
        choiceId: choiceId || null,
        choiceText: choiceText,
        selectedCards: this._selectedCards().length > 0 ? this._selectedCards() : null,
        freeText: this._freeText().trim() || null,
        diceResult: this._diceResult()
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
      this.storage.clearEventsForStory(storyId);
      await this.loadStoryContext(storyId);
      console.log('Story reset');
    } catch (err: any) {
      console.error('Reset story failed:', err);
    }
  }
}
