export interface ReglaSeguridad {
  id?: string;
  droga: string;
  // ✅ Ahora una droga puede chocar con varias etiquetas de alergia
  alergiasRelacionadas: string[];
  severidad: 'MEDIA' | 'CRITICA';
  mensajeAlerta: string;
}
