import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ServiciosDiagnosticoService } from './servicios-diagnostico.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ServicioDiagnostico } from '../../../core/interfaces/servicio-diagnostico.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faVial, faPlus, faEdit, faTrash, faTimes, faSave, faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-gestion-servicios-diagnostico',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-servicios-diagnostico.component.html',
  styleUrls: ['../_admin-theme.scss']
})
export class GestionServiciosDiagnosticoComponent {
  private service = inject(ServiciosDiagnosticoService);
  private notification = inject(NotificacionService);
  private fb = inject(FormBuilder);

  icons = { vial: faVial, plus: faPlus, edit: faEdit, trash: faTrash, close: faTimes, save: faSave, price: faMoneyBillWave };

  servicios = toSignal(this.service.obtenerTodos(), { initialValue: [] });
  precioMaestro = toSignal(this.service.obtenerPrecioGlobal(), { initialValue: 0 });

  // Control de Modales
  isModalServicioOpen = signal(false);
  isModalPrecioOpen = signal(false);

  selectedServicio: ServicioDiagnostico | null = null;
  formServicio: FormGroup;
  formPrecio: FormGroup;

  constructor() {
    this.formServicio = this.fb.group({
      nombre: ['', Validators.required],
      instrucciones: ['', Validators.required],
      estado: ['Activo', Validators.required]
    });

    this.formPrecio = this.fb.group({
      nuevoPrecio: [0, [Validators.required, Validators.min(0)]]
    });
  }

  // --- ACCIONES SERVICIOS ---
  abrirModalServicio(item?: ServicioDiagnostico) {
    if (item) {
      this.selectedServicio = item;
      this.formServicio.patchValue(item);
    } else {
      this.selectedServicio = null;
      this.formServicio.reset({ estado: 'Activo' });
    }
    this.isModalServicioOpen.set(true);
  }

  async guardarServicio() {
    if (this.formServicio.invalid) return;
    try {
      // ✅ Capturamos el valor actual del signal del precio maestro
      const precioActual = this.precioMaestro();

      const data = {
        ...this.formServicio.value,
        precioFijo: precioActual // Se inyecta el precio configurado arriba
      };

      if (this.selectedServicio?.id) {
        await this.service.actualizar(this.selectedServicio.id, data);
      } else {
        await this.service.crear(data);
      }
      this.isModalServicioOpen.set(false);
      this.notification.showSuccessToast('Servicio guardado con éxito.');
    } catch (e) {
      this.notification.showAlertError('Error', 'No se pudo guardar el servicio.');
    }
  }

  // --- ACCIÓN PRECIO MAESTRO ---
  abrirModalPrecio() {
    this.formPrecio.patchValue({ nuevoPrecio: this.precioMaestro() });
    this.isModalPrecioOpen.set(true);
  }

  async guardarPrecioMaestro() {
    if (this.formPrecio.invalid) return;
    try {
      await this.service.actualizarPrecioGlobal(this.formPrecio.value.nuevoPrecio);
      this.notification.showSuccessToast('Tarifario institucional actualizado');
      this.isModalPrecioOpen.set(false);
    } catch (e) { this.notification.showAlertError('Error', 'No se pudo actualizar el precio.'); }
  }

  async borrar(item: ServicioDiagnostico) {
    const confirm = await this.notification.showConfirm('Eliminar', `¿Borrar ${item.nombre}?`);
    if (confirm.isConfirmed && item.id) {
      await this.service.borrar(item.id);
      this.notification.showSuccessToast('Eliminado');
    }
  }
}
