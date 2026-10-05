import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';

// Servicios


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faStar as faStarSolid, faCheck, faTimes, faHeart, faStar as faStarRegular } from '@fortawesome/free-solid-svg-icons';
import { TurnosService } from '../../../core/services/turnos.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ResenaTurno, Turno } from '../../../core/interfaces/turno.model';

@Component({
  selector: 'app-modal-resena',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './modal-resena.component.html',
  styleUrls: ['./modal-resena.component.scss']
})
export class ModalResenaComponent {
  private fb = inject(FormBuilder);
  private turnosService = inject(TurnosService);
  private notify = inject(NotificacionService);

  @Input({ required: true }) turno!: Turno;
  @Output() cerrar = new EventEmitter<void>();

  icons = { starSolid: faStarSolid, starRegular: faStarRegular, ok: faCheck, close: faTimes, like: faHeart };

  form: FormGroup;
  procesando = signal(false);
  puntuacionHover = signal(0);
  puntuacionSeleccionada = signal(0);

  constructor() {
    this.form = this.fb.group({
      comentario: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(300)]],
      recomienda: [true, Validators.required]
    });
  }

  setRating(rating: number) {
    this.puntuacionSeleccionada.set(rating);
  }

    async enviarResena() {
    if (this.form.invalid || this.puntuacionSeleccionada() === 0) {
      this.notify.showAlertWarning('Atención', 'Selecciona una puntuación.');
      return;
    }

    this.procesando.set(true);
    const val = this.form.value;

    // Construimos el objeto con la interfaz real
    const nuevaResena: ResenaTurno = {
      puntos: this.puntuacionSeleccionada(),
      comentario: val.comentario,
      recomienda: val.recomienda,
      fecha: Timestamp.now(),
      estadoModeracion: 'publicado'
    };

    try {
    // ✅ USAMOS EL NUEVO MÉTODO:
  // Esto agrega el campo 'resena' al documento pero MANTIENE el 'estado: Finalizado'
  await this.turnosService.actualizarTurno(this.turno.id!, {
    resena: nuevaResena
  });

  this.notify.showSuccessToast('¡Gracias por tu opinión!');
  this.cerrar.emit();
    } catch (e) {
      this.notify.showAlertError('Error', 'No se pudo guardar.');
    } finally {
      this.procesando.set(false);
    }
  }
}
