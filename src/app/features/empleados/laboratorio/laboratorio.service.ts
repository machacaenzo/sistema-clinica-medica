import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, collectionData,
  doc, updateDoc, Timestamp, addDoc, orderBy, writeBatch,
  limit
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { PedidoLaboratorio } from '../../../core/interfaces/pedido-laboratorio.model';

@Injectable({
  providedIn: 'root'
})
export class LaboratorioService {
  private firestore = inject(Firestore);
  private readonly colPedidos = 'pedidos_laboratorio';

  /**
   * 🔍 BUSCADOR OPERATIVO (Nivel Dios)
   * Obtiene los pedidos filtrados por fecha y opcionalmente por DNI.
   * Se usa collectionData para que la lista se actualice sola si el médico pide algo nuevo.
   */
  obtenerPedidosFiltrados(fechaString: string, dni?: string): Observable<PedidoLaboratorio[]> {
    const colRef = collection(this.firestore, this.colPedidos);

    // Filtro base: Por fecha (ej: '2023-12-22') y que no estén cancelados
    let queryConstraints = [
      where('fechaString', '==', fechaString),
      where('estado', '!=', 'CANCELADO'),
      orderBy('estado', 'desc'), // PENDIENTES primero
      orderBy('fechaPedido', 'asc')
    ];

    // Si la secretaria/técnico escribió un DNI, sumamos el filtro
    if (dni && dni.trim() !== '') {
      queryConstraints.push(where('pacienteDni', '==', dni.trim()));
    }

    const q = query(colRef, ...queryConstraints);
    return collectionData(q, { idField: 'id' }) as Observable<PedidoLaboratorio[]>;
  }

  /**
   * ✅ CIERRE DE CIRCUITO ATÓMICO
   * Carga los resultados, finaliza el pedido y le avisa al turno del médico.
   */
  async finalizarEstudio(idPedido: string, idTurno: string, resultados: any, observaciones: string): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Actualizar el pedido de laboratorio
    const pedidoRef = doc(this.firestore, this.colPedidos, idPedido);
    batch.update(pedidoRef, {
      resultados: resultados, // Aquí irán Glucemia, Colesterol, etc.
      observacionesTecnicas: observaciones,
      estado: 'LISTO',
      fechaFinalizado: Timestamp.now()
    });

    // 2. Avisar al Turno (Para que el médico vea el badge "Resultados Listos")
    const turnoRef = doc(this.firestore, 'turnos', idTurno);
    batch.update(turnoRef, {
      estudiosListos: true
    });

    return await batch.commit();
  }

  /**
   * 📝 GENERACIÓN DE ORDEN (Usado por Médico o Wizard de Turnos)
   */
  async crearPedidoDesdeConsulta(datos: any) {
    const colRef = collection(this.firestore, this.colPedidos);

    // Normalizamos la fecha para el filtrado del técnico
    const fechaActual = new Date();
    const fechaString = datos.fechaString || fechaActual.toISOString().split('T')[0];

    return addDoc(colRef, {
      ...datos,
      fechaString: fechaString, // Campo vital para el buscador del técnico
      estado: 'PENDIENTE',
      fechaPedido: Timestamp.now()
    });
  }

  /**
   * 📊 HISTORIAL CLÍNICO (Para comparar valores anteriores)
   */
  obtenerHistorialPorPaciente(idPaciente: string): Observable<PedidoLaboratorio[]> {
    const colRef = collection(this.firestore, this.colPedidos);
    const q = query(
      colRef,
      where('idPaciente', '==', idPaciente),
      where('estado', '==', 'LISTO'),
      orderBy('fechaFinalizado', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<PedidoLaboratorio[]>;
  }

/**
 * 🔗 ESLABÓN PERDIDO:
 * Busca si hay un pedido finalizado para este turno específico.
 * Sirve para que el médico vea los resultados mientras atiende.
 */
obtenerPedidoPorTurno(idTurno: string): Observable<PedidoLaboratorio | undefined> {
  const colRef = collection(this.firestore, this.colPedidos);
  const q = query(
    colRef,
    where('idTurno', '==', idTurno),
    // Opcional: Solo traer si está LISTO, aunque el médico querría ver si está PENDIENTE también
    // where('estado', '==', 'LISTO')
    limit(1)
  );

  return collectionData(q, { idField: 'id' }).pipe(
    map(resultados => resultados.length > 0 ? resultados[0] as PedidoLaboratorio : undefined)
  );
}
}
