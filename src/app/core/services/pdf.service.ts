import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ClinicaService } from '../../features/admin/config-clinica/clinica.service';
import { DashboardMetrics } from '../../features/admin/dashboard/dashboard.service';

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private clinicaService = inject(ClinicaService);

  // Colores corporativos
  private readonly colorPrimario = '#0f766e'; // Teal 700

  /**
   * Genera el Reporte Ejecutivo Completo (Finanzas + Operativa + Auditoría)
   */
  generarReporteGerencial(metrics: DashboardMetrics, periodo: string) {
    const doc = this.inicializarPDF('REPORTE DE GESTIÓN');

    doc.setFontSize(10);
    doc.setTextColor(100);
    const textoPeriodo = periodo === 'hoy' ? 'REPORTE DIARIO' : 'REPORTE MENSUAL';
    doc.text(`${textoPeriodo} - ${new Date().toLocaleDateString()}`, 105, 58, { align: 'center' });

    let y = 70;

    // 1. FINANZAS
    doc.setFontSize(12);
    doc.setTextColor(this.colorPrimario);
    doc.setFont('helvetica', 'bold');
    doc.text('1. RESUMEN FINANCIERO', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Concepto', 'Monto']],
      body: [
        ['Ingresos Totales (Caja)', `$ ${metrics.financiero.ingresos.toLocaleString()}`],
        ['Gastos Operativos', `$ ${metrics.financiero.egresos.toLocaleString()}`],
        ['BALANCE NETO', `$ ${metrics.financiero.balance.toLocaleString()}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: this.colorPrimario },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // 2. OPERATIVO
    doc.text('2. INDICADORES OPERATIVOS', 15, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valor']],
      body: [
        ['Turnos Totales Agendados', metrics.operativo.totalTurnos],
        ['Pacientes Atendidos', metrics.operativo.realizados],
        ['Turnos Cancelados', metrics.operativo.cancelados],
        ['Tasa de Ausentismo', `${metrics.operativo.tasaCancelacion}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105] }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // 3. TOP MÉDICOS
    if (y > 220) { doc.addPage(); y = 20; }
    doc.text('3. RANKING DE ACTIVIDAD MÉDICA', 15, y);
    y += 5;

    const dataMedicos = metrics.graficos.medicos.labels.map((nombre, i) => {
      return [nombre, metrics.graficos.medicos.data[i]];
    });

    autoTable(doc, {
      startY: y,
      head: [['Profesional', 'Pacientes Atendidos']],
      body: dataMedicos.length ? dataMedicos : [['Sin actividad', '-']],
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: 0 },
      columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // 4. AUDITORÍA (LOGS) - ✅ VERSIÓN CORREGIDA
    if (y > 200) { doc.addPage(); y = 20; }
    doc.text('4. AUDITORÍA DE ACCESOS (Últimos movimientos)', 15, y);
    y += 5;

    const dataLogs = metrics.logsRecientes.map(log => [
      log.email || 'Anónimo',
      (log.rol || 'SIN ROL').toUpperCase(), // ✅ PROTECCIÓN CONTRA UNDEFINED
      new Date(log.fecha.seconds * 1000).toLocaleString()
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Usuario', 'Rol', 'Fecha y Hora']],
      body: dataLogs.length ? dataLogs : [['Sin registros recientes', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }, // Rojo
      styles: { fontSize: 8 }
    });

    // PIE
    const pageCount = doc.internal.pages.length - 1;
    const pageHeight = doc.internal.pageSize.height;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Sistema de Gestión HIA - Reporte Confidencial`, 15, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, 190, pageHeight - 10, { align: 'right' });
    }

    window.open(doc.output('bloburl'), '_blank');
  }

  // =================================================================
  // 🎨 HELPER DE DISEÑO
  // =================================================================

  private inicializarPDF(tituloDocumento: string): jsPDF {
    const doc = new jsPDF();
    const info = this.clinicaService.clinicaData();

    // Logo
    if (info?.logo) {
      try {
        doc.addImage(info.logo, 'PNG', 15, 10, 20, 20);
      } catch (e) { console.warn('Error logo', e); }
    }

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(this.colorPrimario);
    doc.setFont('helvetica', 'bold');
    doc.text(info?.nombre || 'CLÍNICA MÉDICA', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    doc.text(info?.direccion || 'Administración Central', 105, 26, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(this.colorPrimario);
    doc.setLineWidth(0.5);
    doc.line(15, 35, 195, 35);

    // Título
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(tituloDocumento, 105, 50, { align: 'center' });

    // Caja decorativa título
    doc.setDrawColor(200);
    doc.setLineWidth(0.1);
    doc.roundedRect(60, 42, 90, 12, 2, 2);

    return doc;
  }

  // =================================================================
  // COMPROBANTE DE PAGO (CAJA)
  // =================================================================
  generarReciboPago(datos: {
    paciente: string,
    dni?: string,
    concepto: string,
    items?: { descripcion: string, cantidad: number, precio: number }[],
    total: number,
    formaPago: string
  }) {
    const doc = this.inicializarPDF('COMPROBANTE DE PAGO');
    const fechaHoy = new Date().toLocaleString();

    // Caja Datos Cliente
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 60, 170, 25, 'F');

    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text('Recibí de:', 25, 70);
    doc.text('Fecha:', 120, 70);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(datos.paciente, 45, 70);
    doc.text(fechaHoy, 135, 70);

    if (datos.dni) {
       doc.setFont('helvetica', 'normal');
       doc.setTextColor(50);
       doc.text('DNI:', 25, 80);
       doc.setFont('helvetica', 'bold');
       doc.setTextColor(0);
       doc.text(datos.dni, 35, 80);
    }

    let y = 100;

    // Tabla de Items (Si es Farmacia) o Concepto Simple (Turno)
    if (datos.items && datos.items.length > 0) {
      const body = datos.items.map(i => [i.descripcion, i.cantidad, `$${i.precio}`, `$${i.cantidad * i.precio}`]);

      autoTable(doc, {
        startY: y,
        head: [['Descripción', 'Cant', 'Unitario', 'Subtotal']],
        body: body,
        theme: 'plain',
        headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right' } }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(12);
      doc.text(`Concepto: ${datos.concepto}`, 20, y);
      y += 15;
    }

    // Totales
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${datos.total.toLocaleString()}`, 190, y, { align: 'right' });

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Forma de Pago: ${datos.formaPago.toUpperCase()}`, 190, y, { align: 'right' });

    // Pie legal
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Comprobante válido para control interno.', 105, 270, { align: 'center' });

    window.open(doc.output('bloburl'), '_blank');
  }
}
