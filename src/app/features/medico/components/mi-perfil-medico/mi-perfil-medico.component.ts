import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { MedicoService } from '../../../admin/gestion-medicos/medico.service';
import { PerfilMedico } from '../../../../core/interfaces/perfil-medico.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserMd, faIdCard, faCalendarCheck, faClock, faCalendarTimes
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mi-perfil-medico',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './mi-perfil-medico.component.html',
  styleUrls: ['./mi-perfil-medico.component.scss']
})
export class MiPerfilMedicoComponent implements OnInit {
  private authService = inject(AuthService);
  private medicoService = inject(MedicoService);

  icons = {
    doctor: faUserMd,
    card: faIdCard,
    calendar: faCalendarCheck,
    clock: faClock,
    none: faCalendarTimes
  };

  medico = signal<PerfilMedico | null>(null);
  loading = signal(true);
  defaultImage = 'assets/user-default.jpg';

  // Lista para iterar la agenda
  diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.uid) {
      this.cargarDatos(user.uid);
    }
  }

  async cargarDatos(uid: string) {
    this.medicoService.obtenerMedicosCompletos().subscribe(medicos => {
      const found = medicos.find(m => m.uid === uid);
      if (found) {
        this.medico.set(found);
      }
      this.loading.set(false);
    });
  }

  getDisponibilidadDia(dia: string) {
    return this.medico()?.disponibilidad?.find(d => d.dia === dia);
  }
}
