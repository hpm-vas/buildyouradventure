import { Injectable, signal } from '@angular/core';
import { 
  Story, StoryNode, Choice, StoryEvent, 
  EmotionCard, CardDeck, InteractionType, DiceConfig, Media 
} from '../models/story.model';

const STORAGE_KEY = 'plotsmithy_data';

/**
 * Internal storage structure
 */
interface AppData {
  stories: StoredStory[];
  storyNodes: StoredStoryNode[];
  choices: StoredChoice[];
  events: StoredStoryEvent[];
  cardDecks: StoredCardDeck[];
  emotionCards: StoredEmotionCard[];
}

// Internal storage types (flat structure for localStorage)
export interface StoredStory {
  id: string;
  name: string;
  description: string;
  isPublished: boolean;
  coverImage: string;
  created: string;
  updated: string;
}

export interface StoredStoryNode {
  id: string;
  storyId: string;
  nodeKey: string;
  title: string;
  text: string;
  media: Media | null;
  isStart: boolean;
  interactionType: InteractionType | null;
  diceConfig: DiceConfig | null;
  cardDeckId: string | null;
  created: string;
  updated: string;
}

export interface StoredChoice {
  id: string;
  nodeId: string;
  text: string;
  nextNode: string;
  type?: string;  // 'button' | 'freetext'
  placeholder?: string;
  diceConfig?: DiceConfig;
  created: string;
}

export interface StoredStoryEvent {
  id: string;
  storyId: string;
  nodeKey: string;
  choiceId: string | null;
  choiceText: string | null;
  selectedCards: string[] | null;
  freeText: string | null;
  diceResult: {
    rolls: number[];
    total: number;
    modifier: number;
    finalTotal: number;
    isManual: boolean;
    success?: boolean;
  } | null;
  created: string;
}

export interface StoredCardDeck {
  id: string;
  name: string;
  description: string;
  storyId: string | null;
  isGlobal: boolean;
  created: string;
}

export interface StoredEmotionCard {
  id: string;
  deckId: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

/**
 * Service for storing all app data in browser localStorage
 * Single source of truth for the entire application state
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private _data = signal<AppData>(this.loadFromStorage());

  constructor() {
    console.log('LocalStorageService initialized');
    // Initialize with default card deck if empty
    if (this._data().cardDecks.length === 0) {
      this.seedDefaultCards();
    }
  }

  // =====================
  // UTILITY
  // =====================

  /** Generate a unique ID */
  generateId(): string {
    return crypto.randomUUID();
  }

  /** Get current ISO timestamp */
  private now(): string {
    return new Date().toISOString();
  }

  /** Load data from localStorage */
  private loadFromStorage(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    return this.emptyData();
  }

  /** Save current data to localStorage */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data()));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  /** Create empty data structure */
  private emptyData(): AppData {
    return {
      stories: [],
      storyNodes: [],
      choices: [],
      events: [],
      cardDecks: [],
      emotionCards: []
    };
  }

  /** Seed default emotion cards */
  private seedDefaultCards(): void {
    const deckId = this.generateId();
    const deck: StoredCardDeck = {
      id: deckId,
      name: 'Default Emotions',
      description: 'Basic emotion cards for story interactions',
      storyId: null,
      isGlobal: true,
      created: this.now()
    };

    const emotions = [
      { label: 'Joy', description: 'Happiness and delight', icon: '😊', color: '#FFD700' },
      { label: 'Sadness', description: 'Sorrow and melancholy', icon: '😢', color: '#4169E1' },
      { label: 'Anger', description: 'Frustration and rage', icon: '😠', color: '#DC143C' },
      { label: 'Fear', description: 'Anxiety and dread', icon: '😨', color: '#800080' },
      { label: 'Surprise', description: 'Astonishment and wonder', icon: '😲', color: '#FF8C00' },
      { label: 'Love', description: 'Affection and care', icon: '❤️', color: '#FF69B4' }
    ];

    const cards: StoredEmotionCard[] = emotions.map((e, i) => ({
      id: this.generateId(),
      deckId,
      label: e.label,
      description: e.description,
      icon: e.icon,
      color: e.color,
      sortOrder: i
    }));

    this._data.update(d => ({
      ...d,
      cardDecks: [deck],
      emotionCards: cards
    }));
    this.saveToStorage();
  }

  // =====================
  // STORIES
  // =====================

  getStories(): StoredStory[] {
    return this._data().stories;
  }

  getStoryById(id: string): StoredStory | undefined {
    return this._data().stories.find(s => s.id === id);
  }

  createStory(name: string, description: string = ''): StoredStory {
    const story: StoredStory = {
      id: this.generateId(),
      name,
      description,
      isPublished: false,
      coverImage: '',
      created: this.now(),
      updated: this.now()
    };

    this._data.update(d => ({
      ...d,
      stories: [story, ...d.stories]
    }));
    this.saveToStorage();
    return story;
  }

  updateStory(id: string, updates: Partial<Omit<StoredStory, 'id' | 'created'>>): StoredStory | null {
    let updated: StoredStory | null = null;
    this._data.update(d => ({
      ...d,
      stories: d.stories.map(s => {
        if (s.id === id) {
          updated = { ...s, ...updates, updated: this.now() };
          return updated;
        }
        return s;
      })
    }));
    this.saveToStorage();
    return updated;
  }

  deleteStory(id: string): void {
    this._data.update(d => ({
      ...d,
      stories: d.stories.filter(s => s.id !== id),
      storyNodes: d.storyNodes.filter(n => n.storyId !== id),
      choices: d.choices.filter(c => {
        const node = d.storyNodes.find(n => n.id === c.nodeId);
        return node && node.storyId !== id;
      }),
      events: d.events.filter(e => e.storyId !== id)
    }));
    this.saveToStorage();
  }

  // =====================
  // STORY NODES
  // =====================

  getNodesByStoryId(storyId: string): StoredStoryNode[] {
    return this._data().storyNodes.filter(n => n.storyId === storyId);
  }

  getNodeById(id: string): StoredStoryNode | undefined {
    return this._data().storyNodes.find(n => n.id === id);
  }

  getNodeByKey(storyId: string, nodeKey: string): StoredStoryNode | undefined {
    return this._data().storyNodes.find(n => n.storyId === storyId && n.nodeKey === nodeKey);
  }

  getStartNode(storyId: string): StoredStoryNode | undefined {
    return this._data().storyNodes.find(n => n.storyId === storyId && n.isStart);
  }

  createNode(data: Omit<StoredStoryNode, 'id' | 'created' | 'updated'>): StoredStoryNode {
    const node: StoredStoryNode = {
      ...data,
      id: this.generateId(),
      created: this.now(),
      updated: this.now()
    };

    // If this is a start node, clear other start nodes in the same story
    if (node.isStart) {
      this._data.update(d => ({
        ...d,
        storyNodes: d.storyNodes.map(n => 
          n.storyId === node.storyId && n.isStart ? { ...n, isStart: false } : n
        )
      }));
    }

    this._data.update(d => ({
      ...d,
      storyNodes: [...d.storyNodes, node]
    }));
    this.saveToStorage();
    return node;
  }

  updateNode(id: string, updates: Partial<Omit<StoredStoryNode, 'id' | 'created'>>): StoredStoryNode | null {
    let updated: StoredStoryNode | null = null;

    // If setting as start node, clear other start nodes first
    if (updates.isStart) {
      const node = this.getNodeById(id);
      if (node) {
        this._data.update(d => ({
          ...d,
          storyNodes: d.storyNodes.map(n => 
            n.storyId === node.storyId && n.isStart && n.id !== id 
              ? { ...n, isStart: false } 
              : n
          )
        }));
      }
    }

    this._data.update(d => ({
      ...d,
      storyNodes: d.storyNodes.map(n => {
        if (n.id === id) {
          updated = { ...n, ...updates, updated: this.now() };
          return updated;
        }
        return n;
      })
    }));
    this.saveToStorage();
    return updated;
  }

  deleteNode(id: string): void {
    this._data.update(d => ({
      ...d,
      storyNodes: d.storyNodes.filter(n => n.id !== id),
      choices: d.choices.filter(c => c.nodeId !== id)
    }));
    this.saveToStorage();
  }

  // =====================
  // CHOICES
  // =====================

  getChoicesByNodeId(nodeId: string): StoredChoice[] {
    return this._data().choices.filter(c => c.nodeId === nodeId);
  }

  getChoicesByStoryId(storyId: string): StoredChoice[] {
    const nodeIds = this.getNodesByStoryId(storyId).map(n => n.id);
    return this._data().choices.filter(c => nodeIds.includes(c.nodeId));
  }

  getChoiceById(id: string): StoredChoice | undefined {
    return this._data().choices.find(c => c.id === id);
  }

  createChoice(data: Omit<StoredChoice, 'id' | 'created'>): StoredChoice {
    const choice: StoredChoice = {
      ...data,
      id: this.generateId(),
      created: this.now()
    };

    this._data.update(d => ({
      ...d,
      choices: [...d.choices, choice]
    }));
    this.saveToStorage();
    return choice;
  }

  updateChoice(id: string, updates: Partial<Omit<StoredChoice, 'id' | 'created'>>): StoredChoice | null {
    let updated: StoredChoice | null = null;
    this._data.update(d => ({
      ...d,
      choices: d.choices.map(c => {
        if (c.id === id) {
          updated = { ...c, ...updates };
          return updated;
        }
        return c;
      })
    }));
    this.saveToStorage();
    return updated;
  }

  deleteChoice(id: string): void {
    this._data.update(d => ({
      ...d,
      choices: d.choices.filter(c => c.id !== id)
    }));
    this.saveToStorage();
  }

  // =====================
  // STORY EVENTS
  // =====================

  getEventsByStoryId(storyId: string): StoredStoryEvent[] {
    return this._data().events
      .filter(e => e.storyId === storyId)
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
  }

  getLastEvent(storyId: string): StoredStoryEvent | undefined {
    const events = this.getEventsByStoryId(storyId);
    return events[events.length - 1];
  }

  createEvent(data: Omit<StoredStoryEvent, 'id' | 'created'>): StoredStoryEvent {
    const event: StoredStoryEvent = {
      ...data,
      id: this.generateId(),
      created: this.now()
    };

    this._data.update(d => ({
      ...d,
      events: [...d.events, event]
    }));
    this.saveToStorage();
    return event;
  }

  clearEventsForStory(storyId: string): void {
    this._data.update(d => ({
      ...d,
      events: d.events.filter(e => e.storyId !== storyId)
    }));
    this.saveToStorage();
  }

  // =====================
  // CARD DECKS & EMOTION CARDS
  // =====================

  getCardDecks(storyId?: string): StoredCardDeck[] {
    return this._data().cardDecks.filter(d => 
      d.isGlobal || d.storyId === storyId
    );
  }

  getCardDeckById(id: string): StoredCardDeck | undefined {
    return this._data().cardDecks.find(d => d.id === id);
  }

  getEmotionCardsByDeckId(deckId: string): StoredEmotionCard[] {
    return this._data().emotionCards
      .filter(c => c.deckId === deckId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getGlobalDeck(): StoredCardDeck | undefined {
    return this._data().cardDecks.find(d => d.isGlobal);
  }

  // =====================
  // EXPORT / IMPORT
  // =====================

  exportData(): string {
    return JSON.stringify(this._data(), null, 2);
  }

  importData(json: string): boolean {
    try {
      const data = JSON.parse(json) as AppData;
      // Basic validation
      if (!data.stories || !data.storyNodes || !data.choices || !data.events) {
        throw new Error('Invalid data structure');
      }
      this._data.set(data);
      this.saveToStorage();
      return true;
    } catch (e) {
      console.error('Failed to import data:', e);
      return false;
    }
  }

  /** Clear all data (for testing) */
  clearAll(): void {
    this._data.set(this.emptyData());
    this.saveToStorage();
    this.seedDefaultCards();
  }
}
