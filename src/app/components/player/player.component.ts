import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LocalStorageService, StoredStory } from '../../services/local-storage.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player.component.html',
  styleUrl: './player.component.scss'
})
export class PlayerComponent implements OnInit {
  private auth = inject(AuthService);
  private storage = inject(LocalStorageService);
  private router = inject(Router);

  // State
  readonly stories = signal<StoredStory[]>([]);
  readonly loading = signal(true);
  readonly searchQuery = signal('');

  // Computed: filtered stories (published only + search)
  readonly filteredStories = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    let result = this.stories().filter(s => s.isPublished);

    if (query) {
      result = result.filter(story =>
        story.name.toLowerCase().includes(query) ||
        (story.description && story.description.toLowerCase().includes(query))
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.loadStories();
  }

  private loadStories(): void {
    this.loading.set(true);
    // Load stories from LocalStorage
    const allStories = this.storage.getStories();
    this.stories.set(allStories);
    this.loading.set(false);
  }

  diveIn(story: StoredStory): void {
    this.router.navigate(['/player/story', story.id]);
  }

  switchRole(): void {
    this.auth.logout();
  }
}
