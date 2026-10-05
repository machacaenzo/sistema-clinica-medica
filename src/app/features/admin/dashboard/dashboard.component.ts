import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { RouterModule } from '@angular/router';

// Servicios
import { DashboardService, DashboardMetrics } from './dashboard.service';
import { PdfService } from '../../../core/services/pdf.service';
import { TurnosService } from '../../../core/services/turnos.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChartPie, faChartBar, faWallet, faFilePdf, faCalendarAlt,
  faArrowUp, faArrowDown, faUsers, faStethoscope, faShieldAlt, faClock
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FaIconComponent, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private pdfService = inject(PdfService);
  private turnosService = inject(TurnosService);

  icons = {
    pie: faChartPie, bar: faChartBar, wallet: faWallet, pdf: faFilePdf,
    calendar: faCalendarAlt, up: faArrowUp, down: faArrowDown,
    users: faUsers, doctor: faStethoscope, shield: faShieldAlt, clock: faClock
  };

  loading = signal(true);
  periodo = signal<'hoy' | 'mes'>('mes');
  metrics = signal<DashboardMetrics | null>(null);

  // --- 1. GRÁFICO DE EVOLUCIÓN (LÍNEA - ÁREA) ---
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.4 } }, // Curva suave
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
      x: { grid: { display: false } }
    }
  };
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [{ data: [], label: 'Ingresos', fill: true, backgroundColor: 'rgba(20, 184, 166, 0.1)', borderColor: '#0d9488' }]
  };

  // --- 2. GRÁFICO SEMANAL (BARRAS VERTICALES) ---
  public weeklyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };
  public weeklyChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: '#6366f1', borderRadius: 4 }]
  };

  // --- 3. GRÁFICO TORTA (PAGOS) ---
  public pieChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'right' } }
  };
  public pieChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#0d9488', '#6366f1', '#f59e0b'] }]
  };

  // --- 4. GRÁFICO MÉDICOS (BARRAS HORIZONTALES) ---
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } }
  };
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: '#14b8a6', borderRadius: 4 }]
  };

  constructor() {
    effect(() => {
      this.cargarDatos(this.periodo());
    });
  }

  ngOnInit() {
    setTimeout(() => {
      this.turnosService.chequearYEnviarRecordatorios();
    }, 3000);
  }

  cargarDatos(rango: 'hoy' | 'mes') {
    this.loading.set(true);
    this.dashboardService.obtenerMetricas(rango).subscribe({
      next: (data) => {
        this.metrics.set(data);

        // 1. Evolución (Línea)
        this.lineChartData = {
          labels: data.graficos.ingresosPorDia.labels,
          datasets: [{
            data: data.graficos.ingresosPorDia.data,
            label: 'Ingresos ($)',
            fill: true,
            tension: 0.4,
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13, 148, 136, 0.15)', // Efecto Glass
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0d9488',
            pointHoverBackgroundColor: '#0d9488',
            pointHoverBorderColor: '#fff'
          }]
        };

        // 2. Semanal (Barras)
        this.weeklyChartData = {
          labels: data.graficos.turnosPorDiaSemana.labels,
          datasets: [{
            data: data.graficos.turnosPorDiaSemana.data,
            backgroundColor: '#6366f1',
            borderRadius: 6,
            barThickness: 20
          }]
        };

        // 3. Torta
        this.pieChartData = {
          labels: data.graficos.pagos.labels,
          datasets: [{
            data: data.graficos.pagos.data,
            backgroundColor: ['#10b981', '#6366f1', '#f59e0b'], // Verde, Indigo, Naranja
            borderWidth: 0,
            hoverOffset: 10
          }]
        };

        // 4. Médicos
        this.barChartData = {
          labels: data.graficos.medicos.labels,
          datasets: [{
            data: data.graficos.medicos.data,
            backgroundColor: '#06b6d4', // Cyan
            borderRadius: 4,
            barPercentage: 0.6
          }]
        };

        this.loading.set(false);
      },
      error: (e) => {
        console.error(e);
        this.loading.set(false);
      }
    });
  }

  exportarReporte() {
    if (this.metrics()) {
      this.pdfService.generarReporteGerencial(this.metrics()!, this.periodo());
    }
  }
}
