import { Component, signal, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecordModel } from 'pocketbase';
import { Story } from '../../models/story.model';
import { PocketBaseService } from '../../services/pocketbase.service';
import { AuthService } from '../../services/auth.service';

interface StoryRecord extends RecordModel {
  name: string;
  description: string;
  owner_id: string;
  is_published: boolean;
  cover_image: string;
}

@Component({
  selector: 'app-story-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="story-select">
      <header class="story-select-header">
        <h2>Select a Story</h2>
        @if (isAdmin()) {
          <button class="btn-create" (click)="openCreateDialog()">+ New Story</button>
        }
      </header>

      @if (loading()) {
        <div class="loading">
          <p>Loading stories...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <p>{{ error() }}</p>
          <button (click)="loadStories()">Retry</button>
        </div>
      } @else if (stories().length === 0) {
        <div class="empty">
          <p>No stories available.</p>
          @if (isAdmin()) {
            <p>Create your first story to get started!</p>
          }
        </div>
      } @else {
        <div class="story-grid">
          @for (story of stories(); track story.id) {
            <article class="story-card" (click)="selectStory(story)">
              <div class="story-cover">
                @if (story.coverImage) {
                  <img [src]="story.coverImage" [alt]="story.name" />
                } @else {
                  <div class="story-cover-placeholder">
                    <span>📖</span>
                  </div>
                }
              </div>
              <div class="story-info">
                <h3>{{ story.name }}</h3>
                @if (story.description) {
                  <p class="story-description">{{ story.description }}</p>
                }
                @if (!story.isPublished && isAdmin()) {
                  <span class="badge draft">Draft</span>
                }
              </div>
            </article>
          }
        </div>
      }

      @if (showCreateDialog()) {
        <div class="dialog-backdrop" (click)="closeCreateDialog()">
          <div class="dialog" (click)="$event.stopPropagation()">
            <h3>Create New Story</h3>
            <form (submit)="createStory($event)">
              <div class="form-group">
                <label for="storyName">Story Name</label>
                <input 
                  type="text" 
                  id="storyName" 
                  #storyName
                  required 
                  minlength="1"
                  maxlength="200"
                  placeholder="Enter story name"
                />
              </div>
              <div class="form-group">
                <label for="storyDesc">Description (optional)</label>
                <textarea 
                  id="storyDesc" 
                  #storyDesc
                  rows="3"
                  placeholder="Brief description of your story"
                ></textarea>
              </div>
              <div class="dialog-actions">
                <button type="button" class="btn-cancel" (click)="closeCreateDialog()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="creating()">
                  {{ creating() ? 'Creating...' : 'Create Story' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .story-select {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .story-select-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .story-select-header h2 {
      margin: 0;
      font-size: 1.75rem;
    }

    .btn-create {
      padding: 0.75rem 1.5rem;
      background: var(--primary-color, #4a6fa5);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
    }

    .btn-create:hover {
      background: var(--primary-hover, #3d5d8a);
    }

    .story-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .story-card {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .story-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .story-cover {
      height: 160px;
      background: var(--cover-bg, #e8e8e8);
      overflow: hidden;
    }

    .story-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .story-cover-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .story-info {
      padding: 1rem;
    }

    .story-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }

    .story-description {
      margin: 0;
      color: var(--text-muted, #666);
      font-size: 0.9rem;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    .badge.draft {
      background: #ffc107;
      color: #333;
    }

    .loading, .error, .empty {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted, #666);
    }

    .error button, .empty button {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
    }

    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: var(--card-bg, #fff);
      border-radius: 12px;
      padding: 1.5rem;
      width: 90%;
      max-width: 400px;
    }

    .dialog h3 {
      margin: 0 0 1.5rem 0;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .dialog-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .btn-cancel {
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-primary {
      padding: 0.75rem 1.5rem;
      background: var(--primary-color, #4a6fa5);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class StorySelectComponent implements OnInit {
  private readonly pb = inject(PocketBaseService);
  private readonly auth = inject(AuthService);

  // Output event when a story is selected
  storySelected = output<Story>();

  // State
  readonly stories = signal<Story[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showCreateDialog = signal(false);
  readonly creating = signal(false);

  readonly isAdmin = this.auth.isAdmin;

  ngOnInit(): void {
    this.loadStories();
  }

  async loadStories(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const records = await this.pb.collection<StoryRecord>('stories').getFullList({
        sort: '-created',
        filter: this.isAdmin() 
          ? '' 
          : 'is_published = true'
      });

      this.stories.set(records.map(r => this.mapRecord(r)));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load stories';
      this.error.set(message);
      console.error('StorySelectComponent.loadStories error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  selectStory(story: Story): void {
    this.storySelected.emit(story);
  }

  openCreateDialog(): void {
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
  }

  async createStory(event: Event): Promise<void> {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const nameInput = form.querySelector('#storyName') as HTMLInputElement;
    const descInput = form.querySelector('#storyDesc') as HTMLTextAreaElement;

    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) return;

    this.creating.set(true);

    try {
      // Create the story
      const storyRecord = await this.pb.collection<StoryRecord>('stories').create({
        name,
        description,
        owner_id: this.auth.user()?.id,
        is_published: false
      });

      // Create the default "start" node for the story
      await this.pb.collection('story_nodes').create({
        story_id: storyRecord.id,
        node_key: 'start',
        title: 'Beginning',
        text: '<!-- Add your story content here -->',
        pending: true,
        is_start: true
      });

      // Add to list and close dialog
      const newStory = this.mapRecord(storyRecord);
      this.stories.update(list => [newStory, ...list]);
      this.closeCreateDialog();

      // Optionally auto-select the new story
      this.selectStory(newStory);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create story';
      alert(message);
      console.error('StorySelectComponent.createStory error:', e);
    } finally {
      this.creating.set(false);
    }
  }

  private mapRecord(record: StoryRecord): Story {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      ownerId: record.owner_id,
      isPublished: record.is_published,
      coverImage: record.cover_image 
        ? this.pb.client.files.getURL(record, record.cover_image)
        : undefined,
      createdAt: new Date(record['created'] as string),
      updatedAt: new Date(record['updated'] as string)
    };
  }
}
