import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Timestamp } from '@angular/fire/firestore';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faArrowLeft, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

import { HabitosService } from '../services/habitos.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-modal-test-habito',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './modal-test-habito.component.html'
})
export class ModalTestHabitoComponent implements OnInit {
  private habitosService = inject(HabitosService);
  private notify = inject(NotificacionService);
  private authService = inject(AuthService);

  @Input({ required: true }) tipo: 'ALCOHOL' | 'ACTIVIDAD_FISICA' | 'TABAQUISMO' | 'DIABETES' = 'ALCOHOL';
  @Output() cerrar = new EventEmitter<void>();

  icons = { next: faArrowRight, prev: faArrowLeft, save: faCheck, close: faTimes };

  indiceActual = signal(0);
  preguntas = signal<any[]>([]);
  respuestas: number[] = [];
  procesando = signal(false);

  ngOnInit() {
    this.cargarCuestionario();
  }

  cargarCuestionario() {
    // 1. CUESTIONARIO ALCOHOL (AUDIT - 10 Preguntas)
    if (this.tipo === 'ALCOHOL') {
      this.preguntas.set([
        { t: '¿Con qué frecuencia consumes alcohol?', o: [{l:'Nunca', v:0}, {l:'1 o menos al mes', v:1}, {l:'2-4 al mes', v:2}, {l:'2-3 por semana', v:3}, {l:'4+ por semana', v:4}]},
        { t: '¿Cuántas copas tomas en un día normal?', o: [{l:'1-2', v:0}, {l:'3-4', v:1}, {l:'5-6', v:2}, {l:'7-9', v:3}, {l:'10+', v:4}]},
        { t: '¿Con qué frecuencia tomas 6 o más copas seguidas?', o: [{l:'Nunca', v:0}, {l:'Menos de una vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿En el último año, no pudiste parar de beber una vez empezado?', o: [{l:'Nunca', v:0}, {l:'-1 vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿En el último año, no pudiste hacer tus tareas por beber?', o: [{l:'Nunca', v:0}, {l:'-1 vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿Necesitaste beber en ayunas tras haber bebido mucho el día anterior?', o: [{l:'Nunca', v:0}, {l:'-1 vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿Tuviste remordimientos tras beber?', o: [{l:'Nunca', v:0}, {l:'-1 vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿No recordaste lo que pasó la noche anterior por haber bebido?', o: [{l:'Nunca', v:0}, {l:'-1 vez al mes', v:1}, {l:'Mensual', v:2}, {l:'Semanal', v:3}, {l:'Diario', v:4}]},
        { t: '¿Te has lesionado o alguien se ha lesionado porque habías bebido?', o: [{l:'No', v:0}, {l:'Sí, pero no en el último año', v:2}, {l:'Sí, en el último año', v:4}]},
        { t: '¿Un familiar o médico se ha preocupado por tu forma de beber?', o: [{l:'No', v:0}, {l:'Sí, pero no en el último año', v:2}, {l:'Sí, en el último año', v:4}]}
      ]);
    }
    // 2. CUESTIONARIO TABACO (Fagerström - 6 Preguntas)
    else if (this.tipo === 'TABAQUISMO') {
      this.preguntas.set([
        { t: '¿Cuánto tiempo pasa desde que se levanta hasta que fuma el primer cigarrillo?', o: [{l:'Menos de 5 min', v:3}, {l:'6-30 min', v:2}, {l:'31-60 min', v:1}, {l:'Más de 60 min', v:0}]},
        { t: '¿Le cuesta no fumar en lugares donde está prohibido?', o: [{l:'Sí', v:1}, {l:'No', v:0}]},
        { t: '¿A qué cigarrillo le costaría más renunciar?', o: [{l:'El primero de la mañana', v:1}, {l:'Cualquier otro', v:0}]},
        { t: '¿Cuántos cigarrillos fuma al día?', o: [{l:'31 o más', v:3}, {l:'21-30', v:2}, {l:'11-20', v:1}, {l:'10 o menos', v:0}]},
        { t: '¿Fuma más en las primeras horas de la mañana?', o: [{l:'Sí', v:1}, {l:'No', v:0}]},
        { t: '¿Fuma aunque esté tan enfermo que tenga que estar en la cama?', o: [{l:'Sí', v:1}, {l:'No', v:0}]}
      ]);
    }
    // 3. CUESTIONARIO DIABETES (FINDRISC - 8 Preguntas)
    else if (this.tipo === 'DIABETES') {
      this.preguntas.set([
        { t: '¿Qué edad tiene?', o: [{l:'Menos de 45 años', v:0}, {l:'45-54 años', v:2}, {l:'55-64 años', v:3}, {l:'Más de 64 años', v:4}]},
        { t: '¿Cuál es su Índice de Masa Corporal (IMC)?', o: [{l:'Menor a 25 (Normal)', v:0}, {l:'25-30 (Sobrepeso)', v:1}, {l:'Mayor a 30 (Obesidad)', v:3}]},
        { t: 'Perímetro de cintura (debajo de costillas)', o: [{l:'Hombre < 94cm / Mujer < 80cm', v:0}, {l:'Hombre 94-102cm / Mujer 80-88cm', v:3}, {l:'Hombre > 102cm / Mujer > 88cm', v:4}]},
        { t: '¿Realiza al menos 30 min de actividad física diaria?', o: [{l:'Sí', v:0}, {l:'No', v:2}]},
        { t: '¿Con qué frecuencia come verduras o frutas?', o: [{l:'A diario', v:0}, {l:'No todos los días', v:1}]},
        { t: '¿Toma medicación para la hipertensión regularmente?', o: [{l:'No', v:0}, {l:'Sí', v:2}]},
        { t: '¿Le han encontrado alguna vez la glucosa alta?', o: [{l:'No', v:0}, {l:'Sí', v:5}]},
        { t: '¿Algún familiar tiene diabetes (tipo 1 o 2)?', o: [{l:'No', v:0}, {l:'Sí: abuelos, tíos, primos', v:3}, {l:'Sí: padres, hermanos, hijos', v:5}]}
      ]);
    }
    // 4. CUESTIONARIO ACTIVIDAD FÍSICA (IPAQ - 3 Preguntas)
    else {
      this.preguntas.set([
        { t: 'Días por semana de actividad física intensa', o: [{l:'0', v:0}, {l:'1', v:1}, {l:'2', v:2}, {l:'3', v:3}, {l:'4', v:4}, {l:'5', v:5}, {l:'6', v:6}, {l:'7', v:7}]},
        { t: 'Días por semana de actividad física moderada', o: [{l:'0', v:0}, {l:'1', v:1}, {l:'2', v:2}, {l:'3', v:3}, {l:'4', v:4}, {l:'5', v:5}, {l:'6', v:6}, {l:'7', v:7}]},
        { t: 'Días por semana que camina al menos 30 min', o: [{l:'0', v:0}, {l:'1', v:1}, {l:'2', v:2}, {l:'3', v:3}, {l:'4', v:4}, {l:'5', v:5}, {l:'6', v:6}, {l:'7', v:7}]}
      ]);
    }

    this.respuestas = new Array(this.preguntas().length).fill(-1);
  }

  seleccionar(valor: number) {
    this.respuestas[this.indiceActual()] = valor;
    if (this.indiceActual() < this.preguntas().length - 1) {
      this.indiceActual.update(i => i + 1);
    } else {
      this.finalizar();
    }
  }

  volver() { if (this.indiceActual() > 0) this.indiceActual.update(i => i - 1); }

  async finalizar() {
    const totalScore = this.respuestas.reduce((a, b) => a + b, 0);
    this.procesando.set(true);

    // DETERMINAR EVALUACIÓN SEGÚN TIPO
    let evaluacion;
    switch (this.tipo) {
      case 'ALCOHOL':
        evaluacion = this.habitosService.analizarAlcohol(totalScore);
        break;
      case 'TABAQUISMO':
        evaluacion = this.habitosService.analizarTabaco(totalScore);
        break;
      case 'DIABETES':
        evaluacion = this.habitosService.analizarDiabetes(totalScore);
        break;
      default: // ACTIVIDAD_FISICA
        evaluacion = this.habitosService.analizarActividad(totalScore * 200);
        break;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    // OBJETO FINAL PARA FIRESTORE (Sin campos undefined)
    const datosAGuardar = {
      idPaciente: user.uid,
      fecha: Timestamp.now(),
      tipo: this.tipo,
      score: evaluacion.score || 0,
      resultado: evaluacion.nivel || 'Sin resultado',
      color: evaluacion.color || 'text-slate-500'
    };

    try {
      await this.habitosService.guardarResultadoTest(user.uid, datosAGuardar);
      this.notify.showSuccessToast('Evaluación guardada');
      this.cerrar.emit();
    } catch (e) {
      console.error("ERROR CRÍTICO DE FIREBASE:", e);
      this.notify.showAlertError('Error', 'No se pudo guardar la evaluación.');
    } finally {
      this.procesando.set(false);
    }
  }
}
