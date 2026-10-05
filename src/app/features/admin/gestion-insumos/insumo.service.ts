import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy,
  doc, writeBatch, collectionData, increment, Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Insumo, MovimientoInsumo } from '../../../core/interfaces/insumo.model';


@Injectable({
  providedIn: 'root'
})
export class InsumoService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);

  private readonly pathInsumos = 'insumos';
  private readonly pathMovimientos = 'insumos_movimientos';

  // --- CRUD BÁSICO INSUMOS ---

  obtenerTodos(): Observable<Insumo[]> {
    // Ordenamos por vencimiento para que el admin vea lo urgente primero
    const colRef = collection(this.firestore, this.pathInsumos);
    const q = query(colRef, orderBy('nombre', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Insumo[]>;
  }

  crear(insumo: Insumo): Promise<any> {
    return this.firestoreService.addDocument(this.pathInsumos, insumo);
  }

  actualizar(id: string, data: Partial<Insumo>): Promise<void> {
    return this.firestoreService.updateDocument(this.pathInsumos, id, data);
  }

  // --- GESTIÓN DE MOVIMIENTOS (KARDEX) ---

  /**
   * Registra un movimiento y actualiza el stock en una sola transacción.
   */
  async registrarMovimiento(movimiento: MovimientoInsumo): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Referencia al insumo padre
    const insumoRef = doc(this.firestore, this.pathInsumos, movimiento.idInsumo);

    // 2. Calcular el incremento/decremento
    let delta = 0;
    if (movimiento.tipo === 'ENTRADA') {
      delta = movimiento.cantidad;
    } else {
      // SALIDA, AJUSTE, VENCIDO restan
      delta = -movimiento.cantidad;
    }

    // 3. Actualizar el stock del insumo
    batch.update(insumoRef, {
      stockActual: increment(delta)
    });

    // 4. Crear el documento de historial (Movimiento)
    // Necesitamos crear una referencia de doc nuevo con ID automático
    const movRef = doc(collection(this.firestore, this.pathMovimientos));
    batch.set(movRef, movimiento);

    // 5. Ejecutar todo
    await batch.commit();
  }

  /**
   * Obtiene el historial de un insumo específico
   */
  obtenerHistorial(idInsumo: string): Observable<MovimientoInsumo[]> {
    const colRef = collection(this.firestore, this.pathMovimientos);
    const q = query(
      colRef,
      where('idInsumo', '==', idInsumo),
      orderBy('fecha', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<MovimientoInsumo[]>;
  }
}
