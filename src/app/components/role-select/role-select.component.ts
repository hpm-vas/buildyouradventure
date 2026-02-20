import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-role-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="role-select-container">
      <div class="role-select-card">
        <h1 class="title">Plot-smithy</h1>
        <p class="subtitle">Collaborative Episodic Storytelling</p>
        
        <div class="role-buttons">
          <button 
            class="role-button gamemaster"
            (click)="selectRole('gamemaster')"
          >
            <span class="icon">🎭</span>
            <span class="label">Game Master</span>
            <span class="description">Create and manage stories</span>
          </button>
          
          <button 
            class="role-button player"
            (click)="selectRole('player')"
          >
            <span class="icon">📖</span>
            <span class="label">Player</span>
            <span class="description">Experience adventures</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-select-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 1rem;
    }

    .role-select-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border-radius: 1.5rem;
      padding: 3rem;
      text-align: center;
      max-width: 500px;
      width: 100%;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 2.5rem 0;
      font-size: 1rem;
    }

    .role-buttons {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .role-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 2rem;
      border: 2px solid transparent;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.08);
    }

    .role-button:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.12);
    }

    .role-button.gamemaster {
      border-color: rgba(255, 193, 7, 0.3);
    }

    .role-button.gamemaster:hover {
      border-color: rgba(255, 193, 7, 0.6);
      box-shadow: 0 8px 32px rgba(255, 193, 7, 0.2);
    }

    .role-button.player {
      border-color: rgba(76, 175, 80, 0.3);
    }

    .role-button.player:hover {
      border-color: rgba(76, 175, 80, 0.6);
      box-shadow: 0 8px 32px rgba(76, 175, 80, 0.2);
    }

    .icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .label {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 0.25rem;
    }

    .description {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.5);
    }

    @media (min-width: 480px) {
      .role-buttons {
        flex-direction: row;
      }

      .role-button {
        flex: 1;
      }
    }
  `]
})
export class RoleSelectComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    // If already has a role, redirect
    if (this.auth.isAuthenticated()) {
      if (this.auth.isGamemaster()) {
        this.router.navigate(['/gamemaster']);
      } else {
        this.router.navigate(['/player']);
      }
    }
  }

  selectRole(role: 'gamemaster' | 'player'): void {
    this.auth.setRole(role);
  }
}
