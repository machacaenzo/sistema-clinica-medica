import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop'; // ✅ Requerido para tiempo real
import { map } from 'rxjs/operators';

// Servicios
import { MedicoAgendaService } from '../../services/medico-agenda.service';
import { AuthService } from '../../../../core/services/auth.service';
import { LaboratorioService } from '../../../empleados/laboratorio/laboratorio.service';

// Interfaces
import { Turno } from '../../../../core/interfaces/turno.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDay, faClock, faUserInjured, faStethoscope,
  faCheckCircle, faSpinner, faHistory, faVideo, faLink,
  faFileMedical, faVial
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mis-pacientes',
  standalone: true,
  imports: [CommonModule, FaIconComponent, RouterModule],
  templateUrl: './mis-pacientes.component.html',
  styleUrls: ['./mis-pacientes.component.scss']
})
export class MisPacientesComponent {
  private agendaService = inject(MedicoAgendaService);
  private authService = inject(AuthService);
  private router = inject(Router);

  icons = {
    agenda: faCalendarDay,
    reloj: faClock,
    paciente: faUserInjured,
    atender: faStethoscope,
    listo: faCheckCircle,
    espera: faSpinner,
    historial: faHistory,
    video: faVideo,
    link: faLink,
    registrar: faFileMedical,
    lab: faVial
  };

  
  // 1. Obtenemos el usuario actual (Signal)
  private user = this.authService.currentUser;

  // 2. ✅ CONEXIÓN EN TIEMPO REAL (Nivel Dios)
  // toSignal se suscribe automáticamente al Observable del servicio que usa collectionData.
  // Si algo cambia en Firebase, esta señal emite el nuevo valor y Angular redibuja solo lo necesario.
  pacientesHoy = toSignal(
    this.agendaService.obtenerAgendaHoy(this.user()?.uid || ''),
    { initialValue: [] }
  );

  // 3. ✅ MÉTRICAS COMPUTADAS (KPIs)
  // Se recalculan solas cada vez que 'pacientesHoy' cambia.
  pendientes = computed(() =>
    this.pacientesHoy().filter(t => ['Confirmado', 'En Sala'].includes(t.estado)).length
  );

  atendidos = computed(() =>
    this.pacientesHoy().filter(t => t.estado === 'Finalizado').length
  );

  // Estado de carga basado en si la señal ya recibió datos
  loading = computed(() => this.pacientesHoy().length === 0 && this.pendientes() === 0 && this.atendidos() === 0);

  // ✅ NAVEGACIÓN INTELIGENTE
  atender(turno: Turno) {
    if (turno.tipo === 'VIDEO') {
      this.router.navigate(['/medico/atender-video', turno.id]);
    } else {
      this.router.navigate(['/medico/atender', turno.id]);
    }
  }

  // Nota: t.estudiosListos ahora se lee directamente del objeto Turno
  // gracias al Batch que hicimos en el servicio de laboratorio.
}
