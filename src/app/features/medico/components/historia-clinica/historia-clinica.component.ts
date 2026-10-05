import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Consulta } from '../../../../core/interfaces/consulta.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faHistory, faFileMedical, faStethoscope, faWalking,
  faPaperclip, faFilePdf, faFileImage // ✅ Iconos Nuevos
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './historia-clinica.component.html',
  styleUrls: ['./historia-clinica.component.scss']
})
export class HistoriaClinicaComponent {
  @Input() historial: Consulta[] = [];
  @Output() verMapa = new EventEmitter<any[]>();

  icons = {
    history: faHistory,
    file: faFileMedical,
    doctor: faStethoscope,
    cuerpo: faWalking,
    clip: faPaperclip,  // ✅
    pdf: faFilePdf,     // ✅
    img: faFileImage    // ✅
  };
}
