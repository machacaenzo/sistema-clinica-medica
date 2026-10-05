# ClinicaGestionApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
-------------------------------------------------------
----------ESTRUCTURA DEL PROYECTO-------------
ng generate component layouts/admin-layout --skip-tests
ng generate component layouts/public-layout --skip-tests
ng generate component layouts/auth-layout --skip-tests
ng generate component shared/components/sidebar --skip-tests
ng generate component shared/components/navbar --skip-tests
ng generate component shared/components/footer --skip-tests
ng generate component features/auth/login --skip-tests
ng generate component features/auth/register --skip-tests


ng generate component layouts/medico-layout --skip-tests
ng generate component layouts/empleado-layout --skip-tests
ng generate component layouts/components/admin-sidebar --skip-tests
ng generate component layouts/components/medico-sidebar --skip-tests
ng generate component layouts/components/empleado-sidebar --skip-tests

ng generate service core/services/firestore --skip-tests
ng generate service core/services/notificaciones --skip-tests
ng generate service core/services/image --skip-tests  
ng generate guard core/guards/auth --skip-tests
ng generate guard core/guards/public --skip-tests
-----------------USUARIOS--------------------------
ng generate interface core/interfaces/usuario --type=model 
ng generate interface core/interfaces/paciente --type=model 
ng generate service core/services/auth --skip-tests
ng generate component features/admin/gestion-usuarios --skip-tests
ng generate service features/admin/gestion-usuarios/usuario --skip-tests
ng generate component features/auth/forgot-password --skip-tests
ng generate component features/auth/verify-email --skip-tests
----------------PACIENTES----------------------------
ng generate component features/admin/gestion-pacientes --skip-tests
ng generate service features/admin/gestion-pacientes/paciente --skip-tests
--------------------CLINICA-------------------
ng generate interface core/interfaces/clinica --type=model 
ng generate component features/admin/config-clinica --skip-tests
ng generate service features/admin/config-clinica/clinica --skip-tests
-------------------GESTION DE TAREAS----------------------------
ng generate interface core/interfaces/tarea --type=model 
ng generate component features/admin/gestion-empleados/asignar-tarea --skip-tests
ng generate service features/admin/gestion-empleados/asignar-tarea/tarea  --skip-tests
-------------------OBRA-SOCIAL---------------------------
ng generate component features/admin/gestion-obras-sociales --skip-tests
ng generate interface core/interfaces/obra-social --type=model
ng generate service features/admin/gestion-obras-sociales/obra-social --skip-tests
-----------------STOCK DE INSUMOS----------------------------
ng generate component features/admin/gestion-insumos --skip-tests
ng generate interface core/interfaces/insumo --type=model
ng generate service features/admin/gestion-insumos/insumo --skip-tests
-----------------TURNOS---------------------------------------
ng generate interface core/interfaces/turno --type=model
ng generate service core/services/turnos --skip-tests
ng generate component features/admin/gestion-turnos --skip-tests
ng generate component features/public/solicitar-turno --skip-tests
ng generate component features/admin/gestion-turnos --skip-tests
ng generate component features/public/solicitar-turno/components/simulacion-pago --skip-tests
------------------PACIENTE------------------------------
ng generate component features/paciente/mis-turnos --skip-tests
ng g c features/paciente/mi-perfil --skip-tests
ng g c features/paciente/billetera --skip-tests
------------------TRANSACCIONES---------------------------
ng generate interface core/interfaces/transaccion --type=model
ng generate service core/services/transacciones --skip-tests
------------------PUBLIC----------------------------------
ng g c features/public/nosotros --skip-tests
ng g c features/public/staff --skip-tests
ng g c features/public/obras-sociales --skip-tests
ng g c features/public/contacto --skip-tests
ng g s features/public/contacto/contacto --skip-tests
ng g interface core/interfaces/MensajeContacto  --type=model
----------------EMPELADOS----------------------
ng g c features/empleados/mi-perfil --skip-tests
ng g c features/empleados/mis-tareas --skip-tests
ng g c features/empleados/enfermeria --skip-tests
------------MEDICO-----------------
ng g s features/medico/services/especialista --skip-tests
ng g c features/medico/components/mis-pacientes --skip-tests
ng g c features/medico/components/atender-paciente --skip-tests
ng g c features/medico/components/historia-clinica --skip-tests
ng g c features/medico/components/detalle-paciente --skip-tests
ng g interface core/interfaces/Consulta  --type=model
ng g c features/medico/components/ver-historia --skip-tests
ng g s features/medico/services/asistente-clinico --skip-tests
ng g s features/medico/services/medico-agenda --skip-tests
ng g s features/medico/services/consulta-medica --skip-tests
ng g c features/medico/components/graficos-evolucion --skip-tests
ng g c features/medico/components/agenda --skip-tests
ng g c features/medico/components/calculadora-riesgo --skip-tests
-----------------------GRAFICOS-------------------------------
npm install chart.js ng2-charts
----------------VIDEO CONSULTA--------
npm i --save-dev @types/jitsi-meet
ng g c features/medico/components/sala-video --skip-tests
--------------------------------------------------------------------


----------------------------------------------------------------------
reglas de firebase 
----------------------------------------------------------------------

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // =================================================================
    // 1. FUNCIONES AUXILIARES (HELPERS)
    // =================================================================
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() == 'administrador';
    }
    
    function isMedico() {
      return isAuthenticated() && getUserRole() == 'medico';
    }
    
    function isEmpleado() { 
      return isAuthenticated() && getUserRole() == 'empleado';
    }

    function isStaff() {
      return isAdmin() || isMedico() || isEmpleado();
    }
    
    function isGestion() { 
      return isAdmin() || isEmpleado();
    }

    // =================================================================
    // 2. REGLAS DE COLECCIONES DE IDENTIDAD
    // =================================================================

    match /usuarios/{userId} {
      allow read: if isOwner(userId) || isStaff(); 
      allow create: if isOwner(userId);
      allow update: if isAdmin() || isOwner(userId);
      allow delete: if false;
    }

    match /pacientes/{pacienteId} {
      allow read: if isOwner(pacienteId) || isStaff();
      allow write: if isOwner(pacienteId) || isGestion() || isMedico() || isAdmin();
    }

    match /medicos/{medicoId} {
      allow read: if true; 
      allow write: if isAdmin();
    }

    match /empleados/{empleadoId} {
      allow read: if isStaff(); 
      allow write: if isAdmin();
    }

    // =================================================================
    // 3. MÓDULOS CLÍNICOS Y PREVENCIÓN
    // =================================================================

    match /consultas_medicas/{consultaId} {
      allow read: if isOwner(resource.data.idPaciente) || isMedico() || isAdmin();
      allow create: if isMedico();
      allow update: if isMedico() && resource.data.idMedico == request.auth.uid;
    }

    match /plantillas_medicas/{plantillaId} {
      allow read: if isMedico() && resource.data.uidMedico == request.auth.uid;
      allow create: if isMedico() && request.resource.data.uidMedico == request.auth.uid;
      allow update, delete: if isMedico() && resource.data.uidMedico == request.auth.uid;
    }

    // --- REGLAS DE HÁBITOS (PROTECCIÓN DE DOS CAPAS) ---
    match /pacientes/{pacienteId}/historial_habitos/{habitoId} {
      allow read: if isOwner(pacienteId) || isStaff();
      allow create: if isOwner(pacienteId);
      allow update, delete: if false;
    }

    // Permite al Admin y Médico hacer la consulta global para el Dashboard Epidemiológico
    match /{path=**}/historial_habitos/{habitoId} {
      allow read: if isAdmin() || isMedico();
    }

    match /mediciones_pacientes/{docId} {
      allow create: if isAuthenticated() && request.resource.data.idPaciente == request.auth.uid;
      allow read: if isAuthenticated() && (resource.data.idPaciente == request.auth.uid || isStaff());
      allow delete: if isOwner(resource.data.idPaciente);
      allow update: if false;
    }

    // =================================================================
    // 4. PROTOCOLO DE PRIVACIDAD (QR Y AUDITORÍA)
    // =================================================================

    match /autorizaciones_descarga_hc/{tokenId} {
      allow create: if isAuthenticated();
      allow read: if isStaff();
      allow delete: if isStaff();
      allow update: if false;
    }

    match /logs_seguridad_hc/{logId} {
      allow create: if isStaff(); 
      allow read: if isAdmin();   
      allow update, delete: if false; 
    }

    // =================================================================
    // 5. GESTIÓN OPERATIVA Y FINANCIERA
    // =================================================================

    match /turnos/{turnoId} {
      allow list: if true; 
      allow get: if isOwner(resource.data.idPaciente) || isStaff();
      allow create: if isAuthenticated();
      // Permitir al paciente calificar y al staff gestionar estados
      allow update: if isStaff() || isOwner(resource.data.idPaciente);
    }

    match /transacciones/{txId} {
      allow read: if isOwner(resource.data.idPaciente) || isGestion();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    // =================================================================
    // 6. RECURSOS Y AUDITORÍA GENERAL
    // =================================================================

    match /mensajes_web/{document} {
      allow create: if true;
      allow read, update, delete: if isGestion(); 
    }

    match /clinica/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /obras_sociales/{osId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /prestaciones/{id} {
      allow read: if true; 
      allow write: if isAdmin();
    }

    match /insumos/{insumoId} {
      allow read: if isStaff();
      allow write: if isGestion() || isMedico(); 
    }

    match /insumos_movimientos/{movId} {
      allow read: if isStaff();
      allow create: if isStaff(); 
      allow update, delete: if false;
    }

    match /tareas/{tareaId} {
      allow read, create, update: if isStaff(); 
      allow delete: if isAdmin() || resource.data.idCreador == request.auth.uid;
    }

    match /tareas_plantillas/{plantillaId} {
      allow read: if isAdmin() || resource.data.idPropietario == request.auth.uid;
      allow create: if isStaff();
      allow update, delete: if isAdmin() || resource.data.idPropietario == request.auth.uid;
    }

    match /logs_ingresos/{logId} {
      allow create: if isAuthenticated();
      allow read: if isAdmin();
    }

    match /historias_clinicas/{hcId} {
      allow read: if isOwner(resource.data.idPaciente) || isMedico() || isAdmin();
      allow create: if isMedico();
      allow update: if isMedico() && resource.data.idMedico == request.auth.uid;
    }
    // =================================================================
    // REGLAS PARA SERVICIOS DE DIAGNÓSTICO (NUEVO MÓDULO)
    // =================================================================

    // 1. Catálogo de Estudios (Laboratorio, ECG, etc.)
    match /servicios_diagnostico/{servicioId} {
      // Cualquier usuario (incluido visitante) puede leer los servicios y sus precios
      allow read: if true; 
      
      // Solo el Administrador puede crear, editar o borrar estudios del catálogo
      allow write: if isAdmin();
    }

    // 2. Turnos de Servicios (La nueva colección para agendar Lab/ECG)
    match /turnos_servicios/{turnoServId} {
      // El paciente dueño del turno o el Staff pueden leerlo
      allow read: if isAuthenticated() && (isOwner(resource.data.idPaciente) || isStaff());
      
      // Cualquier usuario logueado puede crear un turno de servicio (al reservar combo)
      allow create: if isAuthenticated();
      
      // Solo el Staff (Admin o el nuevo rol de Laboratorio) puede actualizar resultados
      allow update: if isStaff();
      
      // Por integridad contable, no permitimos borrar registros de turnos de servicio
      allow delete: if false;
    }
    // =================================================================
    // REGLAS DEL GUARDIÁN FARMACOLÓGICO
    // =================================================================
    match /reglas_seguridad/{reglaId} {
      // Los Médicos y Admins necesitan leer las reglas para que el sistema valide
      allow read: if isAdmin() || isMedico();
      
      // Solo el Administrador (Director Médico) puede gestionar el Vademécum
      allow write: if isAdmin();
    }
    match /notificaciones_pacientes/{notifId} {
      // El admin/médico pueden crear notificaciones
      allow create: if isStaff();
      // El paciente SOLO puede leer las suyas
      allow read: if isAuthenticated() && request.auth.uid == resource.data.idPaciente;
      // El paciente solo puede marcar como leída (update parcial)
      allow update: if isAuthenticated() && request.auth.uid == resource.data.idPaciente;
    }
    
    // REGLAS PARA PEDIDOS DE LABORATORIO 
    match /pedidos_laboratorio/{pedidoId} {
      // 1. LEER: Staff o el propio Paciente dueño del dato
      allow read: if isStaff() || (isAuthenticated() && request.auth.uid == resource.data.idPaciente);
      
      // 2. CREAR: 
      // Permitimos si es Médico (desde consulta) 
      // O si es el Paciente creando su propio pedido (desde el Wizard de Turnos)
      allow create: if isMedico() || (isAuthenticated() && request.resource.data.idPaciente == request.auth.uid);
      
      // 3. ACTUALIZAR: El Técnico de Lab o el Médico
      allow update: if isStaff();
      
      // 4. BORRAR: Protegemos la integridad
      allow delete: if false;
    }
  }
}
