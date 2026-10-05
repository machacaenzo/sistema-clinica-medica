import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Servicios
import { AuthService } from '../../../core/services/auth.service';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faBars, faXmark, faChevronDown, faUser, faRightFromBracket,
  faBuilding, faUsers, faNotesMedical, faCalendarPlus, faFileMedical,
  faHeartbeat,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import { ClinicaService } from '../../../features/admin/config-clinica/clinica.service';
import { PacienteService } from '../../../features/admin/gestion-pacientes/paciente.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { NotificacionesBadgeComponent } from "../notificaciones-badge/notificaciones-badge.component";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FaIconComponent, NotificacionesBadgeComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  public authService = inject(AuthService); // Público para usar en HTML
  private clinicaService = inject(ClinicaService);

  // Estados de los Menús
  public isMenuCollapsed = signal(true);
  public isProfileDropdownOpen = signal(false);
  public isInstitucionalOpen = signal(false);
   private pacienteService = inject(PacienteService);


   user = this.authService.currentUser;
   // 2. 🛰️ ESCUCHA EN TIEMPO REAL AL PERFIL
  // toSignal mantiene el Navbar sincronizado con los permisos de Firebase
  perfilPaciente = toSignal(
    this.pacienteService.obtenerPacienteSnapshot(this.user()?.uid || ''),
    { initialValue: undefined }
  );

  // 3. 🧠 LÓGICA DE VISIBILIDAD (Nivel Dios)
  // Solo mostramos el link de mediciones si el array tiene al menos una de las 4 médicas
  mostrarMediciones = computed(() => {
    const modulos = this.perfilPaciente()?.modulosHabilitados || [];
    const medicos = ['PRESION', 'PESO', 'GLUCEMIA', 'TEMPERATURA'];
    return modulos.some(m => medicos.includes(m));
  });


  // Datos
  clinicaInfo = this.clinicaService.clinicaData;

  // Iconos
  icons = {
    menu: faBars,
    close: faXmark,
    chevron: faChevronDown,
    user: faUser,
    // logout: faRightFromBracket,
    building: faBuilding,
    staff: faUsers,
    os: faNotesMedical,
    addTurno: faCalendarPlus,
    misTurnos: faFileMedical,
    historial: faFileMedical,
  presion: faHeartbeat,
  logout: faSignOutAlt,
  };

  // --- MÉTODOS DE TOGGLE (INTERACCIÓN) ---

  toggleMenu() {
    this.isMenuCollapsed.update(v => !v);
    this.closeDropdowns(); // Cierra los otros si abres el menú móvil
  }

  toggleProfile() {
    this.isProfileDropdownOpen.update(v => !v);
    this.isInstitucionalOpen.set(false); // Cierra institucional si abres perfil
  }

  toggleInstitucional() {
    this.isInstitucionalOpen.update(v => !v);
    this.isProfileDropdownOpen.set(false); // Cierra perfil si abres institucional
  }

  // Método para cerrar todo cuando se hace clic en un link
  closeAll() {
    this.isMenuCollapsed.set(true);
    this.closeDropdowns();
  }

  private closeDropdowns() {
    this.isProfileDropdownOpen.set(false);
    this.isInstitucionalOpen.set(false);
  }

  logout() {
    this.closeAll();
    this.authService.logout();
  }

}
