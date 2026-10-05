import { Timestamp } from '@angular/fire/firestore';

export type TipoTransaccion =
  | 'INGRESO'        // Entra plata real (Efectivo/Tarjeta)
  | 'EGRESO'         // Sale plata real (Devolución a tarjeta/mano)
  | 'CREDITO'        // Se carga saldo a favor (Reembolso por cancelación)
  | 'DEBITO';        // Se usa saldo a favor (Pago con billetera)

export interface Transaccion {
  id?: string;

  fecha: Timestamp;
  monto: number;      // Siempre positivo en el registro, el tipo define si suma o resta
  tipo: TipoTransaccion;

  // Contexto
  idPaciente: string;
  idTurno?: string;   // A qué turno corresponde (opcional, ej: carga de saldo manual)

  // Auditoría
  usuarioResponsable: string; // 'Sistema', 'Admin: Juan', 'Paciente'
  motivo: string;     // Ej: "Pago turno #123", "Reembolso por cancelación"

  // Referencia externa (Para el futuro con MercadoPago)
  referenciaExterna?: string;
}
