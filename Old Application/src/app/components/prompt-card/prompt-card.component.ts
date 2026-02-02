import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromptCard } from '../../models/story.model';

@Component({
  selector: 'app-prompt-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prompt-card.component.html',
  styleUrl: './prompt-card.component.scss'
})
export class PromptCardComponent {
  @Input() card!: PromptCard;
  @Input() selected = false;
  @Input() disabled = false;
  @Output() toggle = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled) {
      this.toggle.emit();
    }
  }
}
