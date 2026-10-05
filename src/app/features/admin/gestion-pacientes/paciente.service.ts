// src/app/features/admin/gestion-pacientes/paciente.service.ts

import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { UsuarioService } from '../gestion-usuarios/usuario.service';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);
  private usuarioService = inject(UsuarioService);

  private readonly collectionPath = 'pacientes';

  /**
   * Crea o sobrescribe el perfil del paciente.
   * Usamos 'setDocument' para asegurar que el ID del documento sea igual al UID del usuario.
   */
  crearPaciente(paciente: Partial<Paciente>): Promise<void> {
    const datosIniciales = {
      estado: 'Activo', // Por defecto activo
      ...paciente
    };
    return this.firestoreService.setDocument(this.collectionPath, paciente.uid!, datosIniciales);
  }

  /**
   * Obtiene un paciente específico (para editar o ver detalle).
   */
  obtenerPacientePorId(uid: string): Promise<Paciente | undefined> {
    return this.firestoreService.getDocument<Paciente>(this.collectionPath, uid);
  }

  /**
   * Actualiza datos parciales (ej: cargar Obra Social después).
   */
  actualizarPaciente(uid: string, data: Partial<Paciente>): Promise<void> {
    return this.firestoreService.updateDocument(this.collectionPath, uid, data);
  }

  // ===========================================================================
  // ⚡ EL MÉTODO CLAVE PARA LA TABLA DEL ADMIN
  // ===========================================================================
  /**
   * Obtiene una lista combinada de Usuarios (Rol: Paciente) + Sus Datos Clínicos.
   * Esto permite ver en la tabla incluso a los usuarios que se registraron
   * pero NUNCA completaron su ficha médica (aparecerán con campos vacíos).
   */
  obtenerPacientesCompletos(): Observable<any[]> {
  return combineLatest([
    this.usuarioService.obtenerUsuariosPorRol('paciente'),
    this.firestoreService.getCollection<Paciente>(this.collectionPath)
  ]).pipe(
    map(([usuarios, fichasMedicas]) => {
      return usuarios.map(usuario => {
        const ficha = fichasMedicas.find(p => p.uid === usuario.uid);

        // 🔴 CORRECCIÓN LÓGICA AQUÍ:
        // Para estar completo, debe existir la ficha Y tener un DNI cargado
        const estaCompleto = !!ficha && !!ficha.dni && ficha.dni !== '';

        return {
          uid: usuario.uid,

          displayName: usuario.displayName,
          email: usuario.email,
          fotoUsuario: usuario.fotoURL,

          // Si no hay ficha o no hay DNI, mostramos guiones
          dni: (ficha && ficha.dni) ? ficha.dni : '---',
          obraSocial: (ficha && ficha.obraSocial) ? ficha.obraSocial : 'No cargada',
          edad: this.calcularEdad(ficha?.fechaNacimiento),

          ...ficha,

          // Usamos la nueva variable calculada
          perfilCompleto: estaCompleto
        };
      });
    })
  );
}
  /**
   * Helper para calcular edad en base a string 'YYYY-MM-DD'
   */
  private calcularEdad(fechaNac?: string): string {
    if (!fechaNac) return '-';
    const hoy = new Date();
    const cumpleanos = new Date(fechaNac);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }
    return edad.toString();
  }

   obtenerPacienteSnapshot(uid: string): Observable<Paciente | undefined> {
    const docRef = doc(this.firestore, 'pacientes', uid);
    // docData mantiene una conexión abierta al documento
    return docData(docRef) as Observable<Paciente | undefined>;
  }
}
