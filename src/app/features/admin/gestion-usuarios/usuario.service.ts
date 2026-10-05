// src/app/features/admin/gestion-usuarios/usuario.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  query,
  where,
  writeBatch
} from '@angular/fire/firestore'; // Importaciones necesarias para Batch
import { FirestoreService } from '../../../core/services/firestore.service';
import { Rol, Usuario } from '../../../core/interfaces/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private firestore = inject(Firestore); // Inyección directa para acceder a Batch
  private firestoreService = inject(FirestoreService);

  private readonly collectionPath = 'usuarios';

  /**
   * Crea o establece el documento de un usuario en la colección 'usuarios'.
   */
  crearUsuario(usuario: Usuario): Promise<void> {
    return this.firestoreService.setDocument(this.collectionPath, usuario.uid, usuario);
  }

  /**
   * Obtiene el documento de un usuario por su UID.
   */
  obtenerUsuarioPorId(uid: string): Promise<Usuario | undefined> {
    return this.firestoreService.getDocument<Usuario>(this.collectionPath, uid);
  }

  /**
   * Actualiza parcialmente el documento de un usuario.
   */
  actualizarUsuario(uid: string, data: Partial<Usuario>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, uid, data);
  }

  /**
   * Obtiene TODOS los usuarios de la colección.
   */
 obtenerTodosLosUsuarios(): Observable<Usuario[]> {
    // Importar query y where de @angular/fire/firestore
    const colRef = collection(this.firestore, this.collectionPath);

    // Filtro: Solo traer si emailVerified == true
    const q = query(colRef, where('emailVerified', '==', true));

    return collectionData(q, { idField: 'uid' }) as Observable<Usuario[]>;
  }

  /**
   * Obtiene todos los usuarios que tienen un rol específico.
   */
  obtenerUsuariosPorRol(rol: Rol): Observable<Usuario[]> {
    return this.firestoreService.getCollectionByFilter<Usuario>(this.collectionPath, 'role', rol);
  }

  // ==============================================================================
  // ⚡ MÉTODO TRANSACCIONAL DE CAMBIO DE ESTADO (Reemplaza a desactivar/reactivar)
  // ==============================================================================

  /**
   * Cambia el estado de un usuario de forma atómica.
   * Actualiza la colección 'usuarios' Y la colección del perfil correspondiente (medicos/empleados).
   * Si una falla, fallan ambas para mantener la integridad de la base de datos.
   */
  async cambiarEstado(uid: string, rol: Rol, nuevoEstado: 'Activo' | 'Inactivo'): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Operación en la colección MAESTRA (usuarios)
    const userRef = doc(this.firestore, this.collectionPath, uid);
    batch.update(userRef, { estado: nuevoEstado });

    // 2. Determinamos si existe una colección de perfil secundaria
    let collectionName = '';

    switch (rol) {
      case 'medico':
        collectionName = 'medicos';
        break;
      case 'empleado':
        collectionName = 'empleados';
        break;
      case 'paciente':
        collectionName = 'pacientes';
        break;
      // 'administrador' y 'sin_rol' no suelen tener colección de perfil aparte
      default:
        collectionName = '';
    }

    // 3. Si corresponde, agregamos la actualización del perfil al lote
    if (collectionName) {
      const profileRef = doc(this.firestore, collectionName, uid);
      // Usamos update. Si el perfil no existe, Firebase tirará error,
      // lo cual es correcto porque significaría una inconsistencia de datos.
      batch.update(profileRef, { estado: nuevoEstado });
    }

    // 4. Ejecutar todas las operaciones juntas
    await batch.commit();
  }
}
