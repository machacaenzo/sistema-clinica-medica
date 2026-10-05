import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// --- SERVICIOS ---
import { AuthService } from '../../../core/services/auth.service';

// --- ICONOS ---
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt, // Dashboard
  faUsers,         // Usuarios (General)
  faUserNurse,     // Empleados
  faUserMd,        // Médicos
  faProcedures,    // Pacientes
  faCalendarAlt,   // Turnos
  faCalendarCheck, // Agenda Médica
  faSignOutAlt,    // Logout
  faClipboardList  // Historia Clínica / Reportes
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FaIconComponent],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  public authService = inject(AuthService);

  // Imagen por defecto para el perfil del sidebar
  readonly defaultImage = 'assets/user-default.jpg';

  // Colección de Iconos
  icons = {
    dashboard: faTachometerAlt,
    usuarios: faUsers,
    empleados: faUserNurse,
    medicos: faUserMd,
    pacientes: faProcedures,
    turnos: faCalendarAlt,
    agenda: faCalendarCheck,
    logout: faSignOutAlt,
    reportes: faClipboardList
  };

  /**
   * Evita el error 404 si la imagen del usuario no existe
   */
  handleImageError(event: any) {
    event.target.src = this.defaultImage;
  }
}
