import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, orderBy, getDocs, doc, writeBatch, limit } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Consulta } from '../../../core/interfaces/consulta.model';


@Injectable({
  providedIn: 'root'
})
export class ConsultaMedicaService {
  private firestore = inject(Firestore);

  private readonly colConsultas = 'consultas_medicas';
  private readonly colTurnos = 'turnos';
  private readonly colPacientes = 'pacientes';

  /**
   * Obtiene el historial médico previo de un paciente (Timeline).
   */
  obtenerHistorialPaciente(idPaciente: string): Observable<Consulta[]> {
    const q = query(
      collection(this.firestore, this.colConsultas),
      where('idPaciente', '==', idPaciente),
      orderBy('fecha', 'desc'),
      limit(20)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Consulta)))
    );
  }

  /**
   * TRANSACCIÓN ATÓMICA:
   * 1. Guarda la consulta.
   * 2. Cierra el turno.
   * 3. Actualiza antecedentes en el paciente.
   */
  async finalizarConsulta(consulta: Consulta, nuevosDiagnosticosCronicos?: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    // 1. Guardar Consulta
    const consultaRef = doc(collection(this.firestore, this.colConsultas));
    batch.set(consultaRef, consulta);

    // 2. Cerrar Turno
    const turnoRef = doc(this.firestore, this.colTurnos, consulta.idTurno);
    batch.update(turnoRef, { estado: 'Finalizado' });

    // 3. Actualizar Perfil Paciente (Si hay nuevos crónicos)
    if (nuevosDiagnosticosCronicos && nuevosDiagnosticosCronicos.length > 0) {
      const pacienteRef = doc(this.firestore, this.colPacientes, consulta.idPaciente);
      batch.update(pacienteRef, {
        'perfilClinico.antecedentes': nuevosDiagnosticosCronicos
      });
    }

    await batch.commit();
  }
}
