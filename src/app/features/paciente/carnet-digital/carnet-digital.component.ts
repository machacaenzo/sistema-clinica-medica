import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode'; // ✅ IMPORTANTE: La librería

import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';
import { Paciente } from '../../../core/interfaces/paciente.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faQrcode, faShieldAlt, faSyncAlt, faClock } from '@fortawesome/free-solid-svg-icons';
import { AutorizacionHcService } from '../../admin/validador-hc/autorizacion-hc.service';

@Component({
  selector: 'app-carnet-digital',
  standalone: true,
  imports: [CommonModule, QRCodeComponent, FaIconComponent], // ✅ Agregamos el QR aquí
  templateUrl: './carnet-digital.component.html',
  styleUrls: ['./carnet-digital.component.scss']
})
export class CarnetDigitalComponent implements OnInit {
  private auth = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private authHcService = inject(AutorizacionHcService);

  icons = { qr: faQrcode, shield: faShieldAlt, refresh: faSyncAlt, clock: faClock };

  paciente = signal<Paciente | null>(null);
  qrData = signal<string>(''); // Aquí guardaremos el Token ID
  loading = signal(true);
  expiraEn = signal<number>(600); // 10 minutos en segundos para el contador

  async ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      const p = await this.pacienteService.obtenerPacientePorId(user.uid);
      if (p) {
        this.paciente.set(p);
        this.generarNuevaLlave();
      }
    }
  }

  async generarNuevaLlave() {
    if (!this.paciente()) return;
    this.loading.set(true);
    try {
      // 1. Generamos el token temporal en la base de datos
      const tokenId = await this.authHcService.generarTokenAcceso(this.paciente()!.uid);

      // 2. El QR solo contiene ese ID. La secretaria no sabe quién es hasta que lo escanea.
      this.qrData.set(tokenId);

      this.loading.set(false);
      this.iniciarContador();
    } catch (e) {
      console.error(e);
      this.loading.set(false);
    }
  }

  iniciarContador() {
    this.expiraEn.set(600);
    const interval = setInterval(() => {
      this.expiraEn.update(v => v - 1);
      if (this.expiraEn() <= 0) {
        clearInterval(interval);
        this.qrData.set(''); // Borramos el QR por seguridad al expirar
      }
    }, 1000);
  }

  get tiempoFormateado() {
    const m = Math.floor(this.expiraEn() / 60);
    const s = this.expiraEn() % 60;
    return `${m}:${s < 10 ? '0' + s : s}`;
  }
}
