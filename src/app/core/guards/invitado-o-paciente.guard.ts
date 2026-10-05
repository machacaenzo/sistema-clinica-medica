import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificacionService } from '../services/notificaciones.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs';

export const invitadoOPacienteGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificacionService);

  return toObservable(authService.currentUser).pipe(
    take(1),
    map(user => {
      // 1. Si es Visitante (No logueado) -> PASE
      if (!user) return true;

      // 2. Si es Paciente O Usuario Nuevo (sin_rol) -> PASE
      // ✅ CORRECCIÓN AQUÍ: Agregamos la condición || user.role === 'sin_rol'
      if (user.role === 'paciente' || user.role === 'sin_rol') {
        return true;
      }

      // 3. Si es Staff (Admin, Medico, Empleado) -> BLOQUEAR
      notificationService.showAlertInfo(
        'Modo Staff',
        'El personal debe gestionar turnos desde el panel interno.'
      );

      authService.redirectToPanel(user);
      return false;
    })
  );
};
