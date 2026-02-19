import { Routes } from '@angular/router';
import { storyRequiredGuard } from './guards/story-required.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/select-story', pathMatch: 'full' },
  {
    path: 'select-story',
    loadComponent: () => import('./components/story-select/story-select.component').then(m => m.StorySelectComponent)
  },
  { 
    path: 'story', 
    loadComponent: () => import('./components/story-view/story-view.component').then(m => m.StoryViewComponent),
    canActivate: [storyRequiredGuard]
  },
  { 
    path: 'gamemaster', 
    loadComponent: () => import('./components/gamemaster/gamemaster.component').then(m => m.GamemasterComponent),
    canActivate: [storyRequiredGuard]
  }
];
