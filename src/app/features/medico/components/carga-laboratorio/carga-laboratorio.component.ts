import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faVial, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-carga-laboratorio', // Asegúrate que el selector coincida con el que usas en atender-paciente
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './carga-laboratorio.component.html',
  styleUrls: ['./carga-laboratorio.component.scss']
})
export class CargaLaboratorioComponent implements OnInit {
  private fb = inject(FormBuilder);

  @Input() datosPrevios: any;
  @Output() guardar = new EventEmitter<any>();
  @Output() cancelar = new EventEmitter<void>();

  icons = { lab: faVial, check: faCheck, close: faTimes };

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      // Metabólico
      glucemia: [''],
      hba1c: [''],
      // Lípidos
      colesterol: [''],
      hdl: [''],
      ldl: [''],
      trigliceridos: [''],
      // Renal
      creatinina: [''],
      urea: [''],
      // Extras
      observaciones: ['']
    });
  }

  ngOnInit() {
    // Si ya cargó algo en esta sesión, lo mostramos
    if (this.datosPrevios) {
      this.form.patchValue(this.datosPrevios);
    }
  }

  confirmar() {
    // Emitimos los datos al padre (atender-paciente) para que los guarde en memoria
    this.guardar.emit(this.form.value);
  }
}
