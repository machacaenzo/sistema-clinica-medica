import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent, CalendarView, CalendarModule } from 'angular-calendar';
import { isSameDay, isSameMonth } from 'date-fns';
import { Subject } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { Turno } from '../../../../core/interfaces/turno.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faChevronLeft, faChevronRight, faCalendarAlt, faSync,
  faClock, faUser, faTimes
} from '@fortawesome/free-solid-svg-icons';

const colors: any = {
  confirmado: { primary: '#0d9488', secondary: '#ccfbf1' },
  pendiente: { primary: '#f97316', secondary: '#ffedd5' },
  finalizado: { primary: '#64748b', secondary: '#f1f5f9' },
  enAtencion: { primary: '#3b82f6', secondary: '#dbeafe' },
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, CalendarModule, FaIconComponent],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent implements OnInit {
  private authService = inject(AuthService);
  private turnosService = inject(TurnosService);

  protected readonly CalendarView = CalendarView;

  icons = {
    prev: faChevronLeft, next: faChevronRight, today: faCalendarAlt,
    refresh: faSync, clock: faClock, user: faUser, close: faTimes
  };

  view: CalendarView = CalendarView.Month;
  viewDate: Date = new Date();
  refresh = new Subject<void>();
  events: CalendarEvent[] = [];
  loading = signal(true);

  // --- NUEVO: PANEL LATERAL ---
  isSidePanelOpen = signal(false);
  selectedDate = signal<Date>(new Date());
  selectedEvents = signal<CalendarEvent[]>([]);

  ngOnInit() {
    const medico = this.authService.currentUser();
    if (medico?.uid) {
      this.cargarTurnos(medico.uid);
    }
  }

  cargarTurnos(idMedico: string) {
    this.loading.set(true);
    this.turnosService.obtenerTurnosPorMedico(idMedico).subscribe({
      next: (turnos) => {
        this.events = turnos.map(turno => this.mapearTurnoAEvento(turno));
        this.refresh.next();
        this.loading.set(false);
      },
      error: (err) => { console.error(err); this.loading.set(false); }
    });
  }

  private mapearTurnoAEvento(turno: Turno): CalendarEvent {
    const [year, month, day] = turno.fechaString.split('-').map(Number);
    const [hour, minute] = turno.hora.split(':').map(Number);
    const fechaInicio = new Date(year, month - 1, day, hour, minute);

    // Asignamos colores
    let color = colors.pendiente;
    if (turno.estado === 'Confirmado' || turno.estado === 'En Sala') color = colors.confirmado;
    if (turno.estado === 'Finalizado') color = colors.finalizado;
    if (turno.estado === 'En Atencion') color = colors.enAtencion;

    return {
      start: fechaInicio,
      title: turno.pacienteData.nombre, // Solo el nombre para el evento
      color: color,
      meta: {
        turno,
        hora: turno.hora,
        estado: turno.estado,
        paciente: turno.pacienteData.nombre
      }
    };
  }

  // ✅ LOGICA MODIFICADA: AL CLICKEAR EL DÍA ABRE PANEL
  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    this.viewDate = date; // Mueve el foco al día
    this.selectedDate.set(date);
    this.selectedEvents.set(events);
    this.isSidePanelOpen.set(true); // Abre el panel
  }

  closeSidePanel() {
    this.isSidePanelOpen.set(false);
  }

  setView(view: CalendarView) {
    this.view = view;
  }
}
