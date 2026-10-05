import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faMapMarkerAlt, faPhone, faEnvelope, faClock, faAngleRight
} from '@fortawesome/free-solid-svg-icons';
import {
  faFacebookF, faInstagram, faTwitter, faLinkedinIn
} from '@fortawesome/free-brands-svg-icons';

// Servicios
import { ClinicaService } from '../../../features/admin/config-clinica/clinica.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  public clinicaService = inject(ClinicaService);

  // Año dinámico
  currentYear = new Date().getFullYear();

  icons = {
    map: faMapMarkerAlt,
    phone: faPhone,
    email: faEnvelope,
    clock: faClock,
    arrow: faAngleRight,
    facebook: faFacebookF,
    instagram: faInstagram,
    twitter: faTwitter,
    linkedin: faLinkedinIn
  };

  // Signal con datos de la clínica
  info = this.clinicaService.clinicaData;
}
