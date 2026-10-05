import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, orderBy, getDocs, collectionData } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Turno } from '../../../core/interfaces/turno.model';


@Injectable({
  providedIn: 'root'
})
export class MedicoAgendaService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);
  private readonly colTurnos = 'turnos';


  obtenerAgendaHoy(idMedico: string): Observable<Turno[]> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hoy = `${year}-${month}-${day}`;

    const q = query(
      collection(this.firestore, this.colTurnos),
      where('idMedico', '==', idMedico),
      where('fechaString', '==', hoy),
      where('estado', 'in', ['Confirmado', 'En Sala', 'En Atencion', 'Finalizado']),
      orderBy('hora', 'asc')
    );

    // ✅ NIVEL DIOS: collectionData mantiene la conexión abierta.
    // Si el enfermero cambia el estado a 'En Sala', este Observable emite un nuevo valor.
    return collectionData(q, { idField: 'id' }) as Observable<Turno[]>;
  }

  actualizarEstadoTurno(idTurno: string, estado: string): Promise<void> {
    return this.firestoreService.updateDocument(this.colTurnos, idTurno, { estado });
  }

}
