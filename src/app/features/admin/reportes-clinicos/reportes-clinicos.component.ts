import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

// Servicios
import { DashboardService } from '../dashboard/dashboard.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faShieldVirus, faBiohazard, faLayerGroup, faUserShield,
  faChartPie, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-reportes-clinicos',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FaIconComponent],
  templateUrl: './reportes-clinicos.component.html',
  styleUrls: ['./reportes-clinicos.component.scss']
})
export class ReportesClinicosComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  icons = {
    shield: faUserShield,
    biohazard: faBiohazard,
    pyramid: faLayerGroup,
    chart: faChartPie,
    alert: faExclamationTriangle
  };

  loading = signal(true);

  // --- CONFIG GRÁFICO BARRAS (PATOLOGÍAS) ---
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Casos Detectados',
      backgroundColor: 'rgba(244, 63, 94, 0.6)', // Rose 500 con transparencia
      borderColor: '#f43f5e',
      borderWidth: 1,
      borderRadius: 12
    }]
  };

  public barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.03)' } },
      x: { grid: { display: false } }
    }
  };

  // --- CONFIG GRÁFICO DONA (RIESGO) ---
  public pieChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Bajo', 'Moderado', 'Alto'],
    datasets: [{
      data: [],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], // Emerald, Amber, Red
      hoverOffset: 20,
      borderWidth: 0
    }]
  };

  public pieOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%', // Estilo anillo fino
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold', size: 11 } } }
    }
  };

  ngOnInit() {
    this.cargarReporte();
  }

  async cargarReporte() {
    this.loading.set(true);
    try {
      const data = await this.dashboardService.obtenerReporteClinicoGlobal();

      // Mapear datos a Barras
      this.barChartData = {
        labels: data.rankingPatologias.labels,
        datasets: [{ ...this.barChartData.datasets[0], data: data.rankingPatologias.data }]
      };

      // Mapear datos a Dona
      this.pieChartData = {
        labels: data.piramideRiesgo.labels,
        datasets: [{ ...this.pieChartData.datasets[0], data: data.piramideRiesgo.data }]
      };

    } catch (error) {
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }
}
