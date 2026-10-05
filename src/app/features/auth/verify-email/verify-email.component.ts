import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

// --- IMPORTACIONES DE FONT AWESOME ---
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faEnvelopeCircleCheck ,faTimes} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  // --- AÑADIR FaIconComponent A LOS IMPORTS ---
  imports: [RouterModule, CommonModule, FaIconComponent],
  templateUrl: './verify-email.component.html',
  styleUrls: ['../auth-styles.scss']
})
export class VerifyEmailComponent {
  authService = inject(AuthService);
  isSending = signal(false);

  // --- DECLARAR EL ICONO PARA EL TEMPLATE ---
  faEnvelopeCircleCheck = faEnvelopeCircleCheck;
  faTimes=faTimes;

  async resendVerification(): Promise<void> {
    this.isSending.set(true);
    await this.authService.resendVerificationEmail();
    this.isSending.set(false);
  }
}
