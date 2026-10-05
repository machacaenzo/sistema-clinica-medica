import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
// ✅ 1. IMPORTAR ESTO:
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { Chart } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';


// Importar idioma español
import localeEs from '@angular/common/locales/es';
import { registerLocaleData } from '@angular/common';

import { provideHttpClient } from '@angular/common/http';

registerLocaleData(localeEs);
Chart.register(annotationPlugin);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // ✅ 2. AGREGAR ESTO AQUÍ (Vital para el calendario):
    provideAnimations(),

    provideFirebaseApp(() =>
      initializeApp({
        projectId: "gestion-clinica-hia",
        appId: "1:3917806034:web:f4bc90a06616a6bd99b00b",
        storageBucket: "gestion-clinica-hia.firebasestorage.app",
        apiKey: "AIzaSyCRmE1_8hxSCzLXEZdkYXAMRIYLM62znsw",
        authDomain: "gestion-clinica-hia.firebaseapp.com",
        messagingSenderId: "3917806034",
      })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideCharts(withDefaultRegisterables()),
    provideHttpClient(),
    importProvidersFrom(
      CalendarModule.forRoot({
        provide: DateAdapter,
        useFactory: adapterFactory,
      })
    ),
    { provide: LOCALE_ID, useValue: 'es' }
  ]
};
