import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { marked } from 'marked';
import { StoryService } from '../../../services/story.service';
import { EmotionCardsComponent } from '../../emotion-cards/emotion-cards.component';
import { DiceRollerComponent } from '../../dice-roller/dice-roller.component';
import { FreeTextInputComponent } from '../../free-text-input/free-text-input.component';
import { Choice, DiceResult, StoryEvent } from '../../../models/story.model';

@Component({
  selector: 'app-player-story-view',
  standalone: true,
  imports: [
    CommonModule,
    EmotionCardsComponent,
    DiceRollerComponent,
    FreeTextInputComponent
  ],
  templateUrl: './player-story-view.component.html',
  styleUrl: './player-story-view.component.scss'
})
export class PlayerStoryViewComponent implements OnInit {
  readonly storyService = inject(StoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Local staged interaction state (before submit)
  readonly selectedChoice = signal<Choice | null>(null);
  readonly localSelectedCards = signal<string[]>([]);
  readonly localFreeText = signal('');
  readonly localDiceResult = signal<DiceResult | null>(null);

  // For freetext choices
  readonly freetextChoiceValues = signal<Record<string, string>>({});

  // UI state
  readonly showHistory = signal(false);

  // Alias for current node (for template use)
  readonly currentNode = computed(() => this.storyService.currentNode());

  // Computed: check if interaction is valid for submit
  readonly canSubmit = computed(() => {
    const node = this.currentNode();
    if (!node) return false;

    const type = node.interactionType ?? 'choice';
    const hasChoices = node.choices && node.choices.length > 0;

    // Check card requirement
    if (type.startsWith('card_') && this.localSelectedCards().length === 0) {
      return false;
    }

    // Check dice requirement (node-level)
    if (type.includes('roll') && !this.localDiceResult()) {
      return false;
    }

    // Check text requirement for text-only modes
    if ((type === 'card_text' || type === 'text') && !this.localFreeText().trim()) {
      return false;
    }

    // If there are choices, one must be selected (unless freetext choice)
    if (hasChoices && type.includes('choice')) {
      const selected = this.selectedChoice();
      if (!selected) return false;

      // If selected choice is freetext type, check freetext value exists
      if (selected.type === 'freetext') {
        const freetextValue = this.freetextChoiceValues()[selected.id];
        if (!freetextValue?.trim()) return false;
      }

      // If selected choice has dice config, check dice was rolled
      if (selected.diceConfig && !this.localDiceResult()) {
        return false;
      }
    }

    return true;
  });

  // Computed: rendered markdown content
  readonly renderedContent = computed(() => {
    const node = this.storyService.currentNode();
    if (!node?.text) return '';
    return marked.parse(node.text) as string;
  });

  // Computed: Check if node has reached an ending (no choices and not pending interaction)
  readonly isEnding = computed(() => {
    const node = this.storyService.currentNode();
    if (!node) return false;
    const type = node.interactionType;
    const hasChoices = node.choices && node.choices.length > 0;
    // Node is an ending if there are no choices and no required interactions
    return !hasChoices && (!type || type === 'choice');
  });

  ngOnInit(): void {
    const storyId = this.route.snapshot.paramMap.get('storyId');
    if (storyId) {
      this.storyService.loadStoryContext(storyId);
    } else {
      this.router.navigate(['/player']);
    }
  }

  // Card selection
  onCardsSelected(cardIds: string[]): void {
    this.localSelectedCards.set(cardIds);
  }

  // Dice rolling
  onDiceRolled(result: DiceResult): void {
    this.localDiceResult.set(result);
    // Also update storyService for compatibility
    this.storyService.setDiceResult(result);
  }

  // Free text
  onTextChanged(text: string): void {
    this.localFreeText.set(text);
  }

  // Choice selection (staging, not submitting)
  selectChoice(choice: Choice): void {
    // If clicking the same choice, deselect it
    if (this.selectedChoice()?.id === choice.id) {
      this.selectedChoice.set(null);
      this.localDiceResult.set(null); // Clear dice if deselecting
      this.storyService.setDiceResult(null!);
    } else {
      this.selectedChoice.set(choice);
      // Clear dice result when switching choices (if new choice has dice)
      if (choice.diceConfig) {
        this.localDiceResult.set(null);
        this.storyService.setDiceResult(null!);
      }
    }
  }

  // Check if a choice is selected
  isChoiceSelected(choiceId: string): boolean {
    return this.selectedChoice()?.id === choiceId;
  }

  // Freetext choice handling
  onFreetextChoiceChange(choiceId: string, value: string): void {
    this.freetextChoiceValues.update(values => ({
      ...values,
      [choiceId]: value
    }));
  }

  getFreetextChoiceValue(choiceId: string): string {
    return this.freetextChoiceValues()[choiceId] || '';
  }

  // Submit the staged interaction
  async submit(): Promise<void> {
    const node = this.storyService.currentNode();
    if (!node) return;

    // Set all staged values to the service
    this.storyService.setSelectedCards(this.localSelectedCards());
    
    // Determine free text value
    const selected = this.selectedChoice();
    if (selected?.type === 'freetext') {
      // Use freetext from the choice input
      this.storyService.setFreeText(this.freetextChoiceValues()[selected.id] || '');
    } else {
      this.storyService.setFreeText(this.localFreeText());
    }

    // Dice result already set via storyService.setDiceResult

    // Submit the interaction
    const choiceId = selected?.id;
    await this.storyService.submitInteraction(choiceId);

    // Reset local state after submission
    this.resetLocalState();
  }

  private resetLocalState(): void {
    this.selectedChoice.set(null);
    this.localSelectedCards.set([]);
    this.localFreeText.set('');
    this.localDiceResult.set(null);
    this.freetextChoiceValues.set({});
  }

  // Leave story
  leaveStory(): void {
    this.storyService.clearStorySelection();
    this.router.navigate(['/player']);
  }

  // Reset story progress (for testing)
  resetStory(): void {
    this.storyService.resetStory();
    this.resetLocalState();
  }

  // Toggle history panel
  toggleHistory(): void {
    this.showHistory.update(v => !v);
  }

  // Get card label by ID
  getCardLabel(cardId: string): string {
    const cards = this.storyService.availableCards();
    return cards.find(c => c.id === cardId)?.label || cardId;
  }
}
