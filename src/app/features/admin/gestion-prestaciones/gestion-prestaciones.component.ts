import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { NotificacionService } from '../../../core/services/notificaciones.service';
import { Prestacion } from '../../../core/interfaces/prestacion.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faNotesMedical, faPlus, faEdit, faTrash, faTimes, faSave, faStethoscope } from '@fortawesome/free-solid-svg-icons';
import { PrestacionesService } from './prestaciones.service';
import { ServiciosDiagnosticoService } from '../gestion-servicios-diagnostico/servicios-diagnostico.service';

@Component({
  selector: 'app-gestion-prestaciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-prestaciones.component.html',
  styleUrls: ['../_admin-theme.scss'] // Heredamos estilos del admin
})
export class GestionPrestacionesComponent {
  private prestacionesService = inject(PrestacionesService);
  private notificationService = inject(NotificacionService);
  private fb = inject(FormBuilder);
  private serviciosService = inject(ServiciosDiagnosticoService);

  icons = { service: faNotesMedical, plus: faPlus, edit: faEdit, trash: faTrash, close: faTimes, save: faSave, general: faStethoscope };
  serviciosDisponibles = toSignal(this.serviciosService.obtenerTodos(), { initialValue: [] });
  // Datos
  prestaciones = toSignal(this.prestacionesService.obtenerTodas(), { initialValue: [] });

  // Modal
  isModalOpen = signal(false);
  selectedPrestacion: Prestacion | null = null;
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      tipoFormulario: ['GENERAL', Validators.required],
      estado: ['Activa', Validators.required],
      idServicioRequerido: [''] 
    });
  }

  // --- ACCIONES ---

  abrirModal(prestacion?: Prestacion) {
    if (prestacion) {
      this.selectedPrestacion = prestacion;
      this.form.patchValue(prestacion);
    } else {
      this.selectedPrestacion = null;
      this.form.reset({
        tipoFormulario: 'GENERAL',
        estado: 'Activa'
      });
    }
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const data: Prestacion = {
      ...val,
      // Si editamos, mantenemos el ID, si no, se crea
    };

    try {
      if (this.selectedPrestacion && this.selectedPrestacion.id) {
        await this.prestacionesService.actualizar(this.selectedPrestacion.id, data);
        this.notificationService.showSuccessToast('Servicio actualizado');
      } else {
        await this.prestacionesService.crear(data);
        this.notificationService.showSuccessToast('Servicio creado');
      }
      this.cerrarModal();
    } catch (e) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar.');
    }
  }

  async borrar(p: Prestacion) {
    const confirm = await this.notificationService.showConfirm('Eliminar', `¿Borrar servicio "${p.nombre}"?`);
    if (confirm.isConfirmed && p.id) {
      try {
        await this.prestacionesService.borrar(p.id);
        this.notificationService.showSuccessToast('Eliminado correctamente');
      } catch (e) {
        this.notificationService.showAlertError('Error', 'No se pudo eliminar.');
      }
    }
  }

  // Helper visual para el tipo
  getTipoLabel(tipo: string): string {
    const map: any = {
      'GENERAL': 'Consulta Estándar',
      'APTO_FISICO': 'Apto Físico (Certificado)',
      'CONTROL_CRONICO': 'Control Crónicos (Gráficos)'
    };
    return map[tipo] || tipo;
  }
}
