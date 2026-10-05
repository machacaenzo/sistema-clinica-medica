import { Timestamp } from '@angular/fire/firestore';

// Tipos de Movimiento
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'VENCIDO';

export interface MovimientoInsumo {
  id?: string;
  idInsumo: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockResultante: number; // Cuánto quedó después del movimiento
  motivo: string;          // Ej: "Compra Factura B-001", "Uso en Guardia"
  fecha: Timestamp;        // Cuándo ocurrió
  usuario: string;         // Quién lo hizo (Email del admin)
}

export interface Insumo {
  id?: string;

  // Identificación
  nombre: string;
  codigo: string;
  categoria: 'Material Médico' | 'Medicamentos' | 'Limpieza' | 'Oficina' | 'Ropa' | 'Otro';

  // Stock y Almacenamiento
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number; // ✅ NUEVO: Para no sobre-stockear
  unidad: 'Unidad' | 'Caja' | 'Litro' | 'Pack' | 'Ampolla' | 'Blister'; // ✅ NUEVO
  ubicacion: string; // ✅ NUEVO: Ej: "Estantería B", "Heladera Vacunas"

  // Valoración y Vencimiento
  precioUnitario: number;
  fechaVencimiento?: string; // ✅ NUEVO: Crítico para medicamentos (YYYY-MM-DD)

  foto?: string;
  estado: 'Activo' | 'Inactivo';
}
