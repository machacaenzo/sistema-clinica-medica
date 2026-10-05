import { Timestamp } from '@angular/fire/firestore';

export interface NotificacionInterna {
  id?: string;
  idPaciente: string;
  titulo: string;
  mensaje: string;
  fecha: Timestamp;
  leida: boolean;
  link?: string;         // Por si queremos llevarlo a /mis-turnos
  tipo: 'ALERTA' | 'INFO' | 'RESULTADO'; // Para cambiar el color en la campanita
}
