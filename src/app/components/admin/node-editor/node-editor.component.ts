import { Component, inject, signal, computed, input, output, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { AdminStoryService, StoryNodeRecord, ChoiceRecord, StoryNodeFormData } from '../../../services/admin-story.service';

interface EditableChoice {
  id?: string;
  text: string;
  next_node: string;
  isNew?: boolean;
  useCustomTarget?: boolean; // When true, shows text input instead of dropdown
}

type EditorMode = 'create' | 'edit' | 'start';

/**
 * Component for editing story node content and choices
 * Supports Markdown editing with toggle preview
 */
@Component({
  selector: 'app-node-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="node-editor">
      <header class="editor-header">
        <h3>{{ editorTitle() }}</h3>
        <div class="header-actions">
          @if (!isNewNode() && !forceStartNode()) {
            <button 
              type="button"
              class="btn-icon"
              [class.active]="selectedNode()?.is_start"
              [disabled]="selectedNode()?.is_start"
              (click)="setAsStart()"
              title="Set as story start"
            >
              ⭐
            </button>
            <button 
              type="button"
              class="btn-icon btn-danger"
              [disabled]="!canDelete()"
              [title]="canDelete() ? 'Delete this node' : deleteBlockedReason()"
              (click)="onDeleteNode()"
            >
              🗑️
            </button>
          }
          @if (!forceStartNode()) {
            <button type="button" class="btn-secondary" (click)="close.emit()">✕</button>
          }
        </div>
      </header>

      <form class="editor-form" (ngSubmit)="save()">
        <!-- Node Key -->
        <div class="form-group">
          <label for="nodeKey">Node Key</label>
          <input 
            type="text" 
            id="nodeKey"
            [(ngModel)]="formData.node_key"
            name="nodeKey"
            pattern="^[a-z0-9-]+$"
            [disabled]="!isNewNode()"
            placeholder="e.g., prolog-1, forest-clearing"
            required
          />
          <small class="hint">Lowercase letters, numbers, and hyphens only</small>
        </div>

        <!-- Title -->
        <div class="form-group">
          <label for="title">Title (optional)</label>
          <input 
            type="text" 
            id="title"
            [(ngModel)]="formData.title"
            name="title"
            placeholder="Display title for this node"
          />
        </div>

        <!-- Content with Markdown toggle -->
        <div class="form-group content-group">
          <div class="content-header">
            <label for="content">Content (Markdown)</label>
            <button 
              type="button" 
              class="btn-toggle"
              (click)="togglePreview()"
            >
              {{ showPreview() ? '✏️ Edit' : '👁️ Preview' }}
            </button>
          </div>
          
          @if (showPreview()) {
            <div class="markdown-preview" [innerHTML]="renderedContent()"></div>
          } @else {
            <textarea 
              id="content"
              [(ngModel)]="formData.text"
              name="content"
              rows="12"
              placeholder="Write your story content in Markdown..."
              required
            ></textarea>
          }
        </div>

        <!-- Choices Section -->
        <div class="choices-section">
          <div class="section-header">
            <h4>Choices</h4>
            <button type="button" class="btn-small" (click)="addChoice()">+ Add Choice</button>
          </div>

          @for (choice of editableChoices(); track choice.id ?? $index) {
            <div class="choice-row">
              <input 
                type="text"
                [(ngModel)]="choice.text"
                [name]="'choiceText' + $index"
                placeholder="Choice text..."
                class="choice-text"
              />
              <div class="choice-target-wrapper">
                @if (choice.useCustomTarget) {
                  <input 
                    type="text"
                    [(ngModel)]="choice.next_node"
                    [name]="'choiceNextNode' + $index"
                    placeholder="new-node-key"
                    pattern="^[a-z0-9-]+$"
                    class="choice-target"
                  />
                  <button 
                    type="button" 
                    class="btn-icon btn-small-icon"
                    (click)="toggleCustomTarget($index, false)"
                    title="Select existing node"
                  >
                    📋
                  </button>
                } @else {
                  <select
                    [(ngModel)]="choice.next_node"
                    [name]="'choiceNextNode' + $index"
                    class="choice-target-select"
                    (ngModelChange)="onTargetNodeChange($index, $event)"
                  >
                    <option value="" disabled>Select target node...</option>
                    @for (node of availableNodes(); track node.node_key) {
                      <option [value]="node.node_key">
                        {{ node.node_key }}{{ node.title ? ' (' + node.title + ')' : '' }}
                      </option>
                    }
                    <option value="__new__">+ Create new node...</option>
                  </select>
                }
              </div>
              <button 
                type="button" 
                class="btn-icon btn-danger"
                (click)="removeChoice($index)"
                title="Remove choice"
              >
                🗑️
              </button>
            </div>
          }

          @if (editableChoices().length === 0) {
            <p class="no-choices">No choices yet. This will be an ending node.</p>
          }
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
          <button 
            type="submit" 
            class="btn-primary"
            [disabled]="!isValid() || storyService.loading()"
          >
            {{ storyService.loading() ? 'Saving...' : (isNewNode() ? 'Create Node' : 'Save Changes') }}
          </button>
        </div>

        @if (storyService.error()) {
          <div class="error-message">{{ storyService.error() }}</div>
        }
      </form>

      <!-- New Node Dialog -->
      @if (showNewNodeDialog()) {
        <div class="dialog-overlay" (click)="cancelNewNodeDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <h4>Create New Node</h4>
            <div class="form-group">
              <label for="newNodeKey">Node Key</label>
              <input 
                type="text" 
                id="newNodeKey"
                [(ngModel)]="newNodeKey"
                pattern="^[a-z0-9-]+$"
                placeholder="e.g., forest-path"
                (keyup.enter)="confirmNewNodeDialog()"
              />
              <small class="hint">Lowercase letters, numbers, and hyphens only</small>
            </div>
            <div class="dialog-actions">
              <button type="button" class="btn-secondary" (click)="cancelNewNodeDialog()">Cancel</button>
              <button 
                type="button" 
                class="btn-primary" 
                (click)="confirmNewNodeDialog()"
                [disabled]="!isValidNodeKey(newNodeKey)"
              >
                Create & Connect
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .node-editor {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1.5rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      h3 {
        margin: 0;
        color: #e94560;
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
      }
    }

    .editor-form {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-weight: 500;
        color: #eaeaea;
      }

      input[type="text"], textarea {
        padding: 0.75rem;
        border: 1px solid #333;
        border-radius: 8px;
        background: #16213e;
        color: #eaeaea;
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: #e94560;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      textarea {
        resize: vertical;
        font-family: monospace;
        min-height: 200px;
      }

      .hint {
        color: #888;
        font-size: 0.85rem;
      }
    }

    .content-group {
      flex: 1;
      min-height: 250px;
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-toggle {
      padding: 0.4rem 0.8rem;
      font-size: 0.85rem;
      border: 1px solid #e94560;
      border-radius: 6px;
      background: transparent;
      color: #e94560;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #e94560;
        color: white;
      }
    }

    .markdown-preview {
      flex: 1;
      padding: 1rem;
      border: 1px solid #333;
      border-radius: 8px;
      background: #16213e;
      color: #eaeaea;
      overflow-y: auto;
      min-height: 200px;

      h1, h2, h3, h4 { color: #e94560; }
      a { color: #4da6ff; }
      code { background: #0f3460; padding: 0.2em 0.4em; border-radius: 4px; }
      pre { background: #0f3460; padding: 1rem; border-radius: 8px; overflow-x: auto; }
      blockquote { border-left: 3px solid #e94560; padding-left: 1rem; color: #aaa; }
    }

    .checkbox-group {
      flex-direction: row;
      align-items: center;

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }

    .choices-section {
      border-top: 1px solid #333;
      padding-top: 1rem;

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;

        h4 {
          margin: 0;
          color: #eaeaea;
        }
      }

      .btn-small {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        border: none;
        border-radius: 6px;
        background: #0f3460;
        color: #eaeaea;
        cursor: pointer;

        &:hover {
          background: #1a4a7a;
        }
      }
    }

    .choice-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;

      .choice-text {
        flex: 2;
      }

      .choice-target-wrapper {
        flex: 1;
        display: flex;
        gap: 0.25rem;
      }

      .choice-target {
        flex: 1;
        font-family: monospace;
      }

      .choice-target-select {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #333;
        border-radius: 6px;
        background: #2a2a3e;
        color: #eaeaea;
        font-size: 0.9rem;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: #e94560;
        }

        option {
          background: #2a2a3e;
          color: #eaeaea;
        }
      }

      .btn-small-icon {
        padding: 0.25rem 0.4rem;
        font-size: 0.9rem;
      }
    }

    .no-choices {
      color: #888;
      font-style: italic;
      text-align: center;
      padding: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid #333;
    }

    .btn-primary, .btn-secondary {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: #e94560;
      color: white;

      &:hover:not(:disabled) {
        background: #c73e54;
      }
    }

    .btn-secondary {
      background: #333;
      color: #eaeaea;

      &:hover {
        background: #444;
      }
    }

    .btn-icon {
      padding: 0.5rem;
      font-size: 1.2rem;
      border: 1px solid #333;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #333;
      }

      &.active {
        border-color: #ffd700;
        background: rgba(255, 215, 0, 0.2);
      }

      &.btn-danger:hover {
        background: #c73e54;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .error-message {
      padding: 0.75rem;
      background: rgba(233, 69, 96, 0.2);
      border: 1px solid #e94560;
      border-radius: 8px;
      color: #e94560;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #1a1a2e;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 1.5rem;
      min-width: 350px;
      max-width: 450px;

      h4 {
        margin: 0 0 1rem;
        color: #e94560;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }
    }
  `]
})
export class NodeEditorComponent implements OnInit {
  readonly storyService = inject(AdminStoryService);

  // Inputs
  readonly nodeId = input<string | null>(null);
  readonly existingChoices = input<ChoiceRecord[]>([]);
  readonly forceStartNode = input(false);

  // Outputs
  readonly close = output<void>();
  readonly saved = output<StoryNodeRecord>();
  readonly deleteNode = output<StoryNodeRecord>();

  // Local state
  readonly showPreview = signal(false);
  readonly editableChoices = signal<EditableChoice[]>([]);
  
  // New node dialog state
  readonly showNewNodeDialog = signal(false);
  private pendingChoiceIndex = -1;
  private previousNextNode = '';
  newNodeKey = '';

  // Form data - story_id will be set from currentStory
  formData: StoryNodeFormData = {
    story_id: '',
    node_key: '',
    title: '',
    text: ''
  };

  // Computed
  readonly isNewNode = computed(() => !this.nodeId());

  readonly editorTitle = computed(() => {
    if (this.forceStartNode()) return 'Create Start Node';
    return this.isNewNode() ? 'Create New Node' : 'Edit Node';
  });

  readonly selectedNode = computed(() => {
    const id = this.nodeId();
    return id ? this.storyService.getNodeById(id) : null;
  });

  readonly renderedContent = computed(() => {
    try {
      return marked.parse(this.formData.text || '') as string;
    } catch {
      return '<p>Error rendering Markdown</p>';
    }
  });

  // Available nodes for dropdown (excludes current node)
  readonly availableNodes = computed(() => {
    const currentNodeKey = this.selectedNode()?.node_key;
    return this.storyService.nodes()
      .filter(n => n.node_key !== currentNodeKey)
      .sort((a, b) => a.node_key.localeCompare(b.node_key));
  });

  /** Check if current node can be deleted */
  readonly canDelete = computed(() => {
    const node = this.selectedNode();
    if (!node) return false;
    return this.storyService.isNodeDeletable(node);
  });

  /** Get reason why node cannot be deleted */
  readonly deleteBlockedReason = computed(() => {
    const node = this.selectedNode();
    if (!node) return '';
    if (node.is_start) return 'Cannot delete start node';
    const incomingCount = this.storyService.getIncomingChoiceCount(node.node_key);
    if (incomingCount > 0) {
      return `Cannot delete: ${incomingCount} choice${incomingCount > 1 ? 's' : ''} point to this node`;
    }
    return '';
  });

  isValid(): boolean {
    const nodeKeyValid = /^[a-z0-9-]+$/.test(this.formData.node_key);
    const hasContent = this.formData.text.trim().length > 0;
    return nodeKeyValid && hasContent;
  }

  constructor() {
    // Update form when node changes
    effect(() => {
      const node = this.selectedNode();
      const storyId = this.storyService.currentStory()?.id || '';
      if (node) {
        this.formData = {
          story_id: storyId,
          node_key: node.node_key,
          title: node.title || '',
          text: node.text || '',
          media: node.media || undefined
        };
      }
    });

    // Update choices when input changes
    effect(() => {
      const choices = this.existingChoices();
      const availableNodeKeys = new Set(this.storyService.nodes().map(n => n.node_key));
      const currentNodeKey = this.selectedNode()?.node_key;
      
      this.editableChoices.set(
        choices.map(c => ({
          id: c.id,
          text: c.text,
          next_node: c.next_node,
          // Use custom input if target doesn't exist or is self-reference
          useCustomTarget: c.next_node === currentNodeKey || 
                          (!!c.next_node && !availableNodeKeys.has(c.next_node))
        }))
      );
    });
  }

  ngOnInit(): void {
    // Reset form for new nodes
    if (this.isNewNode()) {
      this.resetForm();
    }
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  addChoice(): void {
    this.editableChoices.update(choices => [
      ...choices,
      { text: '', next_node: '', isNew: true }
    ]);
  }

  removeChoice(index: number): void {
    this.editableChoices.update(choices => 
      choices.filter((_, i) => i !== index)
    );
  }

  toggleCustomTarget(index: number, useCustom: boolean): void {
    this.editableChoices.update(choices => {
      const updated = [...choices];
      updated[index] = { ...updated[index], useCustomTarget: useCustom, next_node: '' };
      return updated;
    });
  }

  onTargetNodeChange(index: number, value: string): void {
    if (value === '__new__') {
      // Store the previous value and choice index
      const choices = this.editableChoices();
      this.previousNextNode = choices[index]?.next_node || '';
      this.pendingChoiceIndex = index;
      
      // Generate suggested node key
      const baseKey = this.formData.node_key || 'node';
      this.newNodeKey = this.generateUniqueNodeKey(baseKey);
      
      // Reset the select to empty while dialog is open
      this.editableChoices.update(choices => {
        const updated = [...choices];
        updated[index] = { ...updated[index], next_node: '' };
        return updated;
      });
      
      // Show the dialog
      this.showNewNodeDialog.set(true);
    }
  }

  isValidNodeKey(key: string): boolean {
    return /^[a-z0-9-]+$/.test(key) && key.length > 0;
  }

  async confirmNewNodeDialog(): Promise<void> {
    if (!this.isValidNodeKey(this.newNodeKey)) return;
    
    const index = this.pendingChoiceIndex;
    const nodeKey = this.newNodeKey;
    const currentNodeId = this.nodeId();
    
    // Check if node key already exists
    if (this.storyService.nodeKeyExists(nodeKey)) {
      // Just connect to existing node
      this.editableChoices.update(choices => {
        const updated = [...choices];
        updated[index] = { ...updated[index], next_node: nodeKey };
        return updated;
      });
    } else {
      // Create a new normal node
      const storyId = this.storyService.currentStory()?.id;
      if (!storyId) return;
      
      const newNode = await this.storyService.createNode({
        story_id: storyId,
        node_key: nodeKey,
        title: '',
        text: ''
      });
      
      if (newNode) {
        // Update the choice to point to the new node
        this.editableChoices.update(choices => {
          const updated = [...choices];
          updated[index] = { ...updated[index], next_node: newNode.node_key };
          return updated;
        });
        
        // If editing an existing node, save the choice connection immediately
        if (currentNodeId) {
          const choice = this.editableChoices()[index];
          if (choice && choice.text.trim()) {
            if (choice.id && !choice.isNew) {
              // Update existing choice
              await this.storyService.updateChoice(choice.id, {
                text: choice.text,
                next_node: newNode.node_key
              });
            } else {
              // Create new choice and update local state with the ID
              const savedChoice = await this.storyService.createChoice({
                node_id: currentNodeId,
                text: choice.text || 'Go to ' + nodeKey,
                next_node: newNode.node_key
              });
              if (savedChoice) {
                this.editableChoices.update(choices => {
                  const updated = [...choices];
                  updated[index] = { 
                    ...updated[index], 
                    id: savedChoice.id, 
                    text: savedChoice.text,
                    next_node: savedChoice.next_node,
                    isNew: false 
                  };
                  return updated;
                });
              }
            }
          }
        }
      }
    }
    
    // Close dialog and reset
    this.showNewNodeDialog.set(false);
    this.pendingChoiceIndex = -1;
    this.newNodeKey = '';
  }

  cancelNewNodeDialog(): void {
    // Restore previous value
    const index = this.pendingChoiceIndex;
    if (index >= 0) {
      this.editableChoices.update(choices => {
        const updated = [...choices];
        updated[index] = { ...updated[index], next_node: this.previousNextNode };
        return updated;
      });
    }
    
    // Close dialog and reset
    this.showNewNodeDialog.set(false);
    this.pendingChoiceIndex = -1;
    this.previousNextNode = '';
    this.newNodeKey = '';
  }

  private generateUniqueNodeKey(baseKey: string): string {
    const existingKeys = new Set(this.storyService.nodes().map(n => n.node_key));
    let suffix = 1;
    let newKey = `${baseKey}-${suffix}`;
    
    while (existingKeys.has(newKey)) {
      suffix++;
      newKey = `${baseKey}-${suffix}`;
    }
    
    return newKey;
  }

  async setAsStart(): Promise<void> {
    const nodeId = this.nodeId();
    if (nodeId) {
      await this.storyService.setStartNode(nodeId);
    }
  }

  onDeleteNode(): void {
    const node = this.selectedNode();
    if (node && this.canDelete()) {
      this.deleteNode.emit(node);
    }
  }

  async save(): Promise<void> {
    if (!this.isValid()) return;

    let node: StoryNodeRecord | null = null;

    if (this.isNewNode()) {
      // Create new node
      const nodeData = this.forceStartNode() 
        ? { ...this.formData, is_start: true }
        : this.formData;
      node = await this.storyService.createNode(nodeData);
    } else {
      // Update existing node
      const nodeId = this.nodeId();
      if (nodeId) {
        node = await this.storyService.updateNode(nodeId, this.formData);
      }
    }

    if (!node) return;

    // Handle choices
    await this.saveChoices(node.id);

    this.saved.emit(node);
    this.close.emit();
  }

  private async saveChoices(nodeId: string): Promise<void> {
    const currentChoices = this.editableChoices();
    const originalChoices = this.existingChoices();

    // Find deleted choices
    const deletedChoiceIds = originalChoices
      .filter(orig => !currentChoices.some(c => c.id === orig.id))
      .map(c => c.id);

    // Delete removed choices
    for (const id of deletedChoiceIds) {
      await this.storyService.deleteChoice(id);
    }

    // Update or create choices
    for (const choice of currentChoices) {
      if (!choice.text.trim() || !choice.next_node.trim()) continue;

      if (choice.id && !choice.isNew) {
        // Update existing
        const original = originalChoices.find(c => c.id === choice.id);
        if (original && (original.text !== choice.text || original.next_node !== choice.next_node)) {
          await this.storyService.updateChoice(choice.id, {
            text: choice.text,
            next_node: choice.next_node
          });
        }
      } else {
        // Create new
        await this.storyService.createChoice({
          node_id: nodeId,
          text: choice.text,
          next_node: choice.next_node
        });
      }
    }
  }

  private resetForm(): void {
    const storyId = this.storyService.currentStory()?.id || '';
    this.formData = {
      story_id: storyId,
      node_key: '',
      title: '',
      text: ''
    };
    this.editableChoices.set([]);
    this.showPreview.set(false);
  }
}
