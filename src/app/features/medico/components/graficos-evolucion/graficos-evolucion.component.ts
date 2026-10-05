import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { Consulta } from '../../../../core/interfaces/consulta.model';
import { Medicion } from '../../../../core/interfaces/mediciones.model';

@Component({
  selector: 'app-graficos-evolucion',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './graficos-evolucion.component.html',
  styleUrls: ['./graficos-evolucion.component.scss']
})
export class GraficosEvolucionComponent implements OnChanges {
  @Input() historial: Consulta[] = [];
  @Input() medicionesHogar: Medicion[] = [];
  @Input() metas: any = null;

  tipoGrafico = signal<'presion' | 'peso' | 'glucemia' | 'combinado' | 'metabolico'>('presion');
  rangoSeleccionado = signal<'6m' | '1y' | 'todo'>('6m');
  tieneDatosSuficientes = signal(false);

  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    elements: { line: { tension: 0.3 }, point: { radius: 4 } },
    plugins: {
      legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { size: 9 } } },
      annotation: { annotations: {} }
    },
    scales: {
      y: { type: 'linear', display: true, position: 'left' },
      y1: { type: 'linear', display: false, position: 'right', grid: { drawOnChartArea: false } }
    }
  };

  chartData = signal<ChartConfiguration['data']>({ labels: [], datasets: [] });
  chartType = signal<ChartConfiguration['type']>('line');

  ngOnChanges(changes: SimpleChanges): void {
    this.actualizarGrafico();
  }

  cambiarGrafico(tipo: 'presion' | 'peso' | 'glucemia' | 'combinado' | 'metabolico') {
    this.tipoGrafico.set(tipo);
    this.actualizarGrafico();
  }

  cambiarRango(rango: '6m' | '1y' | 'todo') {
    this.rangoSeleccionado.set(rango);
    this.actualizarGrafico();
  }

  private actualizarGrafico() {
    const fechaLimite = new Date();
    if (this.rangoSeleccionado() === '6m') fechaLimite.setMonth(fechaLimite.getMonth() - 6);
    if (this.rangoSeleccionado() === '1y') fechaLimite.setFullYear(fechaLimite.getFullYear() - 1);
    if (this.rangoSeleccionado() === 'todo') fechaLimite.setFullYear(1900);

    const mapClinica = new Map<string, any>();
    this.historial.forEach(c => {
      if (new Date(c.fechaString) >= fechaLimite) mapClinica.set(c.fechaString, c.signosVitales);
    });

    const mapHogar = new Map<string, Map<string, number[]>>();
    const mapHogarV2 = new Map<string, Map<string, number[]>>(); // Para diastólica (valor2)

    this.medicionesHogar.forEach(m => {
      const fechaObj = m.fecha.toDate();
      if (fechaObj >= fechaLimite) {
        const fechaKey = fechaObj.toISOString().split('T')[0];
        if (!mapHogar.has(fechaKey)) mapHogar.set(fechaKey, new Map());
        if (!mapHogarV2.has(fechaKey)) mapHogarV2.set(fechaKey, new Map());

        if (!mapHogar.get(fechaKey)!.has(m.tipo)) mapHogar.get(fechaKey)!.set(m.tipo, []);
        mapHogar.get(fechaKey)!.get(m.tipo)!.push(m.valor1);

        if (m.valor2) {
          if (!mapHogarV2.get(fechaKey)!.has(m.tipo)) mapHogarV2.get(fechaKey)!.set(m.tipo, []);
          mapHogarV2.get(fechaKey)!.get(m.tipo)!.push(m.valor2);
        }
      }
    });

    const todasLasFechas = Array.from(new Set([...mapClinica.keys(), ...mapHogar.keys()])).sort();
    if (todasLasFechas.length < 2) { this.tieneDatosSuficientes.set(false); return; }
    this.tieneDatosSuficientes.set(true);

    const labelsFormatted = todasLasFechas.map(f => f.split('-').slice(1).reverse().join('/'));
    const options = { ...this.lineChartOptions };
    options.plugins!.annotation = { annotations: {} };
    options.scales!['y1']!.display = false; // ✅ Notación de corchetes para signatura de índice

    let datasets: any[] = [];
    const tipo = this.tipoGrafico();
    const getAvg = (f: string, t: string, v2 = false) => {
      const vals = v2 ? mapHogarV2.get(f)?.get(t) : mapHogar.get(f)?.get(t);
      return vals && vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    // --- A. PRESIÓN (RECUPERADA DIASTÓLICA) ---
    if (tipo === 'presion') {
      datasets.push(
        {
          data: todasLasFechas.map(f => {
            const pa = mapClinica.get(f)?.presionArterial;
            return pa ? Number(pa.split('/')[0]) : null;
          }),
          label: 'Sist. (Clínica)', borderColor: '#e11d48', backgroundColor: '#e11d48', spanGaps: true, pointStyle: 'rectRot'
        },
        {
          data: todasLasFechas.map(f => {
            const pa = mapClinica.get(f)?.presionArterial;
            return pa ? Number(pa.split('/')[1]) : null;
          }),
          label: 'Diast. (Clínica)', borderColor: '#3b82f6', backgroundColor: '#3b82f6', spanGaps: true, pointStyle: 'rectRot'
        },
        {
          data: todasLasFechas.map(f => getAvg(f, 'PRESION')),
          label: 'Sist. (Hogar)', borderColor: '#fb7185', borderDash: [5, 5], spanGaps: true
        },
        {
          data: todasLasFechas.map(f => getAvg(f, 'PRESION', true)),
          label: 'Diast. (Hogar)', borderColor: '#93c5fd', borderDash: [5, 5], spanGaps: true
        }
      );
    }

    // --- B. PESO ---
    else if (tipo === 'peso') {
      datasets.push({
        data: todasLasFechas.map(f => mapClinica.get(f)?.peso || null),
        label: 'Peso (Clínica)', borderColor: '#0d9488', backgroundColor: '#0d9488', spanGaps: true
      });
      datasets.push({
        data: todasLasFechas.map(f => getAvg(f, 'PESO')),
        label: 'Peso (Hogar)', borderColor: '#f59e0b', borderDash: [5, 5], spanGaps: true
      });
      if (this.metas?.metaPeso) this.agregarMeta(options, this.metas.metaPeso, 'Meta Peso', '#0d9488');
    }

    // --- C. GLUCEMIA (RECUPERADA ZONA RIESGO) ---
    else if (tipo === 'glucemia') {
      datasets.push({
        data: todasLasFechas.map(f => mapClinica.get(f)?.glucemia || null),
        label: 'GLU (Clínica)', borderColor: '#f97316', spanGaps: true
      });
      datasets.push({
        data: todasLasFechas.map(f => getAvg(f, 'GLUCEMIA')),
        label: 'GLU (Hogar)', borderColor: '#fdba74', borderDash: [5, 5], spanGaps: true
      });

      // Restauramos la zona de riesgo visual (>126 mg/dL)
      options.plugins!.annotation!.annotations = {
        riesgo: {
          type: 'box', yMin: 126, yMax: 300,
          backgroundColor: 'rgba(239, 68, 68, 0.05)', borderWidth: 0,
          label: { display: true, content: 'ZONA RIESGO', position: 'start', color: '#ef4444', font: { size: 8, weight: 'bold' } }
        }
      };
    }

    // --- D. CORRELACIONES (CON EJE Y1 ACTIVADO) ---
    else if (tipo === 'combinado' || tipo === 'metabolico') {
      // ANTES: options.scales!.y1!.display = true;
options.scales!['y1']!.display = true; // ✅ Notación de corchetes para signatura de índice
      const esMetabolico = tipo === 'metabolico';

      datasets.push({
        data: todasLasFechas.map(f => {
          if (esMetabolico) return mapClinica.get(f)?.glucemia || getAvg(f, 'GLUCEMIA');
          const pa = mapClinica.get(f)?.presionArterial;
          return pa ? Number(pa.split('/')[0]) : getAvg(f, 'PRESION');
        }),
        label: esMetabolico ? 'Glucemia' : 'Presión Sist.',
        borderColor: esMetabolico ? '#f97316' : '#e11d48',
        yAxisID: 'y', type: 'line', spanGaps: true
      });

      datasets.push({
        data: todasLasFechas.map(f => mapClinica.get(f)?.peso || getAvg(f, 'PESO')),
        label: 'Peso (kg)', backgroundColor: 'rgba(13, 148, 136, 0.2)',
        borderColor: '#0d9488', borderWidth: 1, yAxisID: 'y1', type: 'bar'
      });
    }

    this.lineChartOptions = options;
    this.chartData.set({ labels: labelsFormatted, datasets });
  }

  private agregarMeta(options: any, valor: number, etiqueta: string, color: string) {
    options.plugins.annotation.annotations[etiqueta] = {
      type: 'line', yMin: valor, yMax: valor,
      borderColor: color, borderWidth: 2, borderDash: [6, 6],
      label: { display: true, content: etiqueta, position: 'end', backgroundColor: color, color: 'white', font: { size: 8 } }
    };
  }
}
