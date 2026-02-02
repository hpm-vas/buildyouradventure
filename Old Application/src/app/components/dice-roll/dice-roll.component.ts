import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DiceType, DiceResult, SkillCheck } from '../../models/story.model';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dice-roll',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dice-roll.component.html',
  styleUrl: './dice-roll.component.scss'
})
export class DiceRollComponent implements OnInit {
  private supabase = inject(SupabaseService);

  @Input() skillCheck!: SkillCheck;
  @Input() choiceText = '';
  @Output() rollComplete = new EventEmitter<DiceResult>();
  @Output() cancelled = new EventEmitter<void>();

  // Animation state
  isRolling = false;
  showResult = false;
  animatingDice: number[] = [];
  finalRolls: number[] = [];
  total = 0;
  success = false;
  manualOverride = false;

  // GM manual input
  isAdmin = false;
  manualInputEnabled = false;
  manualInputValues = '';

  // Animation timing
  private animationFrameId: number | null = null;

  ngOnInit(): void {
    this.isAdmin = this.supabase.user()?.role === 'admin';
    // Initialize animating dice array
    this.animatingDice = Array(this.skillCheck.diceCount).fill(1);
  }

  get diceMax(): number {
    const maxValues: Record<DiceType, number> = {
      'd4': 4,
      'd6': 6,
      'd8': 8,
      'd10': 10,
      'd12': 12,
      'd20': 20,
      'd100': 100,
    };
    return maxValues[this.skillCheck.diceType];
  }

  get formattedDice(): string {
    const modifier = this.skillCheck.modifier || 0;
    const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
    return `${this.skillCheck.diceCount}${this.skillCheck.diceType.toUpperCase()}${modStr}`;
  }

  toggleManualInput(): void {
    this.manualInputEnabled = !this.manualInputEnabled;
  }

  async roll(): Promise<void> {
    if (this.isRolling) return;

    this.isRolling = true;
    this.showResult = false;

    // Parse manual input if provided
    let manualRolls: number[] | undefined;
    if (this.manualInputEnabled && this.manualInputValues.trim()) {
      manualRolls = this.manualInputValues
        .split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(v => !isNaN(v));

      if (manualRolls.length !== this.skillCheck.diceCount) {
        manualRolls = undefined; // Invalid count, ignore
      }
    }

    // Start dice animation
    this.startDiceAnimation();

    try {
      // Call server-side dice roll
      const response = await fetch('/.netlify/functions/dice-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diceType: this.skillCheck.diceType,
          diceCount: this.skillCheck.diceCount,
          modifier: this.skillCheck.modifier || 0,
          difficulty: this.skillCheck.difficulty,
          manualRolls,
        }),
      });

      if (!response.ok) {
        throw new Error('Dice roll failed');
      }

      const result: DiceResult = await response.json();

      // Let animation run for a bit more before showing result
      await this.delay(1500);

      // Stop animation and show result
      this.stopDiceAnimation();
      this.finalRolls = result.rolls;
      this.total = result.total;
      this.success = result.success;
      this.manualOverride = result.manualOverride;
      this.showResult = true;

      // Wait for user to see result, then emit
      await this.delay(2000);

      this.rollComplete.emit(result);
    } catch (error) {
      console.error('Dice roll error:', error);
      this.stopDiceAnimation();
      this.isRolling = false;
    }
  }

  cancel(): void {
    this.stopDiceAnimation();
    this.cancelled.emit();
  }

  private startDiceAnimation(): void {
    const animate = () => {
      // Randomize each die value during animation
      this.animatingDice = this.animatingDice.map(() =>
        Math.floor(Math.random() * this.diceMax) + 1
      );
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private stopDiceAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isRolling = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
