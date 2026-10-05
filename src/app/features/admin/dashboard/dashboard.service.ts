import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, where, getDocs, Timestamp, orderBy, limit, collectionGroup } from '@angular/fire/firestore';
import { Observable, from, map, combineLatest } from 'rxjs';

// Interfaces
import { Turno } from '../../../core/interfaces/turno.model';
import { Transaccion } from '../../../core/interfaces/transaccion.model';

export interface DatosEpidemiologicos {
  rankingPatologias: { labels: string[], data: number[] };
  piramideRiesgo: { labels: string[], data: number[] }; // Bajo, Medio, Alto
}

// Nueva interfaz para el Log
export interface LogIngreso {
  uid: string;
  email: string;
  rol: string;
  fecha: Timestamp;
  navegador?: string;
}

// Estructura de Datos para la Vista
export interface DashboardMetrics {
  financiero: {
    ingresos: number;
    egresos: number;
    balance: number;
  };
  operativo: {
    totalTurnos: number;
    realizados: number;
    cancelados: number;
    tasaCancelacion: number;
  };
  graficos: {
    pagos: { labels: string[], data: number[] };      // Torta
    especialidades: { labels: string[], data: number[] }; // Barras
    medicos: { labels: string[], data: number[] };    // Ranking

    // ✅ NUEVOS GRÁFICOS
    ingresosPorDia: { labels: string[], data: number[] }; // Línea de Tiempo
    turnosPorDiaSemana: { labels: string[], data: number[] }; // Radar o Barras
  };
  // ✅ NUEVO: LISTA DE LOGS
  logsRecientes: LogIngreso[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private firestore = inject(Firestore);

  obtenerMetricas(rango: 'hoy' | 'mes'): Observable<DashboardMetrics> {
    const { inicio, fin } = this.getFechas(rango);

    // 1. Query Transacciones (Dinero)
    const qTx = query(
      collection(this.firestore, 'transacciones'),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin)
    );

    // 2. Query Turnos (Operativa)
    const qTurnos = query(
      collection(this.firestore, 'turnos'),
      where('fecha', '>=', inicio),
      where('fecha', '<=', fin)
    );

    // 3. ✅ NUEVO: Query Logs (Últimos 10 accesos)
    // No filtramos por fecha estricta, queremos ver los últimos movimientos siempre
    const qLogs = query(
      collection(this.firestore, 'logs_ingresos'),
      orderBy('fecha', 'desc'),
      limit(10)
    );

    // 4. Combinar Todo
    return combineLatest([
      from(getDocs(qTx)),
      from(getDocs(qTurnos)),
      from(getDocs(qLogs))
    ]).pipe(
      map(([snapTx, snapTurnos, snapLogs]) => {
        const transacciones = snapTx.docs.map(d => d.data() as Transaccion);
        const turnos = snapTurnos.docs.map(d => d.data() as Turno);
        const logs = snapLogs.docs.map(d => d.data() as LogIngreso);

        return {
          financiero: this.calcularFinanzas(transacciones),
          operativo: this.calcularOperativa(turnos),
          graficos: {
            pagos: this.agruparPagos(transacciones),
            especialidades: this.agruparPorEspecialidad(turnos),
            medicos: this.agruparPorMedico(turnos),

            // ✅ CÁLCULOS NUEVOS
            ingresosPorDia: this.calcularEvolucionIngresos(transacciones, rango),
            turnosPorDiaSemana: this.calcularOcupacionSemanal(turnos)
          },
          logsRecientes: logs
        };
      })
    );
  }

  // --- LÓGICA DE CÁLCULO ---

  private calcularFinanzas(txs: Transaccion[]) {
    const ingresos = txs.filter(t => t.tipo === 'INGRESO').reduce((s, t) => s + t.monto, 0);
    const egresos = txs.filter(t => t.tipo === 'EGRESO').reduce((s, t) => s + t.monto, 0);
    return { ingresos, egresos, balance: ingresos - egresos };
  }

  private calcularOperativa(turnos: Turno[]) {
    const total = turnos.length;
    const realizados = turnos.filter(t => t.estado === 'Finalizado').length;
    const cancelados = turnos.filter(t => t.estado === 'Cancelado').length;
    const tasa = total > 0 ? Math.round((cancelados / total) * 100) : 0;
    return { totalTurnos: total, realizados, cancelados, tasaCancelacion: tasa };
  }

  // ✅ NUEVO: Evolución diaria para el gráfico de línea
  private calcularEvolucionIngresos(txs: Transaccion[], rango: string) {
    // Inicializamos array según días del mes (aprox 31)
    const diasData = new Array(31).fill(0);
    const labels = Array.from({length: 31}, (_, i) => (i + 1).toString());

    txs.filter(t => t.tipo === 'INGRESO').forEach(t => {
      const fecha = t.fecha.toDate();
      const dia = fecha.getDate() - 1; // Array base 0
      diasData[dia] += t.monto;
    });

    // Si es "hoy", mostramos por hora (Simplificación: Dejamos diario por ahora para no complicar el gráfico)
    return { labels, data: diasData };
  }

  // ✅ NUEVO: Ocupación por día de la semana (Lunes vs Viernes)
  private calcularOcupacionSemanal(turnos: Turno[]) {
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const contadores = new Array(7).fill(0);

    turnos.forEach(t => {
      if (t.estado !== 'Cancelado') {
        const diaIndex = t.fecha.toDate().getDay(); // 0 = Domingo
        contadores[diaIndex]++;
      }
    });

    return {
      labels: diasSemana,
      data: contadores
    };
  }

  private agruparPagos(txs: Transaccion[]) {
    let efectivo = 0, tarjeta = 0, otros = 0;
    txs.filter(t => t.tipo === 'INGRESO').forEach(t => {
      const m = (t.motivo || '').toLowerCase();
      if (m.includes('tarjeta')) tarjeta += t.monto;
      else if (m.includes('efectivo') || m.includes('cobro')) efectivo += t.monto;
      else otros += t.monto;
    });
    return { labels: ['Efectivo', 'Tarjeta', 'Otros'], data: [efectivo, tarjeta, otros] };
  }

  private agruparPorEspecialidad(turnos: Turno[]) {
    const mapa = new Map<string, number>();
    turnos.forEach(t => {
      if (t.estado !== 'Cancelado') {
        const esp = t.medicoData.especialidad;
        mapa.set(esp, (mapa.get(esp) || 0) + 1);
      }
    });
    return { labels: Array.from(mapa.keys()), data: Array.from(mapa.values()) };
  }

  private agruparPorMedico(turnos: Turno[]) {
    const mapa = new Map<string, number>();
    turnos.forEach(t => {
      if (t.estado === 'Finalizado') {
        const nombre = t.medicoData.nombre;
        mapa.set(nombre, (mapa.get(nombre) || 0) + 1);
      }
    });
    const sorted = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
  }

  private getFechas(rango: 'hoy' | 'mes'): { inicio: Timestamp, fin: Timestamp } {
    const start = new Date();
    const end = new Date();
    if (rango === 'hoy') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }
    return { inicio: Timestamp.fromDate(start), fin: Timestamp.fromDate(end) };
  }



  async obtenerReporteClinicoGlobal(): Promise<DatosEpidemiologicos> {
  // 1. Traemos todas las consultas y todos los tests de hábitos
  const snapConsultas = await getDocs(collection(this.firestore, 'consultas_medicas'));
  const snapHabitos = await getDocs(query(collectionGroup(this.firestore, 'historial_habitos')));

  const consultas = snapConsultas.docs.map(d => d.data());
  const habitos = snapHabitos.docs.map(d => d.data());

  return {
    rankingPatologias: this.procesarPatologias(consultas),
    piramideRiesgo: this.procesarPiramideRiesgo(habitos)
  };
}

private procesarPatologias(consultas: any[]) {
  const conteo = new Map<string, number>();

  consultas.forEach(c => {
    const diag = (c.diagnostico || '').toUpperCase();
    let categoria = 'Otros';

    // Lógica de Mapeo Inteligente
    if (diag.includes('[E11]') || diag.includes('DIABETES')) categoria = 'Diabetes';
    else if (diag.includes('[I10]') || diag.includes('HIPERTENSIO') || diag.includes('HTA')) categoria = 'Hipertensión';
    else if (diag.includes('[J11]') || diag.includes('GRIPE') || diag.includes('INFLUENZA')) categoria = 'Cuadros Gripales';
    else if (diag.includes('ANSIEDAD') || diag.includes('STRESS') || diag.includes('ESTRES')) categoria = 'Salud Mental';
    else if (diag.includes('GASTRITIS') || diag.includes('COLON')) categoria = 'Gastrointestinal';
    else if (diag.includes('COVID')) categoria = 'COVID-19';

    conteo.set(categoria, (conteo.get(categoria) || 0) + 1);
  });

  // Ordenamos por cantidad y tomamos el top 5
  const sorted = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    labels: sorted.map(e => e[0]),
    data: sorted.map(e => e[1])
  };
}

private procesarPiramideRiesgo(habitos: any[]) {
  let bajo = 0, medio = 0, alto = 0;

  habitos.forEach(h => {
    const res = h.resultado.toUpperCase();
    if (res.includes('BAJO')) bajo++;
    else if (res.includes('MODERADO') || res.includes('RIESGO')) medio++;
    else if (res.includes('ALTO') || res.includes('DEPENDENCIA') || res.includes('MUY ALTO')) alto++;
  });

  return {
    labels: ['Bajo Riesgo', 'Riesgo Moderado', 'Riesgo Alto'],
    data: [bajo, medio, alto]
  };
}
}
