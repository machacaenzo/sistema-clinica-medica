import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';

export interface DiagnosticoCIE10 {
  codigo: string;
  descripcion: string;
}

@Injectable({
  providedIn: 'root'
})
export class Cie10Service {
  private http = inject(HttpClient);

  // Cache en memoria para no leer el archivo 100 veces
  private cache: DiagnosticoCIE10[] | null = null;

  buscar(termino: string): Observable<DiagnosticoCIE10[]> {
    if (!termino || termino.length < 2) return of([]); // Mínimo 2 letras

    // Si ya tenemos datos, filtramos directo. Si no, cargamos el JSON.
    const datos$ = this.cache ? of(this.cache) : this.cargarDatos();

    return datos$.pipe(
      map(lista => lista.filter(d =>
        d.descripcion.toLowerCase().includes(termino.toLowerCase()) ||
        d.codigo.toLowerCase().includes(termino.toLowerCase())
      ))
    );
  }

  private cargarDatos(): Observable<DiagnosticoCIE10[]> {
    return this.http.get<DiagnosticoCIE10[]>('assets/cie10.json').pipe(
      map(data => {
        this.cache = data;
        return data;
      })
    );
  }
}
