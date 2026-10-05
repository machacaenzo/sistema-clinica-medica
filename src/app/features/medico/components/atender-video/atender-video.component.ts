import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';

// Servicios
import { ConsultaMedicaService } from '../../services/consulta-medica.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PdfService } from '../../services/pdf.service';

// Interfaces
import { Turno } from '../../../../core/interfaces/turno.model';
import { Paciente } from '../../../../core/interfaces/paciente.model';
import { Consulta } from '../../../../core/interfaces/consulta.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faVideo, faClock, faSave, faArrowLeft, faPrint, faFileMedical } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-atender-video',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './atender-video.component.html',
  styleUrls: ['./atender-video.component.scss'] // Asegúrate de tener este archivo o borrar esta línea
})
export class AtenderVideoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private consultaService = inject(ConsultaMedicaService);
  private turnosService = inject(TurnosService);
  private pacienteService = inject(PacienteService);
  private authService = inject(AuthService);
  private notificacionService = inject(NotificacionService);
  private pdfService = inject(PdfService);

  icons = { video: faVideo, clock: faClock, save: faSave, back: faArrowLeft, print: faPrint, notes: faFileMedical };

  loading = signal(true);
  guardando = signal(false);

  turnoActual = signal<Turno | null>(null);
  pacienteData = signal<Paciente | null>(null);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      duracion: ['', [Validators.required, Validators.min(1)]], // En minutos
      notas: ['', Validators.required], // Evolución / Resumen
      tratamiento: [''] // Opcional (Receta)
    });
  }

 async ngOnInit() {
    const idTurno = this.route.snapshot.paramMap.get('idTurno');

    // 1. Si no hay ID en la URL, nos vamos
    if (!idTurno) {
      console.error("No hay ID en la URL");
      this.volver();
      return;
    }

    try {
      // 2. Cargar Turno
      const turno = await this.turnosService.obtenerTurnoPorId(idTurno);

      // 🛑 BLINDAJE: Si el turno no existe O no tiene paciente, salimos.
      // ESTO ES LO QUE TE SALVA DEL ERROR "pacientes has 1"
      if (!turno || !turno.idPaciente) {
        this.notificacionService.showAlertError('Error Crónico', 'El turno está corrupto (sin paciente). Borralo y crea uno nuevo.');
        this.volver();
        return;
      }

      this.turnoActual.set(turno);

      // 3. Cargar Paciente (Ahora es seguro porque validamos arriba)
      const paciente = await this.pacienteService.obtenerPacientePorId(turno.idPaciente);

      if (paciente) {
        this.pacienteData.set(paciente);
      } else {
        console.warn("El paciente no existe en la base de datos");
      }

    } catch (e) {
      console.error("Explotó ngOnInit:", e);
      this.notificacionService.showAlertError('Error', 'No se pudieron cargar los datos.');
      this.volver();
    } finally {
      this.loading.set(false);
    }
  }
  // --- ACCIONES ---

  imprimirReceta() {
    const tratamiento = this.form.get('tratamiento')?.value;
    if (!tratamiento) {
      this.notificacionService.showAlertWarning('Vacío', 'Escriba el tratamiento para imprimir.');
      return;
    }
    const medico = this.authService.currentUser()?.displayName || 'Médico';
    this.pdfService.generarReceta(this.pacienteData()!, tratamiento, medico);
  }

  async finalizar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const val = this.form.value;
    const turno = this.turnoActual()!;
    const user = this.authService.currentUser();

    if (!user) return;

    // Crear objeto Consulta simplificado
    const consulta: Consulta = {
      idTurno: turno.id!,
      idPaciente: turno.idPaciente,
      idMedico: user.uid,
      fecha: Timestamp.now(),
      fechaString: new Date().toISOString().split('T')[0],

      // Datos específicos del PDF
      duracion: `${val.duracion} minutos`,

      // Mapeo a campos estándar
      motivoConsulta: 'Videoconsulta - Seguimiento',
      diagnostico: val.notas, // Usamos el campo diagnóstico para las notas principales
      examenFisico: 'Evaluación remota por videollamada.', // Texto default
      tratamiento: val.tratamiento || 'Sin prescripción.',

      // Datos nulos (No aplican a video)
      signosVitales: {
        presionArterial: 'N/A',
        peso: 0,
        altura: 0
      },
      esControlCronico: false
    };

    try {
      await this.consultaService.finalizarConsulta(consulta);
      this.notificacionService.showSuccessToast('Videoconsulta registrada.');
      this.volver();
    } catch (e) {
      console.error(e);
      this.notificacionService.showAlertError('Error', 'No se pudo guardar.');
    } finally {
      this.guardando.set(false);
    }
  }

  volver() {
    this.router.navigate(['/medico/dashboard']);
  }
}
