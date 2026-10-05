import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, runTransaction,
  query, where, orderBy, collectionData, Timestamp, DocumentReference,
  addDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Transaccion, TipoTransaccion } from '../interfaces/transaccion.model';
import { FirestoreService } from './firestore.service'; // Usamos tu wrapper donde se pueda

@Injectable({
  providedIn: 'root'
})
export class TransaccionesService {
  // Inyectamos Firestore nativo SOLO para runTransaction (que no está en tu wrapper)
  private firestore = inject(Firestore);
  // Inyectamos tu wrapper para las consultas simples
  private firestoreService = inject(FirestoreService);

  private readonly collectionTransacciones = 'transacciones';
  private readonly collectionPacientes = 'pacientes';

  // ============================================================
  // 1. MOVIMIENTO ATÓMICO (El corazón financiero)
  // ============================================================
  /**
   * Ejecuta una transacción ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad).
   * Si algo falla en medio, no se descuenta el saldo ni se guarda el historial.
   */
  async registrarMovimiento(tx: Transaccion): Promise<void> {
    const pacienteRef = doc(this.firestore, this.collectionPacientes, tx.idPaciente);
    const transaccionRef = doc(collection(this.firestore, this.collectionTransacciones));

    try {
      await runTransaction(this.firestore, async (transaction) => {
        // A. Leer el saldo actual del paciente (Bloqueo de lectura)
        const pacienteDoc = await transaction.get(pacienteRef);

        if (!pacienteDoc.exists()) {
          throw new Error(`El paciente con ID ${tx.idPaciente} no existe o no tiene perfil.`);
        }

        const data = pacienteDoc.data();
        // Usamos el campo saldoCuenta definido en tu interfaz Paciente
        const saldoActual = data['saldoCuenta'] || 0;

        // B. Calcular nuevo saldo según el tipo de operación
        let nuevoSaldo = saldoActual;

        if (tx.tipo === 'CREDITO') {
            // CREDITO: El paciente RECIBE dinero en su billetera (Devolución)
            nuevoSaldo += tx.monto;
        } else if (tx.tipo === 'DEBITO') {
            // DEBITO: El paciente GASTA dinero de su billetera
            if (saldoActual < tx.monto) {
              throw new Error(`Saldo insuficiente. Tienes $${saldoActual} y necesitas $${tx.monto}.`);
            }
            nuevoSaldo -= tx.monto;
        }
        // INGRESO (Caja) y EGRESO (Caja) no tocan el saldo virtual,
        // sirven solo para arqueo de caja física.

        // C. Validaciones de integridad (Anti-Bugs)
        if (nuevoSaldo < 0) {
           throw new Error("Error de integridad: El saldo no puede ser negativo.");
        }

        // D. Escribir: Actualizar saldo del paciente
        transaction.update(pacienteRef, { saldoCuenta: nuevoSaldo });

        // E. Escribir: Guardar el registro histórico
        // Asignamos el ID generado automáticamente por Firestore
        const txFinal = {
          ...tx,
          id: transaccionRef.id,
          saldoResultante: nuevoSaldo // Opcional: Útil para auditoría ver cuánto quedó
        };
        transaction.set(transaccionRef, txFinal);
      });

      console.log(`✅ Transacción ${tx.tipo} de $${tx.monto} exitosa.`);

    } catch (error: any) {
      console.error('❌ Error en transacción financiera:', error);
      // Re-lanzamos el error con mensaje limpio para que el UI lo muestre en un Toast/Alerta
      throw new Error(error.message || "Error al procesar el pago.");
    }
  }

  // ============================================================
  // 2. CONSULTAS (Usando tu FirestoreService)
  // ============================================================

  /**
   * Obtiene el historial para la vista "Mi Billetera" del paciente.
   */
  obtenerHistorialPorPaciente(idPaciente: string): Observable<Transaccion[]> {
    // Usamos las queries nativas porque tu wrapper getCollectionByFilter es simple
    // y aquí necesitamos ordenamiento compuesto.
    const colRef = collection(this.firestore, this.collectionTransacciones);
    const q = query(
      colRef,
      where('idPaciente', '==', idPaciente),
      orderBy('fecha', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Transaccion[]>;
  }

  /**
   * Obtiene el saldo actual sin suscribirse (promesa).
   * Útil para verificaciones rápidas antes de abrir el modal de pago.
   */
  async obtenerSaldoActual(idPaciente: string): Promise<number> {
    const paciente = await this.firestoreService.getDocumentById<any>(this.collectionPacientes, idPaciente);
    return paciente?.saldoCuenta || 0;
  }

  // ============================================================
  // 3. GASTOS OPERATIVOS (Insumos, Mantenimiento, etc.)
  // ============================================================
  /**
   * Registra una salida de dinero de la caja que NO afecta a un paciente específico.
   * Ej: Compra de insumos, pago de servicios, etc.
   */
  async registrarGastoOperativo(datos: {
    monto: number,
    motivo: string,
    usuario: string,
    referenciaId?: string
  }): Promise<void> {

    // Armamos el objeto transacción compatible con tu interfaz
    const tx: any = {
      fecha: Timestamp.now(),
      monto: datos.monto,
      tipo: 'EGRESO', // Salida de dinero real

      // Usamos un ID reservado para identificar que es un gasto de la empresa
      idPaciente: 'GASTO_OPERATIVO',
      idTurno: null,

      usuarioResponsable: datos.usuario,
      motivo: datos.motivo,
      referenciaExterna: datos.referenciaId // Aquí guardamos el ID del insumo
    };

    // Usamos addDocument directo (sin runTransaction porque no hay saldo que calcular)
    await this.firestoreService.addDocument(this.collectionTransacciones, tx);
  }

  // ============================================================
  // 4. REPORTE GLOBAL (Para Admin)
  // ============================================================
  /**
   * Obtiene todos los movimientos del sistema ordenados por fecha.
   * Ideal para el Libro Diario.
   */
  obtenerMovimientosGlobales(): Observable<Transaccion[]> {
    const colRef = collection(this.firestore, this.collectionTransacciones);
    const q = query(colRef, orderBy('fecha', 'desc')); // Los más nuevos arriba
    return collectionData(q, { idField: 'id' }) as Observable<Transaccion[]>;
  }

  // ============================================================
  // 3. INGRESO DIRECTO (Venta Mostrador / Farmacia)
  // ============================================================
  /**
   * Registra un ingreso de dinero que NO afecta la cuenta corriente de un paciente.
   * Útil para ventas de farmacia, kiosco o cobros anónimos.
   */
  async registrarIngresoDirecto(tx: Transaccion): Promise<void> {
    try {
      const colRef = collection(this.firestore, this.collectionTransacciones);
      // Simplemente creamos el documento. No leemos nada antes.
      await addDoc(colRef, tx);
      console.log('💰 Ingreso directo registrado en caja.');
    } catch (error) {
      console.error('Error registrando ingreso directo:', error);
      throw error;
    }
  }
}
