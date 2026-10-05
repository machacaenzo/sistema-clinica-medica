import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenteClinicoService } from '../../services/asistente-clinico.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faFileMedical, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'; // Asegúrate de tener un icono, sino usa faHeart o similar

@Component({
  selector: 'app-calculadora-renal',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './calculadora-renal.component.html',
  styleUrls: ['./calculadora-renal.component.scss']
})
export class CalculadoraRenalComponent implements OnInit {
  private asistente = inject(AsistenteClinicoService);

  @Input() datosBase: any; // { edad, sexo, creatinina (opcional) }
  @Output() cerrar = new EventEmitter<void>();
  @Output() resultadoConfirmado = new EventEmitter<string>();

  icons = { rinon: faFileMedical, check: faCheck, close: faTimes }; // Si no tienes faKidneys, usa faFileMedical

  creatinina = signal<number | null>(null);
  resultado = signal<any>(null);

  ngOnInit() {
    // Si ya cargó creatinina en el laboratorio, la tomamos
    if (this.datosBase?.creatinina) {
      this.creatinina.set(this.datosBase.creatinina);
      this.calcular();
    }
  }

  calcular() {
    if (!this.creatinina()) return;

    const res = this.asistente.calcularTFG({
      edad: this.datosBase.edad,
      sexo: this.datosBase.sexo,
      creatinina: this.creatinina()!
    });
    this.resultado.set(res);
  }

  confirmar() {
    if (this.resultado()) {
      const texto = `\n[FUNCIÓN RENAL]: TFG Estimada (CKD-EPI): ${this.resultado().valor} ml/min. Estadío: ${this.resultado().estadio}.`;
      this.resultadoConfirmado.emit(texto);
    }
    this.cerrar.emit();
  }
}
