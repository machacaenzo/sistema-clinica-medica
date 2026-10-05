import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { AsistenteClinicoService } from '../../../features/medico/services/asistente-clinico.service';
import { Paciente } from '../../../core/interfaces/paciente.model';

@Component({
  selector: 'app-radar-salud',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './radar-salud.component.html'
})
export class RadarSaludComponent implements OnChanges {
  private asistente = inject(AsistenteClinicoService);

  @Input({ required: true }) paciente!: Paciente;
  @Input() consultas: any[] = [];
  @Input() habitos: any[] = [];

  public radarChartOptions: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 100,
        beginAtZero: true,
        ticks: { display: false }, // Ocultamos números para que sea estético
        grid: { color: 'rgba(0,0,0,0.05)' },
        angleLines: { color: 'rgba(0,0,0,0.1)' },
        pointLabels: {
          font: { size: 10, weight: 'bold' },
          color: '#64748b'
        }
      }
    },
    plugins: { legend: { display: false } }
  };

  public radarChartData = signal<ChartConfiguration<'radar'>['data']>({
    labels: ['Físico', 'Prevención', 'Hábitos', 'Compromiso', 'Bioquímico'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      label: 'Nivel de Salud',
      borderColor: '#0d9488',
      backgroundColor: 'rgba(13, 148, 136, 0.2)',
      fill: true,
      pointBackgroundColor: '#0d9488',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#0d9488'
    }]
  });

  ngOnChanges(changes: SimpleChanges) {
    if (this.paciente) {
      const scores = this.asistente.calcularPentagonoSalud(this.paciente, this.consultas, this.habitos);
      this.radarChartData.set({
        ...this.radarChartData(),
        datasets: [{ ...this.radarChartData().datasets[0], data: scores }]
      });
    }
  }
}
