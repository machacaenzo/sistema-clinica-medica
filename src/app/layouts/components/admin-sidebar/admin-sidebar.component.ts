import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Servicios
import { AuthService } from '../../../core/services/auth.service';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faTachometerAlt,
  faUsers,
  faUserNurse,
  faUserMd,
  faProcedures,
  faSignOutAlt,
  faCogs,
  faBoxOpen,
  faCalendarAlt,
  faEnvelope,
  faNotesMedical,
  faChartPie,
  faShield,
  faShieldAlt,
  faShieldVirus,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { ClinicaService } from '../../../features/admin/config-clinica/clinica.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FaIconComponent],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent {
  // Inyecciones
  public authService = inject(AuthService);
  public clinicaService = inject(ClinicaService); // ✅ Inyectamos el servicio de estado global

  readonly defaultImage = 'assets/user-default.jpg';

  icons = {
    dashboard: faTachometerAlt,
    usuarios: faUsers,
    empleados: faUserNurse,
    medicos: faUserMd,
    pacientes: faProcedures,
    config: faCogs,
    insumos: faBoxOpen,
    logout: faSignOutAlt,
    turnos: faCalendarAlt,
    mensajes: faEnvelope,
    prestaciones: faNotesMedical,
     reportes: faChartPie,
     shield:faShieldAlt,
     seguridad:faShieldVirus,
     contingencia:faExclamationTriangle
  };

  handleImageError(event: any) {
    event.target.src = this.defaultImage;
  }
}
