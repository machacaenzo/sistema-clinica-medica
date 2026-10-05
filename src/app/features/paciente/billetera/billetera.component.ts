import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../admin/gestion-pacientes/paciente.service';
import { TransaccionesService } from '../../../core/services/transacciones.service';

// Interfaces
import { Transaccion } from '../../../core/interfaces/transaccion.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faWallet, faArrowUp, faArrowDown, faHistory, faArrowLeft,
  faMoneyBillTransfer, faCreditCard, faReceipt
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-billetera',
  standalone: true,
  imports: [CommonModule, FaIconComponent, RouterLink],
  templateUrl: './billetera.component.html',
  styleUrls: ['./billetera.component.scss']
})
export class BilleteraComponent implements OnInit {
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private transaccionesService = inject(TransaccionesService);

  icons = {
    wallet: faWallet,
    up: faArrowUp,
    down: faArrowDown,
    history: faHistory,
    back: faArrowLeft,
    transfer: faMoneyBillTransfer,
    card: faCreditCard,
    receipt: faReceipt
  };

  // Estados
  loading = signal(true);
  saldo = signal<number>(0);
  movimientos = signal<Transaccion[]>([]);

  async ngOnInit() {
    const user = this.authService.currentUser();

    if (user) {
      try {
        // 1. Obtener Saldo en Tiempo Real (Perfil Paciente)
        // Usamos una promesa simple aquí, pero idealmente sería un observable si el saldo cambia mucho
        const perfil = await this.pacienteService.obtenerPacientePorId(user.uid);
        if (perfil) {
          this.saldo.set(perfil.saldoCuenta || 0);
        }

        // 2. Obtener Historial de Movimientos
        this.transaccionesService.obtenerHistorialPorPaciente(user.uid).subscribe({
          next: (data) => {
            this.movimientos.set(data);
            this.loading.set(false);
          },
          error: (err) => {
            console.error(err);
            this.loading.set(false);
          }
        });

      } catch (e) {
        console.error('Error cargando billetera', e);
        this.loading.set(false);
      }
    }
  }

  // --- HELPERS VISUALES ---

  esIngreso(tipo: string): boolean {
    return tipo === 'INGRESO' || tipo === 'CREDITO';
  }

  getIcono(tipo: string, motivo: string): any {
    if (tipo === 'INGRESO') return this.icons.card; // Pago con tarjeta/efectivo
    if (tipo === 'CREDITO') return this.icons.receipt; // Reembolso
    if (tipo === 'DEBITO') return this.icons.wallet; // Uso de saldo
    return this.icons.transfer;
  }

  getColorIcono(tipo: string): string {
    if (this.esIngreso(tipo)) return 'bg-emerald-100 text-emerald-600';
    return 'bg-rose-100 text-rose-600';
  }
}
