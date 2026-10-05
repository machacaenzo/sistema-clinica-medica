import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Servicios e Interfaces
import { TurnosService } from '../../../../../core/services/turnos.service';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCalendarAlt, faClock, faSun, faMoon, faCloudSun, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { Prestacion } from '../../../../../core/interfaces/prestacion.model';

@Component({
  selector: 'app-paso-calendario',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './paso-calendario.component.html',
  styleUrls: ['./paso-calendario.component.scss']
})
export class PasoCalendarioComponent implements OnInit {
  private turnosService = inject(TurnosService);

  // Inputs desde el Padre
  @Input({ required: true }) medico: any;
  @Input({ required: true }) prestacion: Prestacion | null = null;

  // Emite la fecha y hora final al paso de pago
  @Output() onSelect = new EventEmitter<{ fecha: Date, hora: string }>();

  icons = {
    fecha: faCalendarAlt,
    reloj: faClock,
    manana: faSun,
    tarde: faCloudSun,
    noche: faMoon,
    info: faInfoCircle
  };

  // --- ESTADOS REACTIVOS ---
  diasDisponibles = signal<any[]>([]);
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string>('');
  cargandoSlots = signal(false);

  // Agrupador inteligente de horarios (Mañana, Tarde, Noche)
  slotsAgrupados = computed(() => {
    const fecha = this.fechaSeleccionada();
    if (!fecha) return null;
    const diaObj = this.diasDisponibles().find(d => d.date.getTime() === fecha.getTime());
    if (!diaObj) return null;

    const slots = diaObj.slots;
    return {
      manana: slots.filter((h: string) => parseInt(h.split(':')[0]) < 13),
      tarde: slots.filter((h: string) => parseInt(h.split(':')[0]) >= 13 && parseInt(h.split(':')[0]) < 18),
      noche: slots.filter((h: string) => parseInt(h.split(':')[0]) >= 18)
    };
  });

  ngOnInit() {
    this.generarCalendarioProximo();
  }

  /**
   * 🧠 LÓGICA NIVEL DIOS: Generación de agenda con bloqueo preventivo
   */
  async generarCalendarioProximo() {
    this.cargandoSlots.set(true);
    const dias = [];
    const hoy = new Date();

    // 🛡️ REGLA DE PRERREQUISITO:
    // Si la prestación requiere estudio previo, bloqueamos hoy y mañana (48hs)
    // const margenMinimo = 0;
    const margenMinimo = this.prestacion?.idServicioRequerido ? 2 : 0;

    for (let i = margenMinimo; i <= 30; i++) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() + i);
      fecha.setHours(12, 0, 0, 0); // Normalización para evitar errores de zona horaria

      const slots = await this.turnosService.generarSlotsDisponibles(this.medico, fecha);

      if (slots.length > 0) {
        dias.push({
          date: fecha,
          labelDia: this.getNombreDia(fecha),
          labelNum: fecha.getDate().toString(),
          slots: slots
        });
      }
    }

    this.diasDisponibles.set(dias);
    this.cargandoSlots.set(false);

    // Auto-selección del primer día disponible
    if (dias.length > 0) {
      this.seleccionarFecha(dias[0].date);
    }
  }

  seleccionarFecha(date: Date) {
    this.fechaSeleccionada.set(date);
    this.horaSeleccionada.set(''); // Reset de hora al cambiar de día
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada.set(hora);
    // Emitimos el resultado final al padre
    this.onSelect.emit({
      fecha: this.fechaSeleccionada()!,
      hora: this.horaSeleccionada()
    });
  }

  getNombreDia(date: Date): string {
    const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    return dias[date.getDay()];
  }
}
