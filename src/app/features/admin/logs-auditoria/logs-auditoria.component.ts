import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faShieldAlt, faSearch, faUserShield, faExclamationCircle, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { AuditoriaSeguridadService } from '../protocolo-emergencia/auditoria-seguridad.service';

@Component({
  selector: 'app-logs-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './logs-auditoria.component.html',
  styleUrls: ['./logs-auditoria.component.scss']
})
export class LogsAuditoriaComponent {
  private auditoriaService = inject(AuditoriaSeguridadService);

  icons = { shield: faShieldAlt, search: faSearch, user: faUserShield, alert: faExclamationCircle, doc: faFileAlt };

  filtro = signal('');

  // Cargamos los logs de forma reactiva
  logsRaw = toSignal(this.auditoriaService.obtenerLogs(), { initialValue: [] });

  // Filtro por admin o por paciente
  logsFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    return this.logsRaw().filter(log =>
      log.emailAdmin.toLowerCase().includes(term) ||
      log.nombrePaciente.toLowerCase().includes(term) ||
      log.motivo.toLowerCase().includes(term)
    );
  });
}
