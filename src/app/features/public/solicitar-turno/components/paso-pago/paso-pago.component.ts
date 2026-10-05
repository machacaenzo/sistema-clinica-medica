import { Component, EventEmitter, Input, Output, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios e Interfaces
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCheckCircle, faWallet, faMoneyBillWave, faCreditCard,
  faBuilding, faExclamationTriangle, faShieldAlt, faInfoCircle, faFlask
} from '@fortawesome/free-solid-svg-icons';
import { ObraSocialService } from '../../../../admin/gestion-obras-sociales/obra-social.service';
import { ReputacionService } from '../../../../../core/services/reputacion.service';
import { Prestacion } from '../../../../../core/interfaces/prestacion.model';
import { Paciente } from '../../../../../core/interfaces/paciente.model';

@Component({
  selector: 'app-paso-pago',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './paso-pago.component.html',
  styleUrls: ['./paso-pago.component.scss']
})
export class PasoPagoComponent implements OnInit {
  private osService = inject(ObraSocialService);
  private reputacionService = inject(ReputacionService);

  @Input({ required: true }) medico: any;
  @Input({ required: true }) prestacion: Prestacion | null = null;
  @Input({ required: true }) fecha: Date | null = null;
  @Input({ required: true }) hora: string = '';
  @Input({ required: true }) paciente: Paciente | null = null;
  @Input({ required: true }) form!: FormGroup;

  @Input() pagaEstudio: boolean = false;
  @Input() urlEstudioExterno: string | null = null;

  // ✅ CORRECCIÓN 1: Creamos una señal interna
  private precioLabSignal = signal<number>(0);

  // ✅ CORRECCIÓN 2: El Input actúa como un "Setter"
  @Input() set precioLaboratorio(val: number) {
    this.precioLabSignal.set(val);
  }

  @Input() creditoRepro: number = 0;
  @Input() loading: boolean = false;

  @Output() onConfirm = new EventEmitter<void>();

  icons = {
    ok: faCheckCircle, wallet: faWallet, cash: faMoneyBillWave,
    card: faCreditCard, bank: faBuilding, alert: faExclamationTriangle,
    shield: faShieldAlt, info: faInfoCircle, lab: faFlask
  };

  obrasSociales = toSignal(this.osService.obtenerTodas(), { initialValue: [] });
  puedeUsarEfectivo = signal(true);

  // =========================================================
  // 🧮 CALCULADORA FINANCIERA
  // =========================================================
  resumenFinanciero = computed(() => {
    // 1. Precios Base
    const precioMedico = this.medico?.valorConsulta || 0;

    // ✅ CORRECCIÓN 3: Leemos la SEÑAL con paréntesis ()
    // Esto obliga a Angular a recalcular cada vez que cambia el precio
    const precioEstudio = this.pagaEstudio ? this.precioLabSignal() : 0;

    const totalBruto = precioMedico + precioEstudio;

    // 2. Coberturas
    const osNombre = this.form.get('obraSocial')?.value || this.paciente?.obraSocial;
    const osObj = this.obrasSociales().find(o => o.nombre === osNombre);

    const porcCubreConsulta = osObj ? (osObj.coberturaConsulta || 0) : 0;
    const porcCubreEstudio = osObj ? (osObj.coberturaEstudio || 0) : 0;

    const montoCubreConsulta = (precioMedico * porcCubreConsulta) / 100;
    const montoCubreEstudio = (precioEstudio * porcCubreEstudio) / 100;
    const montoCubreOS = montoCubreConsulta + montoCubreEstudio;

    // 3. Saldos
    const saldoBilletera = this.paciente?.saldoCuenta || 0;
    const creditoAnterior = this.creditoRepro;

    let montoRestante = totalBruto - montoCubreOS;

    const usoCreditoViejo = Math.min(creditoAnterior, montoRestante);
    montoRestante -= usoCreditoViejo;

    const usoSaldoBilletera = Math.min(saldoBilletera, montoRestante);
    montoRestante -= usoSaldoBilletera;

    const totalAFacturar = Math.max(0, montoRestante);

    return {
      precioMedico,
      precioEstudio, // Se enviará al HTML actualizado
      totalBruto,
      coberturaConsulta: porcCubreConsulta,
      coberturaEstudio: porcCubreEstudio,
      montoCubreConsulta,
      montoCubreEstudio,
      montoCubreOS,
      usoCreditoViejo,
      usoSaldoBilletera,
      totalAFacturar,
      tieneEstudioExterno: !!this.urlEstudioExterno
    };
  });

  async ngOnInit() {
    if (this.paciente?.uid) {
      const ok = await this.reputacionService.puedePagarEfectivo(this.paciente.uid);
      this.puedeUsarEfectivo.set(ok);

      // Si estaba bloqueado y eligió efectivo, lo pasamos a tarjeta
      if (!ok && this.form.get('metodoPago')?.value === 'Efectivo') {
        this.form.patchValue({ metodoPago: 'Tarjeta de Crédito' });
      }
    }
  }

  confirmar() {
    this.onConfirm.emit();
  }
}
