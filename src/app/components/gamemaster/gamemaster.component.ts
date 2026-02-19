import { Component, signal, inject, OnInit, computed, viewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { GamemasterStoryService, StoryNodeRecord, ChoiceRecord, StoryRecord, StoryEventRecord } from '../../services/gamemaster-story.service';
import { AuthService } from '../../services/auth.service';
import { SharedStoryService } from '../../services/shared-story.service';
import { NodeEditorComponent } from './node-editor/node-editor.component';
import { StoryGraphComponent } from './story-graph/story-graph.component';

type ViewMode = 'graph' | 'list' | 'history';
type EditorMode = 'closed' | 'create' | 'edit';
type SortOption = 'newest' | 'oldest' | 'alphabetical';
type WizardStep = 'meta' | 'startNode' | null;

/** Data for the story creation wizard */
interface WizardStoryMeta {
  name: string;
  description: string;
}

interface WizardStartNode {
  title: string;
  text: string;
}

@Component({
  selector: 'app-gamemaster',
  standalone: true,
  imports: [FormsModule, CommonModule, NodeEditorComponent, StoryGraphComponent],
  templateUrl: './gamemaster.component.html',
  styleUrl: './gamemaster.component.scss'
})
export class GamemasterComponent implements OnInit {
  readonly storyService = inject(GamemasterStoryService);
  readonly authService = inject(AuthService);
  private readonly sharedStoryService = inject(SharedStoryService);

  readonly graphComponent = viewChild(StoryGraphComponent);
  @ViewChildren('storyCard') storyCards!: QueryList<ElementRef<HTMLElement>>;

  // Story creation wizard state
  readonly wizardStep = signal<WizardStep>(null);
  readonly wizardStoryMeta = signal<WizardStoryMeta>({ name: '', description: '' });
  readonly wizardStartNode = signal<WizardStartNode>({ title: '', text: '' });
  readonly wizardShowPreview = signal(false);

  // Story selection state (search, sort, keyboard nav)
  readonly storySearchQuery = signal('');
  readonly storySortOption = signal<SortOption>('newest');
  readonly storyFocusedIndex = signal(0);

  // View state
  readonly viewMode = signal<ViewMode>('graph');
  readonly editorMode = signal<EditorMode>('closed');
  readonly selectedNodeId = signal<string | null>(null);
  readonly searchQuery = signal('');

  // Computed: filtered and sorted stories
  readonly filteredStories = computed(() => {
    const query = this.storySearchQuery().toLowerCase().trim();
    const sort = this.storySortOption();
    let result = [...this.storyService.stories()];

    // Filter by search query
    if (query) {
      result = result.filter(story =>
        (story.name && story.name.toLowerCase().includes(query)) ||
        (story.description && story.description.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sort) {
      case 'newest':
        result.sort((a, b) => new Date(b['created'] as string).getTime() - new Date(a['created'] as string).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a['created'] as string).getTime() - new Date(b['created'] as string).getTime());
        break;
      case 'alphabetical':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }

    return result;
  });

  // Computed values
  readonly selectedNode = computed(() => {
    const id = this.selectedNodeId();
    return id ? this.storyService.getNodeById(id) : null;
  });

  readonly selectedNodeChoices = computed(() => {
    const id = this.selectedNodeId();
    if (!id) return [];
    return this.storyService.choices().filter(c => c.node_id === id);
  });

  readonly filteredNodes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const nodes = this.storyService.nodes();
    
    if (!query) return nodes;
    
    return nodes.filter(node => 
      node.node_key.toLowerCase().includes(query) ||
      (node.title && node.title.toLowerCase().includes(query))
    );
  });

  readonly stats = computed(() => ({
    total: this.storyService.nodes().length,
    complete: this.storyService.nodes().filter(n => n.text && !this.storyService.isPlaceholderText(n.text)).length,
    dummy: this.storyService.dummyNodeCount(),
    hasStart: !!this.storyService.startNode()
  }));

  /** Story events in reverse chronological order (newest first) */
  readonly reversedEvents = computed(() => {
    return [...this.storyService.events()].reverse();
  });

  /** Check if wizard can proceed to next step */
  readonly canProceedToStartNode = computed(() => 
    this.wizardStoryMeta().name.trim().length > 0
  );

  /** Check if wizard can create the story */
  readonly canCreateStory = computed(() => {
    const startNode = this.wizardStartNode();
    return startNode.text.trim().length > 0 && !this.storyService.isPlaceholderText(startNode.text);
  });

  /** Preview of rendered markdown content */
  readonly wizardRenderedContent = computed(() => {
    const text = this.wizardStartNode().text;
    if (!text) return '';
    try {
      return marked.parse(text) as string;
    } catch {
      return text;
    }
  });

  constructor() {
    // No auto-effects needed - wizard handles story creation flow
  }

  ngOnInit(): void {
    // Load available stories on init
    this.storyService.loadStories();
    
    // If SharedStoryService has a story selected, load it
    const sharedStoryId = this.sharedStoryService.getCurrentStoryId();
    if (sharedStoryId && !this.storyService.currentStory()) {
      this.storyService.selectStory(sharedStoryId);
    }
  }

  // Story selection
  async selectStory(story: StoryRecord): Promise<void> {
    console.log('selectStory clicked, story:', story);
    console.log('story.id:', story.id, 'story.name:', story.name);
    
    if (!story.id) {
      console.error('Story has no ID!');
      alert('Error: Story has no ID');
      return;
    }
    
    try {
      await this.storyService.selectStory(story.id);
    } catch (e) {
      console.error('selectStory error:', e);
      alert('Error selecting story: ' + (e instanceof Error ? e.message : e));
    }
  }

  /** Handle keyboard navigation within the story grid */
  onStoryGridKeydown(event: KeyboardEvent): void {
    const stories = this.filteredStories();
    if (stories.length === 0) return;

    const currentIndex = this.storyFocusedIndex();
    let newIndex = currentIndex;

    // Calculate grid columns based on card positions
    const cards = this.storyCards?.toArray();
    if (!cards || cards.length === 0) return;
    
    let cols = 1;
    if (cards.length >= 2) {
      const firstTop = cards[0].nativeElement.getBoundingClientRect().top;
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].nativeElement.getBoundingClientRect().top === firstTop) {
          cols = i + 1;
        } else {
          break;
        }
      }
    }

    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(currentIndex + 1, stories.length - 1);
        event.preventDefault();
        break;
      case 'ArrowLeft':
        newIndex = Math.max(currentIndex - 1, 0);
        event.preventDefault();
        break;
      case 'ArrowDown':
        newIndex = Math.min(currentIndex + cols, stories.length - 1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        newIndex = Math.max(currentIndex - cols, 0);
        event.preventDefault();
        break;
      case 'Home':
        newIndex = 0;
        event.preventDefault();
        break;
      case 'End':
        newIndex = stories.length - 1;
        event.preventDefault();
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      this.storyFocusedIndex.set(newIndex);
      cards[newIndex]?.nativeElement.focus();
    }
  }

  backToStories(): void {
    this.storyService.clearStorySelection();
    this.closeEditor();
  }

  // =====================
  // STORY CREATION WIZARD
  // =====================

  /** Open the story creation wizard */
  openCreateWizard(): void {
    this.wizardStoryMeta.set({ name: '', description: '' });
    this.wizardStartNode.set({ title: '', text: '' });
    this.wizardShowPreview.set(false);
    this.wizardStep.set('meta');
  }

  /** Close the wizard and reset state */
  closeCreateWizard(): void {
    this.wizardStep.set(null);
  }

  /** Move from meta step to start node step */
  wizardGoToStartNode(): void {
    if (this.canProceedToStartNode()) {
      this.wizardStep.set('startNode');
    }
  }

  /** Go back from start node step to meta step */
  wizardGoBackToMeta(): void {
    this.wizardStep.set('meta');
  }

  /** Toggle markdown preview in wizard */
  wizardTogglePreview(): void {
    this.wizardShowPreview.update(v => !v);
  }

  /** Update wizard story meta fields */
  updateWizardMeta(field: 'name' | 'description', value: string): void {
    this.wizardStoryMeta.update(meta => ({ ...meta, [field]: value }));
  }

  /** Update wizard start node fields */
  updateWizardStartNode(field: 'title' | 'text', value: string): void {
    this.wizardStartNode.update(node => ({ ...node, [field]: value }));
  }

  /** Create story with start node atomically */
  async createStoryWithStartNode(): Promise<void> {
    if (!this.canCreateStory()) return;

    const meta = this.wizardStoryMeta();
    const startNode = this.wizardStartNode();

    const story = await this.storyService.createStoryWithStartNode(
      meta.name.trim(),
      meta.description.trim(),
      {
        title: startNode.title.trim(),
        text: startNode.text
      }
    );

    if (story) {
      this.closeCreateWizard();
      await this.selectStory(story);
    }
  }

  // View toggle
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Node selection
  selectNode(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    this.editorMode.set('edit');
    
    // Sync graph selection
    const graph = this.graphComponent();
    if (graph && this.viewMode() === 'graph') {
      graph.selectNode(nodeId);
    }
  }

  onGraphNodeSelected(nodeId: string): void {
    this.selectedNodeId.set(nodeId);
    this.editorMode.set('edit');
  }

  // Editor actions
  openCreateEditor(): void {
    this.selectedNodeId.set(null);
    this.editorMode.set('create');
  }

  closeEditor(): void {
    this.editorMode.set('closed');
    this.selectedNodeId.set(null);
  }

  onNodeSaved(node: StoryNodeRecord): void {
    // Refresh graph after save
    this.storyService.loadAll();
  }

  // Node actions
  async deleteNode(node: StoryNodeRecord): Promise<void> {
    if (!confirm(`Delete node "${node.node_key}"? This will also delete all its choices.`)) {
      return;
    }

    const success = await this.storyService.deleteNode(node.id);
    if (success) {
      this.closeEditor();
    }
  }

  async setAsStart(node: StoryNodeRecord): Promise<void> {
    await this.storyService.setStartNode(node.id);
  }

  // Helper for node status
  getNodeStatus(node: StoryNodeRecord): 'start' | 'complete' | 'dummy' {
    if (node.is_start) return 'start';
    if (!node.text || this.storyService.isPlaceholderText(node.text)) return 'dummy';
    return 'complete';
  }

  // History helpers
  formatEventTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async clearHistory(): Promise<void> {
    if (!confirm('Clear all player history for this story? This cannot be undone.')) {
      return;
    }
    await this.storyService.clearStoryHistory();
  }

  navigateToEventNode(event: StoryEventRecord): void {
    // Find the node by nodeKey and select it
    const node = this.storyService.nodes().find(n => n.node_key === event.nodeKey);
    if (node) {
      this.viewMode.set('graph');
      this.selectNode(node.id);
    }
  }
  getChoiceCount(nodeId: string): number {
    return this.storyService.choices().filter(c => c.node_id === nodeId).length;
  }
}
