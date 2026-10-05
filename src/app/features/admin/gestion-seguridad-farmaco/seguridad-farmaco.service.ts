import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc,
  doc, deleteDoc, query, orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ReglaSeguridad } from '../../../core/interfaces/seguridad-farmaco.model';


@Injectable({
  providedIn: 'root'
})
export class SeguridadFarmacoService {
  private firestore = inject(Firestore);
  private readonly colName = 'reglas_seguridad';

  // --- LÓGICA PARA EL ADMIN (Gestión del Vademécum) ---

  /**
   * Obtiene todas las reglas de incompatibilidad ordenadas por nombre de droga.
   */
  obtenerReglas(): Observable<ReglaSeguridad[]> {
    const colRef = collection(this.firestore, this.colName);
    // ✅ CORRECCIÓN: Definimos la consulta 'q' correctamente
    const q = query(colRef, orderBy('droga', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ReglaSeguridad[]>;
  }

  /**
   * Crea una nueva regla de seguridad (Droga vs Alergia)
   */
  crearRegla(regla: ReglaSeguridad) {
    const colRef = collection(this.firestore, this.colName);
    return addDoc(colRef, regla);
  }

  /**
   * Elimina una regla del sistema
   */
  borrarRegla(id: string) {
    const docRef = doc(this.firestore, this.colName, id);
    return deleteDoc(docRef);
  }

  // --- 🧠 MOTOR DE ESCANEO CLÍNICO (Para el Médico) ---

  /**
   * Analiza un texto de tratamiento buscando coincidencias con drogas prohibidas
   * según el perfil de alergias del paciente.
   */
  analizarTratamiento(texto: string, alergiasPaciente: string[], reglas: ReglaSeguridad[]): ReglaSeguridad[] {
    if (!texto || !alergiasPaciente || alergiasPaciente.length === 0 || !reglas) return [];

    const alertas: ReglaSeguridad[] = [];
    const textoLimpio = texto.toUpperCase();

    reglas.forEach(regla => {
      // 1. ¿El médico escribió esta droga?
      if (textoLimpio.includes(regla.droga.toUpperCase())) {

        // 2. 🧠 LÓGICA DE CRUCE (Nivel Senior):
        // ¿Hay alguna intersección entre las alergias del paciente y las de la regla?
        const conflicto = regla.alergiasRelacionadas.some(tagRegla =>
          alergiasPaciente.some(tagPaciente =>
            tagPaciente.toUpperCase().includes(tagRegla.toUpperCase()) ||
            tagRegla.toUpperCase().includes(tagPaciente.toUpperCase())
          )
        );

        if (conflicto) {
          alertas.push(regla);
        }
      }
    });

    return alertas;
  }
}
