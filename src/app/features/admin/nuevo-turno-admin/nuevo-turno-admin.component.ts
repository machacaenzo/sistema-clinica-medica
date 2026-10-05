import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { TurnosService } from '../../../core/services/turnos.service';
import { MedicoService } from '../gestion-medicos/medico.service';
import { PacienteService } from '../gestion-pacientes/paciente.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { ObraSocialService } from '../gestion-obras-sociales/obra-social.service';
import { TransaccionesService } from '../../../core/services/transacciones.service';
import { MailService } from '../../../core/services/mail.service'; // ✅ REINTEGRADO
import { PrestacionesService } from '../gestion-prestaciones/prestaciones.service'; // ✅ NUEVO

// Interfaces
import { EstadoTurno, MetodoPago, Turno } from '../../../core/interfaces/turno.model';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { Prestacion } from '../../../core/interfaces/prestacion.model'; // ✅ NUEVO

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserMd, faCalendarAlt, faClock, faCheckCircle,
  faArrowLeft, faSyncAlt, faSun, faMoon, faCloudSun,
  faMoneyBillWave, faBuilding, faCreditCard, faWallet, faUser, faArrowRight, faNotesMedical
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-nuevo-turno-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './nuevo-turno-admin.component.html',
  styleUrls: ['./nuevo-turno-admin.component.scss']
})
export class NuevoTurnoAdminComponent implements OnInit {
  private turnosService = inject(TurnosService);
  private medicoService = inject(MedicoService);
  private pacienteService = inject(PacienteService);
  private osService = inject(ObraSocialService);
  private transaccionesService = inject(TransaccionesService);
  private notificacionService = inject(NotificacionService);
  private authService = inject(AuthService);
  private mailService = inject(MailService); // ✅ REINTEGRADO
  private prestacionesService = inject(PrestacionesService); // ✅ NUEVO
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  icons = {
    faUserMd, faCalendarAlt, faClock, faCheckCircle, faArrowLeft, faSyncAlt, faUser,
    manana: faSun, tarde: faCloudSun, noche: faMoon,
    efectivo: faMoneyBillWave, transfer: faBuilding, tarjeta: faCreditCard, wallet: faWallet,
    faArrowRight, servicio: faNotesMedical
  };

  defaultImage = 'assets/user-default.jpg';
  DIAS_A_MOSTRAR = 30;

  // --- ESTADO (Cambiado a 4 Pasos para incluir Prestaciones) ---
  pasoActual = signal<1 | 2 | 3 | 4>(1);
  cargandoSlots = signal(false);

  // Reprogramación
  idTurnoOriginal = signal<string | null>(null);
  creditoReprogramacion = signal<number>(0);

  // --- DATOS MAESTROS ---
  medicos = toSignal(this.medicoService.obtenerMedicosCompletos(), { initialValue: [] });
  obrasSociales = toSignal(this.osService.obtenerTodas(), { initialValue: [] });
  prestaciones = toSignal(this.prestacionesService.obtenerTodas(), { initialValue: [] }); // ✅ NUEVO

  prestacionesActivas = computed(() => {
    return this.prestaciones().filter(p => p.estado === 'Activa');
  });

  // --- SELECCIONES ---
  pacienteSeleccionado = signal<Paciente | any>(null);
  medicoSeleccionado = signal<any>(null);
  prestacionSeleccionada = signal<Prestacion | null>(null); // ✅ NUEVO
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string>('');
  metodoPagoSeleccionado = signal<MetodoPago>('Efectivo');

  // --- CALCULADORA FINANCIERA (Tu lógica original intacta) ---
  montosCalculados = computed(() => {
    const medico = this.medicoSeleccionado();
    const paciente = this.pacienteSeleccionado();

    const precio = medico ? (medico.valorConsulta || 0) : 0;
    const saldoBilletera = paciente ? (paciente.saldoCuenta || 0) : 0;
    const creditoViejo = this.creditoReprogramacion();

    const osNombre = paciente?.obraSocial || '';
    const osObj = this.obrasSociales().find(o => o.nombre === osNombre);
    const coberturaPorc = osObj ? osObj.cobertura : 0;
    const cubre = (precio * coberturaPorc) / 100;

    let montoRestante = precio - cubre;

    const usoCreditoViejo = Math.min(creditoViejo, montoRestante);
    montoRestante -= usoCreditoViejo;

    const usoSaldo = Math.min(saldoBilletera, montoRestante);
    montoRestante -= usoSaldo;

    const pagaPaciente = Math.max(0, montoRestante);

    return {
      precio, coberturaPorc, cubre,
      creditoViejo, usoCreditoViejo,
      saldoDisponible: saldoBilletera, usoSaldo,
      pagaPaciente
    };
  });

  // --- CALENDARIO ---
  diasDisponibles = signal<{ date: Date, labelDia: string, labelNum: string, slots: string[] }[]>([]);

  slotsAgrupados = computed(() => {
    const fecha = this.fechaSeleccionada();
    if (!fecha) return null;
    const diaObj = this.diasDisponibles().find(d => d.date.getTime() === fecha.getTime());
    if (!diaObj) return null;
    const slots = diaObj.slots;
    return {
      manana: slots.filter(h => parseInt(h.split(':')[0]) < 13),
      tarde: slots.filter(h => parseInt(h.split(':')[0]) >= 13 && parseInt(h.split(':')[0]) < 18),
      noche: slots.filter(h => parseInt(h.split(':')[0]) >= 18)
    };
  });

  private getBasePath(): string {
    const role = this.authService.currentUser()?.role;
    return role === 'empleado' ? '/empleado' : '/admin';
  }

  async ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      if (params['reprogramar']) {
        const idViejo = params['reprogramar'];
        this.idTurnoOriginal.set(idViejo);
        const turnoViejo = await this.turnosService.obtenerTurnoPorId(idViejo);
        if (turnoViejo) {
          const creditoReal = (turnoViejo.montoAbonar || 0) + (turnoViejo.montoSaldoUsado || 0);
          this.creditoReprogramacion.set(creditoReal);
          this.cargarPaciente(turnoViejo.idPaciente);
          this.notificacionService.showInfoToast('Modo Reprogramación Activado');
        }
      }
      else if (params['idPaciente']) {
        this.cargarPaciente(params['idPaciente']);
      }
      else {
        this.notificacionService.showAlertWarning('Acceso Incorrecto', 'Seleccione un paciente para asignar turno.');
        this.router.navigate([`${this.getBasePath()}/pacientes`]);
      }
    });
  }

  async cargarPaciente(uid: string) {
    const paciente = await this.pacienteService.obtenerPacientePorId(uid);
    if (paciente) {
      this.pacienteSeleccionado.set(paciente);
    } else {
      this.notificacionService.showAlertError('Error', 'Paciente no encontrado');
      this.router.navigate([`${this.getBasePath()}/pacientes`]);
    }
  }

  // ==========================================================
  // FLUJO WIZARD (Modificado a 4 pasos)
  // ==========================================================

  seleccionarMedico(m: any) {
    this.medicoSeleccionado.set(m);
    this.pasoActual.set(2); // ✅ Paso 2: Prestación
  }

  seleccionarPrestacion(p: Prestacion) {
    this.prestacionSeleccionada.set(p);
    this.generarCalendario(this.medicoSeleccionado());
    this.pasoActual.set(3); // ✅ Paso 3: Calendario
  }

  async generarCalendario(medico: any) {
    this.cargandoSlots.set(true);
    const dias = [];
    const hoy = new Date();

    // 🔴 REPARACIÓN: Empezar en 0 para permitir turnos de hoy
    for (let i = 0; i <= this.DIAS_A_MOSTRAR; i++) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() + i);

      // 🛡️ NORMALIZACIÓN: Evitar errores de zona horaria (Efecto medianoche)
      fecha.setHours(12, 0, 0, 0);

      const slots = await this.turnosService.generarSlotsDisponibles(medico, fecha);
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

    // Auto-selección inteligente
    if (dias.length > 0 && !this.fechaSeleccionada()) {
        this.seleccionarFecha(dias[0].date);
    }
  }

  seleccionarFecha(fecha: Date) {
    this.fechaSeleccionada.set(fecha);
    this.horaSeleccionada.set('');
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada.set(hora);
    this.pasoActual.set(4); // ✅ Paso 4: Pago
  }

  // ==========================================================
  // CONFIRMACIÓN (Tu lógica original + Seguridad de Hora)
  // ==========================================================
  async confirmarTurno() {
    const paciente = this.pacienteSeleccionado();
    const medico = this.medicoSeleccionado();
    const prestacion = this.prestacionSeleccionada();
    const fechaStr = this.getFechaLocal(this.fechaSeleccionada()!);
    const montos = this.montosCalculados();
    const metodoElegido = this.metodoPagoSeleccionado();

    // 🛡️ SEGURIDAD: Evitar guardado sin hora (el bug que mencionabas)
    if (!this.horaSeleccionada()) {
      this.notificacionService.showAlertWarning('Horario Faltante', 'Debe seleccionar un horario antes de confirmar.');
      this.pasoActual.set(3);
      return;
    }

    try {
      const validacion = await this.turnosService.validarPosibilidadDeTurno(
        paciente.uid, medico.uid, fechaStr, metodoElegido
      );
      if (!validacion.posible && !this.idTurnoOriginal()) {
        this.notificacionService.showAlertError('Bloqueo', validacion.mensaje);
        return;
      }
    } catch (e) { return; }

    let estadoFinal: EstadoTurno = 'Confirmado';
    let metodoFinal: MetodoPago = 'Saldo Previo';

    if (montos.pagaPaciente > 0) {
      metodoFinal = metodoElegido;
      estadoFinal = 'Pendiente de Pago';
    }
    else if (montos.cubre === montos.precio) {
      metodoFinal = 'Bonificado 100%';
    }

    const nuevoTurno: Turno = {
      fecha: Timestamp.fromDate(this.fechaSeleccionada()!),
      fechaString: fechaStr,
      hora: this.horaSeleccionada(),
      estado: estadoFinal,
      metodoPago: metodoFinal,
      precioConsulta: montos.precio,
      coberturaPorcentaje: montos.coberturaPorc,
      montoCobertura: montos.cubre,
      montoSaldoUsado: montos.usoSaldo,
      montoAbonar: montos.pagaPaciente,
      idPaciente: paciente.uid,
      idMedico: medico.uid,
      pacienteData: {
        nombre: paciente.nombreCompleto || paciente.displayName || 'Paciente',
        dni: paciente.dni || '---',
        obraSocial: paciente.obraSocial || 'Particular'
      },
      medicoData: {
        nombre: medico.displayName,
        especialidad: medico.especialidad,
        matricula: medico.matricula
      },
      // ✅ INTEGRACIÓN: Datos de Prestación para el Médico
      prestacionData: {
        id: prestacion?.id || '',
        nombre: prestacion?.nombre || 'Consulta General',
        tipoFormulario: prestacion?.tipoFormulario || 'GENERAL'
      },
      fechaCreacion: Timestamp.now(),
      creadoPor: 'ADMIN'
    };

    if (metodoFinal === 'Transferencia') {
       const v = new Date(); v.setHours(v.getHours() + 48);
       nuevoTurno.fechaVencimientoReserva = Timestamp.fromDate(v);
    }

    try {
      if (this.idTurnoOriginal()) {
        // --- CASO REPROGRAMAR ---
        await this.turnosService.reprogramarTurno(this.idTurnoOriginal()!, nuevoTurno);

        // Notificación de reprogramación
        if (paciente.email) {
          this.mailService.enviarNotificacionTurno({ ...nuevoTurno, estado: 'Confirmado' }, paciente.email, paciente.nombreCompleto);
        }
      }
      else {
        // --- CASO TURNO NUEVO ---
        const docRef = await this.turnosService.crearTurno(nuevoTurno);

        if (montos.usoSaldo > 0) {
          await this.transaccionesService.registrarMovimiento({
            idPaciente: paciente.uid, idTurno: docRef.id, monto: montos.usoSaldo, tipo: 'DEBITO', fecha: Timestamp.now(),
            usuarioResponsable: 'SISTEMA', motivo: `Uso saldo turno ${fechaStr} (Admin)`
          });
        }

        // Notificación de nuevo turno
        if (paciente.email) {
          this.mailService.enviarNotificacionTurno(nuevoTurno, paciente.email, paciente.nombreCompleto);
        }
      }

      this.notificacionService.showSuccessToast('Operación finalizada con éxito.');
      this.router.navigate([`${this.getBasePath()}/turnos`]);

    } catch (e) {
      console.error(e);
      this.notificacionService.showAlertError('Error', 'No se pudo procesar el turno.');
    }
  }

  // --- HELPERS ---
  private getFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getNombreDia(date: Date): string {
    const dias = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    return dias[date.getDay()];
  }

  handleImageError(e:any) { e.target.src = this.defaultImage; }

  volver() {
    if (this.pasoActual() > 1) {
      this.pasoActual.update(v => (v - 1) as any);
    } else {
      this.router.navigate([`${this.getBasePath()}/turnos`]);
    }
  }
}
