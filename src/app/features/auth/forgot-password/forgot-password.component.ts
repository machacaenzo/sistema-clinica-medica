import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

// --- IMPORTACIONES DE FONT AWESOME ---
import { FaIconComponent} from '@fortawesome/angular-fontawesome';
import { faEnvelope,faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  // --- AÑADIR FaIconComponent A LOS IMPORTS ---
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FaIconComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../auth-styles.scss']
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificacionService);

  isSubmitting = signal(false);
  forgotPasswordForm: FormGroup;

  // --- DECLARAR EL ICONO PARA EL TEMPLATE ---
  faEnvelope = faEnvelope;
  faTimes=faTimes;
  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async onSubmit(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Correo inválido', 'Por favor, ingresa una dirección de correo válida.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const email = this.forgotPasswordForm.value.email;
      await this.authService.resetPassword(email);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  get email() { return this.forgotPasswordForm.get('email'); }
}
