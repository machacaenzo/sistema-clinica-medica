import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core'; // ✅ Correcto: @angular/core
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'; // ✅ Correcto: @angular/forms

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faExclamationTriangle, faShieldAlt, faLock,
  faUserShield, faFileSignature
} from '@fortawesome/free-solid-svg-icons';
import { AuditoriaSeguridadService } from './auditoria-seguridad.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsuarioService } from '../gestion-usuarios/usuario.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';

@Component({
  selector: 'app-protocolo-emergencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './protocolo-emergencia.component.html',
  styleUrls: ['./protocolo-emergencia.component.scss']
})
export class ProtocoloEmergenciaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auditoria = inject(AuditoriaSeguridadService);
  private auth = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private notify = inject(NotificacionService);

  @Input({ required: true }) paciente: any;
  @Output() accesoConcedido = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  icons = {
    alert: faExclamationTriangle,
    shield: faShieldAlt,
    lock: faLock,
    user: faUserShield,
    sign: faFileSignature
  };

  form!: FormGroup;
  loading = signal(false);
  necesitaConfigurarClave = signal(false);

   async ngOnInit() {
    // 1. PRIMERO CREAMOS EL FORMULARIO (Sincrónico)
    // Así el HTML tiene algo que leer desde el segundo cero.
    this.form = this.fb.group({
      motivo: ['', Validators.required],
      referencia: ['', Validators.required],
      clave: ['', [Validators.required, Validators.minLength(6)]],
      juramento: [false, Validators.requiredTrue]
    });

    const user = this.auth.currentUser();
    if (!user) return;

    // 2. RECIÉN AHORA HACEMOS LOS AWAITS (Asincrónico)
    try {
      const datosAdmin = await this.usuarioService.obtenerUsuarioPorId(user.uid);
      if (!datosAdmin?.masterKey) {
        this.necesitaConfigurarClave.set(true);
      }
    } catch (e) {
      console.error("Error al verificar Master Key", e);
    }
  }

  async ejecutarAccion() {
    if (this.form.invalid) return;

    this.loading.set(true);
    const user = this.auth.currentUser()!;
    const val = this.form.value;

    try {
      const datosAdmin = await this.usuarioService.obtenerUsuarioPorId(user.uid);

      if (this.necesitaConfigurarClave()) {
        // CASO A: El admin define su clave por primera vez
        await this.usuarioService.actualizarUsuario(user.uid, { masterKey: val.clave });
        this.notify.showSuccessToast('Master Key configurada con éxito.');
        this.necesitaConfigurarClave.set(false);
        this.form.get('clave')?.reset();
      }
      else {
        // CASO B: Validar la clave para entrar
        if (datosAdmin?.masterKey === val.clave) {

          // REGISTRAR LOG DE AUDITORÍA (IMBORRABLE)
          await this.auditoria.registrarAccesoEmergencia({
            idAdmin: user.uid,
            emailAdmin: user.email!,
            idPaciente: this.paciente.uid,
            nombrePaciente: this.paciente.nombreCompleto,
            motivo: val.motivo,
            referencia: val.referencia
          });

          this.notify.showSuccessToast('Acceso Autorizado');
          this.accesoConcedido.emit(); // Desbloquea la vista del padre
        } else {
          this.notify.showAlertError('Clave Incorrecta', 'La clave de seguridad no coincide.');
        }
      }
    } catch (e) {
      console.error(e);
      this.notify.showAlertError('Error', 'Fallo en el protocolo de seguridad.');
    } finally {
      this.loading.set(false);
    }
  }
}
