import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Servicios
import { ClinicaService } from '../../admin/config-clinica/clinica.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faHandHoldingHeart, faMicroscope, faUsers, faAward,
  faQuoteLeft, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-nosotros',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent],
  templateUrl: './nosotros.component.html',
  styleUrls: ['./nosotros.component.scss']
})
export class NosotrosComponent {
  private clinicaService = inject(ClinicaService);

  clinicaInfo = this.clinicaService.clinicaData;

  icons = {
    heart: faHandHoldingHeart,
    tech: faMicroscope,
    users: faUsers,
    award: faAward,
    quote: faQuoteLeft,
    check: faCheckCircle
  };

  // Valores Institucionales
  valores = [
    {
      titulo: 'Calidez Humana',
      desc: 'Entendemos que detrás de cada diagnóstico hay una persona. El trato empático es nuestra norma.',
      icon: faHandHoldingHeart
    },
    {
      titulo: 'Tecnología de Punta',
      desc: 'Invertimos constantemente en equipamiento de última generación para diagnósticos precisos.',
      icon: faMicroscope
    },
    {
      titulo: 'Trabajo en Equipo',
      desc: 'Nuestros especialistas trabajan interdisciplinariamente para abordar tu salud de forma integral.',
      icon: faUsers
    }
  ];

  // Estadísticas (Mock para dar credibilidad)
  stats = [
    { numero: '+20', label: 'Años de Trayectoria' },
    { numero: '+15k', label: 'Pacientes Atendidos' },
    { numero: '+50', label: 'Especialistas' },
    { numero: '24hs', label: 'Guardia Activa' }
  ];

  // Galería de Imágenes (URLs de Unsplash para que se vea lindo ya mismo)
  galeria = [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1504813184591-01572f98c85f?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=600'
  ];
}
