import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';

// Servicios y Modelos
import { ClinicaService } from '../../admin/config-clinica/clinica.service';
import { Paciente } from '../../../core/interfaces/paciente.model';


@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private clinicaService = inject(ClinicaService);

  // Color corporativo (Teal Oscuro para textos legales)
  private readonly colorPrimario = '#0f766e';

  // ==========================================================================
  // 1. RECETA MÉDICA (RP)
  // ==========================================================================
  generarReceta(paciente: Paciente, tratamiento: string, nombreMedico: string) {
    const doc = this.inicializarPDF('RECETA MÉDICA (RP)');

    this.agregarDatosPaciente(doc, paciente);

    // Cuerpo del Tratamiento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const splitTexto = doc.splitTextToSize(tratamiento, 170); // Ajuste de ancho
    doc.text(splitTexto, 20, 95);

    this.agregarFirma(doc, nombreMedico);
    window.open(doc.output('bloburl'), '_blank');
  }

  // ==========================================================================
  // 2. ORDEN DE ESTUDIOS
  // ==========================================================================
  generarOrdenEstudios(paciente: Paciente, estudios: string[], diagnostico: string, nombreMedico: string) {
    const doc = this.inicializarPDF('SOLICITUD DE ESTUDIOS');

    this.agregarDatosPaciente(doc, paciente);

    // Diagnóstico
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Diagnóstico Presuntivo:', 20, 95);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(diagnostico || 'En estudio', 65, 95);

    // Lista
    let y = 110;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Se solicita:', 20, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    estudios.forEach(estudio => {
      doc.circle(23, y - 1.5, 1, 'F'); // Bullet point
      doc.text(estudio, 28, y);
      y += 8;
    });

    this.agregarFirma(doc, nombreMedico);
    window.open(doc.output('bloburl'), '_blank');
  }

  // ==========================================================================
  // 3. ORDEN DE INTERCONSULTA (DERIVACIÓN) - ✅ NUEVO
  // ==========================================================================
  generarInterconsulta(paciente: Paciente, especialidad: string, motivo: string, nombreMedico: string) {
    const doc = this.inicializarPDF('SOLICITUD DE INTERCONSULTA');

    this.agregarDatosPaciente(doc, paciente);

    // Cuerpo de la carta
    let y = 95;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    const textoIntro = `Se solicita evaluación y tratamiento por especialista en:`;
    doc.text(textoIntro, 20, y);

    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(especialidad.toUpperCase(), 20, y); // Ej: CARDIOLOGÍA

    y += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Motivo de derivación / Resumen Clínico:', 20, y);

    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const splitMotivo = doc.splitTextToSize(motivo, 170);
    doc.text(splitMotivo, 20, y);

    this.agregarFirma(doc, nombreMedico);
    window.open(doc.output('bloburl'), '_blank');
  }

  // ==========================================================================
  // 🎨 HELPERS DE DISEÑO (PRIVADOS)
  // ==========================================================================

  private inicializarPDF(tituloDocumento: string): jsPDF {
    const doc = new jsPDF();
    const info = this.clinicaService.clinicaData();

    // Logo (Si existe, posición X:15 Y:10)
    if (info?.logo) {
      try {
        doc.addImage(info.logo, 'PNG', 15, 10, 20, 20);
      } catch (e) { console.warn('Error cargando logo', e); }
    }

    // Encabezado Institucional
    doc.setFontSize(18);
    doc.setTextColor(this.colorPrimario);
    doc.setFont('helvetica', 'bold');
    doc.text(info?.nombre || 'Clínica HIA', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(info?.direccion || '', 105, 26, { align: 'center' });

    // Separador
    doc.setDrawColor(this.colorPrimario);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Título del Doc
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(tituloDocumento, 105, 50, { align: 'center' });

    // Caja decorativa título
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.roundedRect(55, 42, 100, 12, 2, 2);

    return doc;
  }

  private agregarDatosPaciente(doc: jsPDF, paciente: Paciente) {
    const fechaHoy = new Date().toLocaleDateString();

    // Fondo gris suave
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 60, 170, 25, 'F');

    doc.setFontSize(10);
    doc.setTextColor(80); // Gris oscuro
    doc.setFont('helvetica', 'normal');

    // Etiquetas
    doc.text('Paciente:', 25, 68);
    doc.text('Obra Social:', 25, 78);
    doc.text('DNI:', 120, 68);
    doc.text('Fecha:', 120, 78);

    // Valores
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0); // Negro

    doc.text(paciente.nombreCompleto, 45, 68);
    doc.text(paciente.obraSocial || 'Particular', 48, 78);
    doc.text(paciente.dni || '---', 130, 68);
    doc.text(fechaHoy, 135, 78);

    // Línea inferior datos
    doc.setDrawColor(220);
    doc.line(20, 85, 190, 85);
  }

  private agregarFirma(doc: jsPDF, medico: string) {
    const yBottom = 250;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(130, yBottom, 190, yBottom);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(medico, 160, yBottom + 5, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Firma y Sello', 160, yBottom + 10, { align: 'center' });
  }

   // ==========================================================================
  // 4. RESUMEN DE CONSULTA (HISTORIA CLÍNICA INDIVIDUAL) - ✅ NUEVO
  // ==========================================================================
  generarResumenConsulta(paciente: Paciente, consulta: any, nombreMedico: string) {
    const doc = this.inicializarPDF('RESUMEN DE CONSULTA CLÍNICA');
    this.agregarDatosPaciente(doc, paciente);

    let y = 95; // Posición vertical inicial después del header
    const lineHeight = 7;
    const pageHeight = 280; // A4 height aprox
    const margin = 20;
    const maxWidth = 170;

    // Helper interno para controlar salto de página
    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight) {
        doc.addPage();
        y = 20; // Reiniciar arriba
      }
    };

    doc.setFontSize(11);

    // --- 1. SIGNOS VITALES ---
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.colorPrimario);
    doc.text('SIGNOS VITALES', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    const sv = consulta.signosVitales || {};
    let textoSignos = `Presión: ${sv.presionArterial || '-'} | Peso: ${sv.peso || '-'}kg | Altura: ${sv.altura || '-'}cm`;
    if(sv.temperatura) textoSignos += ` | Temp: ${sv.temperatura}°C`;
    if(sv.glucemia) textoSignos += ` | Glucemia: ${sv.glucemia}`;

    doc.text(textoSignos, margin, y);
    y += (lineHeight * 2);

    // --- 2. MOTIVO DE CONSULTA ---
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.colorPrimario);
    doc.text('MOTIVO', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const splitMotivo = doc.splitTextToSize(consulta.motivoConsulta || '-', maxWidth);
    doc.text(splitMotivo, margin, y);
    y += (splitMotivo.length * lineHeight) + lineHeight;

    // --- 3. EXAMEN FÍSICO ---
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.colorPrimario);
    doc.text('EXAMEN FÍSICO / EVOLUCIÓN', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const splitExamen = doc.splitTextToSize(consulta.examenFisico || '-', maxWidth);
    doc.text(splitExamen, margin, y);
    y += (splitExamen.length * lineHeight) + lineHeight;

    // --- 4. DIAGNÓSTICO ---
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.colorPrimario);
    doc.text('DIAGNÓSTICO', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const splitDiag = doc.splitTextToSize(consulta.diagnostico || '-', maxWidth);
    doc.text(splitDiag, margin, y);
    y += (splitDiag.length * lineHeight) + lineHeight;

    // --- 5. PLAN DE TRATAMIENTO ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.colorPrimario);
    doc.text('PLAN TÉRAPEUTICO / INDICACIONES', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    const splitTrat = doc.splitTextToSize(consulta.tratamiento || '-', maxWidth);
    doc.text(splitTrat, margin, y);
    y += (splitTrat.length * lineHeight) + (lineHeight * 2);

    // Firma al final
    checkPageBreak(40);
    this.agregarFirma(doc, nombreMedico);

    window.open(doc.output('bloburl'), '_blank');
  }


  // ==========================================================================
  // 5. HISTORIA CLÍNICA COMPLETA (MULTIPÁGINA) - ✅ FINAL
  // ==========================================================================
  generarHistorialCompleto(paciente: Paciente, historial: any[]) {
    const doc = this.inicializarPDF('HISTORIA CLÍNICA COMPLETA');

    // 1. Cabecera del Paciente (Solo en la primera página)
    this.agregarDatosPaciente(doc, paciente);

    let y = 100; // Posición inicial
    const pageHeight = 280; // Margen inferior
    const margin = 20;
    const maxWidth = 170;
    const lineHeight = 6;

    // Función auxiliar para saltar de página si falta espacio
    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight) {
        doc.addPage();
        y = 20; // Reiniciar arriba en la nueva página

        // Opcional: Repetir nombre del paciente en la nueva hoja
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Paciente: ${paciente.nombreCompleto} (Cont.)`, margin, 15);
      }
    };

    doc.setFontSize(10);

    // 2. Iterar sobre las consultas
    historial.forEach((consulta, index) => {

      // Calcular espacio estimado para este bloque (aprox 40px mínimo)
      checkPageBreak(40);

      // --- ENCABEZADO DE LA CONSULTA (Fecha) ---
      doc.setFillColor(240, 242, 245); // Gris muy suave
      doc.rect(margin, y, 170, 8, 'F'); // Barra de fondo

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.colorPrimario);
      doc.text(`FECHA: ${consulta.fechaString}`, margin + 2, y + 5);

      y += 12;

      // --- SIGNOS VITALES ---
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);
      const sv = consulta.signosVitales || {};
      const textoSignos = `Signos: PA ${sv.presionArterial || '-'} | Peso ${sv.peso || '-'}kg | Temp ${sv.temperatura || '-'}°`;

      doc.setFontSize(9);
      doc.text(textoSignos, margin, y);
      y += 8;

      // --- DIAGNÓSTICO ---
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnóstico:', margin, y);

      doc.setFont('helvetica', 'normal');
      const splitDiag = doc.splitTextToSize(consulta.diagnostico || 'Sin diagnóstico', maxWidth - 30);
      doc.text(splitDiag, margin + 25, y);

      const alturaDiag = splitDiag.length * lineHeight;
      checkPageBreak(alturaDiag); // Verificar si el texto empujó mucho
      y += alturaDiag + 2;

      // --- TRATAMIENTO ---
      doc.setFont('helvetica', 'bold');
      doc.text('Tratamiento:', margin, y);

      doc.setFont('helvetica', 'normal');
      const splitTrat = doc.splitTextToSize(consulta.tratamiento || '-', maxWidth - 30);
      doc.text(splitTrat, margin + 25, y);

      const alturaTrat = splitTrat.length * lineHeight;
      y += alturaTrat + 8; // Espacio extra entre consultas

      // Línea separadora suave entre consultas
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 4, 190, y - 4);
    });

    // 3. Pie de página final
    checkPageBreak(20);
    const fechaEmision = new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento generado el ${fechaEmision} - Clínica HIA`, 105, y + 10, { align: 'center' });

    this.agregarSelloValidacion(doc, paciente.uid);
    window.open(doc.output('bloburl'), '_blank');
  }
  // ... (otros métodos) ...

  // ==========================================================================
  // 6. RECIBO DE PAGO / TICKET (CAJA) - ✅ NUEVO
  // ==========================================================================
  generarReciboPago(datos: {
    paciente: string,       // Nombre del paciente
    dni?: string,           // Opcional
    concepto: string,       // Ej: "Consulta Médica - Dr. House" o "Venta Insumos"
    items?: { descripcion: string, cantidad: number, precio: number }[], // Para farmacia
    total: number,
    formaPago: string       // "Efectivo", "Transferencia", etc.
  }) {
    const doc = this.inicializarPDF('COMPROBANTE DE PAGO');
    const fechaHoy = new Date().toLocaleString();

    // 1. Datos del Cliente
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 60, 170, 20, 'F');

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text('Recibí de:', 25, 68);
    doc.text('Fecha:', 120, 68);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(datos.paciente, 45, 68);
    doc.text(fechaHoy, 135, 68);

    if (datos.dni) {
       doc.setFont('helvetica', 'normal');
       doc.setTextColor(50);
       doc.text('DNI:', 25, 75);
       doc.setFont('helvetica', 'bold');
       doc.setTextColor(0);
       doc.text(datos.dni, 35, 75);
    }

    // 2. Detalle del Cobro
    let y = 95;

    // Si hay lista de items (Farmacia)
    if (datos.items && datos.items.length > 0) {
       doc.setFontSize(9);
       doc.setFont('helvetica', 'bold');
       doc.text('DESCRIPCIÓN', 20, y);
       doc.text('CANT', 120, y);
       doc.text('SUBTOTAL', 160, y);
       doc.line(20, y+2, 190, y+2);

       y += 8;
       doc.setFont('helvetica', 'normal');

       datos.items.forEach(item => {
         doc.text(item.descripcion, 20, y);
         doc.text(item.cantidad.toString(), 125, y);
         doc.text(`$${item.precio * item.cantidad}`, 160, y);
         y += 7;
       });
    }
    // Si es solo un concepto general (Turno)
    else {
       doc.setFontSize(12);
       doc.text(`Concepto: ${datos.concepto}`, 20, y);
       y += 10;
    }

    // 3. Totales
    y += 10;
    doc.setDrawColor(0);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAGADO: $${datos.total}`, 190, y, { align: 'right' });

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Forma de Pago: ${datos.formaPago.toUpperCase()}`, 190, y, { align: 'right' });

    // 4. Pie
    const yBottom = 260;
    doc.setFontSize(8);
    doc.text('Documento no válido como factura fiscal.', 105, yBottom, { align: 'center' });
    doc.text('Clínica HIA - Administración', 105, yBottom + 5, { align: 'center' });

    window.open(doc.output('bloburl'), '_blank');
  }


  // ==========================================================================
  // 4. CERTIFICADO DE APTITUD FÍSICA (DISEÑO LEGAL) - ✅ NUEVO
  // ==========================================================================
  generarCertificadoApto(paciente: Paciente, datosClinicos: any, nombreMedico: string) {
    const doc = this.inicializarPDF('CERTIFICADO DE APTITUD FÍSICA');

    // No usamos la cabecera de receta, usamos datos directos en el texto legal
    let y = 70;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    const fechaHoy = new Date().toLocaleDateString();

    const textoIntro = `Certifico que el/la paciente ${paciente.nombreCompleto}, DNI ${paciente.dni}, de ${this.calcularEdad(paciente.fechaNacimiento)} años de edad, ha sido examinado/a en la fecha ${fechaHoy} en esta institución.`;

    const splitIntro = doc.splitTextToSize(textoIntro, 170);
    doc.text(splitIntro, 20, y);
    y += 20;

    // Resultados del Examen (Lo que da valor médico)
    doc.setFont('helvetica', 'bold');
    doc.text('Constataciones Clínicas:', 20, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    // Lista de chequeo
    const items = [
      `• Examen Cardiovascular: ${datosClinicos.corazon ? 'Normal (R1-R2 Normofonéticos)' : 'Observado / Patológico'}`,
      `• Examen Respiratorio: ${datosClinicos.pulmones ? 'Normal (Murmullo Vesicular +)' : 'Observado'}`,
      `• Examen Osteoarticular: ${datosClinicos.columna ? 'Alineación conservada' : 'Observado'}`,
      `• Electrocardiograma: ${datosClinicos.ecg || 'No solicitado'}`
    ];

    items.forEach(item => {
      doc.text(item, 25, y);
      y += 7;
    });

    y += 10;
    doc.setFontSize(12);
    const conclusion = `CONCLUSIÓN: Al momento del examen, no se evidencian contraindicaciones clínicas aparentes para la práctica de actividad física recreativa y/o competitiva.`;
    const splitConclusion = doc.splitTextToSize(conclusion, 170);
    doc.text(splitConclusion, 20, y);

    this.agregarFirma(doc, nombreMedico);
    window.open(doc.output('bloburl'), '_blank');
  }

  // Helper edad (duplicado pequeño o lo importas si tienes utils)
  private calcularEdad(fecha?: string): number {
    if(!fecha) return 0;
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  // =================================================================
  // 5. CERTIFICADO GENÉRICO (Asistencia / Reposo) - ✅ NUEVO
  // =================================================================
  generarCertificadoGenerico(paciente: Paciente, textoCuerpo: string, nombreMedico: string) {
    // Cambiamos el título
    const doc = this.inicializarPDF('CERTIFICADO MÉDICO');

    this.agregarDatosPaciente(doc, paciente);

    // Cuerpo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    // Usamos el texto que le pasemos (ej: "Certifico que asistió...")
    const splitTexto = doc.splitTextToSize(textoCuerpo, 170);
    doc.text(splitTexto, 20, 100);

    this.agregarFirma(doc, nombreMedico);
    window.open(doc.output('bloburl'), '_blank');
  }

  // ==========================================================================
  // 5.b COPIA PARA EL PACIENTE (CON MARCA DE AGUA Y SIN VALIDEZ LEGAL)
  // ==========================================================================
  generarCopiaInformativaHistorial(paciente: Paciente, historial: any[]) {
    // 1. Iniciamos con un título que aclare que es una COPIA
    const doc = this.inicializarPDF('COPIA INFORMATIVA - HISTORIAL CLÍNICO');
    this.agregarDatosPaciente(doc, paciente);

    let y = 100;
    const pageHeight = 280;
    const margin = 20;
    const maxWidth = 170;
    const lineHeight = 6;

    // Helper para MARCA DE AGUA (Se llama en cada página)
    const dibujarMarcaDeAgua = () => {
      doc.saveGraphicsState();
      // @ts-ignore - Acceso a GState para transparencia
      doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
      doc.setFontSize(50);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(150, 150, 150);
      // Texto en diagonal
      doc.text('COPIA PARA EL PACIENTE', 30, 180, { angle: 45 });
      doc.text('SIN VALIDEZ LEGAL', 50, 210, { angle: 45 });
      doc.restoreGraphicsState();
    };

    // Dibujamos la primera marca de agua
    dibujarMarcaDeAgua();

    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > pageHeight) {
        doc.addPage();
        y = 20;
        dibujarMarcaDeAgua(); // Dibujar en la nueva página también
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Paciente: ${paciente.nombreCompleto} (Hoja de cortesía)`, margin, 15);
      }
    };

    doc.setFontSize(10);

    historial.forEach((consulta) => {
      checkPageBreak(40);

      // Fondo para la fecha
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, 170, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(this.colorPrimario);
      doc.text(`FECHA DE CONSULTA: ${consulta.fechaString}`, margin + 2, y + 5);
      y += 12;

      // Signos Vitales
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      const sv = consulta.signosVitales || {};
      const textoSignos = `Registros: PA ${sv.presionArterial || '-'} | Peso ${sv.peso || '-'}kg | Temp ${sv.temperatura || '-'}°`;
      doc.setFontSize(9);
      doc.text(textoSignos, margin, y);
      y += 8;

      // Diagnóstico
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Diagnóstico:', margin, y);
      doc.setFont('helvetica', 'normal');
      const splitDiag = doc.splitTextToSize(consulta.diagnostico || 'Sin registro', maxWidth - 30);
      doc.text(splitDiag, margin + 25, y);
      const alturaDiag = splitDiag.length * lineHeight;
      y += (alturaDiag > lineHeight ? alturaDiag : lineHeight) + 2;

      // Tratamiento
      doc.setFont('helvetica', 'bold');
      doc.text('Indicaciones:', margin, y);
      doc.setFont('helvetica', 'normal');
      const splitTrat = doc.splitTextToSize(consulta.tratamiento || '-', maxWidth - 30);
      doc.text(splitTrat, margin + 25, y);
      const alturaTrat = splitTrat.length * lineHeight;
      y += (alturaTrat > lineHeight ? alturaTrat : lineHeight) + 8;

      // Separador
      doc.setDrawColor(230);
      doc.line(margin, y - 4, 190, y - 4);
    });

    // Pie de página con advertencia legal
    checkPageBreak(25);
    y += 10;
    doc.setDrawColor(255, 0, 0); // Rojo
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);

    doc.setFontSize(7);
    doc.setTextColor(200, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('ADVERTENCIA: Este documento es una copia informativa para uso personal del paciente.', 105, y + 5, { align: 'center' });
    doc.text('No posee validez legal ni reemplaza a la Historia Clínica Original foliada y certificada por la institución.', 105, y + 8, { align: 'center' });

    const fechaEmision = new Date().toLocaleString();
    doc.setTextColor(150);
    doc.text(`Documento generado por el usuario el ${fechaEmision} - Sistema HIA`, 105, y + 15, { align: 'center' });

    this.agregarSelloValidacion(doc, paciente.uid);
    window.open(doc.output('bloburl'), '_blank');
  }

  private agregarSelloValidacion(doc: jsPDF, idTransaccion: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setPage(pageCount); // Ir a la última página

  const y = 270; // Cerca del final
  doc.setDrawColor(13, 148, 136); // Teal de la clínica
  doc.setLineWidth(0.5);
  doc.roundedRect(20, y, 170, 15, 3, 3); // Un recuadro elegante

  doc.setFontSize(8);
  doc.setTextColor(13, 148, 136);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO VALIDADO DIGITALMENTE - SISTEMA DE GESTIÓN HIA', 105, y + 6, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`ID Verificación: ${idTransaccion.toUpperCase()} | Emisión: ${new Date().toLocaleString()}`, 105, y + 11, { align: 'center' });
}
}
