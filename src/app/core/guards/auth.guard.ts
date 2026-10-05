// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, filter, take } from 'rxjs';
import { NotificacionService } from '../services/notificaciones.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificacionService);

  // Usamos el Signal del AuthService que ya tiene el perfil cargado
  return toObservable(authService.currentUser).pipe(
    filter(user => user !== undefined), // Esperamos a que auth inicialice
    take(1),
    map(user => {
      // 1. Verificamos autenticación básica
      if (!user || !user.emailVerified) {
        router.navigate(['/login']);
        return false;
      }

      // 2. Definimos quiénes pueden entrar al PANEL ADMIN
      // Actualizado para aceptar 'empleado'
      const rolesPermitidos = ['administrador', 'medico', 'empleado'];

      if (rolesPermitidos.includes(user.role) && user.estado === 'Activo') {
        return true; // ACCESO CONCEDIDO
      }

      // 3. Si es paciente o sin_rol, lo mandamos a su casa
      notificationService.showAlertError('Acceso Restringido', 'Área exclusiva para personal.');
      router.navigate(['/public/home']);
      return false;
    })
  );
};
