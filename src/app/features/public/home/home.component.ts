import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Servicios
import { ClinicaService } from '../../admin/config-clinica/clinica.service';
import { AuthService } from '../../../core/services/auth.service';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck, faUserMd, faHeartbeat, faClipboardList,
  faClock, faMapMarkerAlt, faArrowRight,
  faMoneyBillWave, faCreditCard, faMobileAlt, faWallet
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FaIconComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  private clinicaService = inject(ClinicaService);
  public authService = inject(AuthService);

  icons = {
    calendar: faCalendarCheck,
    arrow: faArrowRight,
    clock: faClock,
    map: faMapMarkerAlt,
    // Iconos de Servicios Generalistas
    diagnosis: faUserMd,
    prevention: faHeartbeat,
    checkup: faClipboardList,
    // Iconos Pago
    cash: faMoneyBillWave,
    transfer: faMobileAlt,
    wallet: faWallet,
    card: faCreditCard
  };

  clinicaInfo = this.clinicaService.clinicaData;

  // SERVICIOS (Enfoque Medicina General)
  servicios = [
    {
      titulo: 'Diagnóstico Clínico',
      desc: 'Evaluación completa para identificar patologías y definir tratamientos.',
      icon: faUserMd
    },
    {
      titulo: 'Medicina Preventiva',
      desc: 'Controles periódicos y chequeos para mantener tu salud al día.',
      icon: faHeartbeat
    },
    {
      titulo: 'Seguimiento Crónico',
      desc: 'Control de hipertensión, diabetes y otras condiciones a largo plazo.',
      icon: faClipboardList
    }
  ];

  // MÉTODOS DE PAGO (Nuevo)
  metodosPago = [
    { nombre: 'Efectivo', desc: 'Aboná en recepción al llegar.', icon: faMoneyBillWave },
    { nombre: 'Transferencia', desc: 'Pagá desde tu home banking.', icon: faMobileAlt },
    { nombre: 'Billetera HIA', desc: 'Gestioná tu saldo a favor.', icon: faWallet },
  ];

  scrollTo(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
