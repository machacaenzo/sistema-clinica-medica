import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // <-- Asegúrate de que esta línea esté bien
import { NavbarComponent } from '../../shared/components/navbar/navbar.component'; // <-- Importa el navbar
import { FooterComponent } from '../../shared/components/footer/footer.component'; // <-- Importa el footer

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent], // <-- Asegúrate de que estén en los imports
  templateUrl: './public-layout.component.html',
  styleUrls: ['./public-layout.component.scss']
})
export class PublicLayoutComponent { }
