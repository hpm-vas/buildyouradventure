import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/gamemaster', pathMatch: 'full' },
  { 
    path: 'story', 
    loadComponent: () => import('./components/story-view/story-view.component').then(m => m.StoryViewComponent) 
  },
  { 
    path: 'gamemaster', 
    loadComponent: () => import('./components/gamemaster/gamemaster.component').then(m => m.GamemasterComponent)
  }
];
