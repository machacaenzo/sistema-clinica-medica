import { Injectable } from '@angular/core';
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';

// --- CONFIGURACIÓN GLASS (Más transparente) ---
const alertBaseConfig: SweetAlertOptions = {
  // Aumentamos el desenfoque del fondo de atrás para resaltar el vidrio
  backdrop: `rgba(0,0,0,0.2) blur(6px)`,

  // CAMBIO AQUÍ: 0.75 de opacidad (Antes 0.95).
  // Ahora se traslucirá el fondo de la app.
  background: 'rgba(255, 255, 255, 0.75)',

  color: '#1e293b',

  customClass: {
    popup: 'rounded-[2rem] shadow-2xl border border-white/60 backdrop-blur-md', // Añadido backdrop-blur al popup mismo
    confirmButton: 'rounded-full px-6 py-2 font-bold shadow-md',
    cancelButton: 'rounded-full px-6 py-2 font-bold shadow-sm'
  },
  confirmButtonColor: '#06b6d4',
  cancelButtonColor: '#94a3b8',
};

@Injectable({
  providedIn: 'root'
})
export class NotificacionService {

  public showSuccessToast(title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      // También hacemos el Toast más transparente
      background: 'rgba(255, 255, 255, 0.8)',
      color: '#0f766e',
      iconColor: '#14b8a6',
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });
    Toast.fire({ icon: 'success', title });
  }

  public showInfoToast(title: string): void {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      background: 'rgba(255, 255, 255, 0.8)',
      color: '#0ea5e9',
      iconColor: '#38bdf8'
    });
    Toast.fire({ icon: 'info', title });
  }

  public showAlertSuccess(title: string, text: string): void {
    Swal.fire({
      ...alertBaseConfig,
      title,
      text,
      icon: 'success',
      iconColor: '#14b8a6',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#14b8a6'
    });
  }

  public showAlertInfo(title: string, text: string): void {
    Swal.fire({
      ...alertBaseConfig,
      title,
      text,
      icon: 'info',
      iconColor: '#06b6d4',
      confirmButtonText: 'Entendido'
    });
  }

  public showAlertError(title: string, text: string): void {
    Swal.fire({
      ...alertBaseConfig,
      title,
      text,
      icon: 'error',
      iconColor: '#f43f5e',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#f43f5e',
    });
  }

  public showAlertWarning(title: string, text: string): void {
    Swal.fire({
      ...alertBaseConfig,
      title,
      text,
      icon: 'warning',
      iconColor: '#f59e0b',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#f59e0b'
    });
  }

  public showConfirm(title: string, text: string, confirmButtonText: string = 'Confirmar'): Promise<SweetAlertResult> {
    return Swal.fire({
      ...alertBaseConfig,
      title,
      text,
      icon: 'question',
      iconColor: '#64748b',
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
  }
}
