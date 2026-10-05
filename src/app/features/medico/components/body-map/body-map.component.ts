import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTimes, faUndo, faTrash } from '@fortawesome/free-solid-svg-icons';

export interface PuntoDolor {
  x: number;
  y: number;
  vista: 'FRENTE' | 'DORSO';
  nota?: string;
}

@Component({
  selector: 'app-body-map',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './body-map.component.html',
  styleUrls: ['./body-map.component.scss']
})
export class BodyMapComponent {
  @Input() puntos: PuntoDolor[] = [];

  // ✅ MODO LECTURA: Si es true, no deja editar
  @Input() readOnly: boolean = false;

  @Output() puntosChange = new EventEmitter<PuntoDolor[]>();

  icons = { close: faTimes, undo: faUndo, trash: faTrash };

  vistaActual = signal<'FRENTE' | 'DORSO'>('FRENTE');

  imgFrente = 'assets/body_front.png';
  imgDorso = 'assets/body_back.png';

  agregarPunto(event: MouseEvent) {
    // 🛑 BLOQUEO SI ES SOLO LECTURA
    if (this.readOnly) return;

    const imgElement = event.target as HTMLImageElement;
    const rect = imgElement.getBoundingClientRect();

    // 1. Calcular coordenadas relativas visuales
    const xClient = event.clientX - rect.left;
    const yClient = event.clientY - rect.top;

    // =========================================================
    // 🕵️ DETECCIÓN DE TRANSPARENCIA
    // =========================================================
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(imgElement, 0, 0);

    const scaleX = imgElement.naturalWidth / rect.width;
    const scaleY = imgElement.naturalHeight / rect.height;

    const xNatural = Math.floor(xClient * scaleX);
    const yNatural = Math.floor(yClient * scaleY);

    const pixelData = ctx.getImageData(xNatural, yNatural, 1, 1).data;
    const alpha = pixelData[3];

    // Si es transparente, ignorar
    if (alpha < 10) return;

    // =========================================================
    // AGREGAR PUNTO
    // =========================================================
    const xPercent = (xClient / rect.width) * 100;
    const yPercent = (yClient / rect.height) * 100;

    const nuevoPunto: PuntoDolor = {
      x: xPercent,
      y: yPercent,
      vista: this.vistaActual(),
      nota: ''
    };

    this.puntosChange.emit([...this.puntos, nuevoPunto]);
  }

  borrarUltimo() {
    if (!this.readOnly && this.puntos.length > 0) {
      this.puntosChange.emit(this.puntos.slice(0, -1));
    }
  }

  borrarTodo() {
    if (!this.readOnly) {
      this.puntosChange.emit([]);
    }
  }

  cambiarVista(vista: 'FRENTE' | 'DORSO') {
    this.vistaActual.set(vista);
  }
}
