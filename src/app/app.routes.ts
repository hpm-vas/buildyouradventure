import { Routes } from '@angular/router';
import { storyRequiredGuard } from './guards/story-required.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./components/role-select/role-select.component').then(m => m.RoleSelectComponent)
  },
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
    canActivate: [roleGuard('gamemaster')]
  },
  { 
    path: 'player', 
    loadComponent: () => import('./components/player/player.component').then(m => m.PlayerComponent),
    canActivate: [roleGuard('player')]
  },
  {
    path: 'player/story/:storyId',
    loadComponent: () => import('./components/player/player-story-view/player-story-view.component').then(m => m.PlayerStoryViewComponent),
    canActivate: [roleGuard('player')]
  },
  { path: '**', redirectTo: '/' }
];
