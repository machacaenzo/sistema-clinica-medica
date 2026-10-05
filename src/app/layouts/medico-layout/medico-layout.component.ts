import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// ✅ IMPORTAMOS EL SIDEBAR ESPECÍFICO DE MÉDICO
import { MedicoSidebarComponent } from '../components/medico-sidebar/medico-sidebar.component';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-medico-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FaIconComponent,
    MedicoSidebarComponent // <--- Usamos este
  ],
  templateUrl: './medico-layout.component.html',
  styleUrls: ['./medico-layout.component.scss']
})
export class MedicoLayoutComponent {
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
