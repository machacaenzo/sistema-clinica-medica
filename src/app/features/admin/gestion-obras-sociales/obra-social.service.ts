import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { ObraSocial } from '../../../core/interfaces/obra-social.model';
;

@Injectable({
  providedIn: 'root' // Disponible para inyectar en Pacientes después
})
export class ObraSocialService {
  private firestoreService = inject(FirestoreService);

  // Nombre de la colección en Firestore
  private readonly collectionPath = 'obras_sociales';

  crear(os: ObraSocial): Promise<any> {
    return this.firestoreService.addDocument(this.collectionPath, os);
  }

  obtenerTodas(): Observable<ObraSocial[]> {
    // Aquí podrías agregar un ordenamiento alfabético si quisieras
    return this.firestoreService.getCollection<ObraSocial>(this.collectionPath);
  }

  actualizar(id: string, data: Partial<ObraSocial>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, id, data);
  }

  eliminar(id: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.collectionPath, id);
  }
}
