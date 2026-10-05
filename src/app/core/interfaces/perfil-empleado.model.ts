export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface FranjaHoraria {
  inicio: string;
  fin: string;
}

export interface JornadaLaboral {
  dia: DiaSemana;
  activo: boolean;
  franjas: FranjaHoraria[];
}

export interface PerfilEmpleado {
  uid: string;
  nombre: string;
  foto: string;
  cuil: string;
  // ✅ AGREGAMOS EL PUESTO DE LABORATORIO
  puesto: 'Secretaria/o' | 'Recepcionista' | 'Enfermero/a' | 'Técnico/a de Laboratorio' | 'Limpieza' | 'Seguridad' | 'Mantenimiento' | 'Otro';
  jornada: JornadaLaboral[];
  esJefe: boolean;
  estado: 'Activo' | 'Inactivo';
}
