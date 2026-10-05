import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library'; // ✅ IMPORTANTE: Para los tipos de QR

// Servicios


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faShieldAlt, faFilePdf, faUserCheck, faCamera,
  faKeyboard, faSync, faTimes, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { AutorizacionHcService } from './autorizacion-hc.service';
import { ConsultaMedicaService } from '../../medico/services/consulta-medica.service';
import { PacienteService } from '../gestion-pacientes/paciente.service';
import { PdfService } from '../../medico/services/pdf.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-validador-hc',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent, ZXingScannerModule],
  templateUrl: './validador-hc.component.html',
  styleUrls: ['./validador-hc.component.scss']
})
export class ValidadorHcComponent {
  private authHcService = inject(AutorizacionHcService);
  private consultaService = inject(ConsultaMedicaService);
  private pacienteService = inject(PacienteService);
  private pdfService = inject(PdfService);
  private notify = inject(NotificacionService);

  icons = {
    shield: faShieldAlt, pdf: faFilePdf, user: faUserCheck,
    camera: faCamera, key: faKeyboard, sync: faSync,
    close: faTimes, alert: faExclamationTriangle
  };

  // ✅ CONFIGURACIÓN TÉCNICA PARA EL ESCÁNER
  public readonly allowedFormats = [ BarcodeFormat.QR_CODE ];

  // Estados
  loading = signal(false);
  usarCamara = signal(true);
  pacienteAutorizado = signal<any>(null);
  codigoManual = signal('');
  idPacienteActual = '';

  /**
   * Se dispara automáticamente cuando la cámara detecta un QR
   */
  onCodeResult(resultString: string) {
    if (this.loading() || this.pacienteAutorizado()) return;
    console.log('QR Detectado:', resultString);
    this.validarAcceso(resultString);
  }

  async validarAcceso(token: string) {
    if (!token) return;
    this.loading.set(true);

    try {
      const res = await this.authHcService.validarToken(token);

      if (res.valido && res.idPaciente) {
        this.idPacienteActual = res.idPaciente;
        const p = await this.pacienteService.obtenerPacientePorId(res.idPaciente);
        this.pacienteAutorizado.set(p);
        this.notify.showSuccessToast('Credencial Validada');
      } else {
        this.notify.showAlertError('Acceso Denegado', 'La credencial ha expirado o ya fue utilizada.');
      }
    } catch (e) {
      console.error(e);
      this.notify.showAlertError('Error', 'Fallo al conectar con el servidor de seguridad.');
    } finally {
      this.loading.set(false);
    }
  }

  async descargarPDF() {
    if (!this.idPacienteActual) return;
    this.loading.set(true);

    try {
      // Pedimos el historial del paciente autorizado
      this.consultaService.obtenerHistorialPaciente(this.idPacienteActual).subscribe(async (historial) => {
        // Generamos el documento oficial
        await this.pdfService.generarHistorialCompleto(this.pacienteAutorizado(), historial);

        this.notify.showAlertSuccess('Exportación Exitosa', 'El historial clínico ha sido generado. El permiso de acceso ha sido revocado automáticamente.');
        this.reset();
      });
    } catch (e) {
      this.notify.showAlertError('Error', 'No se pudo generar el historial médico.');
      this.loading.set(false);
    }
  }

  reset() {
    this.pacienteAutorizado.set(null);
    this.idPacienteActual = '';
    this.codigoManual.set('');
    this.loading.set(false);
  }
}
