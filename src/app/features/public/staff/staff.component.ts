import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

// Servicios
import { MedicoService } from '../../admin/gestion-medicos/medico.service';
import { TurnosService } from '../../../core/services/turnos.service'; // ✅ INYECTAR

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faUserMd, faCalendarCheck, faStethoscope,
  faIdCard, faStar, faCommentMedical, faTimes
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent, FormsModule],
  templateUrl: './staff.component.html',
  styleUrls: ['./staff.component.scss']
})
export class StaffComponent {
  private medicoService = inject(MedicoService);
  private turnosService = inject(TurnosService); // ✅ NUEVO

  icons = {
    search: faSearch,
    doctor: faUserMd,
    calendar: faCalendarCheck,
    steth: faStethoscope,
    card: faIdCard,
    star: faStar, // ✅ Para el rating
    comentario: faCommentMedical,
    close: faTimes
  };

  filtro = signal('');

  // 1. Cargamos médicos y TODOS los turnos que tengan reseña
  medicosRaw = toSignal(this.medicoService.obtenerMedicosCompletos(), { initialValue: [] });
  // Traemos todos los turnos que tengan el campo 'resena' poblado
  turnosConResena = toSignal(this.turnosService.obtenerTodosLosTurnos(), { initialValue: [] });

  // 2. Lógica de cruce de datos (Nivel Dios)
  medicosConRating = computed(() => {
    const todos = this.medicosRaw();
    const turnos = this.turnosConResena();
    const termino = this.filtro().toLowerCase();

    // 🔍 LOG DE DEBUG PARA VOS (Míralo en F12)
    console.log('Turnos totales cargados en Staff:', turnos.length);
    console.log('Turnos que tienen reseña:', turnos.filter(t => t.resena).length);

    return todos
      .filter(m => m.estado === 'Activo' && (
        m.nombre.toLowerCase().includes(termino) ||
        m.especialidad?.toLowerCase().includes(termino)
      ))
      .map(medico => {
        // Buscamos reseñas donde el ID coincida y la reseña exista
        const misResenas = turnos.filter(t =>
          t.idMedico === medico.uid &&
          t.resena &&
          t.resena.estadoModeracion === 'publicado'
        ).map(t => t.resena);

        const totalPuntos = misResenas.reduce((acc, r) => acc + (r?.puntos || 0), 0);
        const promedio = misResenas.length > 0 ? (totalPuntos / misResenas.length).toFixed(1) : 0;

        return {
          ...medico,
          ratingPromedio: Number(promedio),
          cantidadOpiniones: misResenas.length,
          opiniones: misResenas
        };
      });
  });

  // Estado para el modal de opiniones
  medicoParaOpiniones = signal<any | null>(null);

  verOpiniones(medico: any) {
    this.medicoParaOpiniones.set(medico);
  }

  handleImageError(event: any) {
    event.target.src = 'assets/user-default.jpg';
  }
}
