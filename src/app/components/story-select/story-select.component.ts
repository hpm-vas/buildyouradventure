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
