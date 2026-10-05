import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core'; // ✅ Agregar OnInit
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

// Servicios
import { TurnosService } from '../../../../core/services/turnos.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { MedicoService } from '../../../admin/gestion-medicos/medico.service'; // ✅ IMPORTAR ESTE

// Interfaces
import { Paciente } from '../../../../core/interfaces/paciente.model';
import { Turno } from '../../../../core/interfaces/turno.model';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faVideo, faCalendarAlt, faClock, faLink, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { PerfilMedico } from '../../../../core/interfaces/perfil-medico.model';
import { MailService } from '../../../../core/services/mail.service';
import { UsuarioService } from '../../../admin/gestion-usuarios/usuario.service';

@Component({
  selector: 'app-modal-cita-video',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './modal-cita-video.component.html',
  styleUrls: ['../../../../features/admin/_admin-theme.scss']
})
export class ModalCitaVideoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private turnosService = inject(TurnosService);
  private notificacionService = inject(NotificacionService);
  private authService = inject(AuthService);
  private medicoService = inject(MedicoService); // ✅ INYECTAR
  private mailService = inject(MailService); // ✅ Inyectar aquí
   private usuarioService = inject(UsuarioService);

  @Input() paciente!: Paciente;
  @Output() cerrar = new EventEmitter<void>();

  icons = { video: faVideo, calendar: faCalendarAlt, clock: faClock, link: faLink, close: faTimes, save: faCheck };

  form: FormGroup;
  loading = signal(false);

  // ✅ Variable para guardar los datos completos del médico
  datosMedico = signal<PerfilMedico | null>(null);

  constructor() {
    this.form = this.fb.group({
      fecha: ['', Validators.required],
      hora: ['', Validators.required],
      link: ['']
    });
  }

  // ✅ CARGAR DATOS REALES DEL MÉDICO AL INICIAR
  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.uid) {
      this.medicoService.obtenerMedicosCompletos().subscribe(medicos => {
        const found = medicos.find(m => m.uid === user.uid);
        if (found) {
          this.datosMedico.set(found);
        }
      });
    }
  }

async agendar() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const userAuth = this.authService.currentUser();
    const perfilMedico = this.datosMedico();
    const val = this.form.value;

    if (!userAuth || !perfilMedico) {
        this.notificacionService.showAlertError('Error', 'No se pudieron cargar tus datos de médico.');
        this.loading.set(false);
        return;
    }

    // ✅ VERIFICACIÓN DE CHOQUE (Tu lógica original)
    const estaOcupado = await this.turnosService.verificarChoqueHorarioMedico(
      userAuth.uid,
      val.fecha,
      val.hora
    );

    if (estaOcupado) {
      this.notificacionService.showAlertError(
        'Agenda Ocupada',
        `Ya tienes un turno programado el ${val.fecha} a las ${val.hora} hs.`
      );
      this.loading.set(false);
      return;
    }

    // ✅ CREACIÓN DEL OBJETO COMPLETO (Tu lógica original)
    const nuevoTurno: Turno = {
      idPaciente: this.paciente.uid,
      idMedico: userAuth.uid,
      creadoPor: 'MEDICO',
      fecha: Timestamp.fromDate(new Date(val.fecha)),
      fechaString: val.fecha,
      hora: val.hora,
      estado: 'Confirmado',
      tipo: 'VIDEO',
      enlaceVideo: val.link || '',
      metodoPago: 'Bonificado 100%',
      precioConsulta: 0,
      coberturaPorcentaje: 100,
      montoCobertura: 0,
      montoAbonar: 0,
      montoSaldoUsado: 0,
      fechaCreacion: Timestamp.now(),
      pacienteData: {
        nombre: this.paciente.nombreCompleto,
        dni: this.paciente.dni || '',
        obraSocial: this.paciente.obraSocial || ''
      },
      medicoData: {
        nombre: perfilMedico.nombre,
        especialidad: perfilMedico.especialidades?.[0] || 'General',
        matricula: perfilMedico.matricula || '---'
      }
    };

    try {
      // 1. 🔍 BUSCAMOS EL EMAIL REAL DEL USUARIO (El cambio que necesitabas)
      const datosUsuario = await this.usuarioService.obtenerUsuarioPorId(this.paciente.uid);
      const emailReal = datosUsuario?.email;

      // Si no hay email, avisamos para no gastar un intento de envío fallido
      if (!emailReal) {
        this.notificacionService.showAlertError('Error de contacto', 'El paciente no tiene un correo registrado en su cuenta.');
        this.loading.set(false);
        return;
      }

      // 2. GUARDAMOS EL TURNO
      const docRef = await this.turnosService.crearTurno(nuevoTurno);
      const idGenerado = docRef.id;

      // 3. 📧 DISPARAR EL MAIL (Usando el emailReal que buscamos)
      await this.mailService.enviarCitaVideo(
        { ...nuevoTurno, id: idGenerado },
        emailReal, // ✅ Ahora pasamos el email de la tabla usuarios
        this.paciente.nombreCompleto
      );

      this.notificacionService.showSuccessToast('Videoconsulta programada y notificada.');
      this.cerrar.emit();

    } catch (error) {
      console.error(error);
      this.notificacionService.showAlertError('Error', 'No se pudo agendar el turno.');
    } finally {
      this.loading.set(false);
    }
  }
}
