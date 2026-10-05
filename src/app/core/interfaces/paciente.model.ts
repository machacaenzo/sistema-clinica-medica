
export interface Paciente {
  // --- IDENTIFICACIÓN ---
  uid: string;
  nombreCompleto: string;
  dni?: string;

  // --- DATOS COMPLEMENTARIOS ---
  fechaNacimiento?: string;
  sexo?: 'Masculino' | 'Femenino' | 'X' | 'Otro';
  foto?: string;

  // --- CONTACTO ---
  telefono?: string;
  direccion?: string;
  email?: string;

  // --- DATOS ADMINISTRATIVOS ---
  obraSocial?: string;
  numeroAfiliado?: string;

  // --- SEGURIDAD (Módulo 9: Grupo Sanguíneo) ---
  grupoSanguineo?: '0+' | '0-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
    relacion?: string;
  };

  // --- BILLETERA VIRTUAL ---
  saldoCuenta: number;

  // --- DATOS CLÍNICOS (Módulo Médico) ---

  // 1. ALERGIAS (Array simple para las alertas automáticas)
  alergias?: string[];

  // 2. PERFIL CLÍNICO ESTRUCTURADO
  perfilClinico?: {

    // A. Lógica del Sistema (Para que funcionen las Alertas)
    factoresRiesgo: string[];    // Ej: ['Fumador']
    antecedentes: string[];      // Ej: ['Diabetes', 'Hipertensión'] (Etiquetas rápidas)

    // B. MÓDULO 9 - HISTORIA NARRATIVA (Campos de texto libre)
    // Aquí el médico escribe el detalle: "Padre fallecido por IAM a los 50 años..."
    historiaFamiliar?: string;       // Antecedentes Hereditarios
    cirugiasPrevias?: string;        // Antecedentes Quirúrgicos
    medicacionHabitual?: string;     // Qué toma todos los días (fuera de la receta actual)

    // C. Semáforo de Prevención (Fechas exactas)
    historialPreventivo?: {
      fechaUltimoPap?: string;
      fechaUltimaMamo?: string;
      fechaUltimaColonoscopia?: string;
      fechaUltimoPsa?: string;
      fechaUltimoFondoOjo?: string;
    };
  };

  // --- OBJETIVOS TERAPÉUTICOS (Para los gráficos) ---
  metasSalud?: {
    metaPeso?: number | null;
    metaPresionSistolica?: number | null;
    metaHba1c?: number | null;
    metaLdl?: number | null;
  };

  // --- CONTEXTO SOCIAL ---
  notasContexto?: string;
  medicacionHabitual?: string;

  modulosHabilitados?: string[]; // Ej: ['PRESION', 'HABITOS', 'DIABETES']


  // 🛡️ SISTEMA DE REPUTACIÓN (NIVEL DIOS)
  reputacion?: number;           // 0 a 100 (Empieza en 100)
  estadoReputacion?: 'SALUDABLE' | 'BLOQUEADO';
  inasistenciasEfectivo?: number; // Contador de veces que faltó pagando en efectivo
  multaPendiente?: number;
  
  estado?: 'Activo' | 'Inactivo';
}
