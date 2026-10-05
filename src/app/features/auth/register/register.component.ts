import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUser, faEnvelope, faLock, faEye, faEyeSlash,faTimes  } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FaIconComponent],
  templateUrl: './register.component.html',
  styleUrls: ['../auth-styles.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificacionService);

  isSubmitting = signal(false);
  passwordVisible = signal(false);
  registerForm: FormGroup;

  // Iconos
  faUser = faUser;
  faEnvelope = faEnvelope;
  faLock = faLock;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faTimes  =faTimes ;

  constructor() {
    this.registerForm = this.fb.group({
      // Unificamos nombre y apellido en un solo campo
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Formulario incompleto', 'Por favor, revisa los campos e inténtalo de nuevo.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      await this.authService.register(this.registerForm.value);
    } catch (error) {
      // El AuthService ya maneja la notificación de error
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Getters para acceso fácil en el template
  get nombreCompleto() { return this.registerForm.get('nombreCompleto'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
}
