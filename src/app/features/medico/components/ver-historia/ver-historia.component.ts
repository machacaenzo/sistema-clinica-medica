import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';
import { ConsultaMedicaService } from '../../services/consulta-medica.service';
import { PdfService } from '../../services/pdf.service'; // ✅ INYECTAR
import { AuthService } from '../../../../core/services/auth.service'; // ✅ INYECTAR

// Interfaces
import { Paciente } from '../../../../core/interfaces/paciente.model';
import { Consulta } from '../../../../core/interfaces/consulta.model';

// Componentes Hijos
import { DetallePacienteComponent } from '../detalle-paciente/detalle-paciente.component';
import { GraficosEvolucionComponent } from '../graficos-evolucion/graficos-evolucion.component';
import { BodyMapComponent, PuntoDolor } from '../body-map/body-map.component';
import { NotasObjetivosComponent } from '../notas-objetivos/notas-objetivos.component';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faArrowLeft, faFileMedical, faChartLine, faList, faWalking, faTimes,
  faChevronDown, faChevronUp, faStethoscope, faPills, faNotesMedical, faPaperclip,
  faFilePdf, faFileImage, faPrint, faVideo, faFileAlt
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-ver-historia',
  standalone: true,
  imports: [
    CommonModule,
    FaIconComponent,
    DetallePacienteComponent,
    GraficosEvolucionComponent,
    BodyMapComponent,
    NotasObjetivosComponent
  ],
  templateUrl: './ver-historia.component.html',
  styleUrls: ['./ver-historia.component.scss']
})
export class VerHistoriaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacienteService = inject(PacienteService);
  private consultaService = inject(ConsultaMedicaService);
  private pdfService = inject(PdfService);
  private authService = inject(AuthService);

  icons = {
    volver: faArrowLeft,
    historia: faFileMedical,
    grafico: faChartLine,
    lista: faList,
    cuerpo: faWalking,
    cerrar: faTimes,
    down: faChevronDown,
    up: faChevronUp,
    doctor: faStethoscope,
    tratamiento: faPills,
    notas: faNotesMedical,
    clip: faPaperclip,
    pdf: faFilePdf,
    img: faFileImage,
    print: faPrint,
    video: faVideo,
    file: faFileAlt
  };

  defaultImage = 'assets/user-default.jpg';

  // Estado
  paciente = signal<Paciente | null>(null);
  historial = signal<Consulta[]>([]);
  loading = signal(true);
  verGraficos = signal(false);

  // Acordeón y Modales
  consultaAbiertaId = signal<string | null>(null);
  mostrarModalMapa = signal(false);
  puntosMapaSeleccionados = signal<PuntoDolor[]>([]);

  async ngOnInit() {
    const idPaciente = this.route.snapshot.paramMap.get('idPaciente');

    if (!idPaciente) {
      this.volver();
      return;
    }

    try {
      const p = await this.pacienteService.obtenerPacientePorId(idPaciente);
      if (p) this.paciente.set(p);

      this.consultaService.obtenerHistorialPaciente(idPaciente).subscribe(h => {
        this.historial.set(h);
        // Abrir la primera consulta automáticamente
        if (h.length > 0 && h[0].id) {
          this.consultaAbiertaId.set(h[0].id);
        }
        this.loading.set(false);
      });
    } catch (e) {
      this.loading.set(false);
    }
  }

  // --- ACCIONES ---

  toggleConsulta(id?: string) {
    if (!id) return;
    // Si toco la misma, la cierro. Si no, abro la nueva.
    this.consultaAbiertaId.set(this.consultaAbiertaId() === id ? null : id);
  }

  abrirMapa(event: MouseEvent, puntos: any[]) {
    event.stopPropagation(); // Evita que el clic cierre el acordeón
    this.puntosMapaSeleccionados.set(puntos as PuntoDolor[]);
    this.mostrarModalMapa.set(true);
  }

  volver() {
    this.router.navigate(['/medico/pacientes']);
  }

  // --- EXPORTACIÓN PDF ---

  // 1. Receta Individual
  imprimirReceta(consulta: Consulta, event: Event) {
    event.stopPropagation();
    if (!consulta.tratamiento) return;
    const medico = this.authService.currentUser()?.displayName || 'Médico Tratante';
    this.pdfService.generarReceta(this.paciente()!, consulta.tratamiento, medico);
  }

  // 2. Certificado de Atención (Desde el Historial)
  imprimirCertificado(consulta: Consulta, event: Event) {
    event.stopPropagation();

    const medico = this.authService.currentUser()?.displayName || 'Médico Tratante';

    // Redactamos el texto automático
    const texto = `Certifico que el paciente ${this.paciente()?.nombreCompleto}, DNI ${this.paciente()?.dni}, fue atendido en esta institución el día ${consulta.fechaString} por el servicio de Medicina General.\n\nDiagnóstico: ${consulta.diagnostico || 'Control de Salud'}.\n\nSe extiende el presente a pedido del interesado para ser presentado ante quien corresponda.`;

    // ✅ USAMOS EL MÉTODO NUEVO (Genérico)
    // Ya no dice "Receta", ahora dice "Certificado Médico"
    this.pdfService.generarCertificadoGenerico(this.paciente()!, texto, medico);
  }

  // 3. Resumen Clínico Completo (Ficha de esa consulta)
  imprimirResumenClinico(consulta: Consulta, event: Event) {
    event.stopPropagation();
    const medico = this.authService.currentUser()?.displayName || 'Médico Tratante';
    this.pdfService.generarResumenConsulta(this.paciente()!, consulta, medico);
  }

  // 4. Historia Completa (Libro)
  descargarHistorialCompleto() {
     if (!this.paciente() || this.historial().length === 0) return;
     this.pdfService.generarHistorialCompleto(this.paciente()!, this.historial());
  }
}
