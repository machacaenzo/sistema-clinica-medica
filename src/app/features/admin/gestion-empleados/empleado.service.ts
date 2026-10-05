import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { PerfilEmpleado } from '../../../core/interfaces/perfil-empleado.model';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {
  private firestore = inject(FirestoreService);
  private readonly collectionPath = 'empleados';

  // Crear o Actualizar
  crearPerfil(perfil: Partial<PerfilEmpleado>): Promise<void> {
    return this.firestore.setDocument(this.collectionPath, perfil.uid!, perfil);
  }

  // Obtener uno
  obtenerPerfil(uid: string): Promise<PerfilEmpleado | undefined> {
    return this.firestore.getDocument<PerfilEmpleado>(this.collectionPath, uid);
  }

  // ✅ NUEVO MÉTODO SIMPLIFICADO: Lectura directa
  // Ya no mezclamos con usuarios, porque el empleado ya tiene 'nombre' y 'foto'
  obtenerEmpleados(): Observable<PerfilEmpleado[]> {
    return this.firestore.getCollection<PerfilEmpleado>(this.collectionPath);
  }
}
