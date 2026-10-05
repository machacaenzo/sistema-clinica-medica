
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, Timestamp, orderBy, collectionData, query } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuditoriaSeguridadService {
  private firestore = inject(Firestore);

  async registrarAccesoEmergencia(datos: {
    idAdmin: string,
    emailAdmin: string,
    idPaciente: string,
    nombrePaciente: string,
    motivo: string,
    referencia: string
  }) {
    await addDoc(collection(this.firestore, 'logs_seguridad_hc'), {
      ...datos,
      fecha: Timestamp.now(),
      tipoEvento: 'ACCESO_CRITICO_HC',
      ip: 'Registro de Aplicación'
    });
  }

  obtenerLogs(): Observable<any[]> {
    const colRef = collection(this.firestore, 'logs_seguridad_hc');
    const q = query(colRef, orderBy('fecha', 'desc'));
    return collectionData(q, { idField: 'id' });
  }
}
