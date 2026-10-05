import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Prestacion } from '../../../core/interfaces/prestacion.model';


@Injectable({
  providedIn: 'root'
})
export class PrestacionesService {
  private firestore = inject(Firestore);
  private readonly colName = 'prestaciones';

  // Obtener todas (para la tabla)
  obtenerTodas(): Observable<Prestacion[]> {
    const colRef = collection(this.firestore, this.colName);
    const q = query(colRef, orderBy('nombre', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Prestacion[]>;
  }

  // Crear
  crear(prestacion: Prestacion): Promise<any> {
    const colRef = collection(this.firestore, this.colName);
    return addDoc(colRef, prestacion);
  }

  // Editar
  actualizar(id: string, data: Partial<Prestacion>): Promise<void> {
    const docRef = doc(this.firestore, this.colName, id);
    return updateDoc(docRef, data);
  }

  // Borrar (Lógica o física, aquí física por simplicidad)
  borrar(id: string): Promise<void> {
    const docRef = doc(this.firestore, this.colName, id);
    return deleteDoc(docRef);
  }
}
