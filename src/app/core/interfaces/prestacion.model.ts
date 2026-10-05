export interface Prestacion {
  id?: string;
  nombre: string;         // Ej: "Apto Físico Escolar"
  descripcion?: string;   // Ej: "Traer estudios previos"

  // ⚙️ EL CEREBRO: Define qué pantalla ve el médico
  tipoFormulario: 'GENERAL' | 'APTO_FISICO' | 'CONTROL_CRONICO';

  estado: 'Activa' | 'Inactiva';


  idServicioRequerido?: string; // El ID del documento de la colección de arriba
}
