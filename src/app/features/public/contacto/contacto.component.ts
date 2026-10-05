import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Servicios
import { ClinicaService } from '../../admin/config-clinica/clinica.service';

import { NotificacionService } from '../../../core/services/notificaciones.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMapMarkerAlt, faPhone, faEnvelope, faClock, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { ContactoService } from './contacto.service';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.scss']
})
export class ContactoComponent {
  private fb = inject(FormBuilder);
  private contactoService = inject(ContactoService); // ✅ Usamos el específico
  private notificacionService = inject(NotificacionService);
  private clinicaService = inject(ClinicaService);

  clinicaInfo = this.clinicaService.clinicaData;

  icons = {
    map: faMapMarkerAlt,
    phone: faPhone,
    email: faEnvelope,
    clock: faClock,
    send: faPaperPlane
  };

  loading = signal(false);
  contactForm: FormGroup;

  constructor() {
    this.contactForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      asunto: ['', Validators.required],
      mensaje: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  async enviarMensaje() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    try {
      // ✅ Delegamos toda la lógica al servicio
      await this.contactoService.enviarMensaje(this.contactForm.value);

      this.notificacionService.showSuccessToast('¡Mensaje enviado! Te responderemos a la brevedad.');
      this.contactForm.reset();

    } catch (error) {
      console.error(error);
      this.notificacionService.showAlertError('Error', 'No pudimos enviar tu mensaje. Intenta más tarde.');
    } finally {
      this.loading.set(false);
    }
  }
}
