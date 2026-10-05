import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Servicios
import { AuthService } from '../../../core/services/auth.service';
import { ClinicaService } from '../../../features/admin/config-clinica/clinica.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt, // Dashboard
  faCalendarCheck, // Agenda
  faProcedures,    // Mis Pacientes / Internación
  faSignOutAlt,    // Salir
  faUserMd,         // Icono fallback
  faMagic,   // Para Plantillas
  faIdCard
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-medico-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FaIconComponent],
  templateUrl: './medico-sidebar.component.html',
  styleUrls: ['../../../layouts/components/_sidebar-theme.scss'] // ✅ Reutilizamos el tema global
})
export class MedicoSidebarComponent {
  public authService = inject(AuthService);
  public clinicaService = inject(ClinicaService);

  readonly defaultImage = 'assets/user-default.jpg';

  icons = {
    dashboard: faTachometerAlt,
    agenda: faCalendarCheck,
    pacientes: faProcedures,
    logout: faSignOutAlt,
    medico: faUserMd,
    plantillas: faMagic,
    perfil: faIdCard
  };

  handleImageError(event: any) {
    event.target.src = this.defaultImage;
  }
}
