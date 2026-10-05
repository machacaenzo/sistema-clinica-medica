import { Timestamp } from '@angular/fire/firestore';

export interface MensajeContacto {
  id?: string;
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
  fecha: Timestamp;
  leido: boolean;
  estado: 'Pendiente' | 'Visto' | 'Respondido';

  // Aquí definimos que puede ser string (si está logueado) o null (si es visitante)
  uidUsuario?: string | null;
}
