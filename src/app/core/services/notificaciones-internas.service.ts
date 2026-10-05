import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, addDoc, query, where,
  orderBy, collectionData, doc, updateDoc, Timestamp, limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { NotificacionInterna } from '../interfaces/notificacion-interna.model';

@Injectable({ providedIn: 'root' })
export class NotificacionesInternasService {
  private firestore = inject(Firestore);
  private readonly colName = 'notificaciones_pacientes';

  // 1. Enviar una notificación (Lo usará el Admin en el Motor de Contingencia)
  async enviar(notif: Omit<NotificacionInterna, 'id' | 'fecha' | 'leida'>) {
    const colRef = collection(this.firestore, this.colName);
    return addDoc(colRef, {
      ...notif,
      fecha: Timestamp.now(),
      leida: false
    });
  }

  // 2. Obtener notificaciones en TIEMPO REAL para el Navbar del paciente
  obtenerMisNotificaciones(idPaciente: string): Observable<NotificacionInterna[]> {
    const colRef = collection(this.firestore, this.colName);
    const q = query(
      colRef,
      where('idPaciente', '==', idPaciente),
      orderBy('fecha', 'desc'),
      limit(10) // Solo mostramos las últimas 10 en la campanita
    );
    return collectionData(q, { idField: 'id' }) as Observable<NotificacionInterna[]>;
  }

  // 3. Marcar como leída (Cuando el paciente abre la campana)
  async marcarComoLeida(idNotificacion: string) {
    const docRef = doc(this.firestore, this.colName, idNotificacion);
    return updateDoc(docRef, { leida: true });
  }
}
