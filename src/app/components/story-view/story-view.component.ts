import { Component, inject, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoryService } from '../../services/story.service';
import { EmotionCardsComponent } from '../emotion-cards/emotion-cards.component';
import { DiceRollerComponent } from '../dice-roller/dice-roller.component';
import { FreeTextInputComponent } from '../free-text-input/free-text-input.component';
import { StorySelectComponent } from '../story-select/story-select.component';
import { DiceResult, Story } from '../../models/story.model';

@Component({
  selector: 'app-story-view',
  standalone: true,
  imports: [
    CommonModule, 
    EmotionCardsComponent, 
    DiceRollerComponent, 
    FreeTextInputComponent,
    StorySelectComponent
  ],
  templateUrl: './story-view.component.html',
  styleUrl: './story-view.component.scss'
})
export class StoryViewComponent implements OnInit {
  protected storyService = inject(StoryService);
  
  // If a story ID is provided via route, use that
  storyId = input<string>();
  
  // Local state for free text (since we need two-way binding)
  freeText = signal('');

  ngOnInit(): void {
    const id = this.storyId();
    if (id) {
      this.storyService.loadStoryContext(id);
    }
    // Otherwise, wait for user to select a story
  }

  onStorySelected(story: Story): void {
    this.storyService.loadStoryContext(story.id);
  }

  selectChoice(choiceId: string): void {
    this.storyService.submitInteraction(choiceId);
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
