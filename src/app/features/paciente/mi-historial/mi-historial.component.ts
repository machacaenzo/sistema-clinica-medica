import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { ConsultaMedicaService } from '../../medico/services/consulta-medica.service';
import { AuthService } from '../../../core/services/auth.service';
import { PdfService } from '../../medico/services/pdf.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faFileMedical, faUserMd, faCalendarAlt,
  faDownload, faStethoscope, faNotesMedical, faClock
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mi-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './mi-historial.component.html',
  styleUrls: ['./mi-historial.component.scss']
})
export class MiHistorialComponent implements OnInit {
  private consultaService = inject(ConsultaMedicaService);
  private authService = inject(AuthService);
  private pdfService = inject(PdfService);
  private pacienteService = inject(PacienteService);

  icons = {
    search: faSearch,
    historial: faFileMedical,
    doctor: faUserMd,
    fecha: faCalendarAlt,
    download: faDownload,
    atencion: faStethoscope,
    notas: faNotesMedical,
    reloj: faClock
  };

  user = this.authService.currentUser();
  filtro = signal('');
  loading = signal(true);
  pacienteData = signal<any>(null);

  // Cargamos las consultas directamente en un Signal
  consultas = signal<any[]>([]);

  // Filtro inteligente por médico o diagnóstico
  consultasFiltradas = computed(() => {
    const term = this.filtro().toLowerCase();
    return this.consultas().filter(c =>
      c.diagnostico?.toLowerCase().includes(term) ||
      c.motivoConsulta?.toLowerCase().includes(term)
    );
  });

  async ngOnInit() {
    if (this.user?.uid) {
      // Cargamos datos del perfil para el PDF
      const p = await this.pacienteService.obtenerPacientePorId(this.user.uid);
      this.pacienteData.set(p);

      // Traemos el historial
      this.consultaService.obtenerHistorialPaciente(this.user.uid).subscribe(res => {
        this.consultas.set(res);
        this.loading.set(false);
      });
    }
  }

  descargarPDF() {
  if (this.consultas().length > 0 && this.pacienteData()) {
    this.pdfService.generarCopiaInformativaHistorial(this.pacienteData(), this.consultas());
  }
}

  handleImageError(e: any) {
    e.target.src = 'assets/user-default.jpg';
  }
}
