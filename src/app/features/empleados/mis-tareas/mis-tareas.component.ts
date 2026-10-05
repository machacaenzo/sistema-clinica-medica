import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { TareaService } from '../../admin/gestion-empleados/asignar-tarea/tarea.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

// Interfaces
import { Tarea, EstadoTarea } from '../../../core/interfaces/tarea.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faClipboardList, faPlay, faCheck, faEye, faClock, faExclamationCircle, faTimes
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mis-tareas',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './mis-tareas.component.html',
  styleUrls: ['./mis-tareas.component.scss']
})
export class MisTareasComponent implements OnInit {
  private tareaService = inject(TareaService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificacionService);

  icons = { faClipboardList, faPlay, faCheck, faEye, faClock, faExclamationCircle, faTimes };

  // Datos Base
  currentUserId: string | undefined;

  // Signal principal que contiene TODAS las tareas
  allTareas = signal<Tarea[]>([]);

  // --- COMPUTED SIGNALS (Las 3 Columnas del Kanban) ---
  pendientes = computed(() => this.allTareas().filter(t => t.estado === 'Pendiente'));
  enProceso = computed(() => this.allTareas().filter(t => t.estado === 'En Proceso'));
  completadas = computed(() => this.allTareas().filter(t => t.estado === 'Completada'));

  // Estado del Modal Detalle
  isModalOpen = signal(false);
  selectedTarea = signal<Tarea | null>(null);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.uid) {
      this.currentUserId = user.uid;
      // Suscripción en tiempo real
      this.tareaService.obtenerTareasPorEmpleado(this.currentUserId).subscribe({
        next: (tareas) => this.allTareas.set(tareas),
        error: () => this.notificationService.showAlertError('Error', 'No se pudieron cargar las tareas.')
      });
    }
  }

  // --- ACCIONES ---

  async cambiarEstado(tarea: Tarea, nuevoEstado: EstadoTarea) {
    if (!tarea.id) return;

    try {
      await this.tareaService.actualizarTarea(tarea.id, { estado: nuevoEstado });

      // Feedback visual rápido
      if (nuevoEstado === 'En Proceso') {
        this.notificationService.showInfoToast('Tarea iniciada');
      } else if (nuevoEstado === 'Completada') {
        this.notificationService.showSuccessToast('Tarea completada ¡Buen trabajo!');
      }
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo actualizar el estado.');
    }
  }

  // --- MODAL DETALLE ---
  abrirDetalle(tarea: Tarea) {
    this.selectedTarea.set(tarea);
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
    this.selectedTarea.set(null);
  }

  // Helper visual para prioridades
  getPrioridadColor(prioridad: string): string {
    switch (prioridad) {
      case 'Alta': return 'text-red-600 bg-red-100 border-red-200';
      case 'Media': return 'text-amber-600 bg-amber-100 border-amber-200';
      case 'Baja': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  }
}
