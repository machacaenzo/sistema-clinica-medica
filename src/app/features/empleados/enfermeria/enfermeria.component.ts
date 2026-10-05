import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Servicios
import { TurnosService } from '../../../core/services/turnos.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

// Interfaces
import { Turno } from '../../../core/interfaces/turno.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserNurse, faHeartbeat, faWeight, faRulerVertical,
  faThermometerHalf, faSave, faArrowRight, faCheck
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-enfermeria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './enfermeria.component.html',
  styleUrls: ['./enfermeria.component.scss']
})
export class EnfermeriaComponent implements OnInit {
  private turnosService = inject(TurnosService);
  private notificacionService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  icons = {
    nurse: faUserNurse, presion: faHeartbeat, peso: faWeight,
    altura: faRulerVertical, temp: faThermometerHalf, save: faSave,
    next: faArrowRight, check: faCheck
  };

  turnosHoy = signal<Turno[]>([]);

  pacientesEnEspera = computed(() =>
    this.turnosHoy().filter(t => t.estado === 'Confirmado')
  );

  pacientesListos = computed(() =>
    this.turnosHoy().filter(t => t.estado === 'En Sala')
  );

  isModalOpen = signal(false);
  turnoSeleccionado: Turno | null = null;
  triageForm: FormGroup;

  // Signals para el IMC
  imcCalculado = signal<string>('-');
  estadoImc = signal<string>('');

  constructor() {
    this.triageForm = this.fb.group({
      presion: ['', [Validators.required, Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],
      peso: [null, [Validators.required, Validators.min(1)]],
      altura: [null, [Validators.required, Validators.min(1)]],
      temperatura: [null, [Validators.required, Validators.min(30), Validators.max(45)]],
      saturacion: ['']
    });
  }

  ngOnInit() {
    // Escuchamos cambios en todo el formulario
    this.triageForm.valueChanges.subscribe(val => {
      // Forzamos el cálculo cada vez que cambie cualquier valor
      this.calcularIMC(val.peso, val.altura);
    });

    this.cargarTurnos();
  }

  cargarTurnos() {
    this.turnosService.obtenerTodosLosTurnos().subscribe(turnos => {
      const date = new Date();
      const hoy = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      this.turnosHoy.set(turnos.filter(t => t.fechaString === hoy));
    });
  }

  // ✅ MÉTODO CORREGIDO Y MÁS ROBUSTO
  calcularIMC(peso: any, altura: any) {
    // Convertimos a número por si vienen como string o null
    const p = parseFloat(peso);
    const a = parseFloat(altura);

    if (p > 0 && a > 0) {
      const alturaMetros = a / 100;
      const imc = p / (alturaMetros * alturaMetros);

      this.imcCalculado.set(imc.toFixed(1));

      // Determinamos el estado
      if (imc < 18.5) this.estadoImc.set('Bajo Peso');
      else if (imc < 25) this.estadoImc.set('Normal');
      else if (imc < 30) this.estadoImc.set('Sobrepeso');
      else this.estadoImc.set('Obesidad');
    } else {
      // Si no hay valores válidos, reseteamos
      this.imcCalculado.set('-');
      this.estadoImc.set('');
    }
  }

  abrirTriage(turno: Turno) {
    this.turnoSeleccionado = turno;
    this.triageForm.reset();
    this.imcCalculado.set('-');
    this.estadoImc.set('');
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
    this.turnoSeleccionado = null;
  }

  async guardarTriage() {
    if (this.triageForm.invalid) {
      this.triageForm.markAllAsTouched();
      this.notificacionService.showAlertWarning('Datos', 'Completa los campos obligatorios correctamente.');
      return;
    }

    if (!this.turnoSeleccionado?.id) return;
    const form = this.triageForm.value;

    const datosTriage = {
      signosVitales: {
        presion: form.presion,
        peso: Number(form.peso),
        altura: Number(form.altura),
        temperatura: Number(form.temperatura),
        saturacion: Number(form.saturacion),
        imc: parseFloat(this.imcCalculado())
      },
      estado: 'En Sala'
    };

    try {
      await this.turnosService.actualizarTriage(this.turnoSeleccionado.id, datosTriage);
      this.notificacionService.showSuccessToast('Signos vitales registrados.');
      this.cerrarModal();
    } catch (error) {
      this.notificacionService.showAlertError('Error', 'No se pudo guardar.');
    }
  }
}
