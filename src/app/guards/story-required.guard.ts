import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SharedStoryService } from '../services/shared-story.service';

/**
 * Route guard that ensures a story is selected before accessing protected routes.
 * Redirects to /select-story if no story is selected.
 */
export const storyRequiredGuard: CanActivateFn = () => {
  const sharedStoryService = inject(SharedStoryService);
  const router = inject(Router);

  if (sharedStoryService.hasStorySelected()) {
    return true;
  }

  // Redirect to story selection
  return router.createUrlTree(['/select-story']);
};
