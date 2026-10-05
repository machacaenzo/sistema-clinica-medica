import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, orderBy, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../../core/services/firestore.service';
import { Tarea, TareaPlantilla } from '../../../../core/interfaces/tarea.model';

@Injectable({
  providedIn: 'root'
})
export class TareaService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);

  private readonly tareasPath = 'tareas';
  private readonly plantillasPath = 'tareas_plantillas';

  // --- GESTIÓN DE TAREAS (Igual que antes) ---
  crearTarea(tarea: Tarea) { return this.firestoreService.addDocument(this.tareasPath, tarea); }
  actualizarTarea(id: string, data: any) { return this.firestoreService.updateDocument(this.tareasPath, id, data); }
  eliminarTarea(id: string) { return this.firestoreService.deleteDocument(this.tareasPath, id); }

  obtenerTareasPorEmpleado(uidEmpleado: string): Observable<Tarea[]> {
    const colRef = collection(this.firestore, this.tareasPath);
    const q = query(colRef, where('idEmpleado', '==', uidEmpleado), orderBy('fechaCreacion', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Tarea[]>;
  }

  // =================================================================
  // --- GESTIÓN DE PLANTILLAS (LÓGICA NUEVA) ---
  // =================================================================

  crearPlantilla(plantilla: TareaPlantilla): Promise<any> {
    return this.firestoreService.addDocument(this.plantillasPath, plantilla);
  }

  // ✅ CAMBIO: Ya no trae todas, solo las del usuario logueado
  obtenerPlantillasPorPropietario(uidPropietario: string): Observable<TareaPlantilla[]> {
    const colRef = collection(this.firestore, this.plantillasPath);
    const q = query(colRef, where('idPropietario', '==', uidPropietario));
    return collectionData(q, { idField: 'id' }) as Observable<TareaPlantilla[]>;
  }

  eliminarPlantilla(id: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.plantillasPath, id);
  }
}
