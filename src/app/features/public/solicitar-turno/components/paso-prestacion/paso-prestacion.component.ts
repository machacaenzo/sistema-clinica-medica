import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios e Interfaces

import { CloudinaryService } from '../../../../../core/services/cloudinary.service'; // ✅ Asegura esta ruta

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faNotesMedical, faFlask, faCheckCircle, faExclamationCircle,
  faFileAlt, faArrowRight, faStethoscope, faCloudUploadAlt, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { PrestacionesService } from '../../../../admin/gestion-prestaciones/prestaciones.service';
import { Prestacion } from '../../../../../core/interfaces/prestacion.model';

@Component({
  selector: 'app-paso-prestacion',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './paso-prestacion.component.html',
  styleUrls: ['./paso-prestacion.component.scss']
})
export class PasoPrestacionComponent {
  private prestacionesService = inject(PrestacionesService);
  private cloudinary = inject(CloudinaryService); // ✅ Inyectamos Cloudinary

  @Input({ required: true }) medico: any;

  // ✅ El output ahora es un objeto complejo para que el padre sepa qué cobrar y qué guardar
  @Output() onSelect = new EventEmitter<{
    prestacion: Prestacion,
    pagaEstudio: boolean,
    urlEstudio?: string
  }>();

  icons = {
    servicio: faNotesMedical,
    lab: faFlask,
    check: faCheckCircle,
    alert: faExclamationCircle,
    file: faFileAlt,
    next: faArrowRight,
    doctor: faStethoscope,
    upload: faCloudUploadAlt,
    spinner: faSpinner
  };

  prestaciones = toSignal(this.prestacionesService.obtenerTodas(), { initialValue: [] });

  // Estados de la Bifurcación
  prestacionEnEspera = signal<Prestacion | null>(null);
  mostrarPreguntaEstudio = signal(false);

  // Estados de Carga
  subiendoArchivo = signal(false);
  urlArchivoSubido = signal<string | null>(null);

  seleccionar(p: Prestacion) {
    if (p.idServicioRequerido) {
      this.prestacionEnEspera.set(p);
      this.mostrarPreguntaEstudio.set(true);
    } else {
      // Si no requiere estudio, el paciente no paga extra y no hay URL
      this.onSelect.emit({ prestacion: p, pagaEstudio: false });
    }
  }

  /**
   * Acción: Sube el archivo a Cloudinary
   */
  async manejarSubidaArchivo(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.subiendoArchivo.set(true);
    this.cloudinary.subirArchivo(file).subscribe({
      next: (url) => {
        this.urlArchivoSubido.set(url);
        this.subiendoArchivo.set(false);
      },
      error: (err) => {
        console.error("Error Cloudinary:", err);
        this.subiendoArchivo.set(false);
      }
    });
  }

  /**
   * OPCIÓN A: El paciente ya tiene el estudio.
   * Se envía pagaEstudio: false y la URL del archivo para el técnico de Lab.
   */
  confirmarYaTengoEstudio() {
    if (this.prestacionEnEspera() && this.urlArchivoSubido()) {
      this.onSelect.emit({
        prestacion: this.prestacionEnEspera()!,
        pagaEstudio: false,
        urlEstudio: this.urlArchivoSubido()!
      });
    }
  }

  /**
   * OPCIÓN B: El paciente lo hace en la clínica.
   * Se envía pagaEstudio: true (se sumarán los $2500 al total).
   */
  confirmarNecesitoEstudio() {
    if (this.prestacionEnEspera()) {
      this.onSelect.emit({
        prestacion: this.prestacionEnEspera()!,
        pagaEstudio: true
      });
    }
  }

  cancelarBifurcacion() {
    this.mostrarPreguntaEstudio.set(false);
    this.prestacionEnEspera.set(null);
    this.urlArchivoSubido.set(null);
  }

  getClaseTipo(tipo: string): string {
    const map: any = {
      'GENERAL': 'bg-slate-100 text-slate-600',
      'APTO_FISICO': 'bg-teal-50 text-teal-700 border-teal-100',
      'CONTROL_CRONICO': 'bg-orange-50 text-orange-700 border-orange-100'
    };
    return map[tipo] || 'bg-slate-100 text-slate-600';
  }
}
