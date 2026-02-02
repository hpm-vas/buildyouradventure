import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-story-view',
  standalone: true,
  imports: [],
  templateUrl: './story-view.component.html',
  styleUrl: './story-view.component.scss'
})
export class StoryViewComponent {
  currentNode = signal({
    title: 'Welcome to Plot-smithy',
    text: 'This is a placeholder story node. The collaborative storytelling adventure begins here!',
    choices: [
      { id: '1', text: 'Begin your adventure' },
      { id: '2', text: 'Learn more about the world' }
    ]
  });

  selectChoice(choiceId: string) {
    console.log('Choice selected:', choiceId);
    // TODO: Implement story progression
  }
}
