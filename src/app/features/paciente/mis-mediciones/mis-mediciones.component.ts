import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';
import { from } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { MedicionesService } from '../services/mediciones.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service'; // ✅ Nuevo

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faHeartbeat, faWeight, faTint, faThermometerHalf,
  faPlus, faSave, faHistory, faLock
} from '@fortawesome/free-solid-svg-icons';
import { Medicion } from '../../../core/interfaces/mediciones.model';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-mis-mediciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent,RouterLink ],
  templateUrl: './mis-mediciones.component.html',
  styleUrls: ['./mis-mediciones.component.scss']
})
export class MisMedicionesComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private medicionesService = inject(MedicionesService);
  private pacienteService = inject(PacienteService); // ✅ Inyectar
  private notificacionService = inject(NotificacionService);
  private router = inject(Router);

  icons = {
    presion: faHeartbeat, peso: faWeight, glucemia: faTint,
    temp: faThermometerHalf, add: faPlus, save: faSave, history: faHistory,
    lock: faLock
  };

  user = this.authService.currentUser();

   // 1. ✅ CONEXIÓN LIMPIA Y REACTIVA
  // Ya no usamos 'from', usamos el método que devuelve el Observable directo
  perfil = toSignal(
    this.pacienteService.obtenerPacienteSnapshot(this.user?.uid || ''),
    { initialValue: undefined } // ✅ Usamos undefined para coincidir con el tipo
  );

  // 2. Lógica de Filtrado (Ahora sin errores de tipos)
  modulosDisponibles = computed(() => {
    // Si perfil() es undefined (mientras carga), devolvemos array vacío
    const habilitados = this.perfil()?.modulosHabilitados || [];

    const todos = [
      { id: 'PRESION', label: 'Presión Arterial', icon: this.icons.presion },
      { id: 'PESO', label: 'Peso Corporal', icon: this.icons.peso },
      { id: 'GLUCEMIA', label: 'Glucemia (Azúcar)', icon: this.icons.glucemia },
      { id: 'TEMPERATURA', label: 'Temperatura', icon: this.icons.temp }
    ];

    return todos.filter(m => habilitados.includes(m.id));
  });

  historial = toSignal(
    this.medicionesService.obtenerHistorial(this.user?.uid || ''),
    { initialValue: [] }
  );

  form: FormGroup;
  guardando = signal(false);

  constructor() {
    this.form = this.fb.group({
      tipo: ['', Validators.required], // Empezamos vacío
      valor1: ['', [Validators.required, Validators.min(0)]],
      valor2: [''],
      notas: ['']
    });
  }

  async guardar() {
    if (this.form.invalid || !this.user?.uid) return;
    this.guardando.set(true);
    const val = this.form.value;

    const nueva: any = {
      idPaciente: this.user.uid,
      fecha: Timestamp.now(),
      tipo: val.tipo,
      valor1: Number(val.valor1),
      notas: val.notas || ''
    };

    if (val.tipo === 'PRESION' && val.valor2) {
      nueva.valor2 = Number(val.valor2);
    }

    try {
      await this.medicionesService.registrarMedicion(nueva);
      this.notificacionService.showSuccessToast('Medición registrada.');
      this.form.patchValue({ valor1: '', valor2: '', notas: '' });
      this.form.markAsPristine();
    } catch (e) {
      this.notificacionService.showAlertError('Error', 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
