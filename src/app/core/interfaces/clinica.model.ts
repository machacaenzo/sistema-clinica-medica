export interface Feriado {
  fecha: string; // Formato 'YYYY-MM-DD'
  motivo: string; // Ej: "Navidad", "Día del Trabajador"
}

export interface ClinicaConfig {
  id?: string; // Usaremos un ID fijo, ej: 'config_general'
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;

  logo: string; // Base64

  // Horarios generales de apertura/cierre de la institución
  horarioApertura: string; // '07:00'
  horarioCierre: string;   // '21:00'
  diasAtencion: string[];  // ['Lunes', 'Martes', ...]

  feriados: Feriado[];
}
