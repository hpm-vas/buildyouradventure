import { Component, inject, signal, computed, input, output, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { AdminStoryService, StoryNodeRecord, ChoiceRecord, StoryNodeFormData } from '../../../services/admin-story.service';

interface EditableChoice {
  id?: string;
  text: string;
  next_node: string;
  isNew?: boolean;
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

        <!-- Pending flag -->
        <div class="form-group checkbox-group">
          <label>
            <input 
              type="checkbox" 
              [(ngModel)]="formData.pending"
              name="pending"
            />
            Mark as pending/draft
          </label>
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
              <input 
                type="text"
                [(ngModel)]="choice.next_node"
                [name]="'choiceNextNode' + $index"
                placeholder="target-node-key"
                pattern="^[a-z0-9-]+$"
                class="choice-target"
              />
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

      .choice-target {
        flex: 1;
        font-family: monospace;
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

  // Local state
  readonly showPreview = signal(false);
  readonly editableChoices = signal<EditableChoice[]>([]);

  // Form data - story_id will be set from currentStory
  formData: StoryNodeFormData = {
    story_id: '',
    node_key: '',
    title: '',
    text: '',
    pending: false
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
          media: node.media || undefined,
          pending: node.pending || false
        };
      }
    });

    // Update choices when input changes
    effect(() => {
      const choices = this.existingChoices();
      this.editableChoices.set(
        choices.map(c => ({
          id: c.id,
          text: c.text,
          next_node: c.next_node
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

  async setAsStart(): Promise<void> {
    const nodeId = this.nodeId();
    if (nodeId) {
      await this.storyService.setStartNode(nodeId);
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
      text: '',
      pending: false
    };
    this.editableChoices.set([]);
    this.showPreview.set(false);
  }
}
