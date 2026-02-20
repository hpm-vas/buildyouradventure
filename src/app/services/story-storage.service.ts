/**
 * Story Storage Service - Unified storage abstraction
 * Routes to either API backend or localStorage based on configuration
 * 
 * This service provides the same interface as LocalStorageService but
 * uses the backend API for durable persistence when enabled.
 */

import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, from, throwError } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiService, CreateStoryRequest, CreateNodeRequest, CreateChoiceRequest, CreateEventRequest } from './api.service';
import { LocalStorageService, StoredStory, StoredStoryNode, StoredChoice, StoredStoryEvent, StoredCardDeck, StoredEmotionCard } from './local-storage.service';
import { DataMapperService } from './data-mapper.service';
import { Story, StoryNode, Choice, StoryEvent, CardDeck, DiceResult, InteractionType, DiceConfig, Media } from '../models/story.model';

@Injectable({
  providedIn: 'root'
})
export class StoryStorageService {
  private api = inject(ApiService);
  private localStorage = inject(LocalStorageService);
  private mapper = inject(DataMapperService);

  /** Whether to use backend API (true) or localStorage (false) */
  private useApi = (environment as any).useBackendApi ?? true;

  /** Signal to track API availability */
  private _apiAvailable = signal<boolean | null>(null);
  apiAvailable = this._apiAvailable.asReadonly();

  constructor() {
    // Check API availability on startup if configured to use API
    if (this.useApi) {
      this.checkApiHealth();
    }
  }

  /** Test if the backend API is reachable */
  private checkApiHealth(): void {
    this.api.healthCheck().subscribe({
      next: () => this._apiAvailable.set(true),
      error: () => {
        console.warn('Backend API not available, falling back to localStorage');
        this._apiAvailable.set(false);
      }
    });
  }

  /** Generate a unique ID */
  generateId(): string {
    return crypto.randomUUID();
  }

  // ========================
  // Stories
  // ========================

  getStories(): Observable<StoredStory[]> {
    if (this.useApi) {
      return this.api.getStories().pipe(
        map(stories => stories.map(s => this.mapper.apiStoryToStored(s))),
        catchError(err => {
          console.warn('API getStories failed, falling back to localStorage:', err);
          return of(this.localStorage.getStories());
        })
      );
    }
    return of(this.localStorage.getStories());
  }

  getStoryById(id: string): Observable<StoredStory | undefined> {
    if (this.useApi) {
      return this.api.getStory(id).pipe(
        map(s => this.mapper.apiStoryToStored(s)),
        catchError(err => {
          if (err.status === 404) return of(undefined);
          console.warn('API getStory failed, falling back to localStorage:', err);
          return of(this.localStorage.getStoryById(id));
        })
      );
    }
    return of(this.localStorage.getStoryById(id));
  }

  createStory(name: string, description: string, startNodeText: string, startNodeInteractionType?: InteractionType): Observable<StoredStory> {
    if (this.useApi) {
      const request: CreateStoryRequest = {
        name,
        description,
        startNode: {
          nodeKey: 'start',
          text: startNodeText,
          interactionType: startNodeInteractionType
        }
      };
      return this.api.createStory(request).pipe(
        map(s => this.mapper.apiStoryToStored(s)),
        catchError(err => {
          console.warn('API createStory failed, falling back to localStorage:', err);
          const story = this.localStorage.createStory(name, description);
          // Create start node in localStorage too
          this.localStorage.createNode({
            storyId: story.id,
            nodeKey: 'start',
            title: '',
            text: startNodeText,
            media: null,
            isStart: true,
            interactionType: startNodeInteractionType ?? null,
            diceConfig: null,
            cardDeckId: null
          });
          return of(story);
        })
      );
    }
    const story = this.localStorage.createStory(name, description);
    this.localStorage.createNode({
      storyId: story.id,
      nodeKey: 'start',
      title: '',
      text: startNodeText,
      media: null,
      isStart: true,
      interactionType: startNodeInteractionType ?? null,
      diceConfig: null,
      cardDeckId: null
    });
    return of(story);
  }

  /** Create story with full start node data (used by GamemasterStoryService) */
  createStoryWithStartNode(
    name: string,
    description: string,
    startNode: {
      text: string;
      title?: string;
      interactionType?: InteractionType;
      choices?: Omit<Choice, 'id'>[];
      cardDeckId?: string;
      diceConfig?: DiceConfig;
      media?: Media;
    }
  ): Observable<{ story: StoredStory; startNode: StoredStoryNode }> {
    if (this.useApi) {
      const request: CreateStoryRequest = {
        name,
        description,
        startNode: {
          nodeKey: 'start',
          title: startNode.title,
          text: startNode.text,
          interactionType: startNode.interactionType,
          choices: startNode.choices,
          cardDeckId: startNode.cardDeckId,
          diceConfig: startNode.diceConfig,
          media: startNode.media,
        }
      };
      return this.api.createStory(request).pipe(
        switchMap(story => {
          // Get the start node that was created
          return this.api.getStartNode(story.id).pipe(
            map(node => ({
              story: this.mapper.apiStoryToStored(story),
              startNode: this.mapper.apiNodeToStored(node)
            }))
          );
        }),
        catchError(err => {
          console.warn('API createStory failed, falling back to localStorage:', err);
          return this.createStoryWithStartNodeLocal(name, description, startNode);
        })
      );
    }
    return this.createStoryWithStartNodeLocal(name, description, startNode);
  }

  private createStoryWithStartNodeLocal(
    name: string,
    description: string,
    startNode: {
      text: string;
      title?: string;
      interactionType?: InteractionType;
      choices?: Omit<Choice, 'id'>[];
      cardDeckId?: string;
      diceConfig?: DiceConfig;
      media?: Media;
    }
  ): Observable<{ story: StoredStory; startNode: StoredStoryNode }> {
    const story = this.localStorage.createStory(name, description);
    const node = this.localStorage.createNode({
      storyId: story.id,
      nodeKey: 'start',
      title: startNode.title ?? '',
      text: startNode.text,
      media: startNode.media ?? null,
      isStart: true,
      interactionType: startNode.interactionType ?? null,
      diceConfig: startNode.diceConfig ?? null,
      cardDeckId: startNode.cardDeckId ?? null
    });
    
    // Create choices if provided
    if (startNode.choices) {
      for (const choice of startNode.choices) {
        this.localStorage.createChoice({
          nodeId: node.id,
          text: choice.text,
          nextNode: choice.nextNode,
          type: choice.type,
          placeholder: choice.placeholder,
          diceConfig: choice.diceConfig,
          emotionalHint: choice.emotionalHint
        });
      }
    }
    
    return of({ story, startNode: node });
  }

  updateStory(id: string, updates: Partial<StoredStory>): Observable<StoredStory | null> {
    if (this.useApi) {
      // Map StoredStory updates to API Story updates
      const apiUpdates: Partial<Story> = {};
      if (updates.name !== undefined) apiUpdates.name = updates.name;
      if (updates.description !== undefined) apiUpdates.description = updates.description;
      if (updates.isPublished !== undefined) apiUpdates.isPublished = updates.isPublished;
      if (updates.coverImage !== undefined) apiUpdates.coverImage = updates.coverImage;

      return this.api.updateStory(id, apiUpdates).pipe(
        map(s => this.mapper.apiStoryToStored(s)),
        catchError(err => {
          console.warn('API updateStory failed, falling back to localStorage:', err);
          return of(this.localStorage.updateStory(id, updates));
        })
      );
    }
    return of(this.localStorage.updateStory(id, updates));
  }

  deleteStory(id: string): Observable<void> {
    if (this.useApi) {
      return this.api.deleteStory(id).pipe(
        catchError(err => {
          console.warn('API deleteStory failed, falling back to localStorage:', err);
          this.localStorage.deleteStory(id);
          return of(undefined);
        })
      );
    }
    this.localStorage.deleteStory(id);
    return of(undefined);
  }

  // ========================
  // Nodes
  // ========================

  getNodesByStoryId(storyId: string): Observable<StoredStoryNode[]> {
    if (this.useApi) {
      return this.api.getNodes(storyId).pipe(
        map(nodes => nodes.map(n => this.mapper.apiNodeToStored(n))),
        catchError(err => {
          console.warn('API getNodes failed, falling back to localStorage:', err);
          return of(this.localStorage.getNodesByStoryId(storyId));
        })
      );
    }
    return of(this.localStorage.getNodesByStoryId(storyId));
  }

  getNodeById(id: string): Observable<StoredStoryNode | undefined> {
    if (this.useApi) {
      return this.api.getNode(id).pipe(
        map(n => this.mapper.apiNodeToStored(n)),
        catchError(err => {
          if (err.status === 404) return of(undefined);
          console.warn('API getNode failed, falling back to localStorage:', err);
          return of(this.localStorage.getNodeById(id));
        })
      );
    }
    return of(this.localStorage.getNodeById(id));
  }

  getNodeByKey(storyId: string, nodeKey: string): Observable<StoredStoryNode | undefined> {
    if (this.useApi) {
      return this.api.getNodeByKey(storyId, nodeKey).pipe(
        map(n => this.mapper.apiNodeToStored(n)),
        catchError(err => {
          if (err.status === 404) return of(undefined);
          console.warn('API getNodeByKey failed, falling back to localStorage:', err);
          return of(this.localStorage.getNodeByKey(storyId, nodeKey));
        })
      );
    }
    return of(this.localStorage.getNodeByKey(storyId, nodeKey));
  }

  getStartNode(storyId: string): Observable<StoredStoryNode | undefined> {
    if (this.useApi) {
      return this.api.getStartNode(storyId).pipe(
        map(n => this.mapper.apiNodeToStored(n)),
        catchError(err => {
          if (err.status === 404) return of(undefined);
          console.warn('API getStartNode failed, falling back to localStorage:', err);
          return of(this.localStorage.getStartNode(storyId));
        })
      );
    }
    return of(this.localStorage.getStartNode(storyId));
  }

  createNode(storyId: string, data: CreateNodeRequest): Observable<StoredStoryNode> {
    if (this.useApi) {
      return this.api.createNode(storyId, data).pipe(
        map(n => this.mapper.apiNodeToStored(n)),
        catchError(err => {
          console.warn('API createNode failed, falling back to localStorage:', err);
          const node = this.localStorage.createNode({
            storyId,
            nodeKey: data.nodeKey,
            title: data.title ?? '',
            text: data.text,
            media: data.media ?? null,
            isStart: false,
            interactionType: data.interactionType ?? null,
            diceConfig: data.diceConfig ?? null,
            cardDeckId: data.cardDeckId ?? null
          });
          return of(node);
        })
      );
    }
    const node = this.localStorage.createNode({
      storyId,
      nodeKey: data.nodeKey,
      title: data.title ?? '',
      text: data.text,
      media: data.media ?? null,
      isStart: false,
      interactionType: data.interactionType ?? null,
      diceConfig: data.diceConfig ?? null,
      cardDeckId: data.cardDeckId ?? null
    });
    return of(node);
  }

  updateNode(id: string, updates: Partial<StoredStoryNode>): Observable<StoredStoryNode | null> {
    if (this.useApi) {
      // Map StoredStoryNode updates to API StoryNode updates
      const apiUpdates: Partial<StoryNode> = {};
      if (updates.nodeKey !== undefined) apiUpdates.nodeKey = updates.nodeKey;
      if (updates.title !== undefined) apiUpdates.title = updates.title;
      if (updates.text !== undefined) apiUpdates.text = updates.text;
      if (updates.media !== undefined) apiUpdates.media = updates.media || undefined;
      if (updates.isStart !== undefined) apiUpdates.isStart = updates.isStart;
      if (updates.interactionType !== undefined) apiUpdates.interactionType = updates.interactionType || undefined;
      if (updates.diceConfig !== undefined) apiUpdates.diceConfig = updates.diceConfig || undefined;
      if (updates.cardDeckId !== undefined) apiUpdates.cardDeckId = updates.cardDeckId || undefined;

      return this.api.updateNode(id, apiUpdates).pipe(
        map(n => this.mapper.apiNodeToStored(n)),
        catchError(err => {
          console.warn('API updateNode failed, falling back to localStorage:', err);
          return of(this.localStorage.updateNode(id, updates));
        })
      );
    }
    return of(this.localStorage.updateNode(id, updates));
  }

  deleteNode(id: string): Observable<void> {
    if (this.useApi) {
      return this.api.deleteNode(id).pipe(
        catchError(err => {
          console.warn('API deleteNode failed, falling back to localStorage:', err);
          this.localStorage.deleteNode(id);
          return of(undefined);
        })
      );
    }
    this.localStorage.deleteNode(id);
    return of(undefined);
  }

  // ========================
  // Choices
  // ========================

  getChoicesByNodeId(nodeId: string): Observable<StoredChoice[]> {
    if (this.useApi) {
      return this.api.getChoices(nodeId).pipe(
        map(choices => choices.map(c => this.mapper.apiChoiceToStored(c, nodeId))),
        catchError(err => {
          console.warn('API getChoices failed, falling back to localStorage:', err);
          return of(this.localStorage.getChoicesByNodeId(nodeId));
        })
      );
    }
    return of(this.localStorage.getChoicesByNodeId(nodeId));
  }

  getChoicesByStoryId(storyId: string): Observable<StoredChoice[]> {
    if (this.useApi) {
      return this.api.getStoryChoices(storyId).pipe(
        map(choices => {
          // API returns choices with nodeId - need to map them
          return choices.map(c => ({
            id: c.id,
            nodeId: (c as any).nodeId || '', // Backend should return nodeId
            text: c.text,
            nextNode: c.nextNode,
            type: c.type,
            placeholder: c.placeholder,
            diceConfig: c.diceConfig,
            emotionalHint: c.emotionalHint,
            created: new Date().toISOString()
          }));
        }),
        catchError(err => {
          console.warn('API getStoryChoices failed, falling back to localStorage:', err);
          return of(this.localStorage.getChoicesByStoryId(storyId));
        })
      );
    }
    return of(this.localStorage.getChoicesByStoryId(storyId));
  }

  getChoiceById(id: string): Observable<StoredChoice | undefined> {
    // API doesn't have a direct getChoice by id, look in localStorage
    return of(this.localStorage.getChoiceById(id));
  }

  createChoice(nodeId: string, data: CreateChoiceRequest): Observable<StoredChoice> {
    if (this.useApi) {
      return this.api.createChoice(nodeId, data).pipe(
        map(c => this.mapper.apiChoiceToStored(c, nodeId)),
        catchError(err => {
          console.warn('API createChoice failed, falling back to localStorage:', err);
          const choice = this.localStorage.createChoice({
            nodeId,
            text: data.text,
            nextNode: data.nextNode,
            type: data.type,
            placeholder: data.placeholder,
            diceConfig: data.diceConfig,
            emotionalHint: data.emotionalHint
          });
          return of(choice);
        })
      );
    }
    const choice = this.localStorage.createChoice({
      nodeId,
      text: data.text,
      nextNode: data.nextNode,
      type: data.type,
      placeholder: data.placeholder,
      diceConfig: data.diceConfig,
      emotionalHint: data.emotionalHint
    });
    return of(choice);
  }

  updateChoice(id: string, updates: Partial<StoredChoice>): Observable<StoredChoice | null> {
    if (this.useApi) {
      // Map to API format
      const apiUpdates: Partial<Choice> = {};
      if (updates.text !== undefined) apiUpdates.text = updates.text;
      if (updates.nextNode !== undefined) apiUpdates.nextNode = updates.nextNode;
      if (updates.type !== undefined) apiUpdates.type = updates.type as 'button' | 'freetext';
      if (updates.placeholder !== undefined) apiUpdates.placeholder = updates.placeholder;
      if (updates.diceConfig !== undefined) apiUpdates.diceConfig = updates.diceConfig;
      if (updates.emotionalHint !== undefined) apiUpdates.emotionalHint = updates.emotionalHint;

      return this.api.updateChoice(id, apiUpdates).pipe(
        map(c => ({
          ...c,
          nodeId: updates.nodeId ?? '',
          created: new Date().toISOString()
        })),
        catchError(err => {
          console.warn('API updateChoice failed, falling back to localStorage:', err);
          return of(this.localStorage.updateChoice(id, updates));
        })
      );
    }
    return of(this.localStorage.updateChoice(id, updates));
  }

  deleteChoice(id: string): Observable<void> {
    if (this.useApi) {
      return this.api.deleteChoice(id).pipe(
        catchError(err => {
          console.warn('API deleteChoice failed, falling back to localStorage:', err);
          this.localStorage.deleteChoice(id);
          return of(undefined);
        })
      );
    }
    this.localStorage.deleteChoice(id);
    return of(undefined);
  }

  // ========================
  // Events
  // ========================

  getEventsByStoryId(storyId: string, userId: string = 'player'): Observable<StoredStoryEvent[]> {
    if (this.useApi) {
      return this.api.getEvents(storyId).pipe(
        map(events => events.map(e => this.mapper.apiEventToStored(e))),
        catchError(err => {
          console.warn('API getEvents failed, falling back to localStorage:', err);
          return of(this.localStorage.getEventsByStoryId(storyId));
        })
      );
    }
    return of(this.localStorage.getEventsByStoryId(storyId));
  }

  getLastEvent(storyId: string, userId: string = 'player'): Observable<StoredStoryEvent | undefined> {
    if (this.useApi) {
      return this.api.getLastEvent(storyId).pipe(
        map(e => e ? this.mapper.apiEventToStored(e) : undefined),
        catchError(err => {
          console.warn('API getLastEvent failed, falling back to localStorage:', err);
          return of(this.localStorage.getLastEvent(storyId));
        })
      );
    }
    return of(this.localStorage.getLastEvent(storyId));
  }

  createEvent(storyId: string, data: Omit<StoredStoryEvent, 'id' | 'created' | 'storyId'>, userId: string = 'player'): Observable<StoredStoryEvent> {
    if (this.useApi) {
      const request: CreateEventRequest = {
        nodeKey: data.nodeKey,
        choiceId: data.choiceId ?? undefined,
        choiceText: data.choiceText ?? undefined,
        selectedCards: data.selectedCards ?? undefined,
        freeText: data.freeText ?? undefined,
        diceResult: data.diceResult ?? undefined,
        userId
      };
      return this.api.createEvent(storyId, request).pipe(
        map(e => this.mapper.apiEventToStored(e)),
        catchError(err => {
          console.warn('API createEvent failed, falling back to localStorage:', err);
          const event = this.localStorage.createEvent({
            storyId,
            ...data
          });
          return of(event);
        })
      );
    }
    const event = this.localStorage.createEvent({
      storyId,
      ...data
    });
    return of(event);
  }

  clearEventsForStory(storyId: string, userId: string = 'player'): Observable<void> {
    if (this.useApi) {
      return this.api.clearEvents(storyId).pipe(
        catchError(err => {
          console.warn('API clearEvents failed, falling back to localStorage:', err);
          this.localStorage.clearEventsForStory(storyId);
          return of(undefined);
        })
      );
    }
    this.localStorage.clearEventsForStory(storyId);
    return of(undefined);
  }

  // ========================
  // Card Decks
  // ========================

  getCardDecks(storyId?: string): Observable<StoredCardDeck[]> {
    if (this.useApi) {
      return this.api.getCardDecks(storyId).pipe(
        map(decks => decks.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description ?? '',
          storyId: d.storyId ?? null,
          isGlobal: d.isGlobal,
          created: new Date().toISOString()
        }))),
        catchError(err => {
          console.warn('API getCardDecks failed, falling back to localStorage:', err);
          return of(this.localStorage.getCardDecks(storyId));
        })
      );
    }
    return of(this.localStorage.getCardDecks(storyId));
  }

  getCardDeckById(id: string): Observable<CardDeck | undefined> {
    if (this.useApi) {
      return this.api.getCardDeck(id).pipe(
        catchError(err => {
          if (err.status === 404) return of(undefined);
          console.warn('API getCardDeck failed, falling back to localStorage:', err);
          const deck = this.localStorage.getCardDeckById(id);
          if (!deck) return of(undefined);
          const cards = this.localStorage.getEmotionCardsByDeckId(id);
          return of(this.mapper.storedDeckToApi(deck, cards));
        })
      );
    }
    const deck = this.localStorage.getCardDeckById(id);
    if (!deck) return of(undefined);
    const cards = this.localStorage.getEmotionCardsByDeckId(id);
    return of(this.mapper.storedDeckToApi(deck, cards));
  }

  getGlobalDeck(): Observable<CardDeck | undefined> {
    if (this.useApi) {
      return this.api.getCardDecks().pipe(
        map(decks => decks.find(d => d.isGlobal)),
        catchError(err => {
          console.warn('API getCardDecks failed, falling back to localStorage:', err);
          const deck = this.localStorage.getGlobalDeck();
          if (!deck) return of(undefined);
          const cards = this.localStorage.getEmotionCardsByDeckId(deck.id);
          return of(this.mapper.storedDeckToApi(deck, cards));
        })
      );
    }
    const deck = this.localStorage.getGlobalDeck();
    if (!deck) return of(undefined);
    const cards = this.localStorage.getEmotionCardsByDeckId(deck.id);
    return of(this.mapper.storedDeckToApi(deck, cards));
  }

  getEmotionCardsByDeckId(deckId: string): Observable<StoredEmotionCard[]> {
    if (this.useApi) {
      return this.api.getCardDeck(deckId).pipe(
        map(deck => deck.cards.map(c => ({
          id: c.id,
          deckId: deckId,
          label: c.label,
          description: c.description ?? '',
          icon: c.icon ?? '',
          color: c.color ?? '',
          sortOrder: c.sortOrder
        }))),
        catchError(err => {
          console.warn('API getCardDeck failed, falling back to localStorage:', err);
          return of(this.localStorage.getEmotionCardsByDeckId(deckId));
        })
      );
    }
    return of(this.localStorage.getEmotionCardsByDeckId(deckId));
  }

  // ========================
  // Dice
  // ========================

  rollDice(diceType: string, diceCount: number, modifier?: number, successThreshold?: number): Observable<DiceResult> {
    if (this.useApi) {
      return this.api.rollDice({ diceType, diceCount, modifier, successThreshold }).pipe(
        catchError(err => {
          console.warn('API rollDice failed, rolling locally:', err);
          return of(this.rollDiceLocal(diceType, diceCount, modifier, successThreshold));
        })
      );
    }
    return of(this.rollDiceLocal(diceType, diceCount, modifier, successThreshold));
  }

  private rollDiceLocal(diceType: string, diceCount: number, modifier: number = 0, successThreshold?: number): DiceResult {
    const max = parseInt(diceType.replace('d', ''));
    const rolls: number[] = [];
    for (let i = 0; i < diceCount; i++) {
      rolls.push(Math.floor(Math.random() * max) + 1);
    }
    const total = rolls.reduce((a, b) => a + b, 0);
    const finalTotal = total + modifier;
    return {
      rolls,
      total,
      modifier,
      finalTotal,
      isManual: false,
      success: successThreshold !== undefined ? finalTotal >= successThreshold : undefined
    };
  }
}
