import { inject, Injectable } from '@angular/core';

import { collection, collectionData, Firestore, orderBy, query, Timestamp } from '@angular/fire/firestore';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HabitosService {
  private firestoreBase = inject(FirestoreService);
   private firestore = inject(Firestore );

  async guardarResultadoTest(uidPaciente: string, registro: any): Promise<void> {
  if (!uidPaciente) throw new Error("El UID del paciente es requerido");

  const path = `pacientes/${uidPaciente.trim()}/historial_habitos`;

  // RASTREO PARA CONSOLA:
  console.log("--- INTENTO DE GUARDADO ---");
  console.log("Ruta:", path);
  console.log("Datos:", registro);

  // Simplemente ejecutamos la promesa sin retornar el objeto DocumentReference
  await this.firestoreBase.addDocument(path, registro);

  console.log("¡Operación enviada a Firebase!");
}

  // LÓGICA MÉDICA AUDIT (10 preguntas, 0-4 puntos c/u)
  analizarAlcohol(totalScore: number) {
    if (totalScore >= 20) return { score: totalScore, nivel: 'Dependencia (Urgente)', color: 'text-red-700' };
    if (totalScore >= 8) return { score: totalScore, nivel: 'Consumo de Riesgo', color: 'text-orange-600' };
    return { score: totalScore, nivel: 'Bajo Riesgo', color: 'text-green-600' };
  }

  // LÓGICA MÉDICA FAGERSTRÖM (6 preguntas)
  analizarTabaco(totalScore: number) {
    if (totalScore >= 7) return { score: totalScore, nivel: 'Dependencia Alta', color: 'text-red-700' };
    if (totalScore >= 4) return { score: totalScore, nivel: 'Dependencia Moderada', color: 'text-orange-600' };
    return { score: totalScore, nivel: 'Dependencia Baja', color: 'text-green-600' };
  }

  // LÓGICA MÉDICA IPAQ (Actividad Física)
  analizarActividad(totalScore: number) {
    if (totalScore >= 600 && totalScore < 1500) return { score: totalScore, nivel: 'Activo Moderado', color: 'text-blue-600' };
    if (totalScore >= 1500) return { score: totalScore, nivel: 'Muy Activo', color: 'text-teal-600' };
    return { score: totalScore, nivel: 'Sedentario / Bajo', color: 'text-slate-500' };
  }

  // Al final de habitos.service.ts, añade este método:

  analizarDiabetes(puntos: number) {
    let nivel = '';
    let color = '';
    let riesgo = '';

    if (puntos >= 20) {
      nivel = 'Riesgo Muy Alto';
      color = 'text-red-700';
      riesgo = '50% de probabilidad de desarrollar diabetes en 10 años.';
    } else if (puntos >= 15) {
      nivel = 'Riesgo Alto';
      color = 'text-red-500';
      riesgo = '33% de probabilidad. Se recomienda análisis de sangre.';
    } else if (puntos >= 12) {
      nivel = 'Riesgo Moderado';
      color = 'text-orange-500';
      riesgo = '17% de probabilidad. Mejorar hábitos urgentes.';
    } else {
      nivel = 'Riesgo Bajo';
      color = 'text-green-600';
      riesgo = '1-4% de probabilidad. Mantener estilo de vida.';
    }

    return { score: puntos, nivel: `${nivel} (${riesgo})`, color };
  }

  obtenerHistorial(uidPaciente: string): Observable<any[]> {
    const path = `pacientes/${uidPaciente}/historial_habitos`;
    const colRef = collection(this.firestore, path);
    // Ordenamos por fecha descendente
    const q = query(colRef, orderBy('fecha', 'desc'));

    return collectionData(q, { idField: 'id' });
  }
}
