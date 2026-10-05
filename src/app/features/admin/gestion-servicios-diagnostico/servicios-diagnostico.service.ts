import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, doc,
  updateDoc, deleteDoc, query, orderBy, setDoc, docData,
  getDocs,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import { ServicioDiagnostico } from '../../../core/interfaces/servicio-diagnostico.model';

@Injectable({
  providedIn: 'root'
})
export class ServiciosDiagnosticoService {
  private firestore = inject(Firestore);
  private readonly colName = 'servicios_diagnostico';

  // 1. Obtener solo los estudios (Filtrando el config)
   obtenerTodos(): Observable<ServicioDiagnostico[]> {
    const colRef = collection(this.firestore, this.colName);
    const estudios$ = collectionData(colRef, { idField: 'id' });
    const precioMaestro$ = this.obtenerPrecioGlobal();

    // 🧠 Lógica Senior: Combinamos ambas fuentes de datos
    return combineLatest([estudios$, precioMaestro$]).pipe(
      map(([lista, precioGlobal]) => {
        return lista
          .filter(item => item.id !== '_precio_maestro')
          .map(estudio => ({
            ...estudio,
            precioFijo: precioGlobal // ⚡ SOBREESCRIBIMOS con el precio real del momento
          })) as ServicioDiagnostico[];
      })
    );
  }

  // 2. ✅ CORRECCIÓN: Leer el precio maestro directamente del documento
  obtenerPrecioGlobal(): Observable<number> {
    const docRef = doc(this.firestore, this.colName, '_precio_maestro');
    // docData escucha cambios en tiempo real de ese documento específico
    return docData(docRef).pipe(
      map((data: any) => data ? data.valor : 0)
    );
  }

  // 3. Actualizar el precio
    /**
   * ACTUALIZACIÓN MAESTRA (Sincronización Física)
   * 1. Actualiza el documento de configuración _precio_maestro.
   * 2. Recorre todos los estudios y actualiza su campo 'precioFijo' en la DB.
   */
  async actualizarPrecioGlobal(nuevoPrecio: number): Promise<void> {
    const batch = writeBatch(this.firestore);
    const colRef = collection(this.firestore, this.colName);

    // A. Actualizar el documento de configuración (El "Cerebro")
    const masterRef = doc(this.firestore, this.colName, '_precio_maestro');
    batch.set(masterRef, { valor: nuevoPrecio }, { merge: true });

    try {
      // B. Obtener una "foto" de todos los documentos actuales
      const snapshot = await getDocs(colRef);

      // C. Agregamos cada estudio al paquete de actualización (Batch)
      snapshot.docs.forEach(docSnap => {
        // Evitamos procesar el documento maestro de nuevo
        if (docSnap.id !== '_precio_maestro') {
          batch.update(docSnap.ref, { precioFijo: nuevoPrecio });
        }
      });

      // D. Ejecutamos el envío masivo a Firebase
      await batch.commit();
      console.log(`✅ Sincronización completada: ${snapshot.size - 1} estudios actualizados a $${nuevoPrecio}`);

    } catch (error) {
      console.error("❌ Error en la sincronización masiva:", error);
      throw error; // Re-lanzamos para que el componente muestre el error
    }
  }
  // 4. CRUD de servicios (Usando el precio del momento)
  crear(servicio: ServicioDiagnostico): Promise<any> {
    const colRef = collection(this.firestore, this.colName);
    return addDoc(colRef, servicio);
  }

  actualizar(id: string, data: Partial<ServicioDiagnostico>): Promise<void> {
    const docRef = doc(this.firestore, this.colName, id);
    return updateDoc(docRef, data);
  }

  borrar(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.colName, id);
    return deleteDoc(docRef);
  }

}
