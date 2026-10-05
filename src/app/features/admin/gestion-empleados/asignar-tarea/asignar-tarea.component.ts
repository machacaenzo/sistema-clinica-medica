import { Component, inject, signal, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faPlus, faTrash, faSave, faClipboardCheck, faTasks, faTimes, faPen, faBan } from '@fortawesome/free-solid-svg-icons';
import { TareaService } from './tarea.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Tarea, TareaPlantilla } from '../../../../core/interfaces/tarea.model';

@Component({
  selector: 'app-asignar-tarea',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './asignar-tarea.component.html',
  styleUrls: ['../gestion-empleados.component.scss']
})
export class AsignarTareaComponent implements OnInit {
  private tareaService = inject(TareaService);
  private notificationService = inject(NotificacionService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  @Input({ required: true }) empleado: any;
  @Output() cerrar = new EventEmitter<void>();

  icons = { faPlus, faTrash, faSave, faClipboardCheck, faTasks, faTimes, faPen, faBan };

  // ✅ CAMBIO: Ya no usamos toSignal directo porque necesitamos el UID primero
  plantillas = signal<TareaPlantilla[]>([]);
  tareasDelEmpleado = signal<Tarea[]>([]);

  currentUserUid: string | undefined; // ID del Jefe/Admin

  tareaForm: FormGroup;
  tareaEnEdicionId: string | null = null;

  constructor() {
    this.tareaForm = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: ['', Validators.required],
      prioridad: ['Media', Validators.required],
      fechaLimite: ['', Validators.required]
    });
  }

  ngOnInit() {
    // 1. Obtener quién está logueado (El que asigna la tarea)
    const user = this.authService.currentUser();
    this.currentUserUid = user?.uid;

    if (this.currentUserUid) {
      // ✅ Cargar SOLO las plantillas de este usuario
      this.tareaService.obtenerPlantillasPorPropietario(this.currentUserUid).subscribe(data => {
        this.plantillas.set(data);
      });
    }

    // 2. Cargar tareas del empleado
    if (this.empleado?.uid) {
      this.tareaService.obtenerTareasPorEmpleado(this.empleado.uid).subscribe(tareas => {
        this.tareasDelEmpleado.set(tareas);
      });
    }
  }

  // --- PLANTILLAS ---
  usarPlantilla(plantilla: TareaPlantilla) {
    this.tareaForm.patchValue({
      titulo: plantilla.titulo,
      descripcion: plantilla.descripcion
    });
  }

  async guardarComoPlantilla() {
    const form = this.tareaForm.value;
    if (!form.titulo || !form.descripcion) {
      this.notificationService.showAlertWarning('Faltan datos', 'Completa título y descripción.');
      return;
    }

    if (!this.currentUserUid) return; // Seguridad extra

    try {
      // ✅ Guardamos con el dueño
      const nuevaPlantilla: TareaPlantilla = {
        idPropietario: this.currentUserUid,
        titulo: form.titulo,
        descripcion: form.descripcion
      };

      await this.tareaService.crearPlantilla(nuevaPlantilla);
      this.notificationService.showInfoToast('Plantilla guardada');
    } catch (e) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la plantilla.');
    }
  }

  async borrarPlantilla(id: string, event: Event) {
    event.stopPropagation();
    const confirm = await this.notificationService.showConfirm('Borrar', '¿Eliminar plantilla?');
    if (confirm.isConfirmed) {
      try { await this.tareaService.eliminarPlantilla(id); } catch (e) {}
    }
  }

  // --- TAREAS (CRUD) ---
editarTarea(tarea: Tarea) {
    // 🔒 BLOQUEO: Solo pendientes
    if (tarea.estado !== 'Pendiente') {
      this.notificationService.showAlertWarning('Acción bloqueada', 'No se puede editar una tarea que ya ha iniciado o finalizado.');
      return;
    }

    this.tareaEnEdicionId = tarea.id!;
    this.tareaForm.patchValue({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion,
      prioridad: tarea.prioridad,
      fechaLimite: tarea.fechaLimite
    });
  }


  cancelarEdicion() {
    this.tareaEnEdicionId = null;
    this.tareaForm.reset({ prioridad: 'Media' });
  }

  async guardarTarea() {
    if (this.tareaForm.invalid) {
      this.tareaForm.markAllAsTouched();
      return;
    }

    const form = this.tareaForm.value;

    try {
      if (this.tareaEnEdicionId) {
        await this.tareaService.actualizarTarea(this.tareaEnEdicionId, {
          titulo: form.titulo,
          descripcion: form.descripcion,
          prioridad: form.prioridad,
          fechaLimite: form.fechaLimite
        });
        this.notificationService.showSuccessToast('Tarea actualizada');
        this.cancelarEdicion();
      } else {
        const nuevaTarea: Tarea = {
          idEmpleado: this.empleado.uid,
          idCreador: this.currentUserUid || 'SISTEMA', // El jefe actual
          titulo: form.titulo,
          descripcion: form.descripcion,
          prioridad: form.prioridad,
          estado: 'Pendiente',
          fechaCreacion: Timestamp.now(),
          fechaLimite: form.fechaLimite
        };
        await this.tareaService.crearTarea(nuevaTarea);
        this.notificationService.showSuccessToast('Tarea asignada');
        this.tareaForm.reset({ prioridad: 'Media' });
      }
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la tarea.');
    }
  }

  async borrarTarea(tarea: Tarea) {
    // 🔒 BLOQUEO: Solo pendientes
    if (tarea.estado !== 'Pendiente') {
      this.notificationService.showAlertWarning('Acción bloqueada', 'No se puede eliminar una tarea en curso o completada. Debe completarla o cancelarla desde el panel del empleado.');
      return;
    }

    const confirm = await this.notificationService.showConfirm('Eliminar', '¿Borrar tarea asignada?');

    if (confirm.isConfirmed && tarea.id) {
      // Si justo estábamos editando esa, cancelamos la edición
      if (this.tareaEnEdicionId === tarea.id) this.cancelarEdicion();

      try {
        await this.tareaService.eliminarTarea(tarea.id);
        this.notificationService.showInfoToast('Tarea eliminada');
      } catch (e) {
        this.notificationService.showAlertError('Error', 'No se pudo eliminar.');
      }
    }
  }

  cerrarModal() { this.cerrar.emit(); }
}
