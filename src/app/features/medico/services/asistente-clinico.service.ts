import { Injectable } from '@angular/core';
import { AlertaMedica, PlantillaMedica } from '../../../core/interfaces/consulta.model';
import { Paciente } from '../../../core/interfaces/paciente.model';

// Interfaz interna para el resultado del screening
export interface AlertaScreening {
  estudio: string;
  estado: 'VENCIDO' | 'PENDIENTE' | 'OK';
  mensaje: string;
  fechaUltimo?: string;
}
export interface ResultadoRiesgo {
  puntaje: number;
  riesgoPorcentaje: string;
  nivel: 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY ALTO';
  color: string;
  recomendacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class AsistenteClinicoService {



analizarRiesgos(textoReceta: string, alergiasPaciente: string[]): AlertaMedica[] {
    const alertas: AlertaMedica[] = [];
    const receta = textoReceta.toLowerCase();

    // Base de conocimiento simple de interacciones
    // Formato: Si el paciente es alérgico a X y la receta dice Y -> ALERTA
    const reglas = [
      { alergia: 'penicilina', trigger: 'amox', mensaje: 'Paciente alérgico a Penicilina. Cuidado con Amoxicilina.' },
      { alergia: 'penicilina', trigger: 'penicilina', mensaje: 'Paciente alérgico a Penicilina.' },
      { alergia: 'penicilina', trigger: 'optamox', mensaje: 'Optamox contiene derivados de Penicilina.' },
      { alergia: 'aspirina', trigger: 'aspirina', mensaje: 'Alergia a AAS detectada.' },
      { alergia: 'aspirina', trigger: 'ibuprofeno', mensaje: 'Precaución: AINEs en alérgico a Aspirina.' },
      { alergia: 'yodo', trigger: 'contraste', mensaje: 'Verificar si el estudio requiere contraste iodado.' }
    ];

    if (!alergiasPaciente || alergiasPaciente.length === 0) return [];

    alergiasPaciente.forEach(alergia => {
      const alergiaClean = alergia.toLowerCase();

      reglas.forEach(regla => {
        // Si el paciente tiene la alergia Y la receta contiene la droga gatillo
        if (alergiaClean.includes(regla.alergia) && receta.includes(regla.trigger)) {
          alertas.push({
            tipo: 'PELIGRO',
            mensaje: regla.mensaje,
            drogaConflictiva: regla.trigger
          });
        }
      });
    });

    return alertas;
  }

  // =========================================================
  // 🟢 NUEVO: CEREBRO DE PREVENCIÓN (Semáforo)
  // =========================================================
  analizarScreening(paciente: Paciente): AlertaScreening[] {
    const alertas: AlertaScreening[] = [];
    const hoy = new Date();
    const edad = this.calcularEdad(paciente.fechaNacimiento);
    const esMujer = paciente.sexo === 'Femenino';
    const esDiabetico = paciente.perfilClinico?.antecedentes?.some(a => a.toLowerCase().includes('diabetes'));
    const historial = paciente.perfilClinico?.historialPreventivo || {};

    // 1. PAP (Papanicolau) - Mujeres > 25 años - Anual
    if (esMujer && edad >= 25) {
      const estado = this.verificarVencimiento(historial.fechaUltimoPap, 1); // 1 año
      if (estado !== 'OK') {
        alertas.push({
          estudio: 'PAP',
          estado: estado,
          mensaje: estado === 'VENCIDO' ? 'Hace más de 1 año' : 'Nunca registrado',
          fechaUltimo: historial.fechaUltimoPap
        });
      }
    }

    // 2. MAMOGRAFÍA - Mujeres > 50 años - Bianual (cada 2 años)
    if (esMujer && edad >= 50) {
      const estado = this.verificarVencimiento(historial.fechaUltimaMamo, 2);
      if (estado !== 'OK') {
        alertas.push({
          estudio: 'Mamografía',
          estado: estado,
          mensaje: estado === 'VENCIDO' ? 'Hace más de 2 años' : 'Nunca registrada',
          fechaUltimo: historial.fechaUltimaMamo
        });
      }
    }

    // 3. COLONOSCOPÍA - Todos > 50 años - Cada 5 años
    if (edad >= 50) {
      const estado = this.verificarVencimiento(historial.fechaUltimaColonoscopia, 5);
      if (estado !== 'OK') {
        alertas.push({
          estudio: 'Video Colonoscopía',
          estado: estado,
          mensaje: 'Control preventivo cáncer de colon',
          fechaUltimo: historial.fechaUltimaColonoscopia
        });
      }
    }

    // 4. FONDO DE OJO - Diabéticos - Anual
    if (esDiabetico) {
      const estado = this.verificarVencimiento(historial.fechaUltimoFondoOjo, 1);
      if (estado !== 'OK') {
        alertas.push({
          estudio: 'Fondo de Ojo',
          estado: estado,
          mensaje: 'Control retina diabética',
          fechaUltimo: historial.fechaUltimoFondoOjo
        });
      }
    }

    return alertas;
  }

  // --- HELPERS PRIVADOS ---

  private calcularEdad(fechaNac?: string): number {
    if (!fechaNac) return 0;
    const nacimiento = new Date(fechaNac);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  private verificarVencimiento(fechaStr: string | undefined, anosLimite: number): 'VENCIDO' | 'PENDIENTE' | 'OK' {
    if (!fechaStr) return 'PENDIENTE'; // Nunca se hizo

    const fechaUltimo = new Date(fechaStr);
    const fechaLimite = new Date();
    fechaLimite.setFullYear(fechaLimite.getFullYear() - anosLimite);

    // Si la fecha del estudio es ANTERIOR a la fecha límite (ej: hoy menos 1 año), está vencido
    return fechaUltimo < fechaLimite ? 'VENCIDO' : 'OK';
  }

   // =========================================================
  // 🧮 CALCULADORA RIESGO CV (Framingham Simplificado)
  // =========================================================
  calcularRiesgoCV(datos: {
    edad: number,
    sexo: string,
    fuma: boolean,
    diabetes: boolean,
    presionSistolica: number, // La alta (ej: 140)
    colesterol: number // mg/dL
  }): ResultadoRiesgo {

    let puntos = 0;
    const esHombre = datos.sexo === 'Masculino';

    // 1. Edad
    if (datos.edad >= 40 && datos.edad < 50) puntos += esHombre ? 3 : 2;
    else if (datos.edad >= 50 && datos.edad < 60) puntos += esHombre ? 5 : 4;
    else if (datos.edad >= 60) puntos += esHombre ? 7 : 6;

    // 2. Tabaquismo
    if (datos.fuma) puntos += 4;

    // 3. Diabetes
    if (datos.diabetes) puntos += 3;

    // 4. Presión Sistólica
    if (datos.presionSistolica >= 130 && datos.presionSistolica < 140) puntos += 1;
    else if (datos.presionSistolica >= 140 && datos.presionSistolica < 160) puntos += 2;
    else if (datos.presionSistolica >= 160) puntos += 3;

    // 5. Colesterol (Factor crítico)
    if (datos.colesterol >= 200 && datos.colesterol < 240) puntos += 1;
    else if (datos.colesterol >= 240 && datos.colesterol < 280) puntos += 2;
    else if (datos.colesterol >= 280) puntos += 3;

    // Resultado
    let nivel: any = 'BAJO';
    let color = 'bg-green-100 text-green-700';
    let porc = '< 10%';
    let rec = 'Estilo de vida saludable.';

    if (puntos >= 15) {
      nivel = 'MUY ALTO';
      color = 'bg-red-600 text-white';
      porc = '> 30%';
      rec = 'Intervención inmediata. Estatinas + Control estricto.';
    } else if (puntos >= 10) {
      nivel = 'ALTO';
      color = 'bg-red-100 text-red-700';
      porc = '20-30%';
      rec = 'Considerar medicación hipolipemiante.';
    } else if (puntos >= 5) {
      nivel = 'MODERADO';
      color = 'bg-orange-100 text-orange-700';
      porc = '10-20%';
      rec = 'Dieta y ejercicio. Reevaluar en 6 meses.';
    }

    return {
      puntaje: puntos,
      riesgoPorcentaje: porc,
      nivel: nivel,
      color: color,
      recomendacion: rec
    };
  }

  // =========================================================
  // 🚨 DETECTOR SÍNDROME METABÓLICO (Tiempo Real)
  // =========================================================
  analizarSindromeMetabolico(datos: {
    sexo: string,           // 'Masculino' | 'Femenino'
    imc: number,            // Calculado (Peso/Altura^2)
    presionSistolica: number,
    presionDiastolica: number,
    glucemia?: number,      // Opcional
    trigliceridos?: number, // Opcional
    hdl?: number            // Opcional
  }): string[] {
    const criterios: string[] = [];

    // 1. Obesidad (Usamos IMC > 30 como proxy de circunferencia abdominal)
    if (datos.imc >= 30) criterios.push('Obesidad (IMC > 30)');

    // 2. Presión Arterial (o en tratamiento, aquí vemos el valor)
    if (datos.presionSistolica >= 130 || datos.presionDiastolica >= 85) {
      criterios.push('Presión Arterial Elevada (≥130/85)');
    }

    // 3. Glucemia (Ayuno)
    if (datos.glucemia && datos.glucemia >= 100) {
      criterios.push('Glucemia Alterada (≥100 mg/dL)');
    }

    // 4. Triglicéridos
    if (datos.trigliceridos && datos.trigliceridos >= 150) {
      criterios.push('Triglicéridos Altos (≥150 mg/dL)');
    }

    // 5. HDL (Colesterol Bueno Bajo)
    if (datos.hdl) {
      const limiteHdl = datos.sexo === 'Masculino' ? 40 : 50;
      if (datos.hdl < limiteHdl) {
        criterios.push(`HDL Bajo (<${limiteHdl} mg/dL)`);
      }
    }

    // Diagnóstico positivo si cumple 3 o más criterios
    return criterios;
  }

  // =========================================================
  // 💧 CALCULADORA RENAL (Fórmula CKD-EPI 2009)
  // =========================================================
  calcularTFG(datos: { edad: number, sexo: string, creatinina: number }): { valor: number, estadio: string, color: string, mensaje: string } {
    const { edad, sexo, creatinina } = datos;
    let tfg = 0;

    // Constantes CKD-EPI
    const esMujer = sexo === 'Femenino';
    const k = esMujer ? 0.7 : 0.9;
    const alpha = esMujer ? -0.329 : -0.411;
    const factorSexo = esMujer ? 1.018 : 1; // 1.018 para mujeres, 1 para hombres

    // Cálculo
    // TFG = 141 * min(Scr/k, 1)^alpha * max(Scr/k, 1)^-1.209 * 0.993^Age * SexFactor
    const ratio = creatinina / k;
    tfg = 141 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.209) * Math.pow(0.993, edad) * factorSexo;

    tfg = Math.round(tfg); // Redondear

    // Clasificación KDIGO
    let estadio = '';
    let color = '';
    let mensaje = '';

    if (tfg >= 90) {
      estadio = 'G1 (Normal)';
      color = 'bg-green-100 text-green-700';
      mensaje = 'Función renal normal.';
    } else if (tfg >= 60) {
      estadio = 'G2 (Levemente disminuido)';
      color = 'bg-yellow-100 text-yellow-800';
      mensaje = 'Monitorear anualmente.';
    } else if (tfg >= 30) {
      estadio = 'G3 (Moderadamente disminuido)';
      color = 'bg-orange-100 text-orange-800';
      mensaje = 'Precaución con fármacos nefrotóxicos. Ajustar dosis.';
    } else if (tfg >= 15) {
      estadio = 'G4 (Severamente disminuido)';
      color = 'bg-red-100 text-red-800';
      mensaje = 'Preparación para terapia de reemplazo renal. Derivar a Nefrología.';
    } else {
      estadio = 'G5 (Falla Renal)';
      color = 'bg-red-600 text-white';
      mensaje = 'URGENTE: Falla renal. Requiere diálisis o trasplante.';
    }

    return { valor: tfg, estadio, color, mensaje };
  }
  calcularPentagonoSalud(paciente: Paciente, consultas: any[], habitos: any[]) {
    // 1. EJE FÍSICO (Biometría)
    // Tomamos el último IMC y Presión registrados
    const ultima = consultas[0]?.signosVitales;
    let scoreFisico = 100;
    if (ultima) {
      if (ultima.imc > 25) scoreFisico -= 20;
      if (ultima.imc > 30) scoreFisico -= 20;
      if (ultima.presionArterial?.split('/')[0] > 135) scoreFisico -= 30;
    }

    // 2. EJE PREVENTIVO (Screening)
    // Usamos el método analizarScreening que ya tenés
    const alertas = this.analizarScreening(paciente);
    const scorePreventivo = Math.max(0, 100 - (alertas.length * 25));

    // 3. EJE HÁBITOS (Tests OMS)
    // Analizamos los últimos resultados de los tests
    let scoreHabitos = 100;
    habitos.forEach(h => {
       if (h.resultado.includes('Riesgo Alto') || h.resultado.includes('Alta')) scoreHabitos -= 30;
       if (h.resultado.includes('Moderado')) scoreHabitos -= 15;
    });
    scoreHabitos = Math.max(0, scoreHabitos);

    // 4. EJE COMPROMISO (Adherencia)
    // Calculamos turnos realizados vs cancelados/ausentes
    const realizados = consultas.length;
    const scoreCompromiso = realizados > 0 ? 100 : 50; // Simplificación para el TFI

    // 5. EJE BIOQUÍMICO (Laboratorio)
    const lab = consultas.find(c => c.datosLaboratorio)?.datosLaboratorio;
    let scoreBioquimico = 100;
    if (lab) {
      if (lab.glucemia > 110) scoreBioquimico -= 30;
      if (lab.colesterol > 200) scoreBioquimico -= 20;
      if (lab.hba1c > 6.5) scoreBioquimico -= 30;
    } else {
      scoreBioquimico = 50; // Penalización por no tener laboratorio
    }

    return [scoreFisico, scorePreventivo, scoreHabitos, scoreCompromiso, scoreBioquimico];
}
}
