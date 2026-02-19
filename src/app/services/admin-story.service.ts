import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalStorageService, StoredStory, StoredStoryNode, StoredChoice } from './local-storage.service';
import { InteractionType, DiceConfig } from '../models/story.model';

/**
 * Record interface for stories (compatible with existing components)
 */
export interface StoryRecord {
  id: string;
  collectionId?: string;
  collectionName?: string;
  name: string;
  description: string;
  owner_id: string;
  is_published: boolean;
  cover_image: string;
  created: string;
  updated: string;
}

/**
 * Record interface for story nodes (compatible with existing components)
 */
export interface StoryNodeRecord {
  id: string;
  collectionId?: string;
  collectionName?: string;
  story_id: string;
  node_key: string;
  title: string;
  text: string;
  media: MediaItem[] | null;
  pending: boolean;
  is_start: boolean;
  interaction_type: InteractionType | null;
  dice_config: DiceConfig | null;
  card_deck_id: string | null;
  created: string;
  updated: string;
}

/**
 * Record interface for choices (compatible with existing components)
 */
export interface ChoiceRecord {
  id: string;
  collectionId?: string;
  collectionName?: string;
  node_id: string;
  text: string;
  next_node: string;
  created: string;
}

/**
 * Media item structure for story nodes
 */
export interface MediaItem {
  type: 'image' | 'audio';
  url: string;
  alt?: string;
}

/**
 * Form data for creating/updating story nodes
 */
export interface StoryNodeFormData {
  story_id: string;
  node_key: string;
  title?: string;
  text: string;
  media?: MediaItem[];
  pending?: boolean;
  is_start?: boolean;
  interaction_type?: InteractionType;
  dice_config?: DiceConfig;
  card_deck_id?: string;
}

/**
 * Form data for creating/updating choices
 */
export interface ChoiceFormData {
  node_id: string;
  text: string;
  next_node: string;
}

/**
 * Story node with its choices for display
 */
export interface StoryNodeWithChoices {
  node: StoryNodeRecord;
  choices: ChoiceRecord[];
}

/**
 * Service for managing story content in the admin panel
 * Uses LocalStorage for persistence (no backend required)
 */

/** Placeholder text used for dummy/incomplete nodes */
export const PLACEHOLDER_TEXT = '<!-- Placeholder node - add content -->';

@Injectable({
  providedIn: 'root'
})
export class AdminStoryService {
  private readonly storage = inject(LocalStorageService);

  // Current story context
  private _currentStory = signal<StoryRecord | null>(null);
  private _stories = signal<StoryRecord[]>([]);

  // Reactive state
  private _nodes = signal<StoryNodeRecord[]>([]);
  private _choices = signal<ChoiceRecord[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly currentStory = this._currentStory.asReadonly();
  readonly stories = this._stories.asReadonly();
  readonly nodes = this._nodes.asReadonly();
  readonly choices = this._choices.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Get the current start node */
  readonly startNode = computed(() => 
    this._nodes().find(n => n.is_start) ?? null
  );

  /** Get all nodes with their choices */
  readonly nodesWithChoices = computed<StoryNodeWithChoices[]>(() => {
    const allChoices = this._choices();
    return this._nodes().map(node => ({
      node,
      choices: allChoices.filter(c => c.node_id === node.id)
    }));
  });

  /** Get count of dummy/placeholder nodes */
  readonly dummyNodeCount = computed(() =>
    this._nodes().filter(n => n.pending || !n.text || this.isPlaceholderText(n.text)).length
  );

  /**
   * Check if text is a placeholder/dummy value
   */
  isPlaceholderText(text: string): boolean {
    return text === PLACEHOLDER_TEXT || text === '<!-- Add your story content here -->';
  }

  // =====================
  // STORY OPERATIONS
  // =====================

  /**
   * Convert stored story to record format
   */
  private toStoryRecord(s: StoredStory): StoryRecord {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      owner_id: 'local-gamemaster',
      is_published: s.isPublished,
      cover_image: s.coverImage,
      created: s.created,
      updated: s.updated
    };
  }

  /**
   * Convert stored node to record format
   */
  private toNodeRecord(n: StoredStoryNode): StoryNodeRecord {
    return {
      id: n.id,
      story_id: n.storyId,
      node_key: n.nodeKey,
      title: n.title,
      text: n.text,
      media: n.media ? [n.media] : null,
      pending: n.pending,
      is_start: n.isStart,
      interaction_type: n.interactionType,
      dice_config: n.diceConfig,
      card_deck_id: n.cardDeckId,
      created: n.created,
      updated: n.updated
    };
  }

  /**
   * Convert stored choice to record format
   */
  private toChoiceRecord(c: StoredChoice): ChoiceRecord {
    return {
      id: c.id,
      node_id: c.nodeId,
      text: c.text,
      next_node: c.nextNode,
      created: c.created
    };
  }

  /**
   * Load all available stories
   */
  async loadStories(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('loadStories: fetching from localStorage...');
      const stories = this.storage.getStories().map(s => this.toStoryRecord(s));
      console.log('loadStories: received', stories.length, 'stories');
      this._stories.set(stories);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load stories';
      console.error('AdminStoryService.loadStories error:', e);
      this._error.set(message);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Select a story to work with
   */
  async selectStory(storyId: string): Promise<void> {
    console.log('AdminStoryService.selectStory called with id:', storyId);
    try {
      const stored = this.storage.getStoryById(storyId);
      if (!stored) {
        throw new Error('Story not found');
      }
      const story = this.toStoryRecord(stored);
      console.log('Fetched story for selection:', story);
      this._currentStory.set(story);
      await this.loadAll();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to select story';
      this._error.set(message);
      console.error('AdminStoryService.selectStory error:', e);
    }
  }

  /**
   * Create a new story with its mandatory start node atomically.
   * A story cannot exist without a start node - this method ensures both are created together.
   */
  async createStoryWithStartNode(
    name: string,
    description: string,
    startNodeData: { title: string; text: string }
  ): Promise<StoryRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    console.log('createStoryWithStartNode called with name:', name);

    try {
      // Validate start node content
      if (!startNodeData.text.trim() || this.isPlaceholderText(startNodeData.text)) {
        throw new Error('Start node content is required');
      }

      // Create the story
      const storedStory = this.storage.createStory(name, description);
      const story = this.toStoryRecord(storedStory);

      console.log('Created story:', story);

      // Create complete (non-pending) start node
      this.storage.createNode({
        storyId: story.id,
        nodeKey: 'start',
        title: startNodeData.title || 'Beginning',
        text: startNodeData.text,
        media: null,
        pending: false,  // Not pending - has real content
        isStart: true,
        interactionType: null,
        diceConfig: null,
        cardDeckId: null
      });

      console.log('Created start node for story:', story.id);

      this._stories.update(list => [story, ...list]);
      this._error.set(null);
      return story;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create story';
      this._error.set(message);
      console.error('AdminStoryService.createStoryWithStartNode error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * @deprecated Use createStoryWithStartNode instead.
   * Creates a story without a start node - should not be used in the normal flow.
   */
  async createStory(name: string, description?: string): Promise<StoryRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    console.log('[DEPRECATED] createStory called - use createStoryWithStartNode instead');

    try {
      const stored = this.storage.createStory(name, description || '');
      const story = this.toStoryRecord(stored);

      this._stories.update(list => [story, ...list]);
      this._error.set(null);
      return story;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create story';
      this._error.set(message);
      console.error('AdminStoryService.createStory error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Clear story selection
   */
  clearStorySelection(): void {
    this._currentStory.set(null);
    this._nodes.set([]);
    this._choices.set([]);
  }

  // =====================
  // FETCH OPERATIONS
  // =====================

  /**
   * Load all story nodes and choices for the current story
   */
  async loadAll(): Promise<void> {
    const storyId = this._currentStory()?.id;
    if (!storyId) {
      this._error.set('No story selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const nodes = this.storage.getNodesByStoryId(storyId).map(n => this.toNodeRecord(n));
      const choices = this.storage.getChoicesByStoryId(storyId).map(c => this.toChoiceRecord(c));

      this._nodes.set(nodes);
      this._choices.set(choices);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load story data';
      this._error.set(message);
      console.error('AdminStoryService.loadAll error:', e);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Get a single node by its node_key
   */
  async getNodeByKey(nodeKey: string): Promise<StoryNodeRecord | null> {
    const storyId = this._currentStory()?.id;
    if (!storyId) return null;
    
    const stored = this.storage.getNodeByKey(storyId, nodeKey);
    return stored ? this.toNodeRecord(stored) : null;
  }

  /**
   * Get choices for a specific node
   */
  async getChoicesForNode(nodeId: string): Promise<ChoiceRecord[]> {
    return this.storage.getChoicesByNodeId(nodeId).map(c => this.toChoiceRecord(c));
  }

  // =====================
  // NODE OPERATIONS
  // =====================

  /**
   * Create a new story node
   */
  async createNode(data: StoryNodeFormData): Promise<StoryNodeRecord | null> {
    const storyId = this._currentStory()?.id;
    if (!storyId) {
      this._error.set('No story selected');
      return null;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const stored = this.storage.createNode({
        storyId: storyId,
        nodeKey: data.node_key,
        title: data.title || '',
        text: data.text,
        media: data.media?.[0] || null,
        pending: data.pending ?? false,
        isStart: data.is_start ?? false,
        interactionType: data.interaction_type || null,
        diceConfig: data.dice_config || null,
        cardDeckId: data.card_deck_id || null
      });

      const node = this.toNodeRecord(stored);
      this._nodes.update(nodes => [...nodes, node]);
      return node;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create node';
      this._error.set(message);
      console.error('AdminStoryService.createNode error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Create a dummy/placeholder node with just the node_key
   */
  async createDummyNode(nodeKey: string): Promise<StoryNodeRecord | null> {
    const storyId = this._currentStory()?.id;
    if (!storyId) return null;

    return this.createNode({
      story_id: storyId,
      node_key: nodeKey,
      title: '',
      text: PLACEHOLDER_TEXT,
      pending: true
    });
  }

  /**
   * Update an existing story node
   */
  async updateNode(id: string, data: Partial<StoryNodeFormData>): Promise<StoryNodeRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Map form data to storage format
      const updates: any = {};
      if (data.node_key !== undefined) updates.nodeKey = data.node_key;
      if (data.title !== undefined) updates.title = data.title;
      if (data.text !== undefined) updates.text = data.text;
      if (data.media !== undefined) updates.media = data.media?.[0] || null;
      if (data.pending !== undefined) updates.pending = data.pending;
      if (data.is_start !== undefined) updates.isStart = data.is_start;
      if (data.interaction_type !== undefined) updates.interactionType = data.interaction_type;
      if (data.dice_config !== undefined) updates.diceConfig = data.dice_config;
      if (data.card_deck_id !== undefined) updates.cardDeckId = data.card_deck_id;

      const stored = this.storage.updateNode(id, updates);
      if (!stored) {
        throw new Error('Node not found');
      }

      const node = this.toNodeRecord(stored);
      this._nodes.update(nodes => 
        nodes.map(n => n.id === id ? node : n)
      );
      return node;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update node';
      this._error.set(message);
      console.error('AdminStoryService.updateNode error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Delete a story node and its associated choices
   */
  async deleteNode(id: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      this.storage.deleteNode(id);

      // Update local state (choices cascade delete on server)
      this._nodes.update(nodes => nodes.filter(n => n.id !== id));
      this._choices.update(choices => choices.filter(c => c.node_id !== id));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete node';
      this._error.set(message);
      console.error('AdminStoryService.deleteNode error:', e);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Set a node as the story start point
   */
  async setStartNode(nodeId: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Set new start node (storage handles clearing old start automatically)
      const stored = this.storage.updateNode(nodeId, { isStart: true });
      if (!stored) {
        throw new Error('Node not found');
      }

      const node = this.toNodeRecord(stored);
      this._nodes.update(nodes => 
        nodes.map(n => n.id === nodeId ? node : { ...n, is_start: false })
      );
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to set start node';
      this._error.set(message);
      console.error('AdminStoryService.setStartNode error:', e);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  // =====================
  // CHOICE OPERATIONS
  // =====================

  /**
   * Create a new choice for a node
   * Automatically creates dummy target node if next_node doesn't exist
   */
  async createChoice(data: ChoiceFormData): Promise<ChoiceRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // Check if target node exists, create dummy if not
      const targetExists = this._nodes().some(n => n.node_key === data.next_node);
      if (!targetExists) {
        await this.createDummyNode(data.next_node);
      }

      const stored = this.storage.createChoice({
        nodeId: data.node_id,
        text: data.text,
        nextNode: data.next_node
      });

      const choice = this.toChoiceRecord(stored);
      this._choices.update(choices => [...choices, choice]);
      return choice;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create choice';
      this._error.set(message);
      console.error('AdminStoryService.createChoice error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update an existing choice
   */
  async updateChoice(id: string, data: Partial<ChoiceFormData>): Promise<ChoiceRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // If updating next_node, check if target exists
      if (data.next_node) {
        const targetExists = this._nodes().some(n => n.node_key === data.next_node);
        if (!targetExists) {
          await this.createDummyNode(data.next_node);
        }
      }

      // Map form data to storage format
      const updates: any = {};
      if (data.node_id !== undefined) updates.nodeId = data.node_id;
      if (data.text !== undefined) updates.text = data.text;
      if (data.next_node !== undefined) updates.nextNode = data.next_node;

      const stored = this.storage.updateChoice(id, updates);
      if (!stored) {
        throw new Error('Choice not found');
      }

      const choice = this.toChoiceRecord(stored);
      this._choices.update(choices => 
        choices.map(c => c.id === id ? choice : c)
      );
      return choice;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update choice';
      this._error.set(message);
      console.error('AdminStoryService.updateChoice error:', e);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Delete a choice
   */
  async deleteChoice(id: string): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);

    try {
      this.storage.deleteChoice(id);

      // Update local state
      this._choices.update(choices => choices.filter(c => c.id !== id));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete choice';
      this._error.set(message);
      console.error('AdminStoryService.deleteChoice error:', e);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  // =====================
  // UTILITY
  // =====================

  /**
   * Check if a node_key already exists
   */
  nodeKeyExists(nodeKey: string): boolean {
    return this._nodes().some(n => n.node_key === nodeKey);
  }

  /**
   * Get a node by its ID
   */
  getNodeById(id: string): StoryNodeRecord | undefined {
    return this._nodes().find(n => n.id === id);
  }

  /**
   * Get a node by its node_key
   */
  getNodeByNodeKey(nodeKey: string): StoryNodeRecord | undefined {
    return this._nodes().find(n => n.node_key === nodeKey);
  }

  /**
   * Clear any error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
