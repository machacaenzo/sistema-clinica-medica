import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsistenteClinicoService, ResultadoRiesgo } from '../../services/asistente-clinico.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHeartbeat, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-calculadora-riesgo',
  standalone: true,
  imports: [CommonModule, FormsModule, FaIconComponent],
  templateUrl: './calculadora-riesgo.component.html',
  styleUrls: ['./calculadora-riesgo.component.scss']
})
export class CalculadoraRiesgoComponent implements OnInit {
  private asistente = inject(AsistenteClinicoService);

  @Input() datosBase: any; // { edad, sexo, fuma, diabetes, presion }
  @Output() cerrar = new EventEmitter<void>();
  @Output() resultadoConfirmado = new EventEmitter<string>(); // Emite el texto para pegar en la consulta

  icons = { heart: faHeartbeat, check: faCheck, close: faTimes };

  colesterol = signal<number | null>(null); // El único dato que falta
  resultado = signal<ResultadoRiesgo | null>(null);

  ngOnInit() {
    // Si no tenemos colesterol, no calculamos nada aún.
    // Si quisieras calcular con un promedio por defecto (ej: 180), hazlo aquí.
  }

  calcular() {
    if (!this.colesterol()) return;

    const res = this.asistente.calcularRiesgoCV({
      ...this.datosBase,
      colesterol: this.colesterol()!
    });
    this.resultado.set(res);
  }

  confirmar() {
    if (this.resultado()) {
      const texto = `\n[RIESGO CV]: ${this.resultado()?.nivel} (${this.resultado()?.riesgoPorcentaje}). ${this.resultado()?.recomendacion}`;
      this.resultadoConfirmado.emit(texto);
    }
    this.cerrar.emit();
  }
}
