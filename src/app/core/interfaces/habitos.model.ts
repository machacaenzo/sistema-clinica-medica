import { Timestamp } from '@angular/fire/firestore';

export type TipoHabito = 'ALCOHOL' | 'ACTIVIDAD_FISICA' | 'TABAQUISMO';

export interface RegistroHabito {
  id?: string;
  fecha: Timestamp;
  tipo: TipoHabito;
  score: number;       // El puntaje numérico del test
  resultado: string;   // Ej: "Consumo de Riesgo", "Sedentario", etc.
  detalles: any;       // Guardamos las respuestas crudas por si el médico las quiere ver
  color: string;       // Para el semáforo visual (text-red-500, etc)
}
