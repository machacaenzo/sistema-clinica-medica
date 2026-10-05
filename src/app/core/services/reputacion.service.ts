import { Injectable, inject } from '@angular/core';
import { Firestore, doc, updateDoc, increment, Timestamp, getDoc } from '@angular/fire/firestore';
import { TransaccionesService } from './transacciones.service';
import { NotificacionService } from './notificaciones.service';

@Injectable({ providedIn: 'root' })
export class ReputacionService {
  private firestore = inject(Firestore);
  private transacciones = inject(TransaccionesService);
  private notify = inject(NotificacionService);

  private readonly COL_PACIENTES = 'pacientes';

  /**
   * Penaliza al paciente por no asistir a un turno de EFECTIVO.
   * Baja 30 puntos. Si llega a < 40, lo bloquea.
   */
  async penalizarPorInasistencia(idPaciente: string, idTurno: string) {
    const pacienteRef = doc(this.firestore, this.COL_PACIENTES, idPaciente);

    // Usamos increment para que sea una operación atómica en Firebase
    await updateDoc(pacienteRef, {
      reputacion: increment(-30),
      inasistenciasEfectivo: increment(1)
    });

    // Verificamos si hay que bloquear (esto se podría hacer con un effect o post-update)
    // Para simplificar el TFI, el bloqueo lo chequeamos en el Wizard de turnos.
    console.log(`⚠️ Paciente ${idPaciente} penalizado por inasistencia en turno ${idTurno}`);
  }

  /**
   * Proceso de rehabilitación (Lo usa la secretaria)
   */
  async rehabilitarPaciente(idPaciente: string, montoMulta: number, adminEmail: string) {
    const pacienteRef = doc(this.firestore, this.COL_PACIENTES, idPaciente);

    // 1. Registramos el ingreso de dinero en la caja
    await this.transacciones.registrarIngresoDirecto({
      idPaciente: idPaciente,
      idTurno: '', // Sin turno asociado, es una multa
      monto: montoMulta,
      tipo: 'INGRESO',
      fecha: Timestamp.now(),
      usuarioResponsable: adminEmail,
      motivo: 'Pago de multa por inasistencias reiteradas - REHABILITACIÓN'
    });

    // 2. Limpiamos su historial de reputación
    await updateDoc(pacienteRef, {
      reputacion: 100,
      inasistenciasEfectivo: 0,
      estadoReputacion: 'SALUDABLE',
      multaPendiente: 0
    });

    this.notify.showSuccessToast('Paciente rehabilitado y multa cobrada.');
  }

   /**
   * Verifica si un paciente tiene permitido pagar en efectivo.
   * Si tiene menos de 40 puntos, se le bloquea.
   */
  async puedePagarEfectivo(uid: string): Promise<boolean> {
    const docRef = doc(this.firestore, 'pacientes', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return true; // Paciente nuevo, confiamos

    const data = snap.data();
    const puntos = data['reputacion'] ?? 100;
    return puntos >= 40;
  }
}
