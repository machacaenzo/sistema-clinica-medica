import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { MedicoService } from '../../admin/gestion-medicos/medico.service';
import { TurnosService } from '../../../core/services/turnos.service';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';
import { UsuarioService } from '../../admin/gestion-usuarios/usuario.service';
import { ObraSocialService } from '../../admin/gestion-obras-sociales/obra-social.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { TransaccionesService } from '../../../core/services/transacciones.service';
import { MailService } from '../../../core/services/mail.service';
import { LaboratorioService } from '../../empleados/laboratorio/laboratorio.service';

// Interfaces
import { Turno, MetodoPago, EstadoTurno } from '../../../core/interfaces/turno.model';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { Prestacion } from '../../../core/interfaces/prestacion.model';

// Componentes Hijos
import { PasoMedicoComponent } from './components/paso-medico/paso-medico.component';
import { PasoPrestacionComponent } from './components/paso-prestacion/paso-prestacion.component';
import { PasoCalendarioComponent } from './components/paso-calendario/paso-calendario.component';
import { PasoPagoComponent } from './components/paso-pago/paso-pago.component';
import { SimulacionPagoComponent } from './components/simulacion-pago/simulacion-pago.component';

import {
  faArrowLeft, faSyncAlt, faCheckCircle, faExclamationTriangle,
  faSpinner, faWallet, faVial
} from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ServiciosDiagnosticoService } from '../../admin/gestion-servicios-diagnostico/servicios-diagnostico.service';

@Component({
  selector: 'app-solicitar-turno',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    PasoMedicoComponent, PasoPrestacionComponent,
    PasoCalendarioComponent, PasoPagoComponent,
    SimulacionPagoComponent, FaIconComponent
  ],
  templateUrl: './solicitar-turno.component.html',
  styleUrls: ['./solicitar-turno.component.scss']
})
export class SolicitarTurnoComponent implements OnInit {
  private turnosService = inject(TurnosService);
  private medicoService = inject(MedicoService);
  private usuarioService = inject(UsuarioService);
  public authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private osService = inject(ObraSocialService);
  private notificacionService = inject(NotificacionService);
  private transaccionesService = inject(TransaccionesService);
  private labService = inject(LaboratorioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private mailService = inject(MailService);
  private serviciosDiagnosticoService = inject(ServiciosDiagnosticoService);

  precioEstudioBase = toSignal(this.serviciosDiagnosticoService.obtenerPrecioGlobal(), { initialValue: 0 });

  icons = {
    faArrowLeft,
    reprogramar: faSyncAlt,
    ok: faCheckCircle,
    alert: faExclamationTriangle,
    spinner: faSpinner,
    wallet: faWallet,
    lab: faVial
  };

  // --- ESTADO GLOBAL ---
  pasoActual = signal<1 | 2 | 3 | 4>(1);
  medicoSeleccionado = signal<any>(null);
  prestacionSeleccionada = signal<Prestacion | null>(null);
  fechaSeleccionada = signal<Date | null>(null);
  horaSeleccionada = signal<string>('');

  idTurnoOriginal = signal<string | null>(null);
  creditoReprogramacion = signal<number>(0);

  loadingPerfil = signal(true);
  pacienteActual = signal<Paciente | null>(null);
  guardandoTurno = signal(false);
  mostrarModalPago = signal(false);

  confirmForm: FormGroup;

  // SEÑALES PARA EL MÓDULO DE SERVICIOS
  pagaEstudio = signal<boolean>(false);
  urlEstudioExterno = signal<string | null>(null);


  obrasSociales = toSignal(this.osService.obtenerTodas(), { initialValue: [] });
  usuarioLogueado = this.authService.currentUser;

  constructor() {
    this.confirmForm = this.fb.group({
      dni: ['', [Validators.required, Validators.minLength(7)]],
      obraSocial: ['', Validators.required],
      metodoPago: ['Efectivo', Validators.required]
    });

    effect(() => {
      const user = this.usuarioLogueado();
      if (user && this.loadingPerfil()) {
        this.cargarDatosPaciente(user.uid);
      } else if (!user) {
        setTimeout(() => { if(!this.usuarioLogueado()) this.loadingPerfil.set(false); }, 1500);
      }
    });
  }

  // CALCULADORA FINANCIERA
    montosCalculados = computed(() => {
    const medico = this.medicoSeleccionado();
    const paciente = this.pacienteActual();
    const formVal = this.confirmForm.value;

    const precioMedico = medico ? (medico.valorConsulta || 0) : 0;

    // 🔥 AQUÍ ESTÁ EL CAMBIO: Usamos la señal en lugar de 2500
    const precioEstudio = this.pagaEstudio() ? this.precioEstudioBase() : 0;

    const osNombre = formVal.obraSocial || paciente?.obraSocial;
    const osObj = this.obrasSociales().find(o => o.nombre === osNombre);

    const porcCubreConsulta = osObj ? (osObj.coberturaConsulta || 0) : 0;
    const porcCubreEstudio = osObj ? (osObj.coberturaEstudio || 0) : 0;

    const montoCubreOS = ((precioMedico * porcCubreConsulta) / 100) +
                         ((precioEstudio * porcCubreEstudio) / 100);

    const saldoBilletera = paciente?.saldoCuenta || 0;
    const creditoAnterior = this.creditoReprogramacion();

    let montoRestante = (precioMedico + precioEstudio) - montoCubreOS;

    const usoCreditoViejo = Math.min(creditoAnterior, montoRestante);
    montoRestante -= usoCreditoViejo;

    const usoSaldo = Math.min(saldoBilletera, montoRestante);
    montoRestante -= usoSaldo;

    const pagaPaciente = Math.max(0, montoRestante);

    return {
      precio: precioMedico + precioEstudio,
      coberturaPorc: porcCubreConsulta,
      cubre: montoCubreOS,
      creditoViejo: creditoAnterior,
      usoCreditoViejo,
      saldoDisponible: saldoBilletera,
      usoSaldo,
      pagaPaciente,
      coberturaEstudio: porcCubreEstudio
    };
  });

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params: Params) => {
      if (params['reprogramar']) {
        const idViejo = params['reprogramar'];
        this.idTurnoOriginal.set(idViejo);
        const turnoViejo = await this.turnosService.obtenerTurnoPorId(idViejo);
        if (turnoViejo) {
          const creditoReal = (turnoViejo.montoAbonar || 0) + (turnoViejo.montoSaldoUsado || 0);
          this.creditoReprogramacion.set(creditoReal);
        }
      }
    });
    // Suscribirse manualmente para forzar el valor si toSignal falla por contexto
    this.serviciosDiagnosticoService.obtenerPrecioGlobal().subscribe(precio => {
        console.log("Precio actualizado desde Firebase:", precio); // Mira la consola
        // Esto es solo para debug, pero confirma si el dato llega.
        // Si aquí ves 3000, el problema es puramente de la señal.
    });
  }

  async cargarDatosPaciente(uid: string) {
    try {
      const perfil = await this.pacienteService.obtenerPacientePorId(uid);
      if (perfil) {
        this.pacienteActual.set(perfil);
        if (perfil.dni) {
          this.confirmForm.patchValue({ dni: perfil.dni, obraSocial: perfil.obraSocial || 'Particular' });
          this.confirmForm.get('dni')?.clearValidators();
          this.confirmForm.get('obraSocial')?.clearValidators();
        }
      }
    } finally {
      this.loadingPerfil.set(false);
      this.confirmForm.get('dni')?.updateValueAndValidity();
      this.confirmForm.get('obraSocial')?.updateValueAndValidity();
    }
  }

  // --- NAVEGACIÓN ---
  handleMedicoSelected(medico: any) { this.medicoSeleccionado.set(medico); this.pasoActual.set(2); }

  handlePrestacionSelected(data: { prestacion: Prestacion, pagaEstudio: boolean, urlEstudio?: string }) {
    this.prestacionSeleccionada.set(data.prestacion);
    this.pagaEstudio.set(data.pagaEstudio);
    this.urlEstudioExterno.set(data.urlEstudio || null);
    this.pasoActual.set(3);
  }

  handleSlotSelected(s: { fecha: Date, hora: string }) {
    this.fechaSeleccionada.set(s.fecha);
    this.horaSeleccionada.set(s.hora);
    this.pasoActual.set(4);
  }

  volver() {
    const paso = this.pasoActual();
    if (paso > 1) this.pasoActual.set((paso - 1) as 1 | 2 | 3 | 4);
    else this.router.navigate(['/public/home']);
  }

  private getFechaLocal(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  async confirmarTurno() {
    const user = this.usuarioLogueado();
    if (!user) {
      this.notificacionService.showAlertWarning('Acceso Restringido', 'Debes iniciar sesión.');
      return;
    }

    if (!this.horaSeleccionada()) {
      this.notificacionService.showAlertWarning('Horario Faltante', 'Selecciona un horario.');
      this.pasoActual.set(3);
      return;
    }

    if (this.guardandoTurno()) return;

    if (!this.pacienteActual()?.dni && this.confirmForm.get('dni')?.invalid) {
      this.confirmForm.get('dni')?.markAsTouched();
      this.notificacionService.showAlertWarning('Datos Faltantes', 'El DNI es obligatorio.');
      return;
    }

    const montos = this.montosCalculados();
    const formVal = this.confirmForm.getRawValue();

    if (montos.pagaPaciente > 0 && !formVal.metodoPago) {
      this.notificacionService.showAlertWarning('Atención', 'Selecciona método de pago.');
      return;
    }

    let metodoParaValidar = formVal.metodoPago;
    if (montos.pagaPaciente === 0) metodoParaValidar = 'Saldo Previo';

    try {
      const validacion = await this.turnosService.validarPosibilidadDeTurno(
        user.uid, this.medicoSeleccionado().uid, this.getFechaLocal(this.fechaSeleccionada()!), metodoParaValidar
      );

      if (!validacion.posible && !this.idTurnoOriginal()) {
        this.notificacionService.showAlertError('No permitido', validacion.mensaje);
        this.guardandoTurno.set(false);
        return;
      }
    } catch (e) { this.guardandoTurno.set(false); return; }

    if (formVal.metodoPago === 'Tarjeta de Crédito' && montos.pagaPaciente > 0) {
      this.mostrarModalPago.set(true);
    } else {
      this.procesarGuardado();
    }
  }

  async procesarGuardado() {
    this.guardandoTurno.set(true);
    const usuario = this.usuarioLogueado()!;
    const montos = this.montosCalculados();
    const formVal = this.confirmForm.getRawValue();
    const fechaStr = this.getFechaLocal(this.fechaSeleccionada()!);

    let estado: EstadoTurno = 'Confirmado';
    let metodo: MetodoPago = 'Saldo Previo';

    if (montos.pagaPaciente > 0) {
      metodo = formVal.metodoPago;
      if (metodo === 'Transferencia' || metodo === 'Efectivo') estado = 'Pendiente de Pago';
    } else if (montos.cubre === montos.precio) {
      metodo = 'Bonificado 100%';
    }

    const turnoData: Turno = {
      fecha: Timestamp.fromDate(this.fechaSeleccionada()!),
      fechaString: fechaStr,
      hora: this.horaSeleccionada(),
      estado: estado,
      metodoPago: metodo,
      precioConsulta: montos.precio,
      coberturaPorcentaje: montos.coberturaPorc,
      montoCobertura: montos.cubre,
      montoSaldoUsado: montos.usoSaldo,
      montoAbonar: montos.pagaPaciente,
      idPaciente: usuario.uid,
      idMedico: this.medicoSeleccionado().uid,

      pacienteData: {
        nombre: usuario.displayName || 'Paciente',
        dni: formVal.dni || this.pacienteActual()?.dni || '',
        obraSocial: formVal.obraSocial || this.pacienteActual()?.obraSocial || 'Particular'
      },
      medicoData: {
        nombre: this.medicoSeleccionado().displayName,
        especialidad: this.medicoSeleccionado().especialidad,
        matricula: this.medicoSeleccionado().matricula
      },
      prestacionData: {
        id: this.prestacionSeleccionada()?.id || '',
        nombre: this.prestacionSeleccionada()?.nombre || 'Consulta General',
        tipoFormulario: this.prestacionSeleccionada()?.tipoFormulario || 'GENERAL'
      },
      fechaCreacion: Timestamp.now(),
      creadoPor: 'PACIENTE'
    };

    if (metodo === 'Transferencia' && estado === 'Pendiente de Pago') {
      const v = new Date(); v.setHours(v.getHours() + 2);
      turnoData.fechaVencimientoReserva = Timestamp.fromDate(v);
    }

    try {
      let idTurnoFinal: string;

      if (this.idTurnoOriginal()) {
        await this.turnosService.reprogramarTurno(this.idTurnoOriginal()!, turnoData);
        idTurnoFinal = this.idTurnoOriginal()!;
        if (montos.pagaPaciente > 0 && formVal.metodoPago.includes('Tarjeta')) {
           await this.transaccionesService.registrarMovimiento({
            idPaciente: usuario.uid, idTurno: idTurnoFinal, monto: montos.pagaPaciente, tipo: 'INGRESO', fecha: Timestamp.now(),
            usuarioResponsable: 'PACIENTE', motivo: `Diferencia reprogramación`, referenciaExterna: 'SIMULACION'
          });
        }
        if (usuario.email) this.mailService.enviarNotificacionTurno(turnoData, usuario.email, usuario.displayName || 'Paciente');

      } else {
        const docRef = await this.turnosService.crearTurno(turnoData);
        idTurnoFinal = docRef.id;

        if (!this.pacienteActual()?.dni) {
            if (usuario.role === 'sin_rol') await this.usuarioService.actualizarUsuario(usuario.uid, { role: 'paciente' });
            await this.pacienteService.crearPaciente({
                uid: usuario.uid, nombreCompleto: usuario.displayName || 'Paciente', email: usuario.email || '',
                dni: formVal.dni, obraSocial: formVal.obraSocial, saldoCuenta: 0, estado: 'Activo'
            });
        }


        if (this.pagaEstudio() || this.urlEstudioExterno()) {

          let listaEstudios: string[] = [];
          const p = this.prestacionSeleccionada();

          if (p) {
             if (p.tipoFormulario === 'APTO_FISICO') {
                listaEstudios = ['Electrocardiograma', 'Ergometría'];
             } else if (p.tipoFormulario === 'CONTROL_CRONICO') {
                listaEstudios = ['Glucemia', 'HbA1c', 'Perfil Lipídico', 'Función Renal'];
             } else {
                listaEstudios = [p.nombre];
             }
          } else {
             listaEstudios = ['Estudio General'];
          }


          await this.labService.crearPedidoDesdeConsulta({
            idPaciente: usuario.uid,
            idTurno: idTurnoFinal,
            idMedico: this.medicoSeleccionado().uid,
            medicoNombre: this.medicoSeleccionado().displayName,
            pacienteNombre: usuario.displayName || 'Paciente',
            pacienteDni: formVal.dni || this.pacienteActual()?.dni || '',

            tipoEstudio: listaEstudios.join(', '),
            estudios: listaEstudios,
            fechaPedido: fechaStr,

            urlEstudioExterno: this.urlEstudioExterno() || null
          });
        }

        if (montos.usoSaldo > 0) {
          await this.transaccionesService.registrarMovimiento({
            idPaciente: usuario.uid, idTurno: idTurnoFinal, monto: montos.usoSaldo, tipo: 'DEBITO', fecha: Timestamp.now(),
            usuarioResponsable: 'SISTEMA', motivo: `Uso saldo turno ${fechaStr}`
          });
        }
        if (montos.pagaPaciente > 0 && formVal.metodoPago.includes('Tarjeta')) {
           await this.transaccionesService.registrarMovimiento({
            idPaciente: usuario.uid, idTurno: idTurnoFinal, monto: montos.pagaPaciente, tipo: 'INGRESO', fecha: Timestamp.now(),
            usuarioResponsable: 'PACIENTE', motivo: `Pago online`, referenciaExterna: 'SIMULACION'
          });
        }
        if (usuario.email) this.mailService.enviarNotificacionTurno(turnoData, usuario.email, usuario.displayName || 'Paciente');
      }

      this.notificacionService.showSuccessToast(this.idTurnoOriginal() ? 'Turno reprogramado.' : 'Turno reservado.');
      sessionStorage.removeItem('turno_pendiente');
      this.router.navigate(['/public/mis-turnos']);

    } catch (e) {
      console.error(e);
      this.notificacionService.showAlertError('Error', 'No se pudo completar la operación.');
    } finally {
      this.guardandoTurno.set(false);
    }
  }

  onPagoAprobado() {
    this.mostrarModalPago.set(false);
    this.procesarGuardado();
  }
  irALogin() {
    // Truco: Podrías guardar el estado en localStorage para recuperarlo al volver,
    // pero para el examen, redirigir es suficiente.
    this.router.navigate(['/auth/login']);
  }

  irARegistro() {
    this.router.navigate(['/auth/register']);
  }
}
