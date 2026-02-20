import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

/**
 * Route guard factory that ensures user has the required role.
 * Redirects to role selection if not authenticated or wrong role.
 */
export function roleGuard(requiredRole: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/']);
    }

    if (auth.role() !== requiredRole) {
      // Redirect to their actual role's page
      if (auth.isGamemaster()) {
        return router.createUrlTree(['/gamemaster']);
      } else {
        return router.createUrlTree(['/player']);
      }
    }

    return true;
  };
}
