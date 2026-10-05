import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Timestamp } from '@angular/fire/firestore';

// --- SERVICIOS ---
import { ConsultaMedicaService } from '../../services/consulta-medica.service';
import { AsistenteClinicoService } from '../../services/asistente-clinico.service';
import { TurnosService } from '../../../../core/services/turnos.service';
import { PacienteService } from '../../../admin/gestion-pacientes/paciente.service';
import { NotificacionService } from '../../../../core/services/notificaciones.service';
import { AuthService } from '../../../../core/services/auth.service';
import { PdfService } from '../../services/pdf.service';
import { CloudinaryService } from '../../../../core/services/cloudinary.service';
import { PlantillasService } from '../../services/plantillas.service';
import { Cie10Service, DiagnosticoCIE10 } from '../../services/cie10.service';

// --- INTERFACES ---
import { Turno } from '../../../../core/interfaces/turno.model';
import { Paciente } from '../../../../core/interfaces/paciente.model';
import { Consulta, PlantillaMedica } from '../../../../core/interfaces/consulta.model';

// --- COMPONENTES HIJOS ---
import { DetallePacienteComponent } from '../detalle-paciente/detalle-paciente.component';
import { HistoriaClinicaComponent } from '../historia-clinica/historia-clinica.component';
import { GraficosEvolucionComponent } from '../graficos-evolucion/graficos-evolucion.component';
import { CalculadoraRiesgoComponent } from '../calculadora-riesgo/calculadora-riesgo.component';
import { BodyMapComponent, PuntoDolor } from '../body-map/body-map.component';
import { NotasObjetivosComponent } from '../notas-objetivos/notas-objetivos.component';
import { MedicalToolbarComponent } from '../medical-toolbar/medical-toolbar.component'; // ✅ Nuevo
import { CargaLaboratorioComponent } from '../carga-laboratorio/carga-laboratorio.component'; // ✅ Nuevo
import { CalculadoraRenalComponent } from '../calculadora-renal/calculadora-renal.component';
import { ModalVentaInsumosComponent } from '../modal-venta-insumos/modal-venta-insumos.component'
// --- ICONOS ---
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faUserInjured, faSave, faHistory, faFilePrescription, faAllergies,
  faWeight, faHeartbeat, faTint, faNotesMedical, faMagic, faExclamationTriangle,
  faArrowLeft, faChartLine, faList, faCalculator, faWalking, faCheck,
  faPrint, faUserDoctor, faTrashAlt, faPaperclip, faCloudUploadAlt, faFilePdf, faFileImage, faPills,
  faShield,
  faMicroscope,
} from '@fortawesome/free-solid-svg-icons';
import { MedicionesService } from '../../../paciente/services/mediciones.service';
import { Medicion } from '../../../../core/interfaces/mediciones.model';
import { LaboratorioService } from '../../../empleados/laboratorio/laboratorio.service';
import { SeguridadFarmacoService } from '../../../admin/gestion-seguridad-farmaco/seguridad-farmaco.service';
import { ReglaSeguridad } from '../../../../core/interfaces/seguridad-farmaco.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { PedidoLaboratorio } from '../../../../core/interfaces/pedido-laboratorio.model';
import { ServiciosDiagnosticoService } from '../../../admin/gestion-servicios-diagnostico/servicios-diagnostico.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-atender-paciente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FaIconComponent,
    DetallePacienteComponent,
    HistoriaClinicaComponent,
    GraficosEvolucionComponent,
    CalculadoraRiesgoComponent,
    BodyMapComponent,
    NotasObjetivosComponent, // ✅ Sidebar
    MedicalToolbarComponent, // ✅ Toolbar
    CargaLaboratorioComponent, // ✅ Modal
    CalculadoraRenalComponent,
    ModalVentaInsumosComponent
  ],
  templateUrl: './atender-paciente.component.html',
  styleUrls: ['./atender-paciente.component.scss']
})
export class AtenderPacienteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Servicios
  private consultaService = inject(ConsultaMedicaService);
  private asistenteService = inject(AsistenteClinicoService);
  private turnosService = inject(TurnosService);
  private pacienteService = inject(PacienteService);
  private notificacionService = inject(NotificacionService);
  private authService = inject(AuthService);
  private pdfService = inject(PdfService);
  private cloudinaryService = inject(CloudinaryService);
  private plantillasService = inject(PlantillasService);
  private cie10Service = inject(Cie10Service);
  private medicionesService = inject(MedicionesService); // ✅ Inyectar
  private labService = inject(LaboratorioService);
  private seguridadService = inject(SeguridadFarmacoService);
    private serviciosDiagnostico = inject(ServiciosDiagnosticoService); // 2. INYECTAR

  modulosSeleccionados = signal<string[]>([]);
  medicionesHogar = signal<Medicion[]>([])

  icons = {
    paciente: faUserInjured, save: faSave, history: faHistory,
    receta: faFilePrescription, alergia: faAllergies,
    peso: faWeight, presion: faHeartbeat, sangre: faTint,
    notas: faNotesMedical, plantilla: faMagic, alerta: faExclamationTriangle,
    volver: faArrowLeft, grafico: faChartLine, lista: faList,
    calculadora: faCalculator, cuerpo: faWalking, check: faCheck,
    print: faPrint, doctor: faUserDoctor, trash: faTrashAlt,
    clip: faPaperclip, upload: faCloudUploadAlt, filePdf: faFilePdf, fileImg: faFileImage,
    pills: faPills,shield:faShield,alert:faExclamationTriangle,micro:faMicroscope
  };

   // Este es el "cerebro" que hace el cálculo que intentabas hacer en el HTML
  totalFacturaInsumos = computed(() => {
    return this.insumosVendidos.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  });
  // ✅ Agrega este computed dentro de la clase
tieneAlertaCritica = computed(() =>
  this.alertasFarmacologicas().some(a => a.severidad === 'CRITICA')
);
  defaultImage = 'assets/user-default.jpg';

  // 2. Cargamos las reglas maestras de Firebase en una señal
reglasSeguridad = toSignal(this.seguridadService.obtenerReglas(), { initialValue: [] });

// 3. Señal para las alertas que se detecten en el momento
alertasFarmacologicas = signal<ReglaSeguridad[]>([]);
  // --- ESTADO ---
  loading = signal(true);
  turnoActual = signal<Turno | null>(null);
  pacienteData = signal<Paciente | null>(null);
  historialPrevio = signal<Consulta[]>([]);
  plantillas = signal<PlantillaMedica[]>([]);

  showProtoDiabetes = signal(false);
  showProtoCardio = signal(false);
  showProtoRespi = signal(false); // Agregamos Respiratorio también


  insumosVendidos: any[] = [];
  // Controles de Modales
  mostrarMenuPlantillas = signal(false);
  verGraficos = signal(false);
  mostrarCalculadora = signal(false);
  mostrarMapaCorporal = signal(false);
  mostrarModalLaboratorio = signal(false); // ✅ Nuevo
  mostrarCalculadoraRenal = signal(false)
  mostrarMapaHistorial = signal(false);
  puntosMapaHistorial = signal<PuntoDolor[]>([]);
  mostrarModalFarmacia = signal(false);


  tipoConsulta = computed(() => {
    // Si no hay dato, asume GENERAL
    return this.turnoActual()?.prestacionData?.tipoFormulario || 'GENERAL';
  });

  // Datos Temporales
  datosParaCalculadora: any = null;
  puntosMapa: PuntoDolor[] = [];
  datosLaboratorioTemp: any = null; // ✅ Aquí guardamos lo que viene del modal

  // Adjuntos & Listas
  subiendoArchivo = signal(false);
  archivosAdjuntos: { nombre: string, url: string, tipo: 'IMG' | 'PDF' }[] = [];
  listaDerivaciones: { especialidad: string, motivo: string }[] = [];
  estudiosSeleccionados: string[] = [];

  // Datos estáticos
  especialidadesDerivacion = [
    'Cardiología', 'Nutrición', 'Psicología', 'Traumatología',
    'Dermatología', 'Endocrinología', 'Gastroenterología', 'Kinesiología'
  ];
   listaEstudiosComunes = toSignal(
    this.serviciosDiagnostico.obtenerTodos().pipe(
      // Transformamos los objetos {nombre, precio} a solo una lista de nombres strings
      map(servicios => servicios.map(s => s.nombre))
    ),
    { initialValue: [] }
  );


  pedidoLaboratorioActual = signal<PedidoLaboratorio | null>(null);
  consultaForm: FormGroup;
  derivacionForm: FormGroup;

  esDiabetico = computed(() => this.pacienteData()?.perfilClinico?.antecedentes?.some(a => a.includes('Diabetes')) || false);
  esHipertenso = computed(() => this.pacienteData()?.perfilClinico?.antecedentes?.some(a => a.includes('Hipertensión')) || false);

  alertaMetabolica = signal<string[]>([]);


  // Variables para el Buscador CIE-10
  busquedaCie10 = signal('');
  resultadosCie10 = signal<DiagnosticoCIE10[]>([]);
  mostrandoResultadosCie10 = signal(false);

  constructor() {
    this.consultaForm = this.fb.group({
      // --- SIGNOS VITALES ---
      presion: ['', Validators.required],
      temperatura: [''],
      peso: ['', Validators.required],
      altura: [''],
      glucemia: [''],

      // --- SOAP BÁSICO ---
      motivo: ['', Validators.required],
      examenFisico: ['', Validators.required],
      diagnostico: ['', Validators.required],
      tratamiento: ['', Validators.required],
      nuevoAntecedente: [''],

      // --- 🏃 CAMPOS APTO FÍSICO (Nuevos) ---
      checkCorazon: [false],
      checkPulmones: [false],
      checkColumna: [false],
      // Anamnesis de riesgo (Vital para aptos)
      checkMuerteSubita: [false],
      checkDesmayos: [false],
      checkDolorPecho: [false],
      resultadoECG: ['Normal'], // 'Normal', 'Patológico', 'No solicitado'
      observacionesApto: [''],

      // --- 🛡️ CAMPOS CONTROL CRÓNICO (Nuevos) ---
      // Diabetes
      checkPies: [false],       // Revisión de sensibilidad
      hipoglucemias: ['0'],     // Cantidad de eventos en el mes
      // Hipertensión / Cardio
      checkEdemas: [false],     // Hinchazón
      disneaEsfuerzo: [false],  // Falta de aire
      // General
      adherencia: ['Buena'],    // 'Buena', 'Regular', 'Mala'
      cumplimientoDieta: ['Regular'],
      actualizarMedicacion: [true],
      saturacion: [''],
      frecuenciaResp: [''],
      ruidosRespiratorios: [false] // Check si hay sibilancias/crepitantes
    });

    this.derivacionForm = this.fb.group({
      especialidad: [''],
      motivo: ['']
    });


  }

  async ngOnInit() {
    const idTurno = this.route.snapshot.paramMap.get('idTurno');
    if (!idTurno) { this.router.navigate(['/medico/dashboard']); return; }

    try {
      const turno = await this.turnosService.obtenerTurnoPorId(idTurno);
      if (!turno) throw new Error('Turno no encontrado');
      this.turnoActual.set(turno);

      const paciente = await this.pacienteService.obtenerPacientePorId(turno.idPaciente);
      if (paciente) {
        this.pacienteData.set(paciente);
        this.modulosSeleccionados.set(paciente.modulosHabilitados || []);
        // ✅ AUTO-ACTIVACIÓN INTELIGENTE
        // Si ya sabemos que tiene la enfermedad, prendemos el switch automáticamente
        if (this.esDiabetico()) this.showProtoDiabetes.set(true);
        if (this.esHipertenso()) this.showProtoCardio.set(true);
        // Si tiene asma/epoc, prendemos el respiratorio
        if (paciente.perfilClinico?.antecedentes?.some(a => a.includes('Asma') || a.includes('EPOC'))) {
          this.showProtoRespi.set(true);
        }
      }
      this.medicionesService.obtenerHistorial(turno.idPaciente).subscribe(meds => {
        this.medicionesHogar.set(meds);
      });

      this.consultaService.obtenerHistorialPaciente(turno.idPaciente).subscribe(historial => {
        this.historialPrevio.set(historial);
      });

      if ((turno as any).signosVitales) {
        const sv = (turno as any).signosVitales;
        this.consultaForm.patchValue({
          presion: sv.presion, peso: sv.peso, altura: sv.altura, temperatura: sv.temperatura
        });
      }

       // ✅ AGREGAR ESTO: BUSCAR RESULTADOS DE LAB
      this.labService.obtenerPedidoPorTurno(idTurno).subscribe(pedido => {
        if (pedido && pedido.estado === 'LISTO') {
          this.pedidoLaboratorioActual.set(pedido);

          // Opcional: Si quieres guardar estos datos en la consulta automáticamente
          this.datosLaboratorioTemp = pedido.resultados;
          this.notificacionService.showInfoToast('Resultados de laboratorio recibidos.');
        }
      });
    } catch (e) {
      this.loading.set(false);
    } finally {
      this.loading.set(false);
    }

    const user = this.authService.currentUser();
    if (user?.uid) {
      this.plantillasService.obtenerMisPlantillas(user.uid).subscribe(data => {
        this.plantillas.set(data);
      });
    }

    this.consultaForm.valueChanges.subscribe(() => {
      this.detectarRiesgosEnVivo();
    });

    // 4. 🧠 EL MOTOR DE ESCANEO (Nivel Dios)
  // Vigilamos el campo de tratamiento en tiempo real
  this.consultaForm.get('tratamiento')?.valueChanges.subscribe(texto => {
    const alergiasPaciente = this.pacienteData()?.alergias || [];

    // Llamamos al servicio para cruzar el texto con las reglas y las alergias del paciente
    const hallazgos = this.seguridadService.analizarTratamiento(
      texto,
      alergiasPaciente,
      this.reglasSeguridad()
    );

    this.alertasFarmacologicas.set(hallazgos);
  });
  }

  // --- MÉTODO DE DETECCIÓN ---
  detectarRiesgosEnVivo() {
    const form = this.consultaForm.value;
    const paciente = this.pacienteData();
    if (!paciente) return;

    // 1. Calcular IMC al vuelo
    let imc = 0;
    if (form.peso && form.altura) {
      const metros = form.altura / 100;
      imc = form.peso / (metros * metros);
    }

    // 2. Parsear Presión (ej: "140/90")
    let sis = 0, dia = 0;
    if (form.presion && form.presion.includes('/')) {
      const partes = form.presion.split('/');
      sis = Number(partes[0]);
      dia = Number(partes[1]);
    }

    // 3. Obtener datos de laboratorio (del modal temporal o del form)
    // Prioridad: Modal Temp > Formulario
    const lab = this.datosLaboratorioTemp || {};
    // Si no hay en temp, buscar en form (por si cargó glucemia en signos vitales)
    const glucemia = lab.glucemia || form.glucemia;

    // 4. Llamar al servicio
    const criterios = this.asistenteService.analizarSindromeMetabolico({
      sexo: paciente.sexo || 'Masculino',
      imc: imc,
      presionSistolica: sis,
      presionDiastolica: dia,
      glucemia: glucemia ? Number(glucemia) : undefined,
      trigliceridos: lab.trigliceridos ? Number(lab.trigliceridos) : undefined,
      hdl: lab.hdl ? Number(lab.hdl) : undefined
    });

    // 5. Actualizar Señal (Solo si hay 3 o más criterios se considera Síndrome)
    if (criterios.length >= 3) {
      this.alertaMetabolica.set(criterios);
    } else {
      this.alertaMetabolica.set([]);
    }
  }

  // --- MÉTODOS DE LA TOOLBAR ---
  guardarLaboratorio(datos: any) {
    this.datosLaboratorioTemp = datos; // Guardamos en memoria
    this.mostrarModalLaboratorio.set(false);
    this.notificacionService.showSuccessToast('Datos de laboratorio cargados temporalmente.');
    this.detectarRiesgosEnVivo();
  }

  abrirCalculadora() {
    const paciente = this.pacienteData();
    const form = this.consultaForm.value;
    if (!paciente) return;

    let sistolica = 120;
    if (form.presion && form.presion.includes('/')) {
      sistolica = Number(form.presion.split('/')[0]);
    }

    this.datosParaCalculadora = {
      edad: this.calcularEdad(paciente.fechaNacimiento),
      sexo: paciente.sexo,
      fuma: paciente.perfilClinico?.factoresRiesgo?.includes('Fumador') || false,
      diabetes: this.esDiabetico(),
      presionSistolica: sistolica
    };
    this.mostrarCalculadora.set(true);
  }

  insertarRiesgo(texto: string) {
    const actual = this.consultaForm.get('diagnostico')?.value || '';
    this.consultaForm.patchValue({ diagnostico: actual + texto });
    this.mostrarCalculadora.set(false);
  }

  // --- MÉTODOS VARIOS (Plantillas, Derivaciones, PDF, Cloudinary) ---
  togglePlantillas() { this.mostrarMenuPlantillas.update(v => !v); }

  aplicarPlantilla(plantilla: PlantillaMedica) {
    this.consultaForm.patchValue({
      motivo: plantilla.textoMotivo || '',
      examenFisico: plantilla.textoExamen || '',
      tratamiento: plantilla.textoPlan || ''
    });
    this.mostrarMenuPlantillas.set(false);
  }

  agregarDerivacion() {
    const val = this.derivacionForm.value;
    if (val.especialidad && val.motivo) {
      this.listaDerivaciones.push({ especialidad: val.especialidad, motivo: val.motivo });
      this.derivacionForm.reset({ especialidad: '', motivo: '' });
    }
  }
  borrarDerivacion(index: number) { this.listaDerivaciones.splice(index, 1); }

  toggleEstudio(estudio: string, event: any) {
    if (event.target.checked) this.estudiosSeleccionados.push(estudio);
    else this.estudiosSeleccionados = this.estudiosSeleccionados.filter(e => e !== estudio);
  }

  async onAdjuntoSeleccionado(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.subiendoArchivo.set(true);
    try {
      const url = await this.cloudinaryService.subirArchivo(file).toPromise();
      if (url) this.archivosAdjuntos.push({ nombre: file.name, url: url, tipo: file.type.startsWith('image/') ? 'IMG' : 'PDF' });
    } finally { this.subiendoArchivo.set(false); event.target.value = ''; }
  }
  borrarAdjunto(index: number) { this.archivosAdjuntos.splice(index, 1); }

  imprimirReceta() {
    const t = this.consultaForm.get('tratamiento')?.value;
    if (!t) return;
    this.pdfService.generarReceta(this.pacienteData()!, t, this.authService.currentUser()?.displayName || 'Médico');
  }
  imprimirOrdenEstudios() {
    if (this.estudiosSeleccionados.length === 0) return;
    this.pdfService.generarOrdenEstudios(this.pacienteData()!, this.estudiosSeleccionados, this.consultaForm.get('diagnostico')?.value, this.authService.currentUser()?.displayName || 'Médico');
  }
  imprimirDerivacion(d: any) {
    this.pdfService.generarInterconsulta(this.pacienteData()!, d.especialidad, d.motivo, this.authService.currentUser()?.displayName || 'Médico');
  }

  // --- GUARDADO FINAL ---
  // --- GUARDADO FINAL (MÉTODO COMPLETO) ---
  async finalizarConsulta() {
    // 1. LÓGICA PARA APTO FÍSICO
    if (this.tipoConsulta() === 'APTO_FISICO') {
      const f = this.consultaForm.value;
      if (!f.motivo) this.consultaForm.patchValue({ motivo: 'Evaluación para Certificado de Aptitud Física' });
      if (!f.diagnostico) this.consultaForm.patchValue({ diagnostico: 'Examen de Salud - Apto Físico' });

      if (!f.examenFisico) {
        const textoExamen = `Examen Físico:
           - Cardiovascular: ${f.checkCorazon ? 'R1-R2 Normofonéticos' : 'Soplos/Arritmia'}
           - Respiratorio: ${f.checkPulmones ? 'Normal' : 'Ruidos patológicos'}
           - Postura: ${f.checkColumna ? 'Alineada' : 'Alterada'}
           Anamnesis: Muerte Súbita: ${f.checkMuerteSubita ? 'SÍ' : 'No'}, Síncope: ${f.checkDesmayos ? 'SÍ' : 'No'}.
           ECG: ${f.resultadoECG}`;
        this.consultaForm.patchValue({ examenFisico: textoExamen.trim() });
        this.consultaForm.patchValue({ tratamiento: f.observacionesApto || 'Apto físico otorgado.' });
      }
    }

    // 2. LÓGICA PARA CONTROL CRÓNICO
    if (this.tipoConsulta() === 'CONTROL_CRONICO') {
      const f = this.consultaForm.value;
      if (!f.examenFisico) {
        let textoCronico = `Control de Patología Crónica. `;
        if (this.esDiabetico()) textoCronico += `Diabetes: Hipoglucemias: ${f.hipoglucemias}. Pies: ${f.checkPies ? 'OK' : 'No exam'}. `;
        if (this.esHipertenso()) textoCronico += `HTA: Edemas: ${f.checkEdemas ? 'SÍ' : 'NO'}. Disnea: ${f.disneaEsfuerzo ? 'SÍ' : 'NO'}. `;
        this.consultaForm.patchValue({ examenFisico: textoCronico.trim() });
      }
    }

    this.loading.set(true);
    const form = this.consultaForm.value;
    const turno = this.turnoActual()!;
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    // 3. PREPARAR OBJETO CONSULTA (🛡️ Limpieza de Undefined)
    const nuevaConsulta: Consulta = {
      idTurno: turno.id!,
      idPaciente: turno.idPaciente,
      idMedico: currentUser.uid,
      fecha: Timestamp.now(),
      fechaString: new Date().toISOString().split('T')[0],
      signosVitales: {
        presionArterial: form.presion || '',
        peso: Number(form.peso || 0),
        altura: Number(form.altura || 0),
        temperatura: Number(form.temperatura || 0),
        glucemia: (this.esDiabetico() && form.glucemia) ? Number(form.glucemia) : null
      },
      motivoConsulta: form.motivo || '',
      examenFisico: form.examenFisico || '',
      diagnostico: form.diagnostico || '',
      tratamiento: form.tratamiento || '',
      mapaCorporal: this.puntosMapa || [],
      datosLaboratorio: this.datosLaboratorioTemp || null, // ✅ Cambiado undefined por null
      archivosAdjuntos: this.archivosAdjuntos || [],
      estudiosSolicitados: this.estudiosSeleccionados || [],
      derivaciones: this.listaDerivaciones || [],
      esControlCronico: this.esDiabetico() || this.esHipertenso()
    };

    try {
      // 4. DETECTAR NUEVOS ANTECEDENTES
      let nuevosCronicos: string[] | null = null; // ✅ Cambiado undefined por null
      if (form.nuevoAntecedente && form.nuevoAntecedente.trim() !== '') {
        const actuales = this.pacienteData()?.perfilClinico?.antecedentes || [];
        if (!actuales.includes(form.nuevoAntecedente)) {
          nuevosCronicos = [...actuales, form.nuevoAntecedente];
        }
      }

      // 5. GUARDADO EN FIREBASE
      await this.consultaService.finalizarConsulta(
        nuevaConsulta,
        nuevosCronicos ? nuevosCronicos : undefined // Si es null, pasamos undefined para que el servicio no actualice
      );

      // 6. ACTUALIZAR PERFIL (Módulos y Medicación)
      const updateData: any = {
        modulosHabilitados: this.modulosSeleccionados() || []
      };

      if (this.tipoConsulta() === 'CONTROL_CRONICO' && form.actualizarMedicacion) {
        updateData['perfilClinico.medicacionHabitual'] = form.tratamiento || '';
      }

      await this.pacienteService.actualizarPaciente(turno.idPaciente, updateData);

      // 7. PEDIDO DE LABORATORIO
      if (this.estudiosSeleccionados && this.estudiosSeleccionados.length > 0) {
        await this.labService.crearPedidoDesdeConsulta({
          idPaciente: turno.idPaciente,
          idTurno: turno.id!,
          idMedico: currentUser.uid,
          medicoNombre: currentUser.displayName || 'Médico',
          pacienteNombre: this.pacienteData()?.nombreCompleto || 'Paciente',
          pacienteDni: this.pacienteData()?.dni || '',
          estudios: this.estudiosSeleccionados,
          tipoEstudio: this.estudiosSeleccionados.join(', '),
          urlArchivoExterno: null // ✅ Null en lugar de undefined
        });
      }

      this.notificacionService.showSuccessToast('Consulta finalizada.');
      this.router.navigate(['/medico/dashboard']);

    } catch (e) {
      console.error("ERROR AL GUARDAR:", e); // Esto te dirá el error real en la consola
      this.notificacionService.showAlertError('Error', 'No se pudo guardar la consulta. Revisa los datos.');
    } finally {
      this.loading.set(false);
    }
  }

  volver() { this.router.navigate(['/medico/dashboard']); }

  private calcularEdad(fechaNac?: string): number {
    if (!fechaNac) return 0;

    const hoy = new Date();
    const cumpleanos = new Date(fechaNac);

    // 1. Resta básica de años
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();

    // 2. Ajuste: ¿Ya pasó su cumpleaños este año?
    const mesActual = hoy.getMonth();
    const mesCumple = cumpleanos.getMonth();

    // Si estamos en un mes anterior al cumple, O es el mismo mes pero día anterior
    if (mesActual < mesCumple || (mesActual === mesCumple && hoy.getDate() < cumpleanos.getDate())) {
      edad--; // Le restamos 1 porque todavía no cumplió
    }

    return edad;
  }
  abrirCalculadoraRenal() {
    // Necesitamos pasar creatinina si ya la cargó
    const creatinina = this.datosLaboratorioTemp?.creatinina || this.consultaForm.get('creatinina')?.value;

    this.datosParaCalculadora = {
      edad: this.calcularEdad(this.pacienteData()?.fechaNacimiento),
      sexo: this.pacienteData()?.sexo,
      creatinina: creatinina ? Number(creatinina) : null
    };
    this.mostrarCalculadoraRenal.set(true);
  }

  abrirMapaHistorial(puntos: any[]) {
    this.puntosMapaHistorial.set(puntos as PuntoDolor[]);
    this.mostrarMapaHistorial.set(true);
  }
  abrirFarmacia() {
    this.mostrarModalFarmacia.set(true);
  }

  onVentaConfirmada(items: any[]) {
    // Agregamos lo vendido a la lista de la consulta actual
    this.insumosVendidos.push(...items);
    this.mostrarModalFarmacia.set(false);
    // El modal ya mostró el toast de éxito, no hace falta otro
  }

  // Método para buscar (conectado al input)
  buscarCie10(evento: any) {
    const termino = evento.target.value;
    this.busquedaCie10.set(termino);

    if (termino.length >= 2) {
      this.cie10Service.buscar(termino).subscribe(res => {
        this.resultadosCie10.set(res);
        this.mostrandoResultadosCie10.set(true);
      });
    } else {
      this.mostrandoResultadosCie10.set(false);
    }
  }

  // Método al hacer clic en una opción
  seleccionarDiagnostico(diag: DiagnosticoCIE10) {
    const textoActual = this.consultaForm.get('diagnostico')?.value || '';

    // Formato profesional: "CÓDIGO - Descripción"
    const nuevoTexto = `[${diag.codigo}] ${diag.descripcion}`;

    // Si ya había texto, lo agregamos en una nueva línea
    const textoFinal = textoActual ? `${textoActual}\n${nuevoTexto}` : nuevoTexto;

    this.consultaForm.patchValue({ diagnostico: textoFinal });

    // Limpiar buscador
    this.busquedaCie10.set('');
    this.mostrandoResultadosCie10.set(false);
  }

  imprimirTicketFarmacia() {
    if (this.insumosVendidos.length === 0) return;

    const total = this.insumosVendidos.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    this.pdfService.generarReciboPago({
      paciente: this.pacienteData()?.nombreCompleto || 'Consumidor Final',
      dni: this.pacienteData()?.dni,
      concepto: 'Venta de Farmacia / Insumos',
      items: this.insumosVendidos.map(i => ({
        descripcion: i.nombre,
        cantidad: i.cantidad,
        precio: i.precio
      })),
      total: total,
      formaPago: 'Efectivo' // Asumimos efectivo por la lógica anterior
    });
  }

  copiarMedicacionHabitual() {
    const medicacion = this.pacienteData()?.perfilClinico?.medicacionHabitual;

    if (medicacion) {
      // Agregamos al texto existente o reemplazamos
      const actual = this.consultaForm.get('tratamiento')?.value || '';
      const nuevoTexto = actual ? `${actual}\n\n[Medicación Habitual]: ${medicacion}` : medicacion;

      this.consultaForm.patchValue({ tratamiento: nuevoTexto });
      this.notificacionService.showInfoToast('Medicación habitual copiada.');
    } else {
      this.notificacionService.showAlertWarning('Vacío', 'El paciente no tiene medicación habitual registrada en su perfil.');
    }
  }

  // Para Apto Físico: Genera el certificado PDF
  imprimirCertificadoApto() {
    const f = this.consultaForm.value;
    const datosParaPDF = {
      corazon: f.checkCorazon,
      pulmones: f.checkPulmones,
      columna: f.checkColumna,
      ecg: f.resultadoECG
    };

    this.pdfService.generarCertificadoApto(
      this.pacienteData()!,
      datosParaPDF,
      this.authService.currentUser()?.displayName || 'Médico'
    );
  }
  toggleModulo(id: string) {
  const actual = this.modulosSeleccionados();
  if (actual.includes(id)) {
    this.modulosSeleccionados.set(actual.filter(m => m !== id));
  } else {
    this.modulosSeleccionados.set([...actual, id]);
  }
}

/**
 * Helper para el HTML
 */
tieneModulo(id: string): boolean {
  return this.modulosSeleccionados().includes(id);
}
}
