import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Route guard that restricts access to admin/gamemaster roles only
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.role();
  
  // Allow admin and gamemaster roles
  if (role === 'admin') {
    return true;
  }

  // Also check for gamemaster role from the user object
  const user = authService.user();
  if (user && (user.role === 'admin' || (user.role as string) === 'gamemaster')) {
    return true;
  }

  // Redirect to story page if not authorized
  console.warn('Admin access denied. User role:', role);
  return router.createUrlTree(['/story']);
};
