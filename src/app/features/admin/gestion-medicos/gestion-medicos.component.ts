import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { MedicoService } from './medico.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';


// Interfaces
import { DiaAgenda, PerfilMedico, DiaSemana, FranjaHoraria } from '../../../core/interfaces/perfil-medico.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faTimes, faUserMd, faClock, faCalendarCheck, faDollarSign, faPlus, faTrash
} from '@fortawesome/free-solid-svg-icons';
import { ClinicaService } from '../config-clinica/clinica.service';

@Component({
  selector: 'app-gestion-medicos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-medicos.component.html',
  styleUrls: ['./gestion-medicos.component.scss']
})
export class GestionMedicosComponent {
  private medicoService = inject(MedicoService);
  private notificationService = inject(NotificacionService);
  private clinicaService = inject(ClinicaService);
  private fb = inject(FormBuilder);

  readonly defaultImage = 'assets/user-default.jpg';

  icons = { faSearch, faEdit, faTimes, faUserMd, faClock, faCalendarCheck, faDollarSign, faPlus, faTrash };

  // Datos
  medicosSignal = toSignal(this.medicoService.obtenerMedicosCompletos(), { initialValue: [] });
  searchTerm = signal('');

  // Opciones de Horarios (00:00 a 23:30)
  horariosOptions: string[] = [];

  // Filtrado
  filteredMedicos = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.medicosSignal().filter(m =>
      m.displayName?.toLowerCase().includes(term) ||
      m.especialidad?.toLowerCase().includes(term) ||
      m.matricula?.toLowerCase().includes(term)
    );
  });

  isModalOpen = signal(false);
  selectedMedico: any = null;
  medicoForm: FormGroup;

  readonly diasSemana: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado','Domingo'];

  constructor() {
    // 1. Generar opciones de horario (cada 30 min)
    this.generarOpcionesHorarias();

    // 2. Inicializar Formulario
    this.medicoForm = this.fb.group({
      especialidad: ['', Validators.required],
      matricula: ['', Validators.required],
      duracionTurno: [30, [Validators.required, Validators.min(10)]],
      valorConsulta: ['', [Validators.required, Validators.min(0)]],
      dias: this.fb.array([])
    });
  }

  // --- GENERADOR DE HORARIOS (24hs) ---
  generarOpcionesHorarias() {
    let minutos = 0;
    const finDia = 24 * 60; // 1440 minutos

    while (minutos < finDia) {
      const h = Math.floor(minutos / 60);
      const m = minutos % 60;
      // Formato HH:MM
      const horaStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      this.horariosOptions.push(horaStr);

      minutos += 30; // Intervalo de 30 minutos
    }
    // Opcional: Agregar 23:59 como cierre final
    // this.horariosOptions.push('23:59');
  }

  // Getters
  get diasArray() { return this.medicoForm.get('dias') as FormArray; }

  getFranjas(indexDia: number): FormArray {
    return this.diasArray.at(indexDia).get('franjas') as FormArray;
  }

  // --- GESTIÓN DE FRANJAS ---
  crearFranja(inicio = '08:00', fin = '12:00'): FormGroup {
    return this.fb.group({
      inicio: [inicio, Validators.required],
      fin: [fin, Validators.required]
    });
  }

  agregarFranja(indexDia: number) {
    this.getFranjas(indexDia).push(this.crearFranja());
  }

  eliminarFranja(indexDia: number, indexFranja: number) {
    this.getFranjas(indexDia).removeAt(indexFranja);
  }

  handleImageError(event: any) { event.target.src = this.defaultImage; }
  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }

  // --- MODAL ---
  openEditModal(medico: any) {
    this.selectedMedico = medico;

    this.medicoForm.patchValue({
      especialidad: medico.especialidad !== 'Sin asignar' ? medico.especialidad : '',
      matricula: medico.matricula !== '---' ? medico.matricula : '',
      duracionTurno: medico.duracionTurno || 30,
      valorConsulta: medico.valorConsulta || ''
    });

    this.diasArray.clear();

    this.diasSemana.forEach(diaNombre => {
      const configDia = medico.disponibilidad?.find((d: DiaAgenda) => d.dia === diaNombre);

      const diaGroup = this.fb.group({
        dia: [diaNombre],
        activo: [configDia ? configDia.activo : false],
        franjas: this.fb.array([])
      });

      const franjasArr = diaGroup.get('franjas') as FormArray;

      if (configDia && configDia.franjas && configDia.franjas.length > 0) {
        configDia.franjas.forEach((f: any) => {
          franjasArr.push(this.crearFranja(f.inicio, f.fin));
        });
      } else {
        // Default si activa el día
        franjasArr.push(this.crearFranja('09:00', '13:00'));
      }

      this.diasArray.push(diaGroup);
    });

    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedMedico = null;
  }

  // --- GUARDAR ---
  // En gestion-medicos.component.ts

async saveChanges() {
    if (this.medicoForm.invalid) {
      this.medicoForm.markAllAsTouched();
      return;
    }

    const form = this.medicoForm.value;
    const clinicaConfig = this.clinicaService.clinicaData();

    // ... (Validaciones de horario siguen igual) ...

    // Mapeo Agenda
    const disponibilidad: DiaAgenda[] = form.dias.map((d: any) => ({
      dia: d.dia,
      activo: d.activo,
      franjas: d.franjas
    }));

    // ✅ CORRECCIÓN AQUÍ:
    // Al armar el objeto, incluimos el nombre y foto que ya tenía el 'selectedMedico'.
    // Como 'selectedMedico' viene de 'obtenerMedicosCompletos', ya tiene esos datos.
    const perfilActualizado: Partial<PerfilMedico> = {
      uid: this.selectedMedico.uid,

      // Preservamos identidad (Datos que este form NO edita pero NO debe borrar)
      nombre: this.selectedMedico.displayName || this.selectedMedico.nombre,
      foto: this.selectedMedico.fotoUsuario || this.selectedMedico.foto,

      // Datos que SÍ editamos
      matricula: form.matricula,
      especialidades: [form.especialidad],
      duracionTurno: form.duracionTurno,
      valorConsulta: form.valorConsulta,
      disponibilidad: disponibilidad,
      estado: 'Activo'
    };

    try {
      // Usamos update para ser más seguros, o set con merge si el servicio lo soporta.
      // Pero con pasar los datos completos arriba, setDocument funcionará bien.
      await this.medicoService.crearPerfil(perfilActualizado);

      this.notificationService.showSuccessToast('Configuración guardada');
      this.closeModal();
    } catch (error) {
      console.error(error);
      this.notificationService.showAlertError('Error', 'No se pudo guardar.');
    }
  }
}
