import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// ✅ IMPORTAMOS EL SIDEBAR ESPECÍFICO DE EMPLEADO
import { EmpleadoSidebarComponent } from '../components/empleado-sidebar/empleado-sidebar.component';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-empleado-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FaIconComponent,
    EmpleadoSidebarComponent // <--- Usamos este
  ],
  templateUrl: './empleado-layout.component.html',
  styleUrls: ['./empleado-layout.component.scss']
})
export class EmpleadoLayoutComponent {
  isSidebarOpen = signal(false);

  faBars = faBars;
  faTimes = faTimes;

  toggleSidebar() {
    this.isSidebarOpen.update(val => !val);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }
}
