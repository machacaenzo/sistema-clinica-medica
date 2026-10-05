import { Timestamp } from '@angular/fire/firestore';

// --- LA CONSULTA MÉDICA ---
export interface Consulta {
  id?: string;
  idTurno: string;
  idPaciente: string;
  idMedico: string;
  fecha: Timestamp;
  fechaString: string;

  // 1. TRIAGE / SIGNOS VITALES
  signosVitales: {
    presionArterial: string;
    peso: number;
    altura: number;
    temperatura?: number;
    frecuenciaCardiaca?: number;
    imc?: number;
    saturacion?: number;
    glucemia?: number | null; // Importante el null para diferenciar "no medido" de "0"
  };

  // 2. SOAP (Evolución)
  motivoConsulta: string;
  examenFisico: string;
  diagnostico: string;
  tratamiento: string;

  // 3. 🟢 NUEVO: ADJUNTOS INTELIGENTES (Cloudinary)
  // Reemplazamos string[] por objetos detallados
  archivosAdjuntos?: {
    nombre: string;       // "Analisis_Sangre_Mayo.pdf"
    url: string;          // "https://res.cloudinary.com/..."
    tipo: 'IMG' | 'PDF';  // Para saber qué icono mostrar
    fechaCarga?: string;
  }[];

  // 4. 🟣 NUEVO: MAPA CORPORAL (Body Map)
  // Guardamos los puntos donde el médico hizo clic
   mapaCorporal?: {
    x: number;
    y: number;
    vista: 'FRENTE' | 'DORSO'; // ✅ AGREGADO: Crucial para re-dibujar
    nota?: string;
  }[];
  // 5. 📝 NUEVO: ESTUDIOS SOLICITADOS (Para generar PDF de Orden)
  estudiosSolicitados?: string[]; // Ej: ['Hemograma', 'Rx Torax']

derivaciones?: {
  especialidad: string; // Ej: "Cardiología", "Nutrición"
  motivo: string;       // Ej: "Control post-crisis hipertensiva", "Descenso de peso"
  prioridad?: 'RUTINA' | 'URGENTE';
}[];


  datosLaboratorio?: {
    colesterol?: number | null;
    hdl?: number | null; // Colesterol bueno
    ldl?: number | null; // Colesterol malo
    trigliceridos?: number| null;
    glucemia?: number| null; // (A veces viene de lab, a veces de dedo)
    creatinina?: number| null; // Clave para calculadora renal
    hba1c?: number| null; // Hemoglobina Glicosilada (Diabetes)
  };
  esControlCronico: boolean;
  duracion?: string;
    insumosEntregados?: {
    nombre: string;
    cantidad: number;
    precio: number;
  }[];
}

// Interfaces auxiliares (Plantillas y Alertas) se mantienen igual...
export interface PlantillaMedica {
  id?: string;           // ID de Firestore
  uidMedico: string;     // Para saber de quién es
  nombre: string;        // Título (ej: "Gripe")
  textoMotivo?: string;
  textoExamen?: string;
  textoPlan?: string;
}

export interface AlertaMedica {
  tipo: 'PELIGRO' | 'ADVERTENCIA';
  mensaje: string;
  drogaConflictiva?: string;
}
