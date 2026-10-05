import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faWineGlassAlt,
  faRunning,
  faSmoking,
  faHistory,
  faCheckCircle,
  faClose
} from '@fortawesome/free-solid-svg-icons';

import { ModalTestHabitoComponent } from '../modal-test-habito/modal-test-habito.component';
import { HabitosService } from '../services/habitos.service';
import { AuthService } from '../../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-test-habitos',
  standalone: true,
  imports: [CommonModule, FaIconComponent, ModalTestHabitoComponent],
  templateUrl: './test-habitos.component.html',
  styleUrls: ['./test-habitos.component.scss']
})
export class TestHabitosComponent {

   private habitosService = inject(HabitosService);
  private authService = inject(AuthService);

  // Íconos para la interfaz
  icons = {
    alcohol: faWineGlassAlt,
    actividad: faRunning,
    tabaco: faSmoking,
    historial: faHistory,
    ok: faCheckCircle,
    close:faClose
  };

    modalAbierto = signal(false);
  modalHistorialAbierto = signal(false); // <--- NUEVA SEÑAL
  testSeleccionado = signal<'ALCOHOL' | 'ACTIVIDAD_FISICA' | 'TABAQUISMO' | 'DIABETES'>('ALCOHOL');

  abrirTest(tipo: 'ALCOHOL' | 'ACTIVIDAD_FISICA' | 'TABAQUISMO' | 'DIABETES') {
    this.testSeleccionado.set(tipo);
    this.modalAbierto.set(true);
  }

  // Helper para iconos (ya lo tenías)
  getIcon(tipo: string) {
    if (tipo === 'ALCOHOL') return this.icons.alcohol;
    if (tipo === 'TABAQUISMO') return this.icons.tabaco;
    if (tipo === 'ACTIVIDAD_FISICA') return this.icons.actividad;
    return this.icons.ok;
  }
   // 1. Cargamos el historial automáticamente usando el UID del usuario actual
  user = this.authService.currentUser();
  historial = toSignal(
    this.habitosService.obtenerHistorial(this.user?.uid || ''),
    { initialValue: [] }
  );

  // Helper para mostrar iconos en la lis
  /**
   * Abre el modal configurando el tipo de test seleccionado
   */

}
