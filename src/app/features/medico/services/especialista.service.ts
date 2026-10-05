import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, query, where, orderBy, getDocs,
  doc, writeBatch, Timestamp, limit
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { Turno } from '../../../core/interfaces/turno.model';
import { AlertaMedica, Consulta, PlantillaMedica } from '../../../core/interfaces/consulta.model';



@Injectable({
  providedIn: 'root'
})
export class EspecialistaService {
  private firestore = inject(Firestore);
  private firestoreService = inject(FirestoreService);

  private readonly colConsultas = 'consultas_medicas';
  private readonly colTurnos = 'turnos';
  private readonly colPacientes = 'pacientes';

  // =================================================================
  // 1. GESTIÓN DE AGENDA DEL DÍA (Operativa)
  // =================================================================

  /**
   * Obtiene los turnos de HOY para este médico.
   * Filtra por fechaString para ser eficiente.
   * Ordena por hora para mostrar la agenda secuencial.
   */
  obtenerAgendaHoy(idMedico: string): Observable<Turno[]> {
    const hoy = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const q = query(
      collection(this.firestore, this.colTurnos),
      where('idMedico', '==', idMedico),
      where('fechaString', '==', hoy),
      // Traemos confirmados, en sala (esperando) y atendidos (para ver el historial del día)
      where('estado', 'in', ['Confirmado', 'En Sala', 'En Atencion', 'Finalizado']),
      orderBy('hora', 'asc')
    );

    // Convertimos la promesa de getDocs a Observable para que el componente se suscriba
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turno)))
    );
  }

  /**
   * Cambia el estado del turno (ej: de 'En Sala' a 'En Atencion')
   */
  actualizarEstadoTurno(idTurno: string, estado: string): Promise<void> {
    return this.firestoreService.updateDocument(this.colTurnos, idTurno, { estado });
  }

  // =================================================================
  // 2. HISTORIA CLÍNICA Y GUARDADO (El núcleo)
  // =================================================================

  /**
   * Obtiene el historial médico previo de un paciente.
   * Útil para el Timeline y los Gráficos.
   */
  obtenerHistorialPaciente(idPaciente: string): Observable<Consulta[]> {
    const q = query(
      collection(this.firestore, this.colConsultas),
      where('idPaciente', '==', idPaciente),
      orderBy('fecha', 'desc'),
      limit(20) // Traemos las últimas 20 para no saturar
    );

    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consulta)))
    );
  }

  /**
   * GUARDA LA CONSULTA Y CIERRA EL TURNO (Transacción Atómica)
   * 1. Guarda el documento en 'consultas_medicas'.
   * 2. Actualiza el estado del turno a 'Finalizado'.
   * 3. (Opcional) Actualiza datos crónicos en 'pacientes'.
   */
  async finalizarConsulta(consulta: Consulta, nuevosDiagnosticosCronicos?: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // A. Referencia nueva consulta
    const consultaRef = doc(collection(this.firestore, this.colConsultas));
    batch.set(consultaRef, consulta);

    // B. Referencia turno (Cerrarlo)
    const turnoRef = doc(this.firestore, this.colTurnos, consulta.idTurno);
    batch.update(turnoRef, { estado: 'Finalizado' });

    // C. Si hubo diagnósticos nuevos (ej: Ahora es Hipertenso), actualizamos perfil
    if (nuevosDiagnosticosCronicos && nuevosDiagnosticosCronicos.length > 0) {
      const pacienteRef = doc(this.firestore, this.colPacientes, consulta.idPaciente);
      // Nota: En un caso real usaríamos arrayUnion, aquí sobrescribimos o mergeamos según lógica
      // Para simplificar, asumimos que el componente manda la lista completa actualizada
      batch.update(pacienteRef, {
        'perfilClinico.antecedentes': nuevosDiagnosticosCronicos
      });
    }

    await batch.commit();
  }

  // =================================================================
  // 3. INTELIGENCIA CLÍNICA (Herramientas de ayuda)
  // =================================================================

 

  /**
   * EL ÁNGEL GUARDIÁN (Validador de Seguridad)
   * Analiza el texto de la receta contra las alergias del paciente.
   */
  analizarRiesgos(textoReceta: string, alergiasPaciente: string[]): AlertaMedica[] {
    const alertas: AlertaMedica[] = [];
    const receta = textoReceta.toLowerCase();

    // Base de conocimiento simple de interacciones
    // Formato: Si el paciente es alérgico a X y la receta dice Y -> ALERTA
    const reglas = [
      { alergia: 'penicilina', trigger: 'amox', mensaje: 'Paciente alérgico a Penicilina. Cuidado con Amoxicilina.' },
      { alergia: 'penicilina', trigger: 'penicilina', mensaje: 'Paciente alérgico a Penicilina.' },
      { alergia: 'penicilina', trigger: 'optamox', mensaje: 'Optamox contiene derivados de Penicilina.' },
      { alergia: 'aspirina', trigger: 'aspirina', mensaje: 'Alergia a AAS detectada.' },
      { alergia: 'aspirina', trigger: 'ibuprofeno', mensaje: 'Precaución: AINEs en alérgico a Aspirina.' },
      { alergia: 'yodo', trigger: 'contraste', mensaje: 'Verificar si el estudio requiere contraste iodado.' }
    ];

    if (!alergiasPaciente || alergiasPaciente.length === 0) return [];

    alergiasPaciente.forEach(alergia => {
      const alergiaClean = alergia.toLowerCase();

      reglas.forEach(regla => {
        // Si el paciente tiene la alergia Y la receta contiene la droga gatillo
        if (alergiaClean.includes(regla.alergia) && receta.includes(regla.trigger)) {
          alertas.push({
            tipo: 'PELIGRO',
            mensaje: regla.mensaje,
            drogaConflictiva: regla.trigger
          });
        }
      });
    });

    return alertas;
  }
}
