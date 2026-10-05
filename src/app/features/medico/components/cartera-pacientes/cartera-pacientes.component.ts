import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Servicios
import { AuthService } from '../../../../core/services/auth.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';

// Interfaces
import { Paciente } from '../../../../core/interfaces/paciente.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faUserInjured, faHistory, faFileMedical, faCalendarCheck,faVideo
} from '@fortawesome/free-solid-svg-icons';
import { ModalCitaVideoComponent } from '../modal-cita-video/modal-cita-video.component';
@Component({
  selector: 'app-cartera-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent,ModalCitaVideoComponent],
  templateUrl: './cartera-pacientes.component.html',
  styleUrls: ['./cartera-pacientes.component.scss']
})
export class CarteraPacientesComponent implements OnInit {
  private authService = inject(AuthService);
  private turnosService = inject(TurnosService);
  private pacienteService = inject(PacienteService);
  private router = inject(Router);

  icons = {
    search: faSearch,
    user: faUserInjured,
    history: faHistory,
    file: faFileMedical,
    date: faCalendarCheck,
    video: faVideo
  };

  defaultImage = 'assets/user-default.jpg';

  loading = signal(true);

  // Lista de pacientes con metadatos extra (ej: fecha última visita)
  pacientesList = signal<any[]>([]);
  filtro = signal('');

  pacienteParaVideo = signal<Paciente | null>(null);

  pacientesFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    return this.pacientesList().filter(p =>
      p.nombreCompleto.toLowerCase().includes(term) ||
      p.dni?.includes(term)
    );
  });

  ngOnInit() {
    const medico = this.authService.currentUser();
    if (medico?.uid) {
      this.cargarCartera(medico.uid);
    }
  }

  async cargarCartera(idMedico: string) {
    try {
      // 1. Traer todos los turnos históricos de este médico
      this.turnosService.obtenerTurnosPorMedico(idMedico).subscribe(async turnos => {

        // 2. Map de Pacientes Unicos para no repetir y guardar la fecha más reciente
        const mapaPacientes = new Map<string, string>(); // ID -> Fecha Última Visita

        turnos.forEach(t => {
          if (!mapaPacientes.has(t.idPaciente)) {
            mapaPacientes.set(t.idPaciente, t.fechaString);
          } else {
            // Si ya existe, nos quedamos con la fecha más reciente
            const fechaGuardada = mapaPacientes.get(t.idPaciente) || '';
            if (t.fechaString > fechaGuardada) {
              mapaPacientes.set(t.idPaciente, t.fechaString);
            }
          }
        });

        // 3. Traer datos de cada paciente
        // Nota: En un sistema gigante esto se paginaría, para TFI un Promise.all está bien
        const ids = Array.from(mapaPacientes.keys());

        const promesas = ids.map(async id => {
          const datos = await this.pacienteService.obtenerPacientePorId(id);
          return {
            uid:id,
            ...datos,
            ultimaVisita: mapaPacientes.get(id)
          };
        });

        const resultados = await Promise.all(promesas);

        // Ordenar por última visita (los más recientes primero)
        resultados.sort((a, b) => (b.ultimaVisita || '').localeCompare(a.ultimaVisita || ''));

        this.pacientesList.set(resultados);
        this.loading.set(false);
      });

    } catch (e) {
      console.error(e);
      this.loading.set(false);
    }
  }

  handleImageError(e: any) { e.target.src = this.defaultImage; }

  // Acciones
  verHistoriaClinica(paciente: Paciente) {
    // ✅ Navegamos a la ruta que acabamos de crear
    this.router.navigate(['/medico/pacientes', paciente.uid]);
  }

   abrirModalVideo(paciente: Paciente) {
    this.pacienteParaVideo.set(paciente);
  }
}
