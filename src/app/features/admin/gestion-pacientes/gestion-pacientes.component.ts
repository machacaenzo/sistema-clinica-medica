import { Router } from '@angular/router';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { PacienteService } from './paciente.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ObraSocialService } from '../gestion-obras-sociales/obra-social.service';
import { AuthService } from '../../../core/services/auth.service'; // ✅ Asegurar import

// Interfaces
import { Paciente } from '../../../core/interfaces/paciente.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faTrash, faUndo, faTimes,
  faUserInjured, faFileMedical, faIdCard, faPhone, faMapMarkerAlt,
  faClipboardList, faCalendarAlt, faCalendarPlus, // ✅ Icono nuevo turno
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import { ConsultaMedicaService } from '../../medico/services/consulta-medica.service';
import { PdfService } from '../../medico/services/pdf.service';
import { ProtocoloEmergenciaComponent } from "../protocolo-emergencia/protocolo-emergencia.component";
import { ReputacionService } from '../../../core/services/reputacion.service';

@Component({
  selector: 'app-gestion-pacientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent, ProtocoloEmergenciaComponent],
  templateUrl: './gestion-pacientes.component.html',
  styleUrls: ['./gestion-pacientes.component.scss'] // Asegúrate de tener los estilos del admin
})
export class GestionPacientesComponent {
  private pacienteService = inject(PacienteService);
  private osService = inject(ObraSocialService);
  private notificationService = inject(NotificacionService);
  private authService = inject(AuthService); // ✅ Inyectado
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private consultaService = inject(ConsultaMedicaService);
  private pdfService = inject(PdfService);
   private reputacionService = inject(ReputacionService); // ✅ Inyectar

  // 2. Señales para el Protocolo
  mostrarProtocolo = signal(false);
  pacienteSeleccionado = signal<any>(null);

  readonly defaultImage = 'assets/user-default.jpg';

  icons = {
    faSearch, faEdit, faTrash, faUndo, faTimes,
    faUserInjured, faFileMedical, faIdCard, faPhone, faMapMarkerAlt,
    historia: faClipboardList,
    turnos: faCalendarAlt,
    nuevoTurno: faCalendarPlus,
    pago: faMoneyBillWave
  };

  // --- CARGA DE DATOS ---
  listaPacientes = toSignal(this.pacienteService.obtenerPacientesCompletos(), { initialValue: [] });
  listaObrasSociales = toSignal(this.osService.obtenerTodas(), { initialValue: [] });

  obrasSocialesActivas = computed(() => {
    return this.listaObrasSociales().filter(os => os.estado === 'Activa');
  });

  // --- FILTROS ---
  searchTerm = signal('');
  showIncomplete = signal(false);

  filteredPacientes = computed(() => {
    const pacientes = this.listaPacientes();
    const search = this.searchTerm().toLowerCase();
    const soloIncompletos = this.showIncomplete();

    return pacientes.filter(p => {
      const matchesSearch =
        p.displayName?.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search) ||
        p.dni?.toLowerCase().includes(search);
      const matchesIncomplete = soloIncompletos ? !p.perfilCompleto : true;
      return matchesSearch && matchesIncomplete;
    });
  });

  // --- MODAL ---
  isModalOpen = signal(false);
  selectedPaciente: any | null = null;
  pacienteForm: FormGroup;


  constructor() {
    this.pacienteForm = this.fb.group({
      dni: ['', [Validators.required, Validators.minLength(7), Validators.pattern('^[0-9]*$')]],
      fechaNacimiento: ['', Validators.required],
      sexo: ['Masculino', Validators.required],
      obraSocial: ['', Validators.required],
      numeroAfiliado: [''],
      grupoSanguineo: [''],
      telefono: ['', Validators.required],
      direccion: [''],
      contactoEmergenciaNombre: [''],
      contactoEmergenciaTelefono: ['']
    });
  }

  // Helpers
  obtenerSiglas(nombreOS: string): string {
    if (!nombreOS || nombreOS === 'No cargada') return '---';
    if (nombreOS === 'Particular') return 'Particular';
    const osEncontrada = this.listaObrasSociales().find(os => os.nombre === nombreOS);
    return osEncontrada && osEncontrada.siglas ? osEncontrada.siglas : (nombreOS.length > 15 ? nombreOS.substring(0, 12) + '...' : nombreOS);
  }

  handleImageError(event: any) { event.target.src = this.defaultImage; }
  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }
  toggleIncomplete(e: Event) { this.showIncomplete.set((e.target as HTMLInputElement).checked); }

  // --- ACCIONES MODAL ---
  openEditModal(paciente: any) {
    this.selectedPaciente = paciente;
    this.pacienteForm.patchValue({
      dni: paciente.dni !== '---' ? paciente.dni : '',
      fechaNacimiento: paciente.fechaNacimiento || '',
      sexo: paciente.sexo || 'Masculino',
      obraSocial: paciente.obraSocial !== 'No cargada' ? paciente.obraSocial : '',
      numeroAfiliado: paciente.numeroAfiliado || '',
      grupoSanguineo: paciente.grupoSanguineo || '',
      telefono: paciente.telefono || '',
      direccion: paciente.direccion || '',
      contactoEmergenciaNombre: paciente.contactoEmergencia?.nombre || '',
      contactoEmergenciaTelefono: paciente.contactoEmergencia?.telefono || ''
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedPaciente = null;
    this.pacienteForm.reset();
  }

  async saveChanges() {
    if (this.pacienteForm.invalid) {
      this.pacienteForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Datos Faltantes', 'El DNI y la Obra Social son obligatorios.');
      return;
    }
    const form = this.pacienteForm.value;
    const datosActualizados: Partial<Paciente> = {
      dni: form.dni,
      fechaNacimiento: form.fechaNacimiento,
      sexo: form.sexo,
      obraSocial: form.obraSocial,
      numeroAfiliado: form.numeroAfiliado,
      grupoSanguineo: form.grupoSanguineo,
      telefono: form.telefono,
      direccion: form.direccion,
      contactoEmergencia: {
        nombre: form.contactoEmergenciaNombre,
        telefono: form.contactoEmergenciaTelefono
      },
      nombreCompleto: this.selectedPaciente.displayName
    };

    try {
      const uid = this.selectedPaciente.uid;
      if (this.selectedPaciente.dni === '---') {
         await this.pacienteService.crearPaciente({ uid: uid, saldoCuenta: 0, ...datosActualizados });
      } else {
         await this.pacienteService.actualizarPaciente(uid, datosActualizados);
      }
      this.notificationService.showSuccessToast('Ficha médica actualizada');
      this.closeModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los datos.');
    }
  }

  // --- NAVEGACIÓN INTELIGENTE (LA SOLUCIÓN) ---

  asignarTurno(paciente: any) {
    if (!paciente.perfilCompleto) {
      this.notificationService.showAlertWarning('Atención', 'Complete la ficha (DNI) antes de asignar turnos.');
      return;
    }

    const rol = this.authService.currentUser()?.role;
    const queryParams = { idPaciente: paciente.uid };

    // ✅ Redirección condicional según quién esté logueado
    if (rol === 'administrador') {
      this.router.navigate(['/admin/nuevo-turno'], { queryParams });
    } else if (rol === 'empleado') {
      this.router.navigate(['/empleado/nuevo-turno'], { queryParams });
    } else {
      this.notificationService.showAlertError('Error', 'Rol no autorizado para asignar turnos.');
    }
  }

   // 3. Modificamos tu método original
  verHistoriaClinica(paciente: any) {
    if (!paciente.dni) {
      this.notificationService.showAlertWarning('Ficha Incompleta', 'El paciente no tiene DNI registrado.');
      return;
    }

    // En lugar de ir a la historia, abrimos el protocolo de seguridad
    this.pacienteSeleccionado.set(paciente);
    this.mostrarProtocolo.set(true);
  }
   // 4. Qué pasa cuando el Admin pone bien la Master Key
  async alAutorizarAcceso() {
    this.mostrarProtocolo.set(false);
    const p = this.pacienteSeleccionado();

    this.notificationService.showSuccessToast('Acceso auditado correctamente.');

    // NIVEL DIOS: Para máxima seguridad, no lo llevamos a una pantalla,
    // le generamos el PDF OFICIAL directamente.
    // Así el Admin tiene el documento pero no "navega" por datos sensibles en la web.
    try {
      this.consultaService.obtenerHistorialPaciente(p.uid).subscribe(async (historial) => {
        // Usamos el generador oficial (el que no tiene marca de agua)
        await this.pdfService.generarHistorialCompleto(p, historial);
      });
    } catch (e) {
      this.notificationService.showAlertError('Error', 'No se pudo exportar el historial.');
    }
  }

   /**
   * Proceso de cobro de multa y desbloqueo
   */
 async cobrarMultaYRehabilitar(p: any) {
    const MONTO_MULTA = 1500;
    const confirm = await this.notificationService.showConfirm(
      'Cobrar Multa',
      `Registrar cobro de $${MONTO_MULTA} y rehabilitar a ${p.displayName || p.nombreCompleto}?`,
      'Cobrar y Habilitar'
    );

    if (confirm.isConfirmed) {
      try {
        const adminEmail = this.authService.currentUser()?.email || 'Admin';
        await this.reputacionService.rehabilitarPaciente(p.uid, MONTO_MULTA, adminEmail);
        this.notificationService.showSuccessToast('Paciente rehabilitado');
      } catch (e) {
        this.notificationService.showAlertError('Error', 'No se pudo procesar el pago.');
      }
    }
  }

  // ✅ HELPER PARA COLORES (Opcional pero recomendado)
  getClaseReputacion(puntos: number = 100): string {
    if (puntos < 40) return 'danger';
    if (puntos < 70) return 'warning';
    return 'activo';
  }
}
