import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';
import { UsuarioService } from '../../admin/gestion-usuarios/usuario.service';
import { ImageService } from '../../../core/services/image.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ObraSocialService } from '../../admin/gestion-obras-sociales/obra-social.service';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { TestHabitosComponent } from '../test-habitos/test-habitos.component';
import { CarnetDigitalComponent } from '../carnet-digital/carnet-digital.component';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUser, faIdCard, faBirthdayCake, faPhone, faMapMarkerAlt, faCamera,
  faWallet, faSave, faFileMedical, faChevronRight, faExclamationCircle,
  faHeartbeat, faSmoking, faWineGlass, faRunning, faUserInjured, faTint,
  faTimes, faPlus, faVenusMars, faPills, faSyringe, faNotesMedical
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent, RouterLink,TestHabitosComponent,CarnetDigitalComponent ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {
  public authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private usuarioService = inject(UsuarioService);
  private osService = inject(ObraSocialService);
  private imageService = inject(ImageService);
  private notificacionService = inject(NotificacionService);
  private fb = inject(FormBuilder);

  icons = {
    faUser, faIdCard, faBirthdayCake, faPhone, faMapMarkerAlt, faCamera,
    faWallet, faSave, faFileMedical, faChevronRight, error: faExclamationCircle,
    health: faHeartbeat, smoke: faSmoking, alcohol: faWineGlass, sport: faRunning,
    emergency: faUserInjured, blood: faTint, times: faTimes, plus: faPlus,
    gender: faVenusMars, pills: faPills, surgery: faSyringe, history: faNotesMedical
  };

  readonly defaultImage = 'assets/user-default.jpg';

  loading = signal(true);
  paciente = signal<Paciente | null>(null);
  saldo = signal<number>(0);
  obrasSociales = toSignal(this.osService.obtenerTodas(), { initialValue: [] });

  perfilForm: FormGroup;
  imagePreview = signal<string | null>(null);
  activeTab = signal<'personal' | 'clinico' | 'seguridad'>('personal');
  alergiasList = signal<string[]>([]);
  mostrarCarnet = signal(false); 

  constructor() {
    this.perfilForm = this.fb.group({
      // Personal
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      dni: ['', [Validators.required, Validators.minLength(7)]],
      fechaNacimiento: ['', Validators.required],
      sexo: ['Masculino', Validators.required],
      telefono: ['', Validators.required],
      direccion: ['', Validators.required],

      // Administrativo
      obraSocial: ['', Validators.required],
      numeroAfiliado: [''],

      // Patologías (Solo Lectura) - LAS MANTENEMOS PORQUE LAS CARGA EL MÉDICO
      anteDiabetes: [false],
      anteHipertension: [false],
      anteAsma: [false],

      // Historia Narrativa
      historiaFamiliar: [''],
      cirugiasPrevias: [''],
      medicacionHabitual: [''],

      // Seguridad
      grupoSanguineo: ['', Validators.required],
      emergenciaNombre: ['', Validators.required],
      emergenciaTelefono: ['', Validators.required],
      emergenciaRelacion: ['']
    });
  }

  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      try {
        const perfil = await this.pacienteService.obtenerPacientePorId(user.uid);
        if (perfil) {
          this.paciente.set(perfil);
          this.saldo.set(perfil.saldoCuenta || 0);
          this.imagePreview.set(perfil.foto || user.fotoURL || this.defaultImage);
          this.alergiasList.set(perfil.alergias || []);

          this.perfilForm.patchValue({
            nombreCompleto: perfil.nombreCompleto || user.displayName,
            dni: perfil.dni,
            fechaNacimiento: perfil.fechaNacimiento,
            sexo: perfil.sexo || 'Masculino',
            telefono: perfil.telefono,
            direccion: perfil.direccion,
            obraSocial: perfil.obraSocial,
            numeroAfiliado: perfil.numeroAfiliado,
            grupoSanguineo: perfil.grupoSanguineo || '',
            emergenciaNombre: perfil.contactoEmergencia?.nombre || '',
            emergenciaTelefono: perfil.contactoEmergencia?.telefono || '',
            emergenciaRelacion: perfil.contactoEmergencia?.relacion || '',

            // Mantenemos esto solo para que se vea el check puesto por el médico
            anteDiabetes: perfil.perfilClinico?.antecedentes?.includes('Diabetes') || false,
            anteHipertension: perfil.perfilClinico?.antecedentes?.includes('Hipertensión') || false,
            anteAsma: perfil.perfilClinico?.antecedentes?.includes('Asma') || false,

            historiaFamiliar: perfil.perfilClinico?.historiaFamiliar || '',
            cirugiasPrevias: perfil.perfilClinico?.cirugiasPrevias || '',
            medicacionHabitual: perfil.perfilClinico?.medicacionHabitual || ''
          });

          if (perfil.dni) this.perfilForm.get('dni')?.disable();
        }
      } catch (error) { console.error(error); }
      finally { this.loading.set(false); }
    }
  }


  setTab(tab: 'personal' | 'clinico' | 'seguridad') { this.activeTab.set(tab); }

  agregarAlergia(event: any) {
    const valor = event.target.value.trim();
    if (valor && !this.alergiasList().includes(valor)) {
      this.alergiasList.update(lista => [...lista, valor]);
    }
    event.target.value = '';
  }

  removerAlergia(alergia: string) {
    this.alergiasList.update(lista => lista.filter(item => item !== alergia));
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await this.imageService.compressAndConvertToBase64(file);
        this.imagePreview.set(base64);
        this.perfilForm.markAsDirty();
      } catch (e) {}
    }
  }
  handleImageError(e: any) { e.target.src = this.defaultImage; }

  async guardarCambios() {
  if (this.perfilForm.invalid) {
    this.perfilForm.markAllAsTouched();
    this.notificacionService.showAlertWarning('Atención', 'Revisa los campos obligatorios.');
    return;
  }

  const user = this.authService.currentUser();
  if (!user) return;

  // getRawValue() recupera incluso los campos deshabilitados (como el DNI)
  const formVal = this.perfilForm.getRawValue();

  // 🛡️ DEFENSA DE DATOS CLÍNICOS:
  // Recuperamos lo que ya existe en la DB para no pisar lo que el médico cargó.
  const perfilActual = this.paciente()?.perfilClinico;

  try {
    const datosPaciente: Partial<Paciente> = {
      nombreCompleto: formVal.nombreCompleto,
      foto: this.imagePreview() || '',
      dni: formVal.dni,
      fechaNacimiento: formVal.fechaNacimiento,
      sexo: formVal.sexo,
      telefono: formVal.telefono,
      direccion: formVal.direccion,
      obraSocial: formVal.obraSocial,
      numeroAfiliado: formVal.numeroAfiliado,
      alergias: this.alergiasList(),
      grupoSanguineo: formVal.grupoSanguineo,
      contactoEmergencia: {
        nombre: formVal.emergenciaNombre,
        telefono: formVal.emergenciaTelefono,
        relacion: formVal.emergenciaRelacion
      },
      // ✅ REFACTORIZACIÓN NIVEL DIOS:
      // Construimos el objeto clínico asegurando que NUNCA sea undefined
      perfilClinico: {
        // 1. Mantenemos lo que ya está (factores de riesgo de los tests, etc.)
        ...perfilActual,

        // 2. Aseguramos que los arrays obligatorios existan (Soluciona tu error)
        factoresRiesgo: perfilActual?.factoresRiesgo || [],
        antecedentes: perfilActual?.antecedentes || [],

        // 3. Actualizamos solo los campos que el paciente tiene permitido tocar
        historiaFamiliar: formVal.historiaFamiliar || '',
        cirugiasPrevias: formVal.cirugiasPrevias || '',
        medicacionHabitual: formVal.medicacionHabitual || ''
      }
    };

    await this.pacienteService.actualizarPaciente(user.uid, datosPaciente);
    this.notificacionService.showSuccessToast('Perfil actualizado correctamente.');
    this.perfilForm.markAsPristine();

  } catch (error) {
    console.error('Error al guardar:', error);
    this.notificacionService.showAlertError('Error', 'No se pudieron guardar los cambios.');
  }
}
}
