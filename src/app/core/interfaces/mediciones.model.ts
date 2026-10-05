import { Timestamp } from '@angular/fire/firestore';

export type TipoMedicion = 'PRESION' | 'PESO' | 'GLUCEMIA' | 'TEMPERATURA';

export interface Medicion {
  id?: string;
  idPaciente: string;
  fecha: Timestamp;
  tipo: TipoMedicion;

  valor1: number;       // Sistólica, Peso, Glucemia o Temp
  valor2?: number;      // Diastólica (Solo para Presión)

  notas?: string;       // "Después de comer", "En ayunas"
}
