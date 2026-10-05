import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserMd, faStar, faSearch, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { MedicoService } from '../../../../admin/gestion-medicos/medico.service';

@Component({
  selector: 'app-paso-medico',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './paso-medico.component.html',
  styleUrls: ['./paso-medico.component.scss']
})
export class PasoMedicoComponent {
  private medicoService = inject(MedicoService);

  // Evento que avanza al paso 2 en el padre
  @Output() onSelect = new EventEmitter<any>();

  icons = {
    doctor: faUserMd,
    star: faStar,
    search: faSearch,
    next: faArrowRight
  };

  defaultImage = 'assets/user-default.jpg';

  // 1. Carga de médicos en tiempo real desde el servicio
  // Usamos toSignal para convertir el Observable en una señal limpia
  medicos = toSignal(this.medicoService.obtenerMedicosCompletos(), { initialValue: [] });

  /**
   * Emite el médico seleccionado al componente padre
   */
  seleccionar(medico: any) {
    this.onSelect.emit(medico);
  }

  /**
   * Manejo de error de imagen para avatares
   */
  handleImageError(event: any) {
    event.target.src = this.defaultImage;
  }
}
