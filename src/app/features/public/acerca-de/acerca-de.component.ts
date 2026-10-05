import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faUserGraduate, faLaptopCode, faUniversity, faLayerGroup, faEnvelope } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-acerca-de',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './acerca-de.component.html',
  styleUrls: ['./acerca-de.component.scss']
})
export class AcercaDeComponent {
  icons = {
    student: faUserGraduate,
    tech: faLaptopCode,
    uni: faUniversity,
    stack: faLayerGroup,
    mail: faEnvelope
  };
}
