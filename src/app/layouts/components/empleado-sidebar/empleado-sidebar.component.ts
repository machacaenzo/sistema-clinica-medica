import { Component, inject, OnInit, signal, computed } from '@angular/core'; // ✅ Agregado computed
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

// Servicios
import { AuthService } from '../../../core/services/auth.service';
import { ClinicaService } from '../../../features/admin/config-clinica/clinica.service';
import { EmpleadoService } from '../../../features/admin/gestion-empleados/empleado.service';

// Interfaces
import { PerfilEmpleado } from '../../../core/interfaces/perfil-empleado.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserClock, faClipboardList,
  faUsers, faCalendarAlt, faIdCard, faBuilding, faEnvelope,
  faUserTie, faBoxOpen, faSignOutAlt,
  faHeartbeat,
  faMicroscope // ✅ 1. Importar icono para Laboratorio
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-empleado-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FaIconComponent],
  templateUrl: './empleado-sidebar.component.html',
  styleUrls: ['../_sidebar-theme.scss']
})
export class EmpleadoSidebarComponent implements OnInit {
  public authService = inject(AuthService);
  public clinicaService = inject(ClinicaService);
  private empleadoService = inject(EmpleadoService);

  defaultImage = 'assets/user-default.jpg';

  icons = {
    perfil: faUserClock,
    tareas: faClipboardList,
    pacientes: faUsers,
    turnos: faCalendarAlt,
    medicos: faIdCard,
    obras: faBuilding,
    mensajes: faEnvelope,
    equipo: faUserTie,
    insumos: faBoxOpen,
    triage: faHeartbeat,
    laboratorio: faMicroscope, // ✅ 2. Agregado al objeto
    logout: faSignOutAlt
  };

  perfil = signal<PerfilEmpleado | null>(null);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.uid) {
      this.empleadoService.obtenerPerfil(user.uid).then(p => {
        if (p) this.perfil.set(p);
      });
    }
  }

  handleImageError(event: any) { event.target.src = this.defaultImage; }

  // --- PERMISOS DINÁMICOS ---

  get esAdministrativo(): boolean {
    const p = this.perfil()?.puesto;
    return p === 'Secretaria/o' || p === 'Recepcionista';
  }

  get esJefe(): boolean {
    return this.perfil()?.esJefe || false;
  }

  get accesoInsumos(): boolean {
    const p = this.perfil()?.puesto;
    return p === 'Enfermero/a' || p === 'Técnico/a de Laboratorio' || this.esJefe;
  }

  get esEnfermeria(): boolean {
    const p = this.perfil()?.puesto;
    return p === 'Enfermero/a' || this.esJefe;
  }

  // ✅ 3. Lógica para el Técnico de Laboratorio
  get esLaboratorio(): boolean {
    const p = this.perfil()?.puesto;
    return p === 'Técnico/a de Laboratorio' || this.esJefe;
  }
}
