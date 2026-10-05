import { Timestamp } from '@angular/fire/firestore';
export interface ResenaTurno {
  puntos: number;
  comentario: string;
  recomienda: boolean;
  fecha: Timestamp;
  estadoModeracion: 'publicado' | 'oculto';
}
export type EstadoTurno =
  | 'Pendiente de Pago'  // Reservado, falta dinero externo
  | 'Confirmado'         // Todo pagado (o bonificado 100%)
  | 'En Sala'            // Paciente presente
  | 'En Atencion'        // En consultorio
  | 'Finalizado'         // Cerrado
  | 'Cancelado'
  | 'Ausente'
  | 'Rechazado'
  | 'Vencido';

export type MetodoPago =
  | 'Efectivo'
  | 'Transferencia'
  | 'Tarjeta de Crédito' // Simulado
  | 'Saldo Previo'       // Si el saldo cubrió el 100%
  | 'Mixto'              // Saldo + Otro método
  | 'Bonificado 100%';   // OS cubre todo

export interface Turno {
  id?: string;

  // --- TEMPORALIDAD ---
  fecha: Timestamp;
  fechaString: string;    // 'YYYY-MM-DD'
  hora: string;           // 'HH:MM'

  // --- ESTADO ---
  estado: EstadoTurno;
  fechaVencimientoReserva?: Timestamp; // TTL para Transferencias

  // --- RELACIONES ---
  idPaciente: string;
  idMedico: string;

  // Snapshots (Datos congelados)
  pacienteData: {
    nombre: string;
    dni: string;
    obraSocial: string;
  };
  medicoData: {
    nombre: string;
    especialidad: string;
    matricula: string;
  };

  // 💰 --- ECONOMÍA DETALLADA (LÓGICA PAGO MIXTO) ---

  // 1. CUÁNTO SALE
  precioConsulta: number;       // Ej: $15.000

  // 2. QUIÉN PAGA QUÉ
  coberturaPorcentaje: number;  // Ej: 20%
  montoCobertura: number;       // Ej: $3.000 (Paga la OS)

  montoSaldoUsado?: number;      // Ej: $4.000 (Se descuenta de la Billetera del Paciente)

  montoAbonar: number;          // Ej: $8.000 (Lo que el paciente tiene que sacar del bolsillo AHORA)

  // 3. CÓMO PAGA EL "MONTO ABONAR"
  metodoPago: MetodoPago;

  // Comprobantes
  comprobanteBase64?: string;
  fechaCargaComprobante?: Timestamp;

  // --- TRAZABILIDAD (REPROGRAMACIÓN) ---
  idTurnoOriginal?: string;      // Si viene de reprogramar, aquí va el ID del turno anterior cancelado
  motivoCancelacion?: string;    // Si este turno se cancela, guardamos por qué

  // --- AUDITORÍA ---
  fechaCreacion: Timestamp;
  creadoPor: 'ADMIN' | 'PACIENTE'|'MEDICO';

 // Solo referencia, no el dato completo
  idHistoriaClinica?: string; // Se llena cuando el médico guarda la consulta

  tipo?: 'CONSULTA' | 'VIDEO'; // Default 'CONSULTA'
  enlaceVideo?: string;       // Opcional, nombre de la sala Jitsi

  recordatorioEnviado?: boolean; // Nuevo campo
  prestacionData?: {
    id: string;
    nombre: string;         // Ej: "Apto Físico Escolar"
    tipoFormulario: string; // 'GENERAL' | 'APTO_FISICO' | 'CONTROL_CRONICO'
  };
 estudiosListos?: boolean;

  resena?: ResenaTurno;
}
