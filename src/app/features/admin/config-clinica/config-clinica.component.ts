import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { ClinicaService } from './clinica.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ImageService } from '../../../core/services/image.service';
import { Feriado } from '../../../core/interfaces/clinica.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSave, faCamera, faTrash, faPlus, faBuilding, faCalendarTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-config-clinica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './config-clinica.component.html',
  styleUrls: ['./config-clinica.component.scss']
})
export class ConfigClinicaComponent implements OnInit {
  private clinicaService = inject(ClinicaService);
  private notificationService = inject(NotificacionService);
  private imageService = inject(ImageService);
  private fb = inject(FormBuilder);

  icons = { faSave, faCamera, faTrash, faPlus, faBuilding, faCalendarTimes };

  // Fallback seguro
  readonly defaultLogo = 'assets/hospital.png';

  logoPreview = signal<string | null>(null);
  configForm: FormGroup;

  // Signal opcional para consumo reactivo
  configSignal = toSignal(this.clinicaService.obtenerConfiguracion());

  constructor() {
    this.configForm = this.fb.group({
      nombre: ['Clínica HIA', Validators.required],
      direccion: ['', Validators.required],
      telefono: [''],
      email: ['', [Validators.required, Validators.email]],
      horarioApertura: ['07:00', Validators.required],
      horarioCierre: ['21:00', Validators.required],
      feriados: this.fb.array([])
    });
  }

  ngOnInit() {
    this.clinicaService.obtenerConfiguracion().subscribe(config => {
      if (config) {
        this.configForm.patchValue({
          nombre: config.nombre,
          direccion: config.direccion,
          telefono: config.telefono,
          email: config.email,
          horarioApertura: config.horarioApertura,
          horarioCierre: config.horarioCierre
        });

        this.logoPreview.set(config.logo || null);

        // Cargar feriados existentes
        const feriadosArray = this.configForm.get('feriados') as FormArray;
        feriadosArray.clear();
        if (config.feriados) {
          config.feriados.forEach(f => this.agregarFeriado(f));
        }
      }
    });
  }

  // --- LÓGICA DE FERIADOS ---
  get feriadosArray() {
    return this.configForm.get('feriados') as FormArray;
  }

  agregarFeriado(feriado?: Feriado) {
    const group = this.fb.group({
      fecha: [feriado?.fecha || '', Validators.required],
      motivo: [feriado?.motivo || '', Validators.required]
    });
    this.feriadosArray.push(group);
  }

  eliminarFeriado(index: number) {
    this.feriadosArray.removeAt(index);
  }

  // --- LÓGICA DE IMAGEN ---

  // Evita bucle infinito de parpadeo
  handleImageError(event: any) {
    if (!event.target.src.includes(this.defaultLogo)) {
      event.target.src = this.defaultLogo;
    }
  }

  async onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.notificationService.showAlertWarning('Archivo inválido', 'Por favor sube una imagen.');
        return;
      }

      try {
        const base64 = await this.imageService.compressAndConvertToBase64(file);
        this.logoPreview.set(base64);
      } catch (e) {
        this.notificationService.showAlertError('Error', 'No se pudo procesar el logo');
      }
    }
  }

  // --- GUARDAR ---
  async guardar() {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Datos Incompletos', 'Por favor revisa el formulario.');
      return;
    }

    const form = this.configForm.value;

    const configData: any = {
      ...form,
      logo: this.logoPreview() || ''
    };

    try {
      await this.clinicaService.guardarConfiguracion(configData);
      this.notificationService.showSuccessToast('Configuración guardada correctamente');
    } catch (error) {
      console.error(error);
      this.notificationService.showAlertError('Error', 'No se pudieron guardar los cambios.');
    }
  }
}
