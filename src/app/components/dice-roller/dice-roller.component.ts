import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiceConfig, DiceResult, DiceType } from '../../models/story.model';

@Component({
  selector: 'app-dice-roller',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dice-roller" [class.rolling]="isRolling()">
      @if (config().label) {
        <h4 class="dice-label">{{ config().label }}</h4>
      }

      <div class="dice-display">
        <div class="dice-info">
          <span class="dice-notation">
            {{ config().diceCount }}{{ config().diceType }}
            @if (config().modifier && config().modifier !== 0) {
              {{ config().modifier! > 0 ? '+' : '' }}{{ config().modifier }}
            }
          </span>
        </div>

        @if (result()) {
          <div class="dice-result">
            <div class="dice-rolls">
              @for (roll of result()!.rolls; track $index) {
                <span class="die" [class.max]="isMaxRoll(roll)" [class.min]="isMinRoll(roll)">
                  {{ roll }}
                </span>
              }
              @if (result()!.modifier !== 0) {
                <span class="modifier">
                  {{ result()!.modifier > 0 ? '+' : '' }}{{ result()!.modifier }}
                </span>
              }
            </div>
            <div class="total">
              <span class="total-label">Total:</span>
              <span class="total-value" [class.success]="result()!.success === true" [class.failure]="result()!.success === false">
                {{ result()!.finalTotal }}
              </span>
              @if (result()!.success !== undefined) {
                <span class="check-result">
                  {{ result()!.success ? '✓ Success' : '✗ Failure' }}
                </span>
              }
            </div>
            @if (result()!.isManual) {
              <span class="manual-badge">Manual Entry</span>
            }
          </div>
        } @else {
          <div class="dice-animation">
            @for (i of diceCountArray(); track i) {
              <span class="die placeholder" [class.rolling]="isRolling()">?</span>
            }
          </div>
        }
      </div>

      @if (!result() && !disabled()) {
        <div class="dice-actions">
          <button class="btn-roll" (click)="roll()" [disabled]="isRolling()">
            {{ isRolling() ? 'Rolling...' : 'Roll Dice' }}
          </button>
          
          @if (allowManual()) {
            <button class="btn-manual" (click)="toggleManualEntry()">
              {{ showManualEntry() ? 'Cancel' : 'Enter Manually' }}
            </button>
          }
        </div>

        @if (showManualEntry()) {
          <div class="manual-entry">
            <div class="manual-inputs">
              @for (i of diceCountArray(); track i; let idx = $index) {
                <input 
                  type="number" 
                  [min]="1" 
                  [max]="getMaxRoll()"
                  [(ngModel)]="manualValues[idx]"
                  placeholder="?"
                  class="manual-input"
                />
              }
            </div>
            <button class="btn-confirm" (click)="submitManual()" [disabled]="!isManualValid()">
              Confirm
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .dice-roller {
      background: var(--dice-bg, #1a1a2e);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      color: white;
    }

    .dice-label {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      color: var(--dice-label, #a0a0c0);
    }

    .dice-info {
      margin-bottom: 1rem;
    }

    .dice-notation {
      font-size: 1.25rem;
      font-weight: bold;
      color: var(--dice-accent, #ffd700);
    }

    .dice-display {
      min-height: 100px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .dice-rolls, .dice-animation {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .die {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: var(--die-bg, #2d2d44);
      border: 2px solid var(--die-border, #4a4a6a);
      border-radius: 8px;
      font-size: 1.25rem;
      font-weight: bold;
    }

    .die.max {
      background: var(--die-max, #2ecc71);
      border-color: var(--die-max-border, #27ae60);
    }

    .die.min {
      background: var(--die-min, #e74c3c);
      border-color: var(--die-min-border, #c0392b);
    }

    .die.placeholder {
      color: var(--dice-label, #a0a0c0);
    }

    .die.rolling {
      animation: roll 0.3s ease-in-out infinite;
    }

    @keyframes roll {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }

    .modifier {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.75rem;
      font-size: 1.25rem;
      color: var(--dice-accent, #ffd700);
    }

    .total {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .total-label {
      color: var(--dice-label, #a0a0c0);
    }

    .total-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--dice-accent, #ffd700);
    }

    .total-value.success {
      color: var(--die-max, #2ecc71);
    }

    .total-value.failure {
      color: var(--die-min, #e74c3c);
    }

    .check-result {
      font-size: 1rem;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
    }

    .manual-badge {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: var(--dice-label, #a0a0c0);
    }

    .dice-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      margin-top: 1rem;
    }

    .btn-roll {
      padding: 0.75rem 2rem;
      font-size: 1.1rem;
      font-weight: bold;
      background: var(--dice-accent, #ffd700);
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-roll:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
    }

    .btn-roll:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-manual {
      padding: 0.75rem 1rem;
      background: transparent;
      color: var(--dice-label, #a0a0c0);
      border: 1px solid var(--dice-label, #a0a0c0);
      border-radius: 8px;
      cursor: pointer;
    }

    .btn-manual:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .manual-entry {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .manual-inputs {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 0.75rem;
    }

    .manual-input {
      width: 60px;
      height: 48px;
      text-align: center;
      font-size: 1.25rem;
      font-weight: bold;
      background: var(--die-bg, #2d2d44);
      border: 2px solid var(--die-border, #4a4a6a);
      border-radius: 8px;
      color: white;
    }

    .manual-input:focus {
      outline: none;
      border-color: var(--dice-accent, #ffd700);
    }

    .btn-confirm {
      padding: 0.5rem 1.5rem;
      background: var(--dice-accent, #ffd700);
      color: #1a1a2e;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class DiceRollerComponent {
  // Inputs
  config = input.required<DiceConfig>();
  result = input<DiceResult | null>(null);
  disabled = input(false);
  allowManual = input(true);

  // Outputs
  rolled = output<DiceResult>();

  // Local state
  readonly isRolling = signal(false);
  readonly showManualEntry = signal(false);
  manualValues: (number | null)[] = [];

  readonly diceCountArray = computed(() => 
    Array.from({ length: this.config().diceCount }, (_, i) => i)
  );

  getMaxRoll(): number {
    const diceType = this.config().diceType;
    return parseInt(diceType.substring(1));
  }

  isMaxRoll(roll: number): boolean {
    return roll === this.getMaxRoll();
  }

  isMinRoll(roll: number): boolean {
    return roll === 1;
  }

  async roll(): Promise<void> {
    this.isRolling.set(true);
    
    // Simulate rolling animation
    await new Promise(resolve => setTimeout(resolve, 800));

    const cfg = this.config();
    const maxRoll = this.getMaxRoll();
    const rolls: number[] = [];

    for (let i = 0; i < cfg.diceCount; i++) {
      rolls.push(Math.floor(Math.random() * maxRoll) + 1);
    }

    const total = rolls.reduce((sum, r) => sum + r, 0);
    const modifier = cfg.modifier || 0;
    const finalTotal = total + modifier;

    const result: DiceResult = {
      rolls,
      total,
      modifier,
      finalTotal,
      isManual: false,
      success: cfg.successThreshold !== undefined 
        ? finalTotal >= cfg.successThreshold 
        : undefined
    };

    this.isRolling.set(false);
    this.rolled.emit(result);
  }

  toggleManualEntry(): void {
    this.showManualEntry.update(v => !v);
    if (this.showManualEntry()) {
      this.manualValues = new Array(this.config().diceCount).fill(null);
    }
  }

  isManualValid(): boolean {
    const maxRoll = this.getMaxRoll();
    return this.manualValues.every(v => 
      v !== null && v >= 1 && v <= maxRoll
    );
  }

  submitManual(): void {
    if (!this.isManualValid()) return;

    const cfg = this.config();
    const rolls = this.manualValues as number[];
    const total = rolls.reduce((sum, r) => sum + r, 0);
    const modifier = cfg.modifier || 0;
    const finalTotal = total + modifier;

    const result: DiceResult = {
      rolls,
      total,
      modifier,
      finalTotal,
      isManual: true,
      success: cfg.successThreshold !== undefined 
        ? finalTotal >= cfg.successThreshold 
        : undefined
    };

    this.showManualEntry.set(false);
    this.rolled.emit(result);
  }
}
