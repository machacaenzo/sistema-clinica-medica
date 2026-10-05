import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop'; // ✅ Importar toObservable
import { switchMap, of, filter } from 'rxjs'; // ✅ Importar operadores
import { NotificacionesInternasService } from '../../../core/services/notificaciones-internas.service';
import { AuthService } from '../../../core/services/auth.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell, faCircle, faInfoCircle, faExclamationTriangle, faFlask } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notificaciones-badge',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './notificaciones-badge.component.html',
  styleUrls: ['./notificaciones-badge.component.scss']
})
export class NotificacionesBadgeComponent {
  private notifService = inject(NotificacionesInternasService);
  private auth = inject(AuthService);

  icons = { bell: faBell, dot: faCircle, info: faInfoCircle, alerta: faExclamationTriangle, lab: faFlask };

  menuAbierto = signal(false);

  // ✅ NIVEL DIOS: Suscripción reactiva al cambio de usuario
  // Esto soluciona el error: si el usuario no está listo, espera.
  // En cuanto el AuthService tiene el UID, conecta con las notificaciones de Firebase.
  notificaciones = toSignal(
    toObservable(this.auth.currentUser).pipe(
      switchMap(user => {
        if (!user?.uid) return of([]); // Si no hay usuario, devolvemos lista vacía
        return this.notifService.obtenerMisNotificaciones(user.uid);
      })
    ),
    { initialValue: [] }
  );

  pendientes = computed(() => this.notificaciones().filter(n => !n.leida).length);

  toggleMenu() {
    this.menuAbierto.update(v => !v);
  }

  async leerNotificacion(id: string) {
    // Cerramos el menú al hacer clic si querés, o lo dejamos abierto
    await this.notifService.marcarComoLeida(id);
  }
}
