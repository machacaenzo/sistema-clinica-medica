import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';

// Servicios
import { TurnosService } from '../../../core/services/turnos.service';
import { MedicoService } from '../gestion-medicos/medico.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { TransaccionesService } from '../../../core/services/transacciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { MailService } from '../../../core/services/mail.service';
// Interfaces
import { Turno } from '../../../core/interfaces/turno.model';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faCalendarAlt, faUserMd, faFilter,
  faHandHoldingDollar, faUserCheck, faBan, faCheckCircle, faClock,
  faPaperclip, faTimes, faSyncAlt
} from '@fortawesome/free-solid-svg-icons';
import { UsuarioService } from '../gestion-usuarios/usuario.service';

@Component({
  selector: 'app-gestion-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './gestion-turnos.component.html',
  styleUrls: ['./gestion-turnos.component.scss']
})
export class GestionTurnosComponent {
  private turnosService = inject(TurnosService);
  private medicoService = inject(MedicoService);
  private transaccionesService = inject(TransaccionesService);
  private authService = inject(AuthService);
  private notificacionService = inject(NotificacionService);
  private router = inject(Router);
   private mailService = inject(MailService);     // ✅ NUEVO
  private usuarioService = inject(UsuarioService);

  icons = {
    faSearch, faCalendarAlt, faUserMd, faFilter,
    cobrar: faHandHoldingDollar,
    recepcion: faUserCheck,
    cancelar: faBan,
    ok: faCheckCircle,
    espera: faClock,
    clip: faPaperclip,
    close: faTimes,
    reprogramar: faSyncAlt
  };

  turnosSignal = toSignal(this.turnosService.obtenerTodosLosTurnos(), { initialValue: [] });
  medicosSignal = toSignal(this.medicoService.obtenerMedicosCompletos(), { initialValue: [] });

  filtroFecha = signal<string>('');
  filtroMedico = signal<string>('');
  filtroTexto = signal<string>('');
  filtroEstado = signal<string>('');

  isComprobanteOpen = signal(false);
  turnoSeleccionado: Turno | null = null;

  constructor() {
    this.turnosService.ejecutarLimpiezaDeTurnos();
  }

  // --- FILTRADO ---
  turnosFiltrados = computed(() => {
    const turnos = this.turnosSignal();
    const fecha = this.filtroFecha();
    const medicoId = this.filtroMedico();
    const texto = this.filtroTexto().toLowerCase();
    const estadoFiltro = this.filtroEstado();

    return turnos.filter(t => {
      const coincideFecha = fecha ? t.fechaString === fecha : true;
      const coincideMedico = medicoId ? t.idMedico === medicoId : true;
      const coincideTexto =
        t.pacienteData.nombre.toLowerCase().includes(texto) ||
        t.pacienteData.dni.includes(texto);

      let coincideEstado = true;
      if (estadoFiltro) {
        if (estadoFiltro === 'Vencido') coincideEstado = this.esTurnoVencido(t);
        else coincideEstado = t.estado === estadoFiltro;
      }
      return coincideFecha && coincideMedico && coincideTexto && coincideEstado;
    });
  });

  esTurnoVencido(t: Turno): boolean {
    if (t.estado === 'Vencido') return true;
    if (t.estado === 'Pendiente de Pago' && !t.comprobanteBase64 && t.fechaVencimientoReserva) {
      return new Date() > t.fechaVencimientoReserva.toDate();
    }
    return false;
  }

  async confirmarPago(turno: Turno) {
    const confirm = await this.notificacionService.showConfirm(
      'Registrar Pago',
      `Confirma recepción de $${turno.montoAbonar} en efectivo.\nSe generará un ingreso en caja.`,
      'Confirmar Cobro'
    );

    if (confirm.isConfirmed && turno.id) {
      try {
        await this.transaccionesService.registrarMovimiento({
          idPaciente: turno.idPaciente,
          idTurno: turno.id,
          monto: turno.montoAbonar,
          tipo: 'INGRESO',
          fecha: Timestamp.now(),
          usuarioResponsable: this.authService.currentUser()?.email || 'Secretaria',
          motivo: `Cobro efectivo turno ${turno.fechaString} (Admin)`
        });

        await this.actualizarEstado(turno.id, 'Confirmado');
        const usuario = await this.usuarioService.obtenerUsuarioPorId(turno.idPaciente);
        if (usuario?.email) {
          const turnoConfirmado = { ...turno, estado: 'Confirmado' };
          this.mailService.enviarNotificacionTurno(turnoConfirmado, usuario.email, turno.pacienteData.nombre);
        }

      } catch (e) {
        console.error(e);
        this.notificacionService.showAlertError('Error', 'No se pudo registrar el cobro.');
      }
    }
  }

  revisarComprobante(turno: Turno) {
    this.turnoSeleccionado = turno;
    this.isComprobanteOpen.set(true);
  }


  async procesarTransferencia(accion: 'APROBAR' | 'RECHAZAR') {
    // Validamos al inicio. Si no hay ID, se corta la función.
    if (!this.turnoSeleccionado?.id) return;

    const turno = this.turnoSeleccionado;

    try {
      if (accion === 'APROBAR') {

        // 1. Registro Financiero (Caja)
        await this.transaccionesService.registrarMovimiento({
          idPaciente: turno.idPaciente,
          // Aquí también usamos el ! por seguridad
          idTurno: turno.id!,
          monto: turno.montoAbonar,
          tipo: 'INGRESO',
          fecha: Timestamp.now(),
          usuarioResponsable: this.authService.currentUser()?.email || 'Admin',
          motivo: `Transferencia validada (Turno ${turno.fechaString})`,
          referenciaExterna: 'COMPROBANTE-OK'
        });

        // 2. Lógica según estado
        if (turno.estado === 'Cancelado') {
           // Reembolso
           await this.transaccionesService.registrarMovimiento({
              idPaciente: turno.idPaciente,
              idTurno: turno.id!, // ✅ Agregado !
              monto: turno.montoAbonar,
              tipo: 'CREDITO',
              fecha: Timestamp.now(),
              usuarioResponsable: 'SISTEMA',
              motivo: 'Reembolso: Transferencia validada post-cancelación'
           });

           this.notificacionService.showSuccessToast('Transferencia válida. Monto acreditado en Billetera.');
        }
        else {
           // Confirmación normal
           // ✅ AQUÍ ESTABA EL ERROR: Agregamos !
           await this.turnosService.actualizarEstado(turno.id!, 'Confirmado');

           const usuario = await this.usuarioService.obtenerUsuarioPorId(turno.idPaciente);
           if (usuario?.email) {
              const turnoConfirmado = { ...turno, estado: 'Confirmado' } as Turno;
              this.mailService.enviarNotificacionTurno(turnoConfirmado, usuario.email, turnoConfirmado.pacienteData.nombre);
           }

           this.notificacionService.showSuccessToast('Pago Aprobado. Turno Confirmado.');
        }

      }
      else {
        // RECHAZAR
        if (turno.estado !== 'Cancelado') {
           // ✅ AQUÍ TAMBIÉN: Agregamos !
           await this.turnosService.actualizarEstado(turno.id!, 'Rechazado');
        }
        this.notificacionService.showInfoToast('Comprobante desestimado.');
      }

      this.closeComprobante();

    } catch (e) {
      console.error(e);
      this.notificacionService.showAlertError('Error', 'Fallo al procesar pago.');
    }
  }

  closeComprobante() {
    this.isComprobanteOpen.set(false);
    this.turnoSeleccionado = null;
  }

  reprogramarTurno(turno: Turno) {
    const rol = this.authService.currentUser()?.role;
    const params = { queryParams: { reprogramar: turno.id } };


    if (rol === 'administrador') {
      this.router.navigate(['/admin/nuevo-turno'], params);
    } else if (rol === 'empleado') {
      this.router.navigate(['/empleado/nuevo-turno'], params);
    } else {
      this.notificacionService.showAlertError('Error', 'No tiene permisos para reprogramar.');
    }
  }


  async cancelarTurno(turno: Turno) {
    const confirm = await this.notificacionService.showConfirm(
      'Cancelar Turno',
      '¿Estás seguro? Se liberará el horario y si corresponde se reembolsará saldo.',
      'Sí, cancelar'
    );
    if (confirm.isConfirmed && turno.id) {
      try {
        await this.turnosService.cancelarTurno(turno, 'ADMIN');
        this.notificacionService.showInfoToast('Turno cancelado correctamente.');
      } catch (e) {
        this.notificacionService.showAlertError('Error', 'No se pudo cancelar.');
      }
    }
  }

  async darPresente(turno: Turno) {
    if (turno.estado === 'Pendiente de Pago') {
      this.notificacionService.showAlertWarning('Cobro Pendiente', 'Debe registrar el pago antes de dar el presente.');
      return;
    }
    if (turno.id) await this.actualizarEstado(turno.id, 'En Sala');
  }

  private async actualizarEstado(id: string, estado: any) {
    await this.turnosService.actualizarEstado(id, estado);
  }

  // Helpers HTML
  onFechaChange(e: Event) { this.filtroFecha.set((e.target as HTMLInputElement).value); }
  onMedicoChange(e: Event) { this.filtroMedico.set((e.target as HTMLSelectElement).value); }
  onTextoChange(e: Event) { this.filtroTexto.set((e.target as HTMLInputElement).value); }
  onEstadoChange(e: Event) { this.filtroEstado.set((e.target as HTMLSelectElement).value); }
}
