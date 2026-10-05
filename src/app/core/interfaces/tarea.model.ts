import { Timestamp } from '@angular/fire/firestore';

export type EstadoTarea = 'Pendiente' | 'En Proceso' | 'Completada';
export type PrioridadTarea = 'Alta' | 'Media' | 'Baja';

export interface Tarea {
  id?: string;
  idEmpleado: string;
  idCreador: string;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  fechaCreacion: Timestamp;
  fechaLimite?: string;
}

// ✅ CAMBIO AQUÍ: Agregamos idPropietario
export interface TareaPlantilla {
  id?: string;
  idPropietario: string; // UID del Jefe/Admin que creó la plantilla
  titulo: string;
  descripcion: string;
}
