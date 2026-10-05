import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';

// Servicios
import { InsumoService } from './insumo.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ImageService } from '../../../core/services/image.service';
import { AuthService } from '../../../core/services/auth.service';
import { TransaccionesService } from '../../../core/services/transacciones.service'; // ✅ NUEVO IMPORT

// Interfaces
import { Insumo, MovimientoInsumo } from '../../../core/interfaces/insumo.model';

// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faPlus, faBoxOpen, faCamera, faTimes,
  faExclamationTriangle, faExchangeAlt, faHistory, faCalendarTimes,
  faImage
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-gestion-insumos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-insumos.component.html',
  styleUrls: ['../_admin-theme.scss']
})
export class GestionInsumosComponent {
  private insumoService = inject(InsumoService);
  private notificationService = inject(NotificacionService);
  private imageService = inject(ImageService);
  private authService = inject(AuthService);
  private transaccionesService = inject(TransaccionesService); // ✅ NUEVA INYECCIÓN
  private fb = inject(FormBuilder);

  icons = {
    faSearch, faEdit, faPlus, faBoxOpen, faCamera, faTimes,
    faExclamationTriangle, faExchangeAlt, faHistory, faCalendarTimes, faImage
  };

  // Datos
  insumosSignal = toSignal(this.insumoService.obtenerTodos(), { initialValue: [] });
  searchTerm = signal('');

  // Filtros
  filterCategory = signal('TODAS');
  filterStock = signal('TODOS');

  // Lógica de Filtrado
  filteredInsumos = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.filterCategory();
    const stockStatus = this.filterStock();

    return this.insumosSignal().filter(i => {
      const matchesTerm = i.nombre.toLowerCase().includes(term) ||
                          i.categoria.toLowerCase().includes(term) ||
                          (i.codigo && i.codigo.toLowerCase().includes(term));
      const matchesCat = cat === 'TODAS' || i.categoria === cat;

      let matchesStock = true;
      if (stockStatus === 'BAJO') matchesStock = i.stockActual <= i.stockMinimo;
      else if (stockStatus === 'NORMAL') matchesStock = i.stockActual > i.stockMinimo;

      return matchesTerm && matchesCat && matchesStock;
    });
  });

  // Modales y Estado
  isEditModalOpen = signal(false);
  isMovementModalOpen = signal(false);
  selectedInsumo: Insumo | null = null;
  insumoForm: FormGroup;
  movimientoForm: FormGroup;
  historialMovimientos = signal<MovimientoInsumo[]>([]);
  imagePreview = signal<string | null>(null);

  constructor() {
    this.insumoForm = this.fb.group({
      nombre: ['', Validators.required],
      codigo: [''],
      categoria: ['Material Médico', Validators.required],
      stockActual: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [5, [Validators.required, Validators.min(0)]],
      unidad: ['Unidad', Validators.required],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
      fechaVencimiento: [''],
      ubicacion: ['']
    });

    this.movimientoForm = this.fb.group({
      tipo: ['ENTRADA', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      motivo: ['', Validators.required],

      // ✅ CAMPOS FINANCIEROS (Solo para entradas)
      costoTotal: [0],
      registrarEnCaja: [true]
    });
  }

  // Helpers
  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }
  onFilterCategory(e: Event) { this.filterCategory.set((e.target as HTMLSelectElement).value); }
  onFilterStock(e: Event) { this.filterStock.set((e.target as HTMLSelectElement).value); }

  getEstadoVencimiento(fechaVencimiento?: string): 'VENCIDO' | 'POR_VENCER' | 'OK' {
    if (!fechaVencimiento) return 'OK';
    const hoy = new Date();
    const venc = new Date(fechaVencimiento);
    const diferenciaDias = (venc.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
    if (diferenciaDias < 0) return 'VENCIDO';
    if (diferenciaDias <= 30) return 'POR_VENCER';
    return 'OK';
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        const base64 = await this.imageService.compressAndConvertToBase64(file);
        this.imagePreview.set(base64);
      } catch (e) {
        this.notificationService.showAlertError('Error', 'Imagen inválida.');
      }
    }
  }

  // --- MODAL EDICIÓN ---
  openEditModal(insumo?: Insumo) {
    if (insumo) {
      this.selectedInsumo = insumo;
      this.insumoForm.patchValue(insumo);
      this.imagePreview.set(insumo.foto || null);
      this.insumoForm.get('stockActual')?.disable();
    } else {
      this.selectedInsumo = null;
      this.insumoForm.reset({
        categoria: 'Material Médico',
        stockActual: 0,
        stockMinimo: 10,
        unidad: 'Unidad',
        precioUnitario: 0
      });
      this.imagePreview.set(null);
      this.insumoForm.get('stockActual')?.enable();
    }
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.isEditModalOpen.set(false);
  }

  async saveInsumo() {
    if (this.insumoForm.invalid) {
      this.insumoForm.markAllAsTouched();
      return;
    }

    const form = this.insumoForm.getRawValue();
    const datos: Partial<Insumo> = {
      ...form,
      foto: this.imagePreview() || '',
      estado: this.selectedInsumo ? this.selectedInsumo.estado : 'Activo'
    };

    try {
      if (this.selectedInsumo && this.selectedInsumo.id) {
        await this.insumoService.actualizar(this.selectedInsumo.id, datos);
        this.notificationService.showSuccessToast('Insumo actualizado');
      } else {
        await this.insumoService.crear(datos as Insumo);
        this.notificationService.showSuccessToast('Insumo creado');
      }
      this.closeEditModal();
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo guardar.');
    }
  }

  // --- KARDEX & MOVIMIENTOS ---
  openMovementModal(insumo: Insumo) {
    this.selectedInsumo = insumo;
    this.isMovementModalOpen.set(true);
    // Resetear form con valores default para costos
    this.movimientoForm.reset({
      tipo: 'ENTRADA',
      cantidad: 1,
      costoTotal: 0,
      registrarEnCaja: true
    });
    if (insumo.id) {
      this.insumoService.obtenerHistorial(insumo.id).subscribe(h => this.historialMovimientos.set(h));
    }
  }

  closeMovementModal() {
    this.isMovementModalOpen.set(false);
    this.selectedInsumo = null;
    this.historialMovimientos.set([]);
  }

  async registrarMovimiento() {
    if (this.movimientoForm.invalid || !this.selectedInsumo?.id) return;

    const form = this.movimientoForm.value;
    const user = this.authService.currentUser();
    const usuarioNombre = user?.email || 'Sistema'; // Usamos email o nombre genérico

    // 1. Calcular nuevo stock
    let nuevoStock = this.selectedInsumo.stockActual;
    if (form.tipo === 'ENTRADA') nuevoStock += form.cantidad;
    else nuevoStock -= form.cantidad;

    if (nuevoStock < 0) {
      this.notificationService.showAlertWarning('Stock', 'Insuficiente para realizar la salida.');
      return;
    }

    const movimiento: MovimientoInsumo = {
      idInsumo: this.selectedInsumo.id,
      tipo: form.tipo,
      cantidad: form.cantidad,
      stockResultante: nuevoStock,
      motivo: form.motivo,
      fecha: Timestamp.now(),
      usuario: usuarioNombre
    };

    try {
      // A. Registrar en Inventario (Stock + Historial)
      await this.insumoService.registrarMovimiento(movimiento);

      // B. ✅ NUEVO: Registrar Gasto Financiero (Si es compra y se marcó el check)
      if (form.tipo === 'ENTRADA' && form.registrarEnCaja && form.costoTotal > 0) {
        await this.transaccionesService.registrarGastoOperativo({
          monto: form.costoTotal,
          motivo: `Compra Insumos: ${this.selectedInsumo.nombre} (x${form.cantidad})`,
          usuario: usuarioNombre,
          referenciaId: this.selectedInsumo.id
        });
      }

      this.notificationService.showSuccessToast('Movimiento registrado correctamente');

      // Reset para nueva carga rápida
      this.movimientoForm.reset({
        tipo: 'ENTRADA',
        cantidad: 1,
        costoTotal: 0,
        registrarEnCaja: true
      });

    } catch (e) {
      console.error(e);
      this.notificationService.showAlertError('Error', 'Fallo al registrar movimiento.');
    }
  }
}
