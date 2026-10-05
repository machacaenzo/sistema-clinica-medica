// src/app/core/guards/public.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter, take } from 'rxjs';

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      // Si el usuario ya está autenticado y verificado...
      if (user && user.emailVerified) {

        // ... lo redirigimos a su panel correspondiente (NO al del admin por defecto)
        switch (user.role) {
          case 'administrador':
            router.navigate(['/admin/dashboard']);
            break;
          case 'medico':
            router.navigate(['/medico/dashboard']);
            break;
          case 'empleado':
            router.navigate(['/empleado/mi-perfil']);
            break;
          case 'paciente':
            router.navigate(['/public/mis-turnos']);
            break;
          default:
            router.navigate(['/public/home']);
        }

        return false; // Bloquea el acceso al login
      }

      return true; // Permite ver el login si no está logueado
    })
  );
};
