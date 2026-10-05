import { Component, EventEmitter, Input, Output, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faVial, faCheck, faTimes, faNotesMedical, faMicroscope, faHeartbeat,faPaperclip, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { PedidoLaboratorio } from '../../../../../core/interfaces/pedido-laboratorio.model';

@Component({
  selector: 'app-carga-laboratorio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './carga-laboratorio.component.html',
  styleUrls: ['./carga-laboratorio.component.scss']
})
export class CargaLaboratorioComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input({ required: true }) pedido!: PedidoLaboratorio;
  @Input() datosPrevios: any;

  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  // Agregué el icono heartbeat
  icons = { lab: faVial, check: faCheck, close: faTimes, doc: faNotesMedical,
    micro: faMicroscope, heart: faHeartbeat, clip: faPaperclip, // ✅ Definir
     };

  form: FormGroup;

  mostrarLipidos = signal(false);
  mostrarMetabolico = signal(false);
  mostrarRenal = signal(false);
  mostrarHemograma = signal(false);
  mostrarCardio = signal(false); // ✅ NUEVA SEÑAL

  constructor() {
    this.form = this.fb.group({
      // Lípidos
      colesterol: [''],
      hdl: [''],
      ldl: [''],
      trigliceridos: [''],

      // Metabólico
      glucemia: [''],
      hba1c: [''],

      // Renal
      creatinina: [''],
      urea: [''],

      // Hemograma
      hematocrito: [''],
      hemoglobina: [''],

      // ✅ CARDIO (Nuevos campos)
      frecuenciaCardiaca: [''],
      informeEcg: [''],

      // General
      observaciones: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit() {
    this.analizarQueMostrar();

    const datos = this.datosPrevios || this.pedido.resultados;
    if (datos) {
      this.form.patchValue(datos);
    }

    if (this.pedido.observacionesTecnicas) {
      this.form.patchValue({ observaciones: this.pedido.observacionesTecnicas });
    }
  }

  private analizarQueMostrar() {
    const estudios = (this.pedido.estudios || []).map(e => e.toUpperCase());

    // Si no hay nada, mostramos todo por seguridad
    if (estudios.length === 0) {
      this.activarTodo();
      return;
    }

    const esLipidico = estudios.some(e => e.includes('LIPID') || e.includes('COLES') || e.includes('GRASAS'));
    this.mostrarLipidos.set(esLipidico);

    const esMetabolico = estudios.some(e => e.includes('GLUC') || e.includes('DIABET') || e.includes('META') || e.includes('AZUCAR'));
    this.mostrarMetabolico.set(esMetabolico);

    const esRenal = estudios.some(e => e.includes('RENAL') || e.includes('RIÑON') || e.includes('UREA') || e.includes('CREAT'));
    this.mostrarRenal.set(esRenal);

    const esHemograma = estudios.some(e => e.includes('HEMO') || e.includes('SANGRE'));
    this.mostrarHemograma.set(esHemograma);

    // ✅ DETECCIÓN DE ECG / APTO FÍSICO
    const esCardio = estudios.some(e => e.includes('ELECTRO') || e.includes('ECG') || e.includes('CARDIO') || e.includes('ERGO'));
    this.mostrarCardio.set(esCardio);

    // Si no se activó NADA (caso raro), activamos observaciones como principal
    if (!esLipidico && !esMetabolico && !esRenal && !esHemograma && !esCardio) {
       // Opcional: Podrías forzar mostrarCardio o dejar solo observaciones
    }
  }

  private activarTodo() {
    this.mostrarLipidos.set(true);
    this.mostrarMetabolico.set(true);
    this.mostrarRenal.set(true);
    this.mostrarHemograma.set(true);
    this.mostrarCardio.set(true);
  }

  confirmar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardar.emit(this.form.value);
  }
}
