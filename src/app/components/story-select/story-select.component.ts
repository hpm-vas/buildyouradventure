import { Component, signal, inject, OnInit, output, computed, ElementRef, QueryList, ViewChildren, AfterViewInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Story } from '../../models/story.model';
import { StoredStory } from '../../services/local-storage.service';
import { StoryStorageService } from '../../services/story-storage.service';
import { AuthService } from '../../services/auth.service';
import { SharedStoryService } from '../../services/shared-story.service';

type SortOption = 'newest' | 'oldest' | 'alphabetical';

@Component({
  selector: 'app-story-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="story-select" [attr.aria-busy]="loading()">
      <header class="story-select-header">
        <div class="header-title">
          <h2 id="story-select-heading">Select a Story</h2>
          @if (!loading() && stories().length > 0) {
            <span class="story-count" aria-live="polite">
              {{ filteredStories().length }} 
              @if (searchQuery()) { of {{ stories().length }} }
              {{ filteredStories().length === 1 ? 'story' : 'stories' }}
            </span>
          }
        </div>
        
        @if (!loading() && stories().length > 0) {
          <div class="header-controls">
            <div class="search-box">
              <label for="story-search" class="visually-hidden">Search stories</label>
              <input 
                id="story-search"
                type="search"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                placeholder="Search stories..."
                aria-describedby="story-select-heading"
              />
            </div>
            
            <div class="sort-controls">
              <label for="story-sort" class="visually-hidden">Sort by</label>
              <select 
                id="story-sort"
                [ngModel]="sortOption()"
                (ngModelChange)="sortOption.set($event)"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>
          </div>
        }
      </header>

      <!-- Status announcements for screen readers -->
      <div class="visually-hidden" aria-live="polite" aria-atomic="true">
        @if (loading()) {
          Loading stories, please wait...
        } @else if (error()) {
          Error: {{ error() }}
        } @else if (stories().length === 0) {
          No stories available.
        } @else if (filteredStories().length === 0) {
          No stories match your search.
        }
      </div>

      @if (loading()) {
        <div class="story-grid skeleton-grid" aria-hidden="true">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="story-card skeleton">
              <div class="story-cover skeleton-cover"></div>
              <div class="story-info">
                <div class="skeleton-title"></div>
                <div class="skeleton-desc"></div>
              </div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="error" role="alert">
          <p>{{ error() }}</p>
          <button (click)="loadStories()">Retry</button>
        </div>
      } @else if (stories().length === 0) {
        <div class="empty">
          <p>No stories available.</p>
          @if (isGamemaster()) {
            <p>Create your first story to get started!</p>
          }
        </div>
      } @else if (filteredStories().length === 0) {
        <div class="empty">
          <p>No stories match "{{ searchQuery() }}"</p>
          <button class="btn-secondary" (click)="searchQuery.set('')">Clear search</button>
        </div>
      } @else {
        <div 
          class="story-grid" 
          role="list"
          aria-labelledby="story-select-heading"
          (keydown)="onGridKeydown($event)"
        >
          @for (story of filteredStories(); track story.id; let i = $index) {
            <article 
              #storyCard
              class="story-card"
              role="listitem"
              tabindex="0"
              [attr.aria-label]="'Select story: ' + story.name + (story.description ? '. ' + story.description : '')"
              [class.focused]="focusedIndex() === i"
              (click)="selectStory(story)"
              (keydown.enter)="selectStory(story)"
              (keydown.space)="selectStory(story); $event.preventDefault()"
              (focus)="focusedIndex.set(i)"
            >
              <div class="story-cover">
                @if (story.coverImage) {
                  <img [src]="story.coverImage" [alt]="''" aria-hidden="true" />
                } @else {
                  <div class="story-cover-placeholder" aria-hidden="true">
                    <span>📖</span>
                  </div>
                }
              </div>
              <div class="story-info">
                <h3>{{ story.name }}</h3>
                @if (story.description) {
                  <p class="story-description">{{ story.description }}</p>
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

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .story-select-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .header-title {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .header-title h2 {
      margin: 0;
      font-size: 1.75rem;
    }

    .story-count {
      font-size: 0.875rem;
      color: var(--text-muted, #666);
    }

    .header-controls {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-box input {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 8px;
      font-size: 0.9rem;
      min-width: 200px;
      background: var(--input-bg, #fff);
      color: var(--text-color, #333);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary, #667eea);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .sort-controls select {
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 8px;
      font-size: 0.9rem;
      background: var(--input-bg, #fff);
      color: var(--text-color, #333);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
    }

    .sort-controls select:focus {
      outline: none;
      border-color: var(--primary, #667eea);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
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
      transition: transform 0.2s, box-shadow 0.2s, outline 0.1s;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .story-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .story-card:focus {
      outline: 3px solid var(--primary, #667eea);
      outline-offset: 2px;
    }

    .story-card:focus:not(:focus-visible) {
      outline: none;
    }

    .story-card:focus-visible {
      outline: 3px solid var(--primary, #667eea);
      outline-offset: 2px;
    }

    /* Skeleton loading styles */
    .story-card.skeleton {
      cursor: default;
      animation: none;
    }

    .skeleton-cover {
      height: 160px;
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-title {
      height: 1.25rem;
      width: 70%;
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .skeleton-desc {
      height: 0.9rem;
      width: 90%;
      background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
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
      border-radius: 6px;
      border: 1px solid var(--border-color, #ddd);
      background: var(--btn-bg, #fff);
      cursor: pointer;
      transition: background 0.2s;
    }

    .error button:hover, .empty button:hover {
      background: var(--btn-hover-bg, #f5f5f5);
    }

    .btn-secondary {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid var(--border-color, #ddd);
      background: var(--btn-bg, #fff);
      cursor: pointer;
    }

    /* Tablet breakpoint */
    @media (max-width: 768px) {
      .story-select {
        padding: 1.5rem 1rem;
      }

      .story-select-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .search-box input {
        width: 100%;
        min-width: unset;
      }

      .sort-controls select {
        width: 100%;
      }

      .story-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }
    }

    /* Mobile breakpoint */
    @media (max-width: 480px) {
      .story-select {
        padding: 1rem 0.75rem;
      }

      .header-title h2 {
        font-size: 1.5rem;
      }

      .story-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .story-card {
        display: flex;
        flex-direction: row;
      }

      .story-cover {
        width: 100px;
        min-width: 100px;
        height: auto;
        min-height: 100px;
      }

      .story-info {
        flex: 1;
        padding: 0.75rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .story-info h3 {
        font-size: 1.1rem;
      }

      .story-description {
        -webkit-line-clamp: 1;
      }
    }
  `]
})
export class StorySelectComponent implements OnInit {
  private readonly storage = inject(StoryStorageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly sharedStoryService = inject(SharedStoryService);

  @ViewChildren('storyCard') storyCards!: QueryList<ElementRef<HTMLElement>>;

  // Output event when a story is selected
  storySelected = output<Story>();

  // State
  readonly stories = signal<Story[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Search & sort state
  readonly searchQuery = signal('');
  readonly sortOption = signal<SortOption>('newest');
  readonly focusedIndex = signal(0);

  readonly isGamemaster = this.auth.isGamemaster;

  // Filtered and sorted stories
  readonly filteredStories = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const sort = this.sortOption();
    let result = [...this.stories()];

    // Filter by search query
    if (query) {
      result = result.filter(story =>
        story.name.toLowerCase().includes(query) ||
        (story.description && story.description.toLowerCase().includes(query))
      );
    }

    // Sort
    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  });

  ngOnInit(): void {
    this.loadStories();
  }

  async loadStories(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const records = await firstValueFrom(this.storage.getStories());
      this.stories.set(records.map(r => this.mapRecord(r)));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load stories';
      this.error.set(message);
      console.error('StorySelectComponent.loadStories error:', e);
    } finally {
      this.loading.set(false);
    }
  }

  async selectStory(story: Story): Promise<void> {
    const storedStory = await firstValueFrom(this.storage.getStoryById(story.id));
    if (storedStory) {
      this.sharedStoryService.selectStoryDirect(storedStory);
    }
    // Emit for backward compatibility (if used as child component)
    this.storySelected.emit(story);
    // Navigate to the builder (gamemaster) view
    this.router.navigate(['/gamemaster']);
  }

  /** Handle keyboard navigation within the grid */
  onGridKeydown(event: KeyboardEvent): void {
    const stories = this.filteredStories();
    if (stories.length === 0) return;

    const currentIndex = this.focusedIndex();
    let newIndex = currentIndex;

    // Calculate grid columns (approximate based on container width)
    const cards = this.storyCards?.toArray();
    if (!cards || cards.length === 0) return;
    
    // Estimate columns based on first two cards' positions
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
      this.focusedIndex.set(newIndex);
      cards[newIndex]?.nativeElement.focus();
    }
  }

  private mapRecord(record: StoredStory): Story {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      ownerId: 'local-gamemaster',
      isPublished: record.isPublished,
      coverImage: record.coverImage || undefined,
      createdAt: new Date(record.created),
      updatedAt: new Date(record.updated)
    };
  }
}
