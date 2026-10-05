import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, doc, getDoc, Timestamp, deleteDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AutorizacionHcService {
  private firestore = inject(Firestore);
  private readonly COL_AUTORIZACIONES = 'autorizaciones_descarga_hc';

  /**
   * Genera un token temporal para que la secretaria pueda descargar la HC
   * Duración: 10 minutos.
   */
  async generarTokenAcceso(idPaciente: string): Promise<string> {
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 10); // Expira en 10 min

    const docRef = await addDoc(collection(this.firestore, this.COL_AUTORIZACIONES), {
      idPaciente: idPaciente,
      fechaCreacion: Timestamp.now(),
      expiraEn: Timestamp.fromDate(expiracion),
      usado: false
    });

    return docRef.id; // Este ID es el que irá dentro del QR
  }

  /**
   * Valida si un token de QR es legítimo y no ha expirado
   */
  async validarToken(tokenId: string): Promise<{ valido: boolean, idPaciente?: string }> {
    const docRef = doc(this.firestore, this.COL_AUTORIZACIONES, tokenId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return { valido: false };

    const data = snap.data();
    const ahora = new Date();
    const expiracion = data['expiraEn'].toDate();

    if (data['usado'] || ahora > expiracion) {
      // Si ya se usó o expiró, lo borramos para limpiar la DB
      await deleteDoc(docRef);
      return { valido: false };
    }

    // Si es válido, marcamos como usado inmediatamente (Solo se puede bajar 1 vez)
    // await deleteDoc(docRef); // Lo borramos ahora o después de la descarga

    return { valido: true, idPaciente: data['idPaciente'] };
  }
}
