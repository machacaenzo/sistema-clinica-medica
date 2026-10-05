export interface ServicioDiagnostico {
  id?: string;
  nombre: string;         // Ej: "Análisis de Sangre Completo"
  precioFijo: number;     // Ej: 2500
  instrucciones: string;  // Ej: "Ayuno de 8hs requerido"
  estado: 'Activo' | 'Inactivo';
}
