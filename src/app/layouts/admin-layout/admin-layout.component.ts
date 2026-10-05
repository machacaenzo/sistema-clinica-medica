import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// ✅ IMPORTAMOS EL SIDEBAR ESPECÍFICO DE ADMIN
import { AdminSidebarComponent } from '../components/admin-sidebar/admin-sidebar.component';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FaIconComponent,
    AdminSidebarComponent // <--- Usamos este
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
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
