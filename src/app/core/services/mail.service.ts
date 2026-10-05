import { Injectable, inject } from '@angular/core';
import emailjs from '@emailjs/browser';
import { ClinicaService } from '../../features/admin/config-clinica/clinica.service';

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private clinicaService = inject(ClinicaService);

  // =================================================================
  // 🔑 CONFIGURACIÓN DE CUENTAS (BALANCEO DE CARGA)
  // =================================================================

  private cuentas = {
    // CUENTA 1: Para turnos que deben plata (Efectivo/Transferencia)
    PENDIENTE: {
      serviceID: 'service_wcecogm',  // <-- PEGA AQUÍ ID CUENTA 1
      templateID: 'template_2rnui99',// <-- PEGA AQUÍ TEMPLATE 1
      publicKey: 'G-MlGDg7u5h_elahW'       // <-- PEGA AQUÍ PUBLIC KEY 1
    },

    // CUENTA 2: Para turnos listos (Tarjeta / Confirmación Admin)
    CONFIRMADO: {
      serviceID: 'service_7fdu16f',  // <-- PEGA AQUÍ ID CUENTA 2
      templateID: 'template_lkbo4o9',// <-- PEGA AQUÍ TEMPLATE 2
      publicKey: 'rgzgzBkbZwbBxKTYZ'       // <-- PEGA AQUÍ PUBLIC KEY 2
    },

    // CUENTA 3: Para recordatorios (Cron Job / Manual)
    RECORDATORIO: {
      serviceID: 'service_777vffz',  // <-- PEGA AQUÍ ID CUENTA 3
      templateID: 'template_wtemrye',// <-- PEGA AQUÍ TEMPLATE 3
      publicKey: 'RmwhtScwRzr8pP56r'       // <-- PEGA AQUÍ PUBLIC KEY 3
    }
  };

  /**
   * Decide qué cuenta usar y envía el correo correspondiente.
   */
  async enviarNotificacionTurno(turno: any, email: string, nombre: string): Promise<boolean> {

    const info = this.clinicaService.clinicaData();
    let credencialesUsar = this.cuentas.CONFIRMADO; // Por defecto éxito

    // Variables para el template
    let titulo = '';
    let instruccion = '';

    // --- LÓGICA DE SELECCIÓN DE CUENTA ---

    // CASO 1: PENDIENTE (Efectivo/Transferencia) -> CUENTA 1
    if (turno.estado === 'Pendiente de Pago') {
        credencialesUsar = this.cuentas.PENDIENTE;

        if (turno.metodoPago === 'Efectivo') {
            instruccion = '⚠️ Debes abonar en recepción 20 minutos antes de la cita, o el turno será cancelado.';
        } else {
            instruccion = '⏳ Tienes 2 horas para subir el comprobante de transferencia desde "Mis Turnos" en la web.';
        }
    }

    // CASO 2: CONFIRMADO (Tarjeta/Admin) -> CUENTA 2
    else if (turno.estado === 'Confirmado') {
        credencialesUsar = this.cuentas.CONFIRMADO;
        // El título y la instrucción ya están fijos en el diseño del Template 2 ("¡Todo Listo!")
        // Pero por si acaso mandamos vacío o un mensaje de refuerzo
        instruccion = 'Tu turno está asegurado. Te esperamos.';
    }

    // --- ARMADO DE PARÁMETROS ---
    const templateParams = {
      nombre_clinica: info?.nombre || 'Clínica HIA',
      direccion_clinica: info?.direccion || 'Sede Central',

      to_email: email, // Vital para EmailJS
      nombre_paciente: nombre,

      fecha: turno.fechaString,
      hora: turno.hora,
      medico: turno.medicoData.nombre,
      especialidad: turno.medicoData.especialidad,

      // Solo usado en Template 1 (Pendiente)
      instrucciones_pago: instruccion
    };

    return this.enviarEmail(credencialesUsar, templateParams);
  }

  /**
   * Envía un recordatorio (Usa CUENTA 3)
   */
  async enviarRecordatorio(turno: any, email: string, nombre: string): Promise<boolean> {
    const info = this.clinicaService.clinicaData();

    const params = {
      nombre_clinica: info?.nombre || 'Clínica HIA',
      to_email: email,
      nombre_paciente: nombre,
      fecha: turno.fechaString,
      hora: turno.hora,
      medico: turno.medicoData.nombre
    };

    return this.enviarEmail(this.cuentas.RECORDATORIO, params);
  }

  // --- MÉTODO PRIVADO GENÉRICO DE ENVÍO ---
  private async enviarEmail(creds: any, params: any): Promise<boolean> {
    try {
      //console.log('📤 Enviando mail con:', creds.serviceID); // Uncomment para debug
      await emailjs.send(creds.serviceID, creds.templateID, params, creds.publicKey);
      console.log('✅ Email enviado con éxito.');
      return true;
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      return false;
    }
  }
  // ✅ NUEVO MÉTODO: Solo para citas creadas por el médico
  /**
   * Envía el correo específico para una videoconsulta agendada por el médico.
   * Utiliza la cuenta de CONFIRMADO (Cuenta 2).
   */
async enviarCitaVideo(turno: any, email: string, nombre: string): Promise<boolean> {
    const info = this.clinicaService.clinicaData();

    // 🔴 REEMPLAZA ESTE NÚMERO POR TU IP (la que sacaste en el Paso 1)
    // Ejemplo: 'http://192.168.0.15:4200'
    const MI_IP = '192.168.1.45'; // <--- PONÉ TU NÚMERO ACÁ   dist/clinica-gestion-app/browser
    const APP_URL = `https://gestion-clinica-hia.web.app`;

    const urlReal = (turno.enlaceVideo && turno.enlaceVideo.trim() !== '')
                      ? turno.enlaceVideo
                      : `${APP_URL}/sala-virtual/${turno.id}`;

    const params = {
      nombre_clinica: info?.nombre || 'Clínica HIA',
      direccion_clinica: 'Consulta Virtual (Vía Celular/PC)',
      to_email: email,
      nombre_paciente: nombre,
      fecha: turno.fechaString,
      hora: turno.hora,
      medico: turno.medicoData.nombre,
      especialidad: turno.medicoData.especialidad || 'Clínica Médica',

      // ✅ MANDAMOS LA URL CON LA IP PARA QUE EL CELULAR LA ENCUENTRE
      link_consulta: urlReal
    };

    return this.enviarEmail(this.cuentas.CONFIRMADO, params);
  }
}
