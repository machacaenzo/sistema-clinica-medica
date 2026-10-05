// src/app/core/guards/role.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificaciones.service';
import { Rol } from '../interfaces/usuario.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificacionService);

  const rolesEsperados: Rol[] = route.data['roles'] || [];

  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined),
    take(1),
    map(user => {
      // 1. No logueado -> Login
      if (!user) {
        router.navigate(['/auth/login']);
        return false;
      }

      // 2. Email no verificado -> Verificar
      if (!user.emailVerified) {
        router.navigate(['/auth/verify-email']);
        return false;
      }

      // 3. ✅ ÉXITO: El rol coincide
      if (rolesEsperados.includes(user.role)) {
        return true;
      }

      // 4. ⛔ ERROR: Rol incorrecto (Intento de fuga)
      // notificationService.showAlertError('Acceso Denegado', `No tienes permisos para esta sección.`);

      // 🚀 REDIRECCIÓN INTELIGENTE (Cada uno a su casa)
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
          router.navigate(['/public/mis-turnos']); // O mi-perfil
          break;
        default:
          router.navigate(['/public/home']);
      }

      return false;
    })
  );
};
