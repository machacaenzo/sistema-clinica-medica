import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private http = inject(HttpClient);

  // Tus credenciales (las que anotamos antes)
  private cloudName = 'dxij0seip';
  private uploadPreset = 'clinica_hia';

  /**
   * Sube un archivo a Cloudinary y devuelve la URL segura.
   * @param archivo El archivo seleccionado del input (File)
   */
  subirArchivo(archivo: File): Observable<string> {
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/upload`;

    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.uploadPreset);

    // Hacemos la petición POST
    return this.http.post<any>(url, formData).pipe(
      map(response => {
        // Cloudinary devuelve un objeto grande, solo nos interesa la URL segura
        return response.secure_url;
      })
    );
  }
}
