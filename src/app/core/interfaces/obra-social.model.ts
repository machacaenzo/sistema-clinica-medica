export interface ObraSocial {
  id?: string;
  nombre: string;       // Ej: OSDE, Swiss Medical
  siglas?: string;      // Ej: PAMI, IOMA (Opcional)
  tipo: 'Prepaga' | 'Obra Social' | 'Particular' | 'Otro';
  cobertura: number;    // Porcentaje: 100, 80, 50, 0
  sitioWeb?: string;    // Opcional: para validar afiliaciones online a futuro
  logo?: string;        // Base64
  estado: 'Activa' | 'Inactiva';

  coberturaConsulta: number; // % para honorarios médicos
  coberturaEstudio: number;
}
