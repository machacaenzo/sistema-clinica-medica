import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../core/services/auth.service';
import { EmpleadoService } from '../../admin/gestion-empleados/empleado.service';
import { PerfilEmpleado, JornadaLaboral } from '../../../core/interfaces/perfil-empleado.model';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserTie, faIdCard, faEnvelope, faClock, faCalendarAlt, faStar
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-mi-perfil-empleado',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './mi-perfil.component.html',
  
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilEmpleadoComponent implements OnInit {
  private authService = inject(AuthService);
  private empleadoService = inject(EmpleadoService);

  icons = { faUserTie, faIdCard, faEnvelope, faClock, faCalendarAlt, faStar };
  defaultImage = 'assets/user-default.jpg';

  perfil = signal<PerfilEmpleado | null>(null);
  email = signal<string>('');

  semana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user?.uid) {
      this.email.set(user.email || '');
      this.empleadoService.obtenerPerfil(user.uid).then(p => {
        if (p) this.perfil.set(p);
      });
    }
  }

  getJornadaDia(dia: string): JornadaLaboral | undefined {
    return this.perfil()?.jornada.find(j => j.dia === dia);
  }
}
