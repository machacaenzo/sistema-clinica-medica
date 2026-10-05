export interface PedidoLaboratorio {
  id?: string;
  idTurno: string;        // Vínculo con la consulta del médico
  idPaciente: string;
  pacienteNombre: string;
  pacienteDni: string;
  idMedico: string;
  medicoNombre: string;

  tipoEstudio: string;    // Ej: "Hemograma", "Glucemia"
  fechaPedido: any;       // Timestamp

  // Lo que llena el técnico:
  resultados?: {
    [key: string]: number | string; // Ej: { glucemia: 110, colesterol: 200 }
  };
  observacionesTecnicas?: string;
  estado: 'PENDIENTE' | 'LISTO' | 'CANCELADO';
  fechaFinalizado?: any;
  estudios: string[];
  urlEstudioExterno?:string|null
}
