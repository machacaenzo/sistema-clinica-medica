import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, deleteDoc, doc,
  query, where, collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// Asegúrate de que esta interfaz tenga el campo 'uidMedico'
import { PlantillaMedica } from '../../../core/interfaces/consulta.model';

@Injectable({
  providedIn: 'root'
})
export class PlantillasService {
  private firestore = inject(Firestore);

  // Nombre de la colección en Firebase
  private readonly COLLECTION_NAME = 'plantillas_medicas';

  /**
   * Crea una nueva plantilla personalizada.
   */
  crearPlantilla(plantilla: PlantillaMedica): Promise<any> {
    const colRef = collection(this.firestore, this.COLLECTION_NAME);
    return addDoc(colRef, plantilla);
  }

  /**
   * Obtiene SOLO las plantillas creadas por el médico logueado.
   * Se actualiza en tiempo real.
   */
  obtenerMisPlantillas(uidMedico: string): Observable<PlantillaMedica[]> {
    const colRef = collection(this.firestore, this.COLLECTION_NAME);

    // Filtramos para que el médico solo vea SUS propias plantillas
    const q = query(colRef, where('uidMedico', '==', uidMedico));

    return collectionData(q, { idField: 'id' }) as Observable<PlantillaMedica[]>;
  }

  /**
   * Elimina una plantilla por su ID.
   */
  borrarPlantilla(idPlantilla: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTION_NAME, idPlantilla);
    return deleteDoc(docRef);
  }
}
