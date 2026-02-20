import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="player-container">
      <div class="player-card">
        <span class="icon">🚧</span>
        <h1 class="title">Player View</h1>
        <p class="message">Coming soon...</p>
        <p class="description">
          The player experience is being built. Check back later to play adventures!
        </p>
        <button class="back-button" (click)="switchRole()">
          ← Back to Role Selection
        </button>
      </div>
    </div>
  `,
  styles: [`
    .player-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 1rem;
    }

    .player-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 1.5rem;
      padding: 3rem;
      text-align: center;
      max-width: 400px;
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.5rem 0;
    }

    .message {
      color: rgba(76, 175, 80, 0.8);
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0 0 1rem 0;
    }

    .description {
      color: rgba(255, 255, 255, 0.5);
      margin: 0 0 2rem 0;
      line-height: 1.5;
    }

    .back-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
    }
  `]
})
export class PlayerComponent {
  private auth = inject(AuthService);

  switchRole(): void {
    this.auth.logout();
  }
}
