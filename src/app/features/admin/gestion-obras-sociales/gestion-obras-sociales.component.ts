import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { ObraSocialService } from './obra-social.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ImageService } from '../../../core/services/image.service';

// Interfaces
import { ObraSocial } from '../../../core/interfaces/obra-social.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faTrash, faPlus, faBuilding, faTimes,
  faCamera, faGlobe, faUndo, faBan, faFileInvoiceDollar
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-gestion-obras-sociales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-obras-sociales.component.html',
  styleUrls: ['../_admin-theme.scss']
})
export class GestionObrasSocialesComponent {
  private osService = inject(ObraSocialService);
  private notificationService = inject(NotificacionService);
  private imageService = inject(ImageService);
  private fb = inject(FormBuilder);

  icons = {
    faSearch, faEdit, faTrash, faPlus, faBuilding, faTimes,
    faCamera, faGlobe, faUndo, faBan, matrix: faFileInvoiceDollar
  };

  readonly defaultLogo = 'assets/os-default.jpg';

  // Datos reactivos
  obrasSignal = toSignal(this.osService.obtenerTodas(), { initialValue: [] });
  searchTerm = signal('');

  // Filtrado reactivo
  filteredObras = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.obrasSignal().filter(os =>
      os.nombre.toLowerCase().includes(term) ||
      os.siglas?.toLowerCase().includes(term)
    );
  });

  // Estado del Modal
  isModalOpen = signal(false);
  selectedOS: ObraSocial | null = null;
  osForm: FormGroup;
  logoPreview = signal<string | null>(null);

  constructor() {
    this.osForm = this.fb.group({
      nombre: ['', Validators.required],
      siglas: [''],
      tipo: ['Obra Social', Validators.required],
      sitioWeb: [''],
      // ✅ NUEVA MATRIZ DE COBERTURA
      coberturaConsulta: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
      coberturaEstudio: [100, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }
  handleImageError(event: any) { event.target.src = this.defaultLogo; }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await this.imageService.compressAndConvertToBase64(file);
        this.logoPreview.set(base64);
      } catch (e) {
        this.notificationService.showAlertError('Error', 'No se pudo procesar el logo.');
      }
    }
  }

  openModal(os?: ObraSocial) {
    if (os) {
      this.selectedOS = os;
      this.osForm.patchValue(os);
      this.logoPreview.set(os.logo || null);
    } else {
      this.selectedOS = null;
      this.osForm.reset({
        tipo: 'Obra Social',
        coberturaConsulta: 80,
        coberturaEstudio: 100
      });
      this.logoPreview.set(null);
    }
    this.isModalOpen.set(true);
  }

  async save() {
    if (this.osForm.invalid) {
      this.osForm.markAllAsTouched();
      return;
    }

    const form = this.osForm.value;
    const datos: Partial<ObraSocial> = {
      ...form,
      logo: this.logoPreview() || '',
      estado: this.selectedOS ? this.selectedOS.estado : 'Activa'
    };

    try {
      if (this.selectedOS?.id) {
        await this.osService.actualizar(this.selectedOS.id, datos);
        this.notificationService.showSuccessToast('Coberturas actualizadas');
      } else {
        await this.osService.crear(datos as ObraSocial);
        this.notificationService.showSuccessToast('Nueva entidad registrada');
      }
      this.isModalOpen.set(false);
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar la configuración.');
    }
  }

  async toggleEstado(os: ObraSocial) {
    const nuevoEstado = os.estado === 'Activa' ? 'Inactiva' : 'Activa';
    const confirm = await this.notificationService.showConfirm(
      'Cambiar Estado',
      `¿Deseas ${os.estado === 'Activa' ? 'desactivar' : 'activar'} ${os.nombre}?`
    );

    if (confirm.isConfirmed && os.id) {
      await this.osService.actualizar(os.id, { estado: nuevoEstado });
      this.notificationService.showSuccessToast('Estado actualizado');
    }
  }
  // ✅ AGREGÁ ESTE MÉTODO PARA SOLUCIONAR EL ERROR
  closeModal() {
    this.isModalOpen.set(false);
  }
}
