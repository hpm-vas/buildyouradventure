import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmotionCard } from '../../models/story.model';

@Component({
  selector: 'app-emotion-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="emotion-cards">
      @if (label()) {
        <h4 class="cards-label">{{ label() }}</h4>
      }
      
      <div class="cards-grid" [class.single-select]="maxSelect() === 1">
        @for (card of cards(); track card.id) {
          <button 
            class="card" 
            [class.selected]="isSelected(card.id)"
            [style.--card-color]="card.color || '#667eea'"
            [disabled]="disabled() || (!isSelected(card.id) && atMaxSelection())"
            (click)="toggleCard(card)"
          >
            @if (card.icon) {
              <span class="card-icon">{{ card.icon }}</span>
            }
            <span class="card-label">{{ card.label }}</span>
            @if (card.description) {
              <span class="card-description">{{ card.description }}</span>
            }
          </button>
        }
      </div>

      @if (minSelect() > 0 && selectedIds().length < minSelect()) {
        <p class="cards-hint">Select at least {{ minSelect() }} card(s)</p>
      }
    </div>
  `,
  styles: [`
    .emotion-cards {
      margin: 1rem 0;
    }

    .cards-label {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: var(--text-secondary, #555);
    }

    .cards-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      min-width: 100px;
      min-height: 80px;
      background: linear-gradient(135deg, var(--card-color) 0%, color-mix(in srgb, var(--card-color) 70%, black) 100%);
      color: white;
      border: 3px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      text-align: center;
    }

    .card:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .card.selected {
      border-color: white;
      box-shadow: 0 0 0 3px var(--card-color), 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: scale(1.05);
    }

    .card:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .card-icon {
      font-size: 1.5rem;
      margin-bottom: 0.25rem;
    }

    .card-label {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .card-description {
      font-size: 0.75rem;
      opacity: 0.9;
      margin-top: 0.25rem;
    }

    .cards-hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.85rem;
      color: var(--text-muted, #888);
    }

    /* Single select mode - larger cards */
    .single-select .card {
      flex: 1;
      min-width: 120px;
      max-width: 160px;
    }
  `]
})
export class EmotionCardsComponent {
  // Inputs
  cards = input.required<EmotionCard[]>();
  selectedIds = input<string[]>([]);
  minSelect = input(0);
  maxSelect = input(1);
  label = input<string>();
  disabled = input(false);

  // Output
  selectionChange = output<string[]>();

  // Computed
  readonly atMaxSelection = computed(() => {
    const max = this.maxSelect();
    return max > 0 && this.selectedIds().length >= max;
  });

  isSelected(cardId: string): boolean {
    return this.selectedIds().includes(cardId);
  }

  toggleCard(card: EmotionCard): void {
    const currentSelection = [...this.selectedIds()];
    const index = currentSelection.indexOf(card.id);

    if (index >= 0) {
      // Deselect
      currentSelection.splice(index, 1);
    } else {
      // Select (if not at max)
      if (this.maxSelect() === 1) {
        // Single select - replace
        currentSelection.length = 0;
        currentSelection.push(card.id);
      } else if (!this.atMaxSelection()) {
        currentSelection.push(card.id);
      }
    }

    this.selectionChange.emit(currentSelection);
  }
}
