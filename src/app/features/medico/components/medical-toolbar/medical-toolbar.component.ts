import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faCalculator,
  faWalking,
  faVial,
  faFileMedical, // Usamos este para riñón si faKidneys no está
  faPills       // ✅ Nuevo para Farmacia
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-medical-toolbar',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './medical-toolbar.component.html',
  styleUrls: ['./medical-toolbar.component.scss']
})
export class MedicalToolbarComponent {
  // Eventos hacia el padre (AtenderPaciente)
  @Output() openLab = new EventEmitter<void>();
  @Output() openBodyMap = new EventEmitter<void>();
  @Output() openRiskCalc = new EventEmitter<void>();
  @Output() openRenalCalc = new EventEmitter<void>();
  @Output() openPharmacy = new EventEmitter<void>(); // ✅ Nuevo

  icons = {
    calc: faCalculator,
    body: faWalking,
    lab: faVial,
    rinon: faFileMedical, // O faKidneys si lo tienes instalado
    pharma: faPills       // ✅ Nuevo
  };
}
