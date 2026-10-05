import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelope, faEnvelopeOpen, faTrash, faTimes, faReply } from '@fortawesome/free-solid-svg-icons';
import { ContactoService } from '../../public/contacto/contacto.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { MensajeContacto } from '../../../core/interfaces/mensaje-contacto.model';

@Component({
  selector: 'app-mensajes-web',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './mensajes-web.component.html',
  styleUrls: ['./mensajes-web.component.scss']
})
export class MensajesWebComponent {
  private contactoService = inject(ContactoService);
  private notificacionService = inject(NotificacionService);

  icons = {
    unread: faEnvelope,
    read: faEnvelopeOpen,
    trash: faTrash,
    close: faTimes,
    reply: faReply
  };

  // Carga de mensajes en tiempo real
  mensajes = toSignal(this.contactoService.obtenerTodosLosMensajes(), { initialValue: [] });

  // Modal de Lectura
  selectedMensaje = signal<MensajeContacto | null>(null);

  // --- ACCIONES ---

  abrirMensaje(msg: MensajeContacto) {
    this.selectedMensaje.set(msg);

    // Si no estaba leído, marcarlo ahora
    if (!msg.leido && msg.id) {
      this.contactoService.marcarComoLeido(msg.id);
    }
  }

  cerrarModal() {
    this.selectedMensaje.set(null);
  }

  async borrarMensaje(e: Event, id?: string) {
    e.stopPropagation(); // Evita que se abra el modal al hacer click en borrar
    if (!id) return;

    const confirm = await this.notificacionService.showConfirm(
      'Eliminar Mensaje',
      '¿Estás seguro de borrar esta consulta?',
      'Sí, borrar'
    );

    if (confirm.isConfirmed) {
      try {
        await this.contactoService.eliminarMensaje(id);
        this.notificacionService.showSuccessToast('Mensaje eliminado.');
        // Si borramos el que estábamos leyendo, cerramos modal
        if (this.selectedMensaje()?.id === id) {
          this.cerrarModal();
        }
      } catch (error) {
        this.notificacionService.showAlertError('Error', 'No se pudo eliminar.');
      }
    }
  }
}
