import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Paciente } from '../../../../core/interfaces/paciente.model';
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AsistenteClinicoService, AlertaScreening } from '../../services/asistente-clinico.service';


import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAllergies, faTint, faIdCard, faPhone, faExclamationTriangle,
  faCheckCircle, faClock, faEdit, faTimes, faSave,
  faPills, faSyringe, faUsers, faWineGlassAlt, faSmoking, faRunning, faStethoscope
} from '@fortawesome/free-solid-svg-icons';
import { HabitosService } from '../../../paciente/services/habitos.service';
import { RadarSaludComponent } from "../../../../shared/components/radar-salud/radar-salud.component";

@Component({
  selector: 'app-detalle-paciente',
  standalone: true,
  imports: [CommonModule, FaIconComponent, FormsModule, RadarSaludComponent],
  templateUrl: './detalle-paciente.component.html',
  styleUrls: ['./detalle-paciente.component.scss']
})
export class DetallePacienteComponent implements OnChanges {
  @Input({ required: true }) paciente!: Paciente;
  @Input() foto!: string;
    @Input() historialPrevio: any[] = []; 
  private asistenteService = inject(AsistenteClinicoService);
  private pacienteService = inject(PacienteService);
  private habitosService = inject(HabitosService); // ✅ NUEVO
  private notificacionService = inject(NotificacionService);

  icons = {
    alergia: faAllergies, sangre: faTint, dni: faIdCard, tel: faPhone,
    alerta: faExclamationTriangle, check: faCheckCircle, pendiente: faClock,
    edit: faEdit, close: faTimes, save: faSave,
    meds: faPills, surgery: faSyringe, family: faUsers,
    alcohol: faWineGlassAlt, tabaco: faSmoking, actividad: faRunning, diabetes: faStethoscope
  };

  alertasPreventivas = signal<AlertaScreening[]>([]);
  ultimosHabitos = signal<any[]>([]); // ✅ Almacena el resultado de los tests


  isUpdateModalOpen = signal(false);
  alertaSeleccionada = signal<AlertaScreening | null>(null);
  fechaInput = signal('');
  tabActiva = signal<'estado' | 'detalles'>('estado');
  private mapCampos: {[key: string]: string} = {
    'PAP': 'fechaUltimoPap',
    'Mamografía': 'fechaUltimaMamo',
    'Video Colonoscopía': 'fechaUltimaColonoscopia',
    'Fondo de Ojo': 'fechaUltimoFondoOjo'
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paciente'] && this.paciente) {
      this.calcularAlertas();
      this.cargarUltimosHabitos(); // ✅ Cargar los tests al cambiar de paciente
    }
  }

  // ✅ Carga el último resultado de cada tipo de test (Alcohol, Tabaco, etc.)
  cargarUltimosHabitos() {
    this.habitosService.obtenerHistorial(this.paciente.uid).subscribe(res => {
      // Agrupamos por tipo y nos quedamos solo con el más reciente de cada uno
      const masRecientes = new Map();
      res.forEach(h => {
        if (!masRecientes.has(h.tipo)) {
          masRecientes.set(h.tipo, h);
        }
      });
      this.ultimosHabitos.set(Array.from(masRecientes.values()));
    });
  }

  calcularAlertas() {
    const resultados = this.asistenteService.analizarScreening(this.paciente);
    this.alertasPreventivas.set(resultados);
  }

  get tieneAlergias(): boolean {
    return (this.paciente.alergias?.length || 0) > 0;
  }

  // ... (modales y guardado se mantienen igual)
  abrirModalActualizar(alerta: AlertaScreening) {
    this.alertaSeleccionada.set(alerta);
    this.fechaInput.set(new Date().toISOString().split('T')[0]);
    this.isUpdateModalOpen.set(true);
  }

  cerrarModal() {
    this.isUpdateModalOpen.set(false);
    this.alertaSeleccionada.set(null);
  }

  async guardarActualizacion() {
    const alerta = this.alertaSeleccionada();
    if (!alerta || !this.fechaInput()) return;
    const campoDB = this.mapCampos[alerta.estudio];
    if (!campoDB) return;

    try {
      const historialActual = this.paciente.perfilClinico?.historialPreventivo || {};
      const historialNuevo = { ...historialActual, [campoDB]: this.fechaInput() };

      const updateData: Partial<Paciente> = {
        perfilClinico: {
          ...this.paciente.perfilClinico,
          historialPreventivo: historialNuevo,
          factoresRiesgo: this.paciente.perfilClinico?.factoresRiesgo || [],
          antecedentes: this.paciente.perfilClinico?.antecedentes || []
        }
      };

      await this.pacienteService.actualizarPaciente(this.paciente.uid, updateData);
      this.notificacionService.showSuccessToast('Historial actualizado.');

      if (this.paciente.perfilClinico) {
        this.paciente.perfilClinico.historialPreventivo = historialNuevo;
      }
      this.calcularAlertas();
      this.cerrarModal();

    } catch (error) {
      this.notificacionService.showAlertError('Error', 'No se pudo actualizar.');
    }
  }
}
