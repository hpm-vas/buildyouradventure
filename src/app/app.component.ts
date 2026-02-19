import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { SharedStoryService } from './services/shared-story.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Plot-smithy';
  
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly sharedStory = inject(SharedStoryService);

  // User info for display (always gamemaster in local mode)
  readonly user = this.auth.user;

  leaveStory(): void {
    this.sharedStory.clearStory();
    this.router.navigate(['/select-story']);
  }
}
