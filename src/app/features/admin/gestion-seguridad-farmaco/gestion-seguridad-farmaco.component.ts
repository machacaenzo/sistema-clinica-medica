import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { SeguridadFarmacoService } from './seguridad-farmaco.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ReglaSeguridad } from '../../../core/interfaces/seguridad-farmaco.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faShieldAlt, faPlus, faTrash, faExclamationTriangle,
  faPrescription, faInfoCircle, faTimes, faTags
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-gestion-seguridad-farmaco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-seguridad-farmaco.component.html',
  styleUrls: ['../_admin-theme.scss']
})
export class GestionSeguridadFarmacoComponent {
  private seguridadService = inject(SeguridadFarmacoService);
  private notify = inject(NotificacionService);
  private fb = inject(FormBuilder);

  icons = {
    shield: faShieldAlt,
    plus: faPlus,
    trash: faTrash,
    alert: faExclamationTriangle,
    pill: faPrescription,
    info: faInfoCircle,
    borrar: faTimes,
    tags: faTags
  };

  reglas = toSignal(this.seguridadService.obtenerReglas(), { initialValue: [] });
  procesando = signal(false);

  // ✅ LISTA REACTIVA PARA LAS ALERGIAS DE LA NUEVA REGLA
  alergiasSeleccionadas = signal<string[]>([]);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      droga: ['', [Validators.required, Validators.minLength(3)]],
      // ❌ Quitamos alergiaRelacionada del form porque ahora usamos tags
      severidad: ['CRITICA', Validators.required],
      mensajeAlerta: ['', Validators.required]
    });
  }

  // --- LÓGICA DE ETIQUETAS (CHIPS) ---

  agregarAlergia(event: any) {
    const valor = event.target.value.trim().toUpperCase();
    if (valor && !this.alergiasSeleccionadas().includes(valor)) {
      this.alergiasSeleccionadas.update(lista => [...lista, valor]);
    }
    event.target.value = ''; // Limpiamos el input
  }

  removerAlergia(alergia: string) {
    this.alergiasSeleccionadas.update(lista => lista.filter(item => item !== alergia));
  }

  // --- ACCIONES DE BASE DE DATOS ---

  async guardarRegla() {
    // Validamos que el form esté bien y que haya al menos una alergia cargada
    if (this.form.invalid || this.alergiasSeleccionadas().length === 0) {
      this.form.markAllAsTouched();
      if (this.alergiasSeleccionadas().length === 0) {
        this.notify.showAlertWarning('Faltan Datos', 'Debes cargar al menos una alergia relacionada.');
      }
      return;
    }

    this.procesando.set(true);
    const formVal = this.form.value;

    const nuevaRegla: ReglaSeguridad = {
      droga: formVal.droga.toUpperCase(),
      mensajeAlerta: formVal.mensajeAlerta,
      severidad: formVal.severidad,
      alergiasRelacionadas: this.alergiasSeleccionadas() // ✅ Enviamos el array
    };

    try {
      await this.seguridadService.crearRegla(nuevaRegla);
      this.notify.showSuccessToast('Protección farmacológica activada.');

      // Reset total
      this.form.reset({ severidad: 'CRITICA' });
      this.alergiasSeleccionadas.set([]);

    } catch (e) {
      this.notify.showAlertError('Error', 'No se pudo guardar la regla.');
    } finally {
      this.procesando.set(false);
    }
  }

  async borrarRegla(regla: ReglaSeguridad) {
    const confirm = await this.notify.showConfirm(
      'Eliminar Seguridad',
      `¿Deseas quitar la protección para la droga ${regla.droga}?`
    );

    if (confirm.isConfirmed && regla.id) {
      try {
        await this.seguridadService.borrarRegla(regla.id);
        this.notify.showSuccessToast('Regla eliminada.');
      } catch (e) {
        this.notify.showAlertError('Error', 'Fallo al eliminar.');
      }
    }
  }
}
