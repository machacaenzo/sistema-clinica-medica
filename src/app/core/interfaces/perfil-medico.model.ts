// Definimos los días permitidos
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' |'Domingo';

export interface FranjaHoraria {
  inicio: string; // '08:00'
  fin: string;    // '12:00'
}

export interface DiaAgenda {
  dia: DiaSemana;
  activo: boolean;
  franjas: FranjaHoraria[];
}

export interface PerfilMedico {
  uid: string; // Vinculación con Auth

  // --- DATOS DESNORMALIZADOS (Copiados de Usuario) ---
  // Esto permite listar médicos en el Wizard sin leer la colección 'usuarios'
  nombre: string;  // Se copia del displayName del Usuario
  foto?: string;   // Se copia del fotoURL del Usuario

  // --- DATOS PROFESIONALES ---
  matricula: string;
  especialidades: string[]; // Array para escalabilidad (aunque uses 1 por ahora)

  // --- CONFIGURACIÓN DE ATENCIÓN ---
  duracionTurno: number; // Por defecto 30
  valorConsulta: number; // Obligatorio para el módulo de Cobros

  // --- AGENDA ---
  disponibilidad: DiaAgenda[];

  estado: 'Activo' | 'Inactivo';
}
