import { Component, inject, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoryService } from '../../services/story.service';
import { SharedStoryService } from '../../services/shared-story.service';
import { EmotionCardsComponent } from '../emotion-cards/emotion-cards.component';
import { DiceRollerComponent } from '../dice-roller/dice-roller.component';
import { FreeTextInputComponent } from '../free-text-input/free-text-input.component';
import { DiceResult, Story, Choice } from '../../models/story.model';

@Component({
  selector: 'app-story-view',
  standalone: true,
  imports: [
    CommonModule, 
    EmotionCardsComponent, 
    DiceRollerComponent, 
    FreeTextInputComponent
  ],
  templateUrl: './story-view.component.html',
  styleUrl: './story-view.component.scss'
})
export class StoryViewComponent implements OnInit {
  protected storyService = inject(StoryService);
  private readonly sharedStoryService = inject(SharedStoryService);
  
  // If a story ID is provided via route, use that
  storyId = input<string>();
  
  // Local state for free text (since we need two-way binding)
  freeText = signal('');
  
  // State for freetext choice values (keyed by choice ID)
  private freetextChoiceValues = signal<Record<string, string>>({});

  // State for pending dice roll on a choice
  pendingDiceChoice = signal<Choice | null>(null);

  ngOnInit(): void {
    // Check if a story ID is provided via route input
    const id = this.storyId();
    if (id) {
      this.storyService.loadStoryContext(id);
      return;
    }
    
    // Otherwise, load the story from SharedStoryService (set by route guard)
    const sharedStoryId = this.sharedStoryService.getCurrentStoryId();
    if (sharedStoryId) {
      this.storyService.loadStoryContext(sharedStoryId);
    }
  }

  selectChoice(choiceId: string): void {
    const node = this.storyService.currentNode();
    const choice = node?.choices.find(c => c.id === choiceId);
    
    // If choice has dice config, show dice roller first
    if (choice?.diceConfig) {
      this.pendingDiceChoice.set(choice);
      return;
    }
    
    this.storyService.submitInteraction(choiceId);
  }

  /** Handle dice roll for a choice with dice config */
  onChoiceDiceRolled(result: DiceResult): void {
    const choice = this.pendingDiceChoice();
    if (!choice) return;
    
    // Store the dice result
    this.storyService.setDiceResult(result);
    
    // Clear the pending choice
    this.pendingDiceChoice.set(null);
    
    // Submit the interaction - the story service will determine the correct
    // target node based on the dice result and choice config
    this.storyService.submitInteraction(choice.id);
  }

  /** Cancel a pending dice roll */
  cancelDiceRoll(): void {
    this.pendingDiceChoice.set(null);
  }

  /** Get the current value for a freetext choice */
  getFreetextChoiceValue(choiceId: string): string {
    return this.freetextChoiceValues()[choiceId] || '';
  }

  /** Handle freetext choice input change */
  onFreetextChoiceChange(choiceId: string, text: string): void {
    this.freetextChoiceValues.update(values => ({
      ...values,
      [choiceId]: text
    }));
  }

  /** Submit a freetext choice */
  submitFreetextChoice(choiceId: string): void {
    const text = this.freetextChoiceValues()[choiceId] || '';
    // Store the freetext value before submitting
    this.storyService.setFreeText(text);
    this.storyService.submitInteraction(choiceId);
    // Clear the freetext value after submission
    this.freetextChoiceValues.update(values => {
      const { [choiceId]: _, ...rest } = values;
      return rest;
    });
  }

  onCardsSelected(cardIds: string[]): void {
    this.storyService.setSelectedCards(cardIds);
  }

  onTextChanged(text: string): void {
    this.freeText.set(text);
    this.storyService.setFreeText(text);
  }

  onDiceRolled(result: DiceResult): void {
    this.storyService.setDiceResult(result);
  }

  submitInteraction(): void {
    this.storyService.submitInteraction();
  }

  /** Check if we can submit non-choice interactions */
  get canSubmit(): boolean {
    return this.storyService.canSubmit();
  }
}
