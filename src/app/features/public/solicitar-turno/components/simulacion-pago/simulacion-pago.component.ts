import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCreditCard, faLock, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-simulacion-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './simulacion-pago.component.html',
  styleUrls: ['./simulacion-pago.component.scss']
})
export class SimulacionPagoComponent {
  private fb = inject(FormBuilder);

  @Input({ required: true }) monto: number = 0;
  @Output() pagoExitoso = new EventEmitter<void>(); // Avisa al padre que pagó
  @Output() cancelar = new EventEmitter<void>();    // Avisa que cerró

  icons = { faCreditCard, faLock, faCheckCircle, faTimes };

  pagoForm: FormGroup;

  // Estados de la simulación
  procesando = signal(false);
  exito = signal(false);

  constructor() {
    this.pagoForm = this.fb.group({
      numero: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]], // 16 dígitos
      nombre: ['', [Validators.required, Validators.minLength(4)]],
      vencimiento: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/[0-9]{2}$')]], // MM/YY
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }

  pagar() {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      return;
    }

    // 1. Iniciamos simulación
    this.procesando.set(true);

    // 2. Simulamos demora de red (3 segundos)
    setTimeout(() => {
      this.procesando.set(false);
      this.exito.set(true);

      // 3. Esperamos 1.5 seg para que vea el tilde verde y cerramos
      setTimeout(() => {
        this.pagoExitoso.emit();
      }, 1500);

    }, 3000);
  }

  cerrar() {
    if (!this.procesando()) {
      this.cancelar.emit();
    }
  }
}
