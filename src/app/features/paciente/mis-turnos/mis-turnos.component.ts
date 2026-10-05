import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs/operators';

// Servicios
import { TurnosService } from '../../../core/services/turnos.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ImageService } from '../../../core/services/image.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';

// Interfaces
import { Turno } from '../../../core/interfaces/turno.model';

// Componentes
import { ModalResenaComponent } from '../modal-resena/modal-resena.component';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faCalendarAlt, faClock, faUserMd, faMapMarkerAlt,
  faFileUpload, faBan, faCheckCircle, faHistory, faMoneyBillWave,
  faExclamationCircle, faWallet, faExchangeAlt, faInfoCircle, faVideo, faStar
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent, RouterLink, ModalResenaComponent],
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.scss']
})
export class MisTurnosComponent implements OnInit {
  private turnosService = inject(TurnosService);
  private authService = inject(AuthService);
  private notificacionService = inject(NotificacionService);
  private imageService = inject(ImageService);
  private pacienteService = inject(PacienteService);
  private router = inject(Router);

  icons = {
    faSearch, faCalendarAlt, faClock, faUserMd, faMapMarkerAlt,
    subir: faFileUpload, cancelar: faBan, ok: faCheckCircle,
    historial: faHistory, pago: faMoneyBillWave, alert: faExclamationCircle,
    wallet: faWallet, reprogramar: faExchangeAlt, faInfoCircle,
    video: faVideo, starSolid: faStar
  };

  // --- ESTADOS ---
  isLoading = signal(true);
  filtro = signal('');
  usuario = this.authService.currentUser();
  saldoPaciente = signal<number>(0);

  // --- MODALES ---
  isUploadModalOpen = signal(false);
  previewComprobante = signal<string | null>(null);
  turnoParaSubir: Turno | null = null;

  modalResenaAbierto = signal(false);
  turnoParaResena = signal<Turno | null>(null);

  // --- DATA ---
  turnosRaw = toSignal(
    this.turnosService.obtenerTurnosPorPaciente(this.usuario?.uid || '').pipe(
      tap(() => this.isLoading.set(false))
    ),
    { initialValue: [] }
  );

  // =================================================================
  // 🧠 LÓGICA DE FILTRADO Y CLASIFICACIÓN (NIVEL SENIOR)
  // =================================================================
  misTurnos = computed(() => {
    const texto = this.filtro().toLowerCase();
    const todos = this.turnosRaw();

    const filtrados = todos.filter(t =>
      t.medicoData.nombre.toLowerCase().includes(texto) ||
      t.medicoData.especialidad.toLowerCase().includes(texto)
    );

    // Fecha de hoy local para comparaciones
    const hoy = new Date().toISOString().split('T')[0];

    const proximos: Turno[] = [];
    const finalizados: Turno[] = [];
    const cancelados: Turno[] = [];

    filtrados.forEach(t => {
      const virtualmenteVencido = this.esVencidoVirtual(t);

      // 1. FINALIZADOS (Atenciones exitosas)
      if (t.estado === 'Finalizado') {
        finalizados.push(t);
      }
      // 2. NO EFECTUADOS (Cancelados, Rechazados, Vencidos o pasados sin atención)
      else if (['Cancelado', 'Rechazado', 'Vencido', 'Ausente'].includes(t.estado) || virtualmenteVencido) {
        const tClon = virtualmenteVencido ? { ...t, estado: 'Vencido' } as Turno : t;
        cancelados.push(tClon);
      }
      // 3. CLASIFICACIÓN POR TIEMPO
      else {
        if (t.fechaString >= hoy) {
          proximos.push(t);
        } else {
          // Si la fecha ya pasó pero no se canceló ni finalizó, es AUSENTE
          cancelados.push({ ...t, estado: 'Ausente' } as Turno);
        }
      }
    });

    return { proximos, finalizados, cancelados };
  });

  ngOnInit() {
    if (this.usuario?.uid) {
      this.pacienteService.obtenerPacientePorId(this.usuario.uid).then(p => {
        if (p) this.saldoPaciente.set(p.saldoCuenta || 0);
      });
    }
  }

  // =================================================================
  // ⚡ ACCIONES
  // =================================================================

  abrirModalResena(turno: Turno) {
    this.turnoParaResena.set(turno);
    this.modalResenaAbierto.set(true);
  }

  async cancelarTurno(turno: Turno) {
    if (turno.tipo === 'VIDEO') {
      this.notificacionService.showAlertInfo('Consulta Protegida', 'Las videoconsultas no pueden cancelarse desde la web. Por favor comuníquese con administración.');
      return;
    }

    const confirm = await this.notificacionService.showConfirm('Cancelar Turno', 'Si cancelas con anticipación, el dinero se acreditará en tu cuenta. ¿Confirmar?', 'Sí, cancelar');

    if (confirm.isConfirmed && turno.id) {
      try {
        await this.turnosService.cancelarTurno(turno, 'PACIENTE');
        this.notificacionService.showInfoToast('Turno cancelado. Saldo actualizado.');
        // Refrescar saldo
        const p = await this.pacienteService.obtenerPacientePorId(this.usuario!.uid);
        if (p) this.saldoPaciente.set(p.saldoCuenta);
      } catch (e: any) {
        if (e.message === 'PENALIZACION_TIEMPO') {
           this.notificacionService.showAlertError('Demasiado tarde', 'Faltan menos de 24hs. Debes llamar a la clínica para cancelar.');
        } else {
           this.notificacionService.showAlertError('Error', 'No se pudo procesar la cancelación.');
        }
      }
    }
  }

  reprogramarTurno(turno: Turno) {
    // 🛡️ REGLA DE ORO: Bloqueo de reprogramación para VIDEO
    if (turno.tipo === 'VIDEO') {
      this.notificacionService.showAlertInfo(
        'Operación no permitida',
        'Las videoconsultas son citas programadas de forma fija. Para cambios de fecha, por favor comuníquese telefónicamente con la clínica.'
      );
      return;
    }

    // Validación de estado base (lo que ya tenías)
    if (turno.estado === 'Pendiente de Pago') {
      this.notificacionService.showAlertWarning('Pago Pendiente', 'No puedes reprogramar un turno que no está confirmado.');
      return;
    }

    // Validación 24hs (lo que ya tenías)
    const ahora = new Date();
    const fechaTurno = new Date(`${turno.fechaString}T${turno.hora}:00`);
    const diferenciaHoras = (fechaTurno.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (diferenciaHoras < 24) {
      this.notificacionService.showAlertError('Plazo Vencido', 'No es posible reprogramar con menos de 24hs de antelación.');
      return;
    }

    this.router.navigate(['/public/solicitar-turno'], { queryParams: { reprogramar: turno.id } });
  }

  // --- GESTIÓN DE COMPROBANTES ---

  async onFileSelected(event: any, turno: Turno) {
    if (this.esVencidoVirtual(turno)) {
      this.notificacionService.showAlertError('Turno Vencido', 'El tiempo para subir el comprobante ha expirado.');
      return;
    }
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.notificacionService.showAlertWarning('Archivo inválido', 'Por favor, sube una imagen (JPG o PNG).');
      return;
    }

    try {
      const base64 = await this.imageService.compressAndConvertToBase64(file);
      this.previewComprobante.set(base64);
      this.turnoParaSubir = turno;
      this.isUploadModalOpen.set(true);
      event.target.value = '';
    } catch (e) {
      this.notificacionService.showAlertError('Error', 'No se pudo procesar la imagen.');
    }
  }

  async confirmarSubida() {
    if (!this.turnoParaSubir?.id || !this.previewComprobante()) return;
    try {
      await this.turnosService.subirComprobante(this.turnoParaSubir.id, this.previewComprobante()!);
      this.notificacionService.showSuccessToast('Comprobante enviado a revisión.');
      this.cerrarUploadModal();
    } catch (e) {
      this.notificacionService.showAlertError('Error', 'Fallo al enviar el comprobante.');
    }
  }

  cerrarUploadModal() {
    this.isUploadModalOpen.set(false);
    this.turnoParaSubir = null;
    this.previewComprobante.set(null);
  }

  // --- HELPERS ---

  esVencidoVirtual(turno: Turno): boolean {
    // 1. Si no es Transferencia Pendiente, no nos importa
    if (turno.metodoPago !== 'Transferencia' || turno.estado !== 'Pendiente de Pago') {
      return false;
    }

    // 2. Si ya subió la foto, no está vencido (está en revisión)
    if (turno.comprobanteBase64) return false;

    // 3. SI TIENE FECHA DE VENCIMIENTO (Turnos bien creados)
    if (turno.fechaVencimientoReserva) {
      // Normalizamos la fecha de Firebase
      const vencimiento = (turno.fechaVencimientoReserva as any).toDate
                          ? (turno.fechaVencimientoReserva as any).toDate()
                          : new Date(turno.fechaVencimientoReserva as any);

      const ahora = new Date();
      return ahora > vencimiento;
    }

    // 4. 🚨 SI NO TIENE FECHA (Turnos viejos o rotos)
    // Asumimos que está vencido para bloquear la subida y evitar errores.
    return true;
  }

  onSearch(e: Event) { this.filtro.set((e.target as HTMLInputElement).value); }
  getMes(date: Date): string { const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']; return meses[date.getMonth()]; }
  getDia(date: Date): string { const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']; return dias[date.getDay()]; }
}
