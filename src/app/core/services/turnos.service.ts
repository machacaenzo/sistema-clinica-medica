import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, query, where, getDocs, Timestamp,
  orderBy, collectionData, updateDoc, doc, writeBatch, getDoc, increment
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { Turno, EstadoTurno } from '../interfaces/turno.model';
import { ClinicaService } from '../../features/admin/config-clinica/clinica.service';
import { FirestoreService } from './firestore.service';
import { TransaccionesService } from './transacciones.service'; // ✅ INTEGRACIÓN FINANCIERA
import { Transaccion } from '../interfaces/transaccion.model';
import { MailService } from './mail.service';
import { UsuarioService } from '../../features/admin/gestion-usuarios/usuario.service';
import { ReputacionService } from './reputacion.service';

@Injectable({
  providedIn: 'root'
})
export class TurnosService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);
  private clinicaService = inject(ClinicaService);
  private transaccionesService = inject(TransaccionesService); // ✅ INYECTADO
  private mailService = inject(MailService);
  private usuarioService = inject(UsuarioService);
  private reputacionService = inject(ReputacionService)

  private readonly collectionPath = 'turnos';


  async cancelarTurno(turno: Turno, solicitadoPor: 'ADMIN' | 'PACIENTE'): Promise<void> {
    if (solicitadoPor === 'PACIENTE') {
      const ahora = new Date();
      const fechaTurno = new Date(`${turno.fechaString}T${turno.hora}:00`);
      const diferenciaHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      if (diferenciaHoras < 24) {
        throw new Error('PENALIZACION_TIEMPO');
      }
    }

    let montoAReembolsar = 0;

    if (turno.estado === 'Confirmado') {
      montoAReembolsar = (turno.montoAbonar || 0) + (turno.montoSaldoUsado || 0);
    }
    else if (turno.estado === 'Pendiente de Pago') {
      montoAReembolsar = (turno.montoSaldoUsado || 0);
    }

    if (montoAReembolsar > 0) {
      const transaccion: Transaccion = {
        fecha: Timestamp.now(),
        monto: montoAReembolsar,
        tipo: 'CREDITO',
        idPaciente: turno.idPaciente,
        idTurno: turno.id,
        usuarioResponsable: solicitadoPor,
        motivo: `Reembolso por cancelación (${turno.estado})`
      };

      try {
        await this.transaccionesService.registrarMovimiento(transaccion);
      } catch (e) {
        console.error('Error al procesar reembolso:', e);
      }
    }


    await this.firestoreService.updateDocument(this.collectionPath, turno.id!, { estado: 'Cancelado' });
  }

  async ejecutarLimpiezaDeTurnos(): Promise<void> {
    const colRef = collection(this.firestore, this.collectionPath);
    const ahora = new Date();

    const hoyCero = new Date();
    hoyCero.setHours(0, 0, 0, 0);

    const q = query(colRef, where('estado', 'in', ['Pendiente de Pago', 'Confirmado', 'En Sala']));
    const snapshot = await getDocs(q);

    const batch = writeBatch(this.firestore);
    let hayCambios = false;

    snapshot.docs.forEach(docSnap => {
      const t = docSnap.data() as Turno;
      // Protección por si la fecha viene mal en datos viejos
      if (!t.fecha) return;

      const fechaTurno = t.fecha.toDate();
      const turnoCero = new Date(fechaTurno);
      turnoCero.setHours(0, 0, 0, 0);

      let nuevoEstado: EstadoTurno | null = null;

      // =======================================================
      // 1. VERIFICAR PENDIENTES (Aquí estaba el problema)
      // =======================================================
      if (t.estado === 'Pendiente de Pago') {

        // A. CASO TRANSFERENCIA
        if (t.metodoPago === 'Transferencia') {
            // Caso 1: Tiene fecha de vencimiento y ya pasó
            if (t.fechaVencimientoReserva) {
                if (ahora > t.fechaVencimientoReserva.toDate() && !t.comprobanteBase64) {
                    nuevoEstado = 'Vencido';
                }
            }
            // Caso 2 (CORRECCIÓN): Es viejo, NO tiene fecha límite y NO tiene comprobante
            // Asumimos que está vencido para limpiar la base de datos
            else if (!t.comprobanteBase64) {
                nuevoEstado = 'Vencido';
            }
        }

        // B. CASO EFECTIVO (Si ya pasó el día)
        if (t.metodoPago === 'Efectivo') {
          if (turnoCero < hoyCero) {
            nuevoEstado = 'Vencido';
          }
        }
      }

      // =======================================================
      // 2. VERIFICAR AUSENTES (Confirmados que no fueron)
      // =======================================================
      if ((t.estado === 'Confirmado' || t.estado === 'En Sala') && turnoCero < hoyCero) {
        nuevoEstado = 'Ausente';
      }

      // Penalización (Solo si era Efectivo y no fue)
      if (t.metodoPago === 'Efectivo' && turnoCero < hoyCero && t.estado !== 'Vencido') {
         // Nota: Agregué t.estado !== 'Vencido' para no penalizar dos veces si cayó en el if de arriba
         nuevoEstado = 'Ausente';
         this.reputacionService.penalizarPorInasistencia(t.idPaciente, docSnap.id);
      }

      // APLICAR CAMBIOS
      if (nuevoEstado) {
        batch.update(docSnap.ref, { estado: nuevoEstado });
        hayCambios = true;
      }
    });

    if (hayCambios) {
      await batch.commit();
      console.log('🧹 Limpieza de turnos ejecutada (Vencidos y Ausentes).');
    }
  }


  async validarPosibilidadDeTurno(
    idPaciente: string,
    idMedico: string,
    fechaString: string,
    metodoPagoIntencional: string
  ): Promise<{ posible: boolean, mensaje: string }> {

    const colRef = collection(this.firestore, this.collectionPath);
    const ahora = new Date();

    const qDuplicados = query(
      colRef,
      where('idPaciente', '==', idPaciente),
      where('idMedico', '==', idMedico),
      where('fechaString', '==', fechaString),

      where('estado', 'in', ['Pendiente de Pago', 'Confirmado', 'En Sala', 'En Atencion'])
    );

    const snapDuplicados = await getDocs(qDuplicados);


    const duplicadoActivo = snapDuplicados.docs.some(doc => {
      const data = doc.data() as Turno;
      if (data.estado === 'Pendiente de Pago' && data.metodoPago === 'Transferencia' && data.fechaVencimientoReserva) {
        const vencimiento = data.fechaVencimientoReserva.toDate();
        if (ahora > vencimiento && !data.comprobanteBase64) return false;
      }
      return true;
    });

    if (duplicadoActivo) {
      return { posible: false, mensaje: 'Ya tienes un turno reservado con este médico para esa fecha.' };
    }

    if (metodoPagoIntencional.includes('Tarjeta') || metodoPagoIntencional.includes('Saldo') || metodoPagoIntencional.includes('Bonificado')) {
      return { posible: true, mensaje: 'OK' };
    }

    const qPendientes = query(
      colRef,
      where('idPaciente', '==', idPaciente),
      where('estado', '==', 'Pendiente de Pago')
    );
    const snapPendientes = await getDocs(qPendientes);

    let cantEfectivo = 0;
    let cantTransferencia = 0;

    snapPendientes.docs.forEach(doc => {
      const t = doc.data() as Turno;

      if (t.metodoPago === 'Efectivo') {
        cantEfectivo++;
      }
      else if (t.metodoPago === 'Transferencia') {
        let esValido = true;
        if (t.fechaVencimientoReserva) {
           const vencimiento = t.fechaVencimientoReserva.toDate();
           if (ahora > vencimiento && !t.comprobanteBase64) esValido = false;
        }
        if (esValido) cantTransferencia++;
      }
    });

    if (metodoPagoIntencional === 'Efectivo') {
      if (cantEfectivo >= 1) {
        return { posible: false, mensaje: 'Solo puedes tener 1 turno pendiente de pago en Efectivo.' };
      }
    }

    if (metodoPagoIntencional === 'Transferencia') {
      if (cantTransferencia >= 2) {
        return { posible: false, mensaje: 'Límite de 2 transferencias pendientes alcanzado. Sube los comprobantes o espera confirmación.' };
      }
    }

    return { posible: true, mensaje: 'OK' };
  }

  async generarSlotsDisponibles(medico: any, fecha: Date): Promise<string[]> {

    // 1. NORMALIZACIÓN DE FECHA (El arreglo del Domingo)
    // Creamos una copia y la forzamos a las 12:00 del mediodía.
    // Esto evita que por diferencia horaria (-3 GMT) caiga al día anterior.
    const fechaSegura = new Date(fecha);
    fechaSegura.setHours(12, 0, 0, 0);

    const fechaStr = this.formatearFechaLocal(fechaSegura);

    // 2. Feriados
    const config = await this.clinicaService.getSnapshotConfig();
    if (config?.feriados && config.feriados.some(f => f.fecha === fechaStr)) return [];

    // 3. Agenda (Usamos fechaSegura para obtener el día correcto)
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaNombre = diasSemana[fechaSegura.getDay()]; // getDay() ahora es seguro
    const agendaDia = medico.disponibilidad?.find((d: any) => d.dia === diaNombre);

    if (!agendaDia || !agendaDia.activo || !agendaDia.franjas || agendaDia.franjas.length === 0) return [];

    // 4. Slots Matemáticos
    let slotsPosibles: string[] = [];
    const duracion = medico.duracionTurno || 30;

    agendaDia.franjas.forEach((franja: any) => {
      const nuevosSlots = this.calcularIntervalos(franja.inicio, franja.fin, duracion);
      slotsPosibles = [...slotsPosibles, ...nuevosSlots];
    });

    // 5. Filtro Hora (Hoy)
    const ahora = new Date();
    const fechaStrHoy = this.formatearFechaLocal(ahora); // Usamos la misma función para comparar

    if (fechaStr === fechaStrHoy) {
      const limiteMinutos = (ahora.getHours() * 60 + ahora.getMinutes()) + 60; // 1 hora de margen
      slotsPosibles = slotsPosibles.filter(slot => this.convertirHoraAMinutos(slot) > limiteMinutos);
    }

    // 6. Filtro Ocupados (DB)
    const q = query(
      collection(this.firestore, this.collectionPath),
      where('idMedico', '==', medico.uid),
      where('fechaString', '==', fechaStr), // Ahora fechaStr es seguro
      where('estado', 'in', ['Pendiente de Pago', 'Confirmado', 'En Sala', 'En Atencion', 'Finalizado'])
    );

    const snapshot = await getDocs(q);
    const horasOcupadas = snapshot.docs
      .map(doc => doc.data() as Turno)
      .filter(turno => {
        if (turno.estado === 'Cancelado') return false;
        // Si es transferencia vencida, liberamos el slot
        if (turno.estado === 'Pendiente de Pago' && turno.metodoPago === 'Transferencia' && turno.fechaVencimientoReserva) {
           const vencimiento = turno.fechaVencimientoReserva.toDate();
           if (ahora > vencimiento && !turno.comprobanteBase64) return false;
        }
        return true;
      })
      .map(t => t.hora);

    // Retornamos los que NO están en la lista de ocupados
    return slotsPosibles.filter(hora => !horasOcupadas.includes(hora));
  }



  crearTurno(turno: Turno): Promise<any> {
    return this.firestoreService.addDocument(this.collectionPath, turno);
  }

  // Método simple para cambios de estado sin lógica financiera (ej: En Sala, Finalizado)
  actualizarEstado(idTurno: string, estado: EstadoTurno): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, idTurno, { estado });
  }

  subirComprobante(idTurno: string, base64: string): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, idTurno, {
      comprobanteBase64: base64,
      fechaCargaComprobante: Timestamp.now()
    });
  }

  async reprogramarTurno(idTurnoViejo: string, datosNuevoTurno: Turno): Promise<void> {

    const turnoViejo = await this.firestoreService.getDocumentById<Turno>(this.collectionPath, idTurnoViejo);
    if (!turnoViejo) throw new Error("Turno original no encontrado");

    if (datosNuevoTurno.creadoPor === 'PACIENTE') {
      const ahora = new Date();
      const fechaTurnoOriginal = new Date(`${turnoViejo.fechaString}T${turnoViejo.hora}:00`);

      const diferenciaHoras = (fechaTurnoOriginal.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      if (diferenciaHoras < 24) {
        throw new Error('PENALIZACION_TIEMPO');
      }
    }

    let creditoUsuario = (turnoViejo.montoSaldoUsado || 0);
if (['Confirmado', 'En Sala', 'En Atencion'].includes(turnoViejo.estado)) {
  creditoUsuario += (turnoViejo.montoAbonar || 0);
}


    const costoUsuarioNuevo = datosNuevoTurno.precioConsulta - datosNuevoTurno.montoCobertura;

    const diferencia = costoUsuarioNuevo - creditoUsuario;

    const batch = writeBatch(this.firestore);

    const viejoRef = doc(this.firestore, this.collectionPath, idTurnoViejo);
    batch.update(viejoRef, {
      estado: 'Cancelado',
      motivoCancelacion: `Reprogramado (Crédito transferido: $${creditoUsuario})`
    });

    const nuevoRef = doc(collection(this.firestore, this.collectionPath));
    const idNuevo = nuevoRef.id;

    let estadoNuevo: EstadoTurno = 'Confirmado';
    let deudaFinal = 0;


    const creditoConsumido = Math.min(costoUsuarioNuevo, creditoUsuario);

    const totalSaldoInternoUsado = (datosNuevoTurno.montoSaldoUsado || 0) + creditoConsumido;

    if (diferencia > 0) {
      deudaFinal = diferencia;

      if (datosNuevoTurno.metodoPago.includes('Tarjeta')) {
         estadoNuevo = 'Confirmado';
      } else {
         estadoNuevo = 'Pendiente de Pago';
      }
    }

    const turnoFinal: Turno = {
      ...datosNuevoTurno,
      id: idNuevo,
      estado: estadoNuevo,
      montoAbonar: deudaFinal,

      montoSaldoUsado: totalSaldoInternoUsado,

      metodoPago: diferencia <= 0 ? 'Saldo Previo' : datosNuevoTurno.metodoPago,
      idTurnoOriginal: idTurnoViejo
    };

    batch.set(nuevoRef, turnoFinal);

    if (diferencia < 0) {
      const reembolso = Math.abs(diferencia);
      const pacienteRef = doc(this.firestore, 'pacientes', datosNuevoTurno.idPaciente);


      batch.update(pacienteRef, { saldoCuenta: increment(reembolso) });
    }

    await batch.commit();
  }

  obtenerTurnoPorId(id: string): Promise<Turno | undefined> {
    return this.firestoreService.getDocument<Turno>(this.collectionPath, id);
  }

  obtenerTodosLosTurnos(): Observable<Turno[]> {
      const colRef = collection(this.firestore, this.collectionPath);
      const q = query(colRef, orderBy('fecha', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  obtenerTurnosPorMedico(idMedico: string): Observable<Turno[]> {
    const q = query(collection(this.firestore, this.collectionPath), where('idMedico', '==', idMedico), orderBy('fecha', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  obtenerTurnosPorPaciente(idPaciente: string): Observable<Turno[]> {
    const q = query(collection(this.firestore, this.collectionPath), where('idPaciente', '==', idPaciente), orderBy('fecha', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

   private formatearFechaLocal(fecha: Date): string {

    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private calcularIntervalos(inicio: string, fin: string, duracion: number): string[] {
    const slots = [];
    let actual = this.convertirHoraAMinutos(inicio);
    const limite = this.convertirHoraAMinutos(fin);
    while ((actual + duracion) <= limite) {
      slots.push(this.convertirMinutosAHora(actual));
      actual += duracion;
    }
    return slots;
  }

  private convertirHoraAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private convertirMinutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }


    actualizarTriage(idTurno: string, datosTriage: any): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, idTurno, {
      ...datosTriage
    });
  }


  async verificarChoqueHorarioMedico(idMedico: string, fechaString: string, hora: string): Promise<boolean> {
    const colRef = collection(this.firestore, this.collectionPath);

    const q = query(
      colRef,
      where('idMedico', '==', idMedico),
      where('fechaString', '==', fechaString),
      where('hora', '==', hora),
      where('estado', 'in', ['Pendiente de Pago', 'Confirmado', 'En Sala', 'En Atencion'])
    );

    const snapshot = await getDocs(q);

    return !snapshot.empty;
  }


  async chequearYEnviarRecordatorios(): Promise<void> {

    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaStringManana = this.formatearFechaLocal(manana);

    console.log('🔍 Buscando recordatorios para:', fechaStringManana);

    const colRef = collection(this.firestore, this.collectionPath);
    const q = query(
      colRef,
      where('fechaString', '==', fechaStringManana),
      where('estado', '==', 'Confirmado')

    );

    const snapshot = await getDocs(q);

    snapshot.docs.forEach(async (docSnap) => {
      const turno = docSnap.data() as Turno;

      if (turno.recordatorioEnviado) return;

      const usuario = await this.usuarioService.obtenerUsuarioPorId(turno.idPaciente);

      if (usuario?.email) {
        console.log(`📤 Enviando recordatorio a ${usuario.email}...`);

        const enviado = await this.mailService.enviarRecordatorio(
          turno,
          usuario.email,
          turno.pacienteData.nombre
        );

        if (enviado) {
          await this.firestoreService.updateDocument(this.collectionPath, docSnap.id, {
            recordatorioEnviado: true
          });
        }
      }
    });
  }
  async crearTurnoConAltaAtomica(turno: Turno, datosAlta?: any): Promise<string> {
    const batch = writeBatch(this.firestore);

    const nuevoTurnoRef = doc(collection(this.firestore, this.collectionPath));
    const idTurno = nuevoTurnoRef.id;
    batch.set(nuevoTurnoRef, { ...turno, id: idTurno });

    if (datosAlta) {
      const pacienteRef = doc(this.firestore, 'pacientes', datosAlta.uid);
      const usuarioRef = doc(this.firestore, 'usuarios', datosAlta.uid);

      const { cambiarRol, ...perfilPaciente } = datosAlta;
      batch.set(pacienteRef, perfilPaciente);

      if (cambiarRol) {
        batch.update(usuarioRef, { role: 'paciente' });
      }
    }

    await batch.commit();
    return idTurno;
  }


actualizarTurno(idTurno: string, datos: Partial<Turno>): Promise<void> {
  return this.firestoreService.updateDocument(this.collectionPath, idTurno, datos);
}
}
