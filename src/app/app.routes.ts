import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/story', pathMatch: 'full' },
  { 
    path: 'story', 
    loadComponent: () => import('./components/story-view/story-view.component').then(m => m.StoryViewComponent) 
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent) 
  }
];
