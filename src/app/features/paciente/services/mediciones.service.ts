import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, collectionData, Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Medicion } from '../../../core/interfaces/mediciones.model';

@Injectable({
  providedIn: 'root'
})
export class MedicionesService {
  private firestore = inject(Firestore);
  private readonly colName = 'mediciones_pacientes';

  // Guardar medición
  registrarMedicion(medicion: Medicion): Promise<any> {
    return addDoc(collection(this.firestore, this.colName), medicion);
  }

  // Leer historial de un paciente
  obtenerHistorial(idPaciente: string): Observable<Medicion[]> {
    const q = query(
      collection(this.firestore, this.colName),
      where('idPaciente', '==', idPaciente),
      orderBy('fecha', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Medicion[]>;
  }
}
