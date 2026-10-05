import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router'; // ✅ Agregado para el link de contacto

import { ObraSocialService } from '../../admin/gestion-obras-sociales/obra-social.service';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSearch, faBriefcaseMedical, faCheckCircle, faNotesMedical } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-obras-sociales',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent, RouterLink], // ✅ RouterLink aquí
  templateUrl: './obras-sociales.component.html',
  styleUrls: ['./obras-sociales.component.scss']
})
export class ObrasSocialesComponent {
  private osService = inject(ObraSocialService);

  icons = {
    search: faSearch,
    medical: faBriefcaseMedical,
    check: faCheckCircle,
    note: faNotesMedical
  };

  filtro = signal('');
  obrasSocialesRaw = toSignal(this.osService.obtenerTodas(), { initialValue: [] });

  listaFiltrada = computed(() => {
    const termino = this.filtro().toLowerCase();
    const todas = this.obrasSocialesRaw();

    if (!todas) return [];

    return todas
      .filter(os =>
        os.estado === 'Activa' &&
        (
          os.nombre.toLowerCase().includes(termino) ||
          (os.siglas && os.siglas.toLowerCase().includes(termino))
        )
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  handleImageError(event: any) {
    event.target.style.display = 'none';
    event.target.parentElement.classList.remove('bg-white');
    event.target.parentElement.classList.add('bg-indigo-50');
  }
}
