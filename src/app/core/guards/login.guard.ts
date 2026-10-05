// src/app/core/guards/login.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    map(user => {
      if (user) { // Si hay CUALQUIER usuario logueado, permite el paso.
        return true;
      }
      router.navigate(['/login']); // Si no, al login.
      return false;
    })
  );
};
  