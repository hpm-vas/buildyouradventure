import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoryService } from '../../services/story.service';

@Component({
  selector: 'app-story-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './story-view.component.html',
  styleUrl: './story-view.component.scss'
})
export class StoryViewComponent implements OnInit {
  protected storyService = inject(StoryService);

  ngOnInit(): void {
    // Load story context when component initializes
    this.storyService.loadCurrentNode();
  }

  selectChoice(choiceId: string): void {
    this.storyService.selectChoice(choiceId);
  }
}
