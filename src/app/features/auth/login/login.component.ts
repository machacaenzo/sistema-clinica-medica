// src/app/features/auth/login/login.component.ts

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// --- NUESTROS SERVICIOS ---
import { AuthService } from '../../../core/services/auth.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

// --- FONT AWESOME ---
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelope, faLock, faEye, faEyeSlash,faTimes } from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FaIconComponent // <-- Importamos el componente de icono
  ],
  templateUrl: './login.component.html',
    styleUrls: ['../auth-styles.scss'] // <-- Usamos los estilos compartidos
})
export class LoginComponent {
  // --- INYECCIÓN DE DEPENDENCIAS ---
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificacionService);

  // --- SEÑALES (SIGNALS) PARA EL ESTADO DEL COMPONENTE ---
  isSubmitting = signal(false);
  passwordVisible = signal(false);

  // --- FORMULARIO REACTIVO ---
  loginForm: FormGroup;

  // --- ICONOS PARA EL TEMPLATE ---
  faEnvelope = faEnvelope;
  faLock = faLock;
  faGoogle = faGoogle;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faTimes =faTimes;

  constructor() {
    // Inicializamos el formulario en el constructor con sus validaciones
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Cambia la visibilidad del campo de contraseña.
   */
  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  /**
   * Se ejecuta al enviar el formulario de login.
   */
  async onSubmit(): Promise<void> {
    // Si el formulario es inválido, marca todos los campos como "tocados" para mostrar errores.
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notificationService.showAlertWarning('Datos incompletos', 'Por favor, completa todos los campos.');
      return;
    }

    this.isSubmitting.set(true); // Activa el estado de carga
    try {
      // Llama al método de login del AuthService con los valores del formulario.
      await this.authService.login(this.loginForm.value);
    } catch (error) {
      // El AuthService ya se encarga de mostrar la notificación de error.
      // Aquí no necesitamos hacer nada más.
    } finally {
      this.isSubmitting.set(false); // Desactiva el estado de carga, tanto si tuvo éxito como si falló.
    }
  }

  /**
   * Inicia el flujo de login con Google.
   */
  async loginWithGoogle(): Promise<void> {
    await this.authService.loginWithGoogle();
  }

  // --- GETTERS PARA ACCESO FÁCIL A LOS CONTROLES DEL FORMULARIO EN EL TEMPLATE ---
  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
