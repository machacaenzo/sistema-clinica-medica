import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { AuthService } from '../../../../core/services/auth.service';
import { PlantillasService } from '../../services/plantillas.service'; // ✅ El servicio nuevo
import { NotificacionService } from '../../../../core/services/notificaciones.service';

// Interfaces
import { PlantillaMedica } from '../../../../core/interfaces/consulta.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMagic, faPlus, faTrash, faTimes, faSave } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mis-plantillas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './mis-plantillas.component.html',
  styleUrls: ['../../../../features/admin/_admin-theme.scss'] // ✅ Importamos estilos globales aquí también si hace falta
})
export class MisPlantillasComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private plantillasService = inject(PlantillasService);
  private notificacionService = inject(NotificacionService);

  icons = { magic: faMagic, plus: faPlus, trash: faTrash, close: faTimes, save: faSave };

  // Usuario actual
  user = this.authService.currentUser();

  // Lista en tiempo real (Signal)
  misPlantillas = toSignal(
    this.plantillasService.obtenerMisPlantillas(this.user?.uid || ''),
    { initialValue: [] }
  );

  // Estado Modal
  isModalOpen = signal(false);
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      textoMotivo: [''],
      textoExamen: [''],
      textoPlan: ['']
    });
  }

  // --- ACCIONES ---

  abrirModal() {
    this.form.reset();
    this.isModalOpen.set(true);
  }

  cerrarModal() {
    this.isModalOpen.set(false);
  }

  async guardar() {
    if (this.form.invalid || !this.user?.uid) return;

    const nuevaPlantilla: PlantillaMedica = {
      uidMedico: this.user.uid,
      ...this.form.value
    };

    try {
      await this.plantillasService.crearPlantilla(nuevaPlantilla);
      this.notificacionService.showSuccessToast('Plantilla creada con éxito.');
      this.cerrarModal();
    } catch (e) {
      this.notificacionService.showAlertError('Error', 'No se pudo guardar la plantilla.');
    }
  }

  async borrar(id?: string) {
    if (!id) return;

    const confirm = await this.notificacionService.showConfirm(
      'Eliminar Plantilla',
      '¿Estás seguro? Esta acción no se puede deshacer.',
      'Sí, eliminar'
    );

    if (confirm.isConfirmed) {
      try {
        await this.plantillasService.borrarPlantilla(id);
        this.notificacionService.showSuccessToast('Plantilla eliminada.');
      } catch (e) {
        this.notificacionService.showAlertError('Error', 'No se pudo eliminar.');
      }
    }
  }
}
