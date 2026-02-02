import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  stories = signal([
    { id: '1', name: 'Demo Story', nodeCount: 5 }
  ]);

  selectedStory = signal<string | null>(null);

  selectStory(id: string) {
    this.selectedStory.set(id);
    console.log('Story selected:', id);
    // TODO: Implement story management
  }
}
