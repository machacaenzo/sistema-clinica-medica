import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { FirestoreService } from '../../../core/services/firestore.service';
import { PerfilMedico } from '../../../core/interfaces/perfil-medico.model';

@Injectable({
  providedIn: 'root'
})
export class MedicoService {
  private firestoreService = inject(FirestoreService);

  private readonly collectionPath = 'medicos';

  /**
   * Crea o actualiza el perfil médico.
   */
  crearPerfil(perfil: Partial<PerfilMedico>): Promise<void> {
    return this.firestoreService.setDocument(this.collectionPath, perfil.uid!, perfil);
  }

  obtenerMedicoPorId(uid: string): Promise<PerfilMedico | undefined> {
    return this.firestoreService.getDocument<PerfilMedico>(this.collectionPath, uid);
  }

  /**
   * ✅ OPTIMIZADO: Lee solo la colección 'medicos'.
   * Ya contiene nombre y foto gracias a la corrección en UsuarioService.
   */
  obtenerMedicosCompletos(): Observable<any[]> {
    return this.firestoreService.getCollection<PerfilMedico>(this.collectionPath).pipe(
      map(medicos => {
        return medicos.map(m => ({
          // Datos crudos del perfil
          ...m,

          // --- ADAPTADORES PARA LA VISTA (HTML) ---
          // El HTML espera 'displayName', pero la interfaz nueva tiene 'nombre'.
          // Hacemos este puente para no tener que reescribir todo el HTML ahora.
          displayName: m.nombre || 'Médico Sin Nombre',
          fotoUsuario: m.foto, // El HTML espera 'fotoUsuario', la interfaz tiene 'foto'

          // Adaptamos el array de especialidades a un string simple para la tabla
          especialidad: (m.especialidades && m.especialidades.length > 0)
                        ? m.especialidades[0]
                        : 'Sin asignar',

          // Flag visual para el ícono de agenda
          agendaConfigurada: m.disponibilidad?.some(d => d.activo) || false
        }));
      })
    );
  }
}
