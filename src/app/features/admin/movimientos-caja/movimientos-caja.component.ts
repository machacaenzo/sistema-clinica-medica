import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
;

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSearch, faMoneyBillWave, faArrowDown, faArrowUp, faExchangeAlt } from '@fortawesome/free-solid-svg-icons';
import { TransaccionesService } from '../../../core/services/transacciones.service';

@Component({
  selector: 'app-movimientos-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './movimientos-caja.component.html',
  styleUrls: ['../_admin-theme.scss'] // Heredamos estilos
})
export class MovimientosCajaComponent {
  private txService = inject(TransaccionesService);

  icons = { search: faSearch, money: faMoneyBillWave, up: faArrowUp, down: faArrowDown, mix: faExchangeAlt };

  // Datos
  movimientosRaw = toSignal(this.txService.obtenerMovimientosGlobales(), { initialValue: [] });

  // Filtros
  filtroTipo = signal<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');
  searchTerm = signal('');

  // Lógica de Filtrado
  movimientosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const tipo = this.filtroTipo();

    return this.movimientosRaw().filter(tx => {
      const matchesTerm = tx.motivo.toLowerCase().includes(term) ||
                          tx.usuarioResponsable?.toLowerCase().includes(term);
      const matchesTipo = tipo === 'TODOS' || tx.tipo === tipo;

      return matchesTerm && matchesTipo;
    });
  });

  // Balance de lo que se ve en pantalla
  balanceTotal = computed(() => {
    return this.movimientosFiltrados().reduce((acc, tx) => {
      if (tx.tipo === 'INGRESO') return acc + tx.monto;
      if (tx.tipo === 'EGRESO') return acc - tx.monto;
      return acc;
    }, 0);
  });
}
