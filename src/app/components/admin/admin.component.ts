import { Component, signal, inject, OnInit, computed, viewChild, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdminStoryService, StoryNodeRecord, ChoiceRecord, StoryRecord } from '../../services/admin-story.service';
import { AuthService } from '../../services/auth.service';
import { NodeEditorComponent } from './node-editor/node-editor.component';
import { StoryGraphComponent } from './story-graph/story-graph.component';

type ViewMode = 'graph' | 'list';
type EditorMode = 'closed' | 'create' | 'edit';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, CommonModule, NodeEditorComponent, StoryGraphComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  readonly storyService = inject(AdminStoryService);
  readonly authService = inject(AuthService);

  readonly graphComponent = viewChild(StoryGraphComponent);

  // Story management
  readonly showCreateStoryDialog = signal(false);
  readonly newStoryName = signal('');
  readonly newStoryDescription = signal('');

  // View state
  readonly viewMode = signal<ViewMode>('graph');
  readonly editorMode = signal<EditorMode>('closed');
  readonly selectedNodeId = signal<string | null>(null);
  readonly searchQuery = signal('');

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
    complete: this.storyService.nodes().filter(n => !n.pending && n.text && n.text !== '<!-- Placeholder node - add content -->').length,
    dummy: this.storyService.dummyNodeCount(),
    hasStart: !!this.storyService.startNode()
  }));

  // When true, only allow creating the start node (only after loading is complete)
  readonly requiresStartNode = computed(() => 
    !this.storyService.loading() && !this.stats().hasStart
  );

  constructor() {
    // Auto-open editor when start node is required
    effect(() => {
      if (this.requiresStartNode()) {
        this.editorMode.set('create');
        this.selectedNodeId.set(null);
      }
    });
  }

  ngOnInit(): void {
    // Load available stories on init
    this.storyService.loadStories();
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

  backToStories(): void {
    this.storyService.clearStorySelection();
    this.closeEditor();
  }

  openCreateStoryDialog(): void {
    this.newStoryName.set('');
    this.newStoryDescription.set('');
    this.showCreateStoryDialog.set(true);
  }

  closeCreateStoryDialog(): void {
    this.showCreateStoryDialog.set(false);
  }

  async createStory(): Promise<void> {
    const name = this.newStoryName().trim();
    const description = this.newStoryDescription().trim();
    
    if (!name) return;

    const story = await this.storyService.createStory(name, description);
    if (story) {
      this.closeCreateStoryDialog();
      await this.selectStory(story);
    }
  }

  // View toggle
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Node selection
  selectNode(nodeId: string): void {
    if (this.requiresStartNode()) return;
    this.selectedNodeId.set(nodeId);
    this.editorMode.set('edit');
    
    // Sync graph selection
    const graph = this.graphComponent();
    if (graph && this.viewMode() === 'graph') {
      graph.selectNode(nodeId);
    }
  }

  onGraphNodeSelected(nodeId: string): void {
    if (this.requiresStartNode()) return;
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
    if (node.pending || !node.text || node.text === '<!-- Placeholder node - add content -->') return 'dummy';
    return 'complete';
  }

  getChoiceCount(nodeId: string): number {
    return this.storyService.choices().filter(c => c.node_id === nodeId).length;
  }
}
