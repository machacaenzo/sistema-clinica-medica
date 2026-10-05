import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

// Servicios
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';

// Interfaces
import { Paciente } from '../../../../core/interfaces/paciente.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faStickyNote, faBullseye, faSave, faWeight, faHeartbeat, faVial
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-notas-objetivos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './notas-objetivos.component.html',
  styleUrls: ['./notas-objetivos.component.scss']
})
export class NotasObjetivosComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private pacienteService = inject(PacienteService);
  private notificacionService = inject(NotificacionService);

  @Input({ required: true }) paciente!: Paciente;

  icons = {
    nota: faStickyNote,
    meta: faBullseye,
    save: faSave,
    peso: faWeight,
    presion: faHeartbeat,
    lab: faVial
  };

  form: FormGroup;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
      nota: [''],
      // Metas Terapéuticas
      metaPeso: [''],
      metaPresion: [''],
      metaHba1c: [''],
      metaLdl: ['']
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paciente'] && this.paciente) {
      // Cargamos los datos existentes al formulario
      this.form.patchValue({
        nota: this.paciente.notasContexto || '',
        metaPeso: this.paciente.metasSalud?.metaPeso || '',
        metaPresion: this.paciente.metasSalud?.metaPresionSistolica || '',
        metaHba1c: this.paciente.metasSalud?.metaHba1c || '',
        metaLdl: this.paciente.metasSalud?.metaLdl || ''
      });
    }
  }

  async guardar() {
    if (!this.paciente.uid) return;
    this.guardando = true;

    const val = this.form.value;

    // Preparamos el objeto parcial para actualizar
    // Usamos null si está vacío para limpiar el campo en BD
    const updateData: Partial<Paciente> = {
      notasContexto: val.nota || null,
      metasSalud: {
        metaPeso: val.metaPeso ? Number(val.metaPeso) : null, // undefined para que no se guarde si está vacío
        metaPresionSistolica: val.metaPresion ? Number(val.metaPresion) : null,
        metaHba1c: val.metaHba1c ? Number(val.metaHba1c) : null,
        metaLdl: val.metaLdl ? Number(val.metaLdl) : null
      }
    };

    try {
      await this.pacienteService.actualizarPaciente(this.paciente.uid, updateData);
      this.notificacionService.showSuccessToast('Objetivos y notas actualizados.');
    } catch (error) {
      console.error(error);
      this.notificacionService.showAlertError('Error', 'No se pudo guardar.');
    } finally {
      this.guardando = false;
    }
  }
}
