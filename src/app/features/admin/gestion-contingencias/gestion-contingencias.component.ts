import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../../core/services/turnos.service';
import { MedicoService } from '../gestion-medicos/medico.service';
import { NotificacionesInternasService } from '../../../core/services/notificaciones-internas.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, faUserMd, faCalendarTimes, faSync, faBell,faClock } from '@fortawesome/free-solid-svg-icons';
import { writeBatch, doc, collection, getDocs, query, where, Firestore } from '@angular/fire/firestore';
import { NotificacionService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-gestion-contingencias',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './gestion-contingencias.component.html'
})
export class GestionContingenciasComponent {
  private turnosService = inject(TurnosService);
  private medicoService = inject(MedicoService);
  private notifService = inject(NotificacionesInternasService);
  private firestore = inject(Firestore);
  private notificaciones = inject(NotificacionService);

  icons = { clock:faClock,alert: faExclamationTriangle, doctor: faUserMd, calendar: faCalendarTimes, sync: faSync, bell: faBell };

  // Estados
  medicos = signal<any[]>([]); // Lista de todos los médicos
  medicoAusenteId = signal('');
  fechaAusencia = signal(new Date().toISOString().split('T')[0]);

  turnosAfectados = signal<any[]>([]);
  buscando = signal(false);
  procesando = signal(false);

  constructor() {
    this.medicoService.obtenerMedicosCompletos().subscribe(res => this.medicos.set(res));
  }

  async buscarAfectados() {
    if (!this.medicoAusenteId()) return;
    this.buscando.set(true);
    this.turnosAfectados.set([]);

    try {
      const q = query(
        collection(this.firestore, 'turnos'),
        where('idMedico', '==', this.medicoAusenteId()),
        where('fechaString', '==', this.fechaAusencia()),
        where('estado', 'in', ['Confirmado', 'Pendiente de Pago'])
      );

      const snap = await getDocs(q);
      const turnosPrevios = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const listaConReemplazos = [];

      for (const turno of turnosPrevios) {
        // 🔍 BUSCAR REEMPLAZO EN TIEMPO REAL PARA ESTA FILA
        // Forzamos la fecha a mediodía para evitar errores de zona horaria
        const fechaObj = new Date(turno.fechaString + 'T12:00:00');

        let medicoEncontrado = null;
        const otrosMedicos = this.medicos().filter(m => m.uid !== this.medicoAusenteId());

        for (const m of otrosMedicos) {
          const slots = await this.turnosService.generarSlotsDisponibles(m, fechaObj);
          // IMPORTANTE: Trim() para evitar errores de espacios en el string de hora
          if (slots.map(s => s.trim()).includes(turno.hora.trim())) {
            medicoEncontrado = m;
            break;
          }
        }

        listaConReemplazos.push({
          ...turno,
          reemplazoSugerido: medicoEncontrado, // Guardamos el objeto del médico si lo halló
          posibleReemplazo: !!medicoEncontrado // Flag booleano para el HTML
        });
      }

      this.turnosAfectados.set(listaConReemplazos);

    } catch (e) {
      console.error(e);
    } finally {
      this.buscando.set(false);
    }
  }

  // Ahora el método de ejecución masiva es mucho más simple porque el trabajo ya se hizo arriba
  async ejecutarReubicacionMasiva() {
    this.procesando.set(true);
    const batch = writeBatch(this.firestore);
    const afectados = this.turnosAfectados();

    for (const turno of afectados) {
      const turnoRef = doc(this.firestore, 'turnos', turno.id);

      if (turno.posibleReemplazo) {
        // CAMINO A: REUBICAR
        batch.update(turnoRef, {
          idMedico: turno.reemplazoSugerido.uid,
          'medicoData.nombre': turno.reemplazoSugerido.displayName,
          estado: 'Confirmado',
          reubicadoPorContingencia: true
        });

        await this.notifService.enviar({
          idPaciente: turno.idPaciente,
          titulo: '✨ Turno Reasignado',
          mensaje: `Tu cita fue asignada al Dr/a. ${turno.reemplazoSugerido.displayName} por ausencia del anterior profesional. Precio protegido.`,
          tipo: 'INFO',
          link: '/public/mis-turnos'
        });
      } else {
        // CAMINO B: CANCELAR (RESCATE)
        batch.update(turnoRef, {
          estado: 'Cancelado',
          motivoCancelacion: 'AUSENCIA_MEDICA_SIN_CUPO'
        });

        await this.notifService.enviar({
          idPaciente: turno.idPaciente,
          titulo: '⚠️ Cita Cancelada',
          mensaje: `Lamentamos informar que el médico no asistirá y no hay cupos disponibles. Tienes prioridad para una nueva reserva.`,
          tipo: 'ALERTA'
        });
      }
    }

    await batch.commit();
    this.procesando.set(false);
    this.turnosAfectados.set([]);
    this.notificaciones.showSuccessToast('Protocolo de contingencia aplicado con éxito.');
  }
}
