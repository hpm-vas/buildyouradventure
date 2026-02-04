import { Injectable, inject, signal, computed } from '@angular/core';
import { RecordModel } from 'pocketbase';
import { PocketBaseService } from './pocketbase.service';

/**
 * PocketBase record interface for story nodes
 */
export interface StoryNodeRecord extends RecordModel {
  node_key: string;
  title: string;
  text: string;
  media: MediaItem[] | null;
  pending: boolean;
  is_start: boolean;
}

/**
 * PocketBase record interface for choices
 */
export interface ChoiceRecord extends RecordModel {
  node_id: string;
  text: string;
  next_node: string;
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
  node_key: string;
  title?: string;
  text: string;
  media?: MediaItem[];
  pending?: boolean;
  is_start?: boolean;
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
 * Provides CRUD operations for story_nodes and choices collections
 */
@Injectable({
  providedIn: 'root'
})
export class AdminStoryService {
  private readonly pb = inject(PocketBaseService);

  // Reactive state
  private _nodes = signal<StoryNodeRecord[]>([]);
  private _choices = signal<ChoiceRecord[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

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
    this._nodes().filter(n => n.pending || !n.text).length
  );

  // =====================
  // FETCH OPERATIONS
  // =====================

  /**
   * Load all story nodes and choices from the database
   */
  async loadAll(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const [nodes, choices] = await Promise.all([
        this.pb.collection<StoryNodeRecord>('story_nodes').getFullList({
          sort: 'node_key'
        }),
        this.pb.collection<ChoiceRecord>('choices').getFullList({
          sort: 'created'
        })
      ]);

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
    try {
      const result = await this.pb.collection<StoryNodeRecord>('story_nodes').getFirstListItem(
        `node_key = "${nodeKey}"`
      );
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get choices for a specific node
   */
  async getChoicesForNode(nodeId: string): Promise<ChoiceRecord[]> {
    try {
      return await this.pb.collection<ChoiceRecord>('choices').getFullList({
        filter: `node_id = "${nodeId}"`,
        sort: 'created'
      });
    } catch {
      return [];
    }
  }

  // =====================
  // NODE OPERATIONS
  // =====================

  /**
   * Create a new story node
   */
  async createNode(data: StoryNodeFormData): Promise<StoryNodeRecord | null> {
    this._loading.set(true);
    this._error.set(null);

    try {
      // If marking as start, clear existing start node first
      if (data.is_start) {
        await this.clearStartNode();
      }

      const node = await this.pb.collection<StoryNodeRecord>('story_nodes').create({
        node_key: data.node_key,
        title: data.title || '',
        text: data.text,
        media: data.media || null,
        pending: data.pending ?? false,
        is_start: data.is_start ?? false
      });

      // Update local state
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
    return this.createNode({
      node_key: nodeKey,
      title: '',
      text: '<!-- Placeholder node - add content -->',
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
      // If marking as start, clear existing start node first
      if (data.is_start) {
        await this.clearStartNode();
      }

      const node = await this.pb.collection<StoryNodeRecord>('story_nodes').update(id, data);

      // Update local state
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
      await this.pb.collection<StoryNodeRecord>('story_nodes').delete(id);

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
      // Clear existing start node
      await this.clearStartNode();

      // Set new start node
      const node = await this.pb.collection<StoryNodeRecord>('story_nodes').update(nodeId, {
        is_start: true
      });

      // Update local state
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

  /**
   * Clear the is_start flag from the current start node
   */
  private async clearStartNode(): Promise<void> {
    const currentStart = this._nodes().find(n => n.is_start);
    if (currentStart) {
      await this.pb.collection<StoryNodeRecord>('story_nodes').update(currentStart.id, {
        is_start: false
      });
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

      const choice = await this.pb.collection<ChoiceRecord>('choices').create({
        node_id: data.node_id,
        text: data.text,
        next_node: data.next_node
      });

      // Update local state
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

      const choice = await this.pb.collection<ChoiceRecord>('choices').update(id, data);

      // Update local state
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
      await this.pb.collection<ChoiceRecord>('choices').delete(id);

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
