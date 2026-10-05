import { Component, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';

// Servicios


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faTimes, faSearch, faPlus, faShoppingCart, faTrash, faCheckCircle, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { InsumoService } from '../../../admin/gestion-insumos/insumo.service';
import { TransaccionesService } from '../../../../core/services/transacciones.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Insumo } from '../../../../core/interfaces/insumo.model';

@Component({
  selector: 'app-modal-venta-insumos',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './modal-venta-insumos.component.html',
  styleUrls: ['./modal-venta-insumos.component.scss']
})
export class ModalVentaInsumosComponent {
  private insumoService = inject(InsumoService);
  private transaccionesService = inject(TransaccionesService);
  private notificacionService = inject(NotificacionService);
  private authService = inject(AuthService);

  @Output() cerrar = new EventEmitter<void>();
  @Output() ventaConfirmada = new EventEmitter<any[]>(); // Devuelve la lista al padre

  icons = { close: faTimes, search: faSearch, plus: faPlus, cart: faShoppingCart, trash: faTrash, check: faCheckCircle, box: faBoxOpen };

  // Datos
  insumos = toSignal(this.insumoService.obtenerTodos(), { initialValue: [] });
  busqueda = signal('');
  carrito = signal<{ insumo: Insumo, cantidad: number }[]>([]);
  procesando = signal(false);

 // Filtrado (Stock > 0 + Activo + Categoría Farmacia + NO VENCIDO)
  insumosFiltrados = computed(() => {
    const term = this.busqueda().toLowerCase();

    // Categorías permitidas
    const categoriasFarmacia = ['Medicamentos', 'Material Médico', 'Ortopedia'];

    // ✅ FECHA DE HOY (Formato YYYY-MM-DD para comparar strings)
    const hoy = new Date().toISOString().split('T')[0];

    return this.insumos().filter(i =>
      i.stockActual > 0 &&
      i.estado === 'Activo' &&
      categoriasFarmacia.includes(i.categoria) &&

      // ✅ REGLA ANTI-VENCIMIENTO:
      // Si no tiene fecha (ej: gasas), pasa. Si tiene fecha, debe ser mayor o igual a hoy.
      (!i.fechaVencimiento || i.fechaVencimiento >= hoy) &&

      (i.nombre.toLowerCase().includes(term) || i.codigo.toLowerCase().includes(term))
    );
  });

  // Totales
  totalPagar = computed(() => {
    return this.carrito().reduce((acc, item) => acc + (item.insumo.precioUnitario * item.cantidad), 0);
  });

  // --- ACCIONES CARRITO ---

  agregarAlCarrito(insumo: Insumo) {
    // Verificar si ya está en el carrito
    const actual = this.carrito();
    const existe = actual.find(i => i.insumo.id === insumo.id);

    if (existe) {
      if (existe.cantidad < insumo.stockActual) {
        existe.cantidad++;
        this.carrito.set([...actual]); // Trigger update
      } else {
        this.notificacionService.showAlertWarning('Stock', 'No hay más unidades disponibles.');
      }
    } else {
      this.carrito.set([...actual, { insumo, cantidad: 1 }]);
    }
  }

  quitarDelCarrito(index: number) {
    const actual = this.carrito();
    actual.splice(index, 1);
    this.carrito.set([...actual]);
  }

  // --- CONFIRMAR VENTA (LÓGICA PESADA) ---

  async confirmarVenta() {
    if (this.carrito().length === 0) return;

    this.procesando.set(true);
    const usuario = this.authService.currentUser();
    const itemsVendidos = this.carrito();
    const total = this.totalPagar();

    try {
      // 1. REGISTRAR INGRESO EN CAJA (Una sola transacción por el total)
      if (total > 0) {
       await this.transaccionesService.registrarIngresoDirecto({ // ✅ USAMOS EL NUEVO MÉTODO
          idPaciente: 'VENTA_MOSTRADOR',
          idTurno: '',
          monto: total,
          tipo: 'INGRESO',
          fecha: Timestamp.now(),
          usuarioResponsable: usuario?.email || 'Medico',
          motivo: 'Venta Insumos/Farmacia en Consultorio'
        });
      }

      // 2. DESCONTAR STOCK (Uno por uno)
      // Usamos Promise.all para esperar a que todos se descuenten
      const promesasStock = itemsVendidos.map(item => {
        return this.insumoService.registrarMovimiento({
          idInsumo: item.insumo.id!,
          tipo: 'SALIDA',
          cantidad: item.cantidad,
          stockResultante: item.insumo.stockActual - item.cantidad, // Estimado, el backend lo calcula bien con increment
          motivo: 'Venta en Consulta',
          fecha: Timestamp.now(),
          usuario: usuario?.email || 'Medico'
        });
      });

      await Promise.all(promesasStock);

      // 3. FINALIZAR
      this.notificacionService.showSuccessToast('Venta registrada y stock actualizado.');

      // Enviamos al padre solo los datos relevantes para el historial
      const resumenParaHistoria = itemsVendidos.map(i => ({
        nombre: i.insumo.nombre,
        cantidad: i.cantidad,
        precio: i.insumo.precioUnitario
      }));

      this.ventaConfirmada.emit(resumenParaHistoria);
      this.cerrar.emit();

    } catch (e) {
      console.error(e);
      this.notificacionService.showAlertError('Error', 'Fallo al procesar la venta.');
    } finally {
      this.procesando.set(false);
    }
  }
}
