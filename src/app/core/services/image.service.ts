import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageService {

  constructor() { }

  /**
   * Toma un archivo File (del input type file), lo comprime y devuelve el string Base64.
   * Resuelve la restricción de "Optimizar tamaño" del PDF.
   */
  public compressAndConvertToBase64(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
          const elem = document.createElement('canvas');

          // Lógica de redimensionamiento manteniendo aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }

          elem.width = width;
          elem.height = height;

          const ctx = elem.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Conversión a Base64 comprimido (JPEG)
          // quality 0.7 reduce drásticamente el tamaño sin perder mucha visión
          const dataUrl = elem.toDataURL('image/jpeg', quality);

          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  }
}
