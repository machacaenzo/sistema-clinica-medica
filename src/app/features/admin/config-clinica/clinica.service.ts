import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ClinicaConfig } from '../../../core/interfaces/clinica.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicaService {
  private firestore = inject(Firestore);

  // Constantes de BD
  private readonly docId = 'configuracion_general';
  private readonly collectionName = 'clinica';

  // ✅ ESTADO GLOBAL (SIGNAL)
  // Contiene la configuración actual disponible para toda la app.
  // Se inicializa en null hasta que carga de Firebase.
  public clinicaData: WritableSignal<ClinicaConfig | null> = signal(null);

  constructor() {
    this.inicializarDatos();
  }

  /**
   * Se suscribe a los cambios en tiempo real de la configuración.
   * Actualiza la señal 'clinicaData' automáticamente.
   */
  private inicializarDatos() {
    const docRef = doc(this.firestore, this.collectionName, this.docId);

    // docData devuelve un Observable. Nos suscribimos para mantener la señal actualizada.
    (docData(docRef) as Observable<ClinicaConfig>).subscribe(data => {
      if (data) {
        this.clinicaData.set(data);
      }
    });
  }

  /**
   * Guarda o actualiza la configuración global.
   */
  guardarConfiguracion(config: ClinicaConfig): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, this.docId);
    // merge: true asegura que no borremos campos si la interfaz cambia a futuro
    return setDoc(docRef, config, { merge: true });
  }

  /**
   * Obtiene la configuración como Observable (Para casos específicos fuera de la señal)
   */
  obtenerConfiguracion(): Observable<ClinicaConfig | undefined> {
    const docRef = doc(this.firestore, this.collectionName, this.docId);
    return docData(docRef) as Observable<ClinicaConfig>;
  }

  /**
   * Obtiene una instantánea (Promesa) para validaciones puntuales (ej: guards o validadores)
   */
  async getSnapshotConfig(): Promise<ClinicaConfig | undefined> {
    const docRef = doc(this.firestore, this.collectionName, this.docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as ClinicaConfig) : undefined;
  }
}
