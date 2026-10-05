import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

// Servicios
import { AuthService } from '../../../../core/services/auth.service';
import { Auth, authState } from '@angular/fire/auth'; // ✅ IMPORTAR ESTO
import { take } from 'rxjs/operators'; // ✅ IMPORTAR ESTO

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faVideo, faSpinner } from '@fortawesome/free-solid-svg-icons';

declare var JitsiMeetExternalAPI: any;

@Component({
  selector: 'app-sala-video',
  standalone: true,
  imports: [CommonModule, FaIconComponent],
  templateUrl: './sala-video.component.html',
  styleUrls: ['./sala-video.component.scss']
})
export class SalaVideoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private auth = inject(Auth); // ✅ Inyectar Auth de Firebase directo

  icons = { volver: faArrowLeft, video: faVideo, loading: faSpinner };

  api: any = null;
  loading = signal(true);

  ngOnInit() {
    const idTurno = this.route.snapshot.paramMap.get('idTurno');

    if (!idTurno) {
      this.salir();
      return;
    }

    // ✅ ESPERAR A QUE LA SESIÓN SE RESTAURE
    authState(this.auth).pipe(take(1)).subscribe(user => {
      if (user) {
        // Usuario logueado confirmado, iniciamos llamada
        // Usamos displayName o email como nombre
        const nombreMostrar = user.displayName || user.email || 'Usuario';
        this.iniciarLlamada(idTurno, nombreMostrar);
      } else {
        // Si después de esperar sigue sin haber usuario, ahí sí lo sacamos
        this.salir();
      }
    });
  }

  iniciarLlamada(idTurno: string, nombreUsuario: string) {
    const domain = 'meet.jit.si';

    const options = {
      roomName: `ClinicaHIA_Consulta_${idTurno}`,
      width: '100%',
      height: '100%',
      parentNode: document.querySelector('#jitsi-container'),
      userInfo: {
        displayName: nombreUsuario
      },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        // ✅ INTENTAR SALTAR EL PRE-JOIN
        prejoinPageEnabled: false,
        // ✅ EVITAR DEEP LINKING (Que intente abrir apps de celular)
        disableDeepLinking: true
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'hangup', 'chat', 'raisehand', 'videoquality', 'tileview'
        ]
      }
    };

    try {
        this.api = new JitsiMeetExternalAPI(domain, options);

        // ✅ FIX: Solo salimos si el evento es estrictamente "Colgar"
        // this.api.addEventListener('videoConferenceLeft', () => {
        //    this.salir();
        // });

    } catch (e) {
        console.error('Error cargando Jitsi', e);
    } finally {
        this.loading.set(false);
    }
  }

  salir() {
    if (this.api) this.api.dispose();

    // Redirigir según rol (leemos el rol del servicio que ya debería estar cargado)
    const role = this.authService.currentUser()?.role;
    if (role === 'medico') {
      this.router.navigate(['/medico/dashboard']);
    } else {
      this.router.navigate(['/public/mis-turnos']);
    }
  }

  ngOnDestroy() {
    if (this.api) this.api.dispose();
  }
}
