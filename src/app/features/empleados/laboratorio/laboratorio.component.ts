import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LaboratorioService } from './laboratorio.service';


// Iconos
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faMicroscope, faSearch, faCalendarAlt, faIdCard,
  faVial, faCheckCircle, faClock, faEdit, faFlask
} from '@fortawesome/free-solid-svg-icons';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { PedidoLaboratorio } from '../../../core/interfaces/pedido-laboratorio.model';
import { CargaLaboratorioComponent } from "./components/carga-laboratorio/carga-laboratorio.component";

@Component({
  selector: 'app-laboratorio',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent, CargaLaboratorioComponent], // ✅ Aquí importaremos el modal después
  templateUrl: './laboratorio.component.html',
  styleUrls: ['./laboratorio.component.scss']
})
export class LaboratorioComponent implements OnInit {
  private labService = inject(LaboratorioService);
  private notify = inject(NotificacionService);

  icons = {
    lab: faFlask,
    micro: faMicroscope,
    search: faSearch,
    fecha: faCalendarAlt,
    dni: faIdCard,
    check: faCheckCircle,
    reloj: faClock,
    edit: faEdit
  };

  // --- ESTADOS DE FILTRO ---
  // Inicializamos con la fecha de hoy en formato YYYY-MM-DD
  fechaFiltro = signal(new Date().toISOString().split('T')[0]);
  dniFiltro = signal('');

  // --- DATA ---
  pedidos = signal<PedidoLaboratorio[]>([]);
  loading = signal(true);

  // --- CONTROL DE MODAL ---
  isModalOpen = signal(false);
  pedidoSeleccionado = signal<PedidoLaboratorio | null>(null);

  constructor() {
    // ✅ NIVEL DIOS: Cada vez que cambie la fecha o el DNI, se recarga la lista solo
    effect(() => {
      this.buscarPedidos();
    });
  }

  ngOnInit() {}

  /**
   * Llama al servicio con los filtros actuales
   */
  buscarPedidos() {
    this.loading.set(true);
    this.labService.obtenerPedidosFiltrados(this.fechaFiltro(), this.dniFiltro()).subscribe({
      next: (data) => {
        this.pedidos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.notify.showAlertError('Error', 'Fallo al cargar la lista de trabajo.');
      }
    });
  }

  /**
   * Abre el modal de carga de resultados
   */
  abrirCarga(pedido: PedidoLaboratorio) {
    this.pedidoSeleccionado.set(pedido);
    this.isModalOpen.set(true);
  }

  /**
   * Cierra el proceso y limpia selección
   */
  cerrarModal() {
    this.isModalOpen.set(false);
    this.pedidoSeleccionado.set(null);
  }

  /**
   * Recibe los datos del componente hijo (app-carga-laboratorio) y finaliza
   */
  async procesarResultados(dataResultados: any) {
    const pedido = this.pedidoSeleccionado();
    if (!pedido || !pedido.id) return;

    try {
      // 1. Guardamos en Firebase (Atomic Batch)
      // dataResultados trae { glucemia, colesterol, hba1c, etc }
      // valNotas viene del formulario de carga
      await this.labService.finalizarEstudio(
        pedido.id,
        pedido.idTurno,
        dataResultados,
        dataResultados.notas || 'Sin observaciones técnicas.'
      );

      this.notify.showSuccessToast('Análisis finalizado y enviado al médico.');
      this.cerrarModal();

    } catch (error) {
      this.notify.showAlertError('Error', 'No se pudo registrar el resultado.');
    }
  }

  // --- HELPERS VISUALES ---
  getBadgeClass(estado: string): string {
    return estado === 'PENDIENTE'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}
