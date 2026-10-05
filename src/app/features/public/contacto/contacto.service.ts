import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, orderBy, collectionData } from '@angular/fire/firestore';

import { Timestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { MensajeContacto } from '../../../core/interfaces/mensaje-contacto.model';



@Injectable({
  providedIn: 'root'
})
export class ContactoService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

  private readonly COLLECTION_NAME = 'mensajes_web';

  // ==========================================================
  // 🟢 ENVIAR (Blindado contra undefined)
  // ==========================================================

  async enviarMensaje(formValue: any): Promise<void> {
    const user = this.authService.currentUser();

    const nuevoMensaje: MensajeContacto = {
      nombre: formValue.nombre,
      email: formValue.email,
      asunto: formValue.asunto,
      mensaje: formValue.mensaje,
      fecha: Timestamp.now(),
      leido: false,
      estado: 'Pendiente',
      uidUsuario: user?.uid || null
    };

    // Quitamos el return porque es void
    await this.firestoreService.addDocument(this.COLLECTION_NAME, nuevoMensaje);
  }

  // ==========================================================
  // 🔴 ADMIN (Lectura)
  // ==========================================================

  obtenerTodosLosMensajes(): Observable<MensajeContacto[]> {
    const colRef = collection(this.firestore, this.COLLECTION_NAME);
    const q = query(colRef, orderBy('fecha', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<MensajeContacto[]>;
  }

  async marcarComoLeido(idMensaje: string): Promise<void> {
    // Usamos Partial<MensajeContacto> porque solo actualizamos campos sueltos
    const updateData: Partial<MensajeContacto> = {
      leido: true,
      estado: 'Visto'
    };
    return this.firestoreService.updateDocument(this.COLLECTION_NAME, idMensaje, updateData);
  }

  async eliminarMensaje(idMensaje: string): Promise<void> {
    return this.firestoreService.deleteDocument(this.COLLECTION_NAME, idMensaje);
  }
}
