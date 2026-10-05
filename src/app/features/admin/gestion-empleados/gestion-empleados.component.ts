import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { EmpleadoService } from './empleado.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ClinicaService } from '../config-clinica/clinica.service';

import { DiaSemana, JornadaLaboral, PerfilEmpleado } from '../../../core/interfaces/perfil-empleado.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faTimes, faUserNurse, faClock, faIdCard, faBriefcase, faPlus, faTrash, faClipboardList
} from '@fortawesome/free-solid-svg-icons';

import { AsignarTareaComponent } from './asignar-tarea/asignar-tarea.component';

@Component({
  selector: 'app-gestion-empleados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent, AsignarTareaComponent],
  templateUrl: './gestion-empleados.component.html',
  styleUrls: ['./gestion-empleados.component.scss']
})
export class GestionEmpleadosComponent {
  private empleadoService = inject(EmpleadoService);
  private notificationService = inject(NotificacionService);
  private clinicaService = inject(ClinicaService);
  private fb = inject(FormBuilder);

  readonly defaultImage = 'assets/user-default.jpg';

  icons = {
    faSearch, faEdit, faTimes, faUserNurse, faClock,
    faIdCard, faBriefcase, faPlus, faTrash, tareas: faClipboardList
  };

  // DATOS
  empleadosSignal = toSignal(this.empleadoService.obtenerEmpleados(), { initialValue: [] });
  searchTerm = signal('');

  horariosOptions: string[] = [];
  readonly diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // FILTROS
  filteredEmpleados = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.empleadosSignal().filter(e =>
      (e.nombre || '').toLowerCase().includes(term) ||
      (e.puesto || '').toLowerCase().includes(term) ||
      (e.cuil || '').includes(term)
    );
  });

  // ESTADOS
  isModalOpen = signal(false);
  isAsignarTareaOpen = signal(false);

  selectedEmpleado: PerfilEmpleado | null = null;
  empleadoParaTarea: PerfilEmpleado | null = null;

  empleadoForm: FormGroup;

  constructor() {
    this.generarOpcionesHorarias();

    this.empleadoForm = this.fb.group({
      puesto: ['', Validators.required],
      cuil: ['', [Validators.required, Validators.minLength(11)]],
      dias: this.fb.array([])
    });
  }

  // --- HELPERS ---
  generarOpcionesHorarias() {
    let minutos = 0;
    while (minutos < 1440) {
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      const horaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      this.horariosOptions.push(horaStr);
      minutos += 30;
    }
  }

  tieneHorarioActivo(e: PerfilEmpleado): boolean {
    return e.jornada?.some(d => d.activo) || false;
  }

  handleImageError(event: any) { event.target.src = this.defaultImage; }
  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }

  // --- FORM ARRAY (Jornada) ---
  get diasArray() { return this.empleadoForm.get('dias') as FormArray; }

  getFranjas(indexDia: number): FormArray {
    return this.diasArray.at(indexDia).get('franjas') as FormArray;
  }

  crearFranja(inicio = '08:00', fin = '16:00'): FormGroup {
    return this.fb.group({
      inicio: [inicio, Validators.required],
      fin: [fin, Validators.required]
    });
  }

  agregarFranja(indexDia: number) {
    this.getFranjas(indexDia).push(this.crearFranja());
  }

  eliminarFranja(indexDia: number, indexFranja: number) {
    this.getFranjas(indexDia).removeAt(indexFranja);
  }

  // --- MODAL EDICIÓN ---
  openEditModal(empleado: PerfilEmpleado) {
    this.selectedEmpleado = empleado;

    // ✅ CORRECCIÓN 1: Eliminamos la comparación con 'Sin asignar' que daba error.
    // Simplemente cargamos lo que tenga, o vacío.
    this.empleadoForm.patchValue({
      puesto: empleado.puesto || '',
      cuil: empleado.cuil || ''
    });

    this.diasArray.clear();

    this.diasSemana.forEach(diaNombre => {
      const jornadaGuardada = empleado.jornada?.find(d => d.dia === diaNombre);

      const diaGroup = this.fb.group({
        dia: [diaNombre],
        activo: [jornadaGuardada ? jornadaGuardada.activo : false],
        franjas: this.fb.array([])
      });

      const franjasArr = diaGroup.get('franjas') as FormArray;

      if (jornadaGuardada && jornadaGuardada.franjas && jornadaGuardada.franjas.length > 0) {
        jornadaGuardada.franjas.forEach((f) => {
          franjasArr.push(this.crearFranja(f.inicio, f.fin));
        });
      } else {
        franjasArr.push(this.crearFranja('08:00', '16:00'));
      }

      this.diasArray.push(diaGroup);
    });

    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedEmpleado = null;
  }

  async saveChanges() {
    if (this.empleadoForm.invalid) {
      this.empleadoForm.markAllAsTouched();
      return;
    }

    // Si por alguna razón selectedEmpleado es null, salimos para evitar errores
    if (!this.selectedEmpleado) return;

    const form = this.empleadoForm.value;
    const clinicaConfig = this.clinicaService.clinicaData();

    // Validación Horaria (Sin cambios)
    if (clinicaConfig) {
      const apertura = clinicaConfig.horarioApertura || '00:00';
      const cierre = clinicaConfig.horarioCierre || '23:59';
      for (let d of form.dias) {
        if (d.activo) {
          for (let f of d.franjas) {
            if (f.inicio < apertura || f.fin > cierre) {
              this.notificationService.showAlertWarning('Horario fuera de rango', `La clínica opera de ${apertura} a ${cierre}.`);
              return;
            }
            if (f.inicio >= f.fin) {
              this.notificationService.showAlertWarning('Error', 'Hora inicio debe ser menor al fin.');
              return;
            }
          }
        }
      }
    }

    const jornada: JornadaLaboral[] = form.dias.map((d: any) => ({
      dia: d.dia,
      activo: d.activo,
      franjas: d.franjas
    }));

    // ✅ CORRECCIÓN 2 (CRÍTICA): PROTECCIÓN DE DATOS
    // Usamos el spread operator (...) sobre selectedEmpleado PRIMERO.
    // Esto copia Nombre, Foto, UID y Estado original.
    // Luego sobrescribimos SOLO lo que cambió en este formulario.
    const perfilActualizado: PerfilEmpleado = {
      ...this.selectedEmpleado, // <--- Aquí se copian nombre y foto
      cuil: form.cuil,          // Sobrescribe CUIL
      puesto: form.puesto,      // Sobrescribe Puesto
      jornada: jornada          // Sobrescribe Jornada
      // 'estado' se mantiene el que tenía, o puedes forzarlo si quieres.
    };

    try {
      await this.empleadoService.crearPerfil(perfilActualizado);
      this.notificationService.showSuccessToast('Perfil actualizado correctamente');
      this.closeModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los datos.');
    }
  }

  // --- TAREAS ---
  openAsignarTarea(empleado: PerfilEmpleado) {
    this.empleadoParaTarea = empleado;
    this.isAsignarTareaOpen.set(true);
  }

  closeAsignarTarea() {
    this.isAsignarTareaOpen.set(false);
    this.empleadoParaTarea = null;
  }
}
