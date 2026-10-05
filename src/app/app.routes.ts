import { Routes } from '@angular/router';
import { canActivate, redirectUnauthorizedTo } from '@angular/fire/auth-guard';

// --- LAYOUTS ---
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { MedicoLayoutComponent } from './layouts/medico-layout/medico-layout.component';
import { EmpleadoLayoutComponent } from './layouts/empleado-layout/empleado-layout.component';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';

// --- GUARDS ---
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { roleGuard } from './core/guards/role.guard';
import { loginGuard } from './core/guards/login.guard';
import { invitadoOPacienteGuard } from './core/guards/invitado-o-paciente.guard';

export const routes: Routes = [

  // 1. AUTH
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [publicGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'verify-email', loadComponent: () => import('./features/auth/verify-email/verify-email.component').then(m => m.VerifyEmailComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // 2. ADMINISTRADOR
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'usuarios', loadComponent: () => import('./features/admin/gestion-usuarios/gestion-usuarios.component').then(m => m.GestionUsuariosComponent) },
      { path: 'medicos', loadComponent: () => import('./features/admin/gestion-medicos/gestion-medicos.component').then(m => m.GestionMedicosComponent) },
      { path: 'empleados', loadComponent: () => import('./features/admin/gestion-empleados/gestion-empleados.component').then(m => m.GestionEmpleadosComponent) },
      { path: 'pacientes', loadComponent: () => import('./features/admin/gestion-pacientes/gestion-pacientes.component').then(m => m.GestionPacientesComponent) },
      { path: 'config', loadComponent: () => import('./features/admin/config-clinica/config-clinica.component').then(m => m.ConfigClinicaComponent) },
      { path: 'obras-sociales', loadComponent: () => import('./features/admin/gestion-obras-sociales/gestion-obras-sociales.component').then(m => m.GestionObrasSocialesComponent) },
      { path: 'insumos', loadComponent: () => import('./features/admin/gestion-insumos/gestion-insumos.component').then(m => m.GestionInsumosComponent) },
      { path: 'turnos', loadComponent: () => import('./features/admin/gestion-turnos/gestion-turnos.component').then(m => m.GestionTurnosComponent) },
      { path: 'nuevo-turno', loadComponent: () => import('./features/admin/nuevo-turno-admin/nuevo-turno-admin.component').then(m => m.NuevoTurnoAdminComponent) },
      { path: 'mensajes', loadComponent: () => import('./features/admin/mensajes-web/mensajes-web.component').then(m => m.MensajesWebComponent) },
      { path: 'caja', loadComponent: () => import('./features/admin/movimientos-caja/movimientos-caja.component').then(m => m.MovimientosCajaComponent)},
      {
      path: 'prestaciones',
      loadComponent: () => import('./features/admin/gestion-prestaciones/gestion-prestaciones.component').then(m => m.GestionPrestacionesComponent)
      },
      {
        path: 'reportes-clinicos',
        loadComponent: () => import('./features/admin/reportes-clinicos/reportes-clinicos.component').then(m => m.ReportesClinicosComponent)
      },
      {
        path: 'validar-credencial',
        loadComponent: () => import('./features/admin/validador-hc/validador-hc.component').then(m => m.ValidadorHcComponent)
      },
      { path: 'logs-seguridad', loadComponent: () => import('./features/admin/logs-auditoria/logs-auditoria.component').then(m => m.LogsAuditoriaComponent) },
      {
        path: 'servicios-diagnostico',
        loadComponent: () => import('./features/admin/gestion-servicios-diagnostico/gestion-servicios-diagnostico.component').then(m => m.GestionServiciosDiagnosticoComponent)
      },
      {
        path: 'seguridad-farmaco',
        loadComponent: () => import('./features/admin/gestion-seguridad-farmaco/gestion-seguridad-farmaco.component').then(m => m.GestionSeguridadFarmacoComponent)
      },
      {
        path: 'contingencias',
        loadComponent: () => import('./features/admin/gestion-contingencias/gestion-contingencias.component').then(m => m.GestionContingenciasComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // 3. MÉDICO
  {
    path: 'medico',
    component: MedicoLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['medico'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/medico/components/mis-pacientes/mis-pacientes.component').then(m => m.MisPacientesComponent)
      },
      {
        path: 'atender/:idTurno',
        loadComponent: () => import('./features/medico/components/atender-paciente/atender-paciente.component').then(m => m.AtenderPacienteComponent)
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./features/medico/components/cartera-pacientes/cartera-pacientes.component').then(m => m.CarteraPacientesComponent)
      },
      {
        path: 'pacientes/:idPaciente',
        loadComponent: () => import('./features/medico/components/ver-historia/ver-historia.component').then(m => m.VerHistoriaComponent)
      },

      // ✅ RUTA NUEVA: AGENDA VISUAL
      {
        path: 'agenda',
        loadComponent: () => import('./features/medico/components/agenda/agenda.component').then(m => m.AgendaComponent)
      },

      {
        path: 'mi-perfil', // O el nombre que quieras
        loadComponent: () => import('./features/medico/components/mi-perfil-medico/mi-perfil-medico.component').then(m => m.MiPerfilMedicoComponent)
      },
      {
        path: 'mis-plantillas',
        loadComponent: () => import('./features/medico/components/mis-plantillas/mis-plantillas.component').then(m => m.MisPlantillasComponent)
      },
        {
        path: 'atender-video/:idTurno',
        loadComponent: () => import('./features/medico/components/atender-video/atender-video.component').then(m => m.AtenderVideoComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // 4. EMPLEADO
  {
    path: 'empleado',
    component: EmpleadoLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['empleado'] },
    children: [
      { path: 'mi-perfil', loadComponent: () => import('./features/empleados/mi-perfil/mi-perfil.component').then(m => m.MiPerfilEmpleadoComponent) },
      { path: 'mis-tareas', loadComponent: () => import('./features/empleados/mis-tareas/mis-tareas.component').then(m => m.MisTareasComponent) },

      // ✅ ENFERMERÍA (Asegurar ruta correcta)
      {
        path: 'triage',
        loadComponent: () => import('./features/empleados/enfermeria/enfermeria.component').then(m => m.EnfermeriaComponent)
      },

      // OPERATIVOS
      { path: 'pacientes', loadComponent: () => import('./features/admin/gestion-pacientes/gestion-pacientes.component').then(m => m.GestionPacientesComponent) },
      { path: 'turnos', loadComponent: () => import('./features/admin/gestion-turnos/gestion-turnos.component').then(m => m.GestionTurnosComponent) },
      { path: 'nuevo-turno', loadComponent: () => import('./features/admin/nuevo-turno-admin/nuevo-turno-admin.component').then(m => m.NuevoTurnoAdminComponent) },
      { path: 'medicos', loadComponent: () => import('./features/admin/gestion-medicos/gestion-medicos.component').then(m => m.GestionMedicosComponent) },
      { path: 'obras-sociales', loadComponent: () => import('./features/admin/gestion-obras-sociales/gestion-obras-sociales.component').then(m => m.GestionObrasSocialesComponent) },
      { path: 'mensajes', loadComponent: () => import('./features/admin/mensajes-web/mensajes-web.component').then(m => m.MensajesWebComponent) },

      // LOGÍSTICA
      { path: 'insumos', loadComponent: () => import('./features/admin/gestion-insumos/gestion-insumos.component').then(m => m.GestionInsumosComponent) },

      // SUPERVISIÓN
      { path: 'equipo', loadComponent: () => import('./features/admin/gestion-empleados/gestion-empleados.component').then(m => m.GestionEmpleadosComponent) },
      {
        path: 'laboratorio',
        loadComponent: () => import('./features/empleados/laboratorio/laboratorio.component').then(m => m.LaboratorioComponent)
      },

      { path: '', redirectTo: 'mi-perfil', pathMatch: 'full' }
    ]
  },

  // 5. PÚBLICO / PACIENTE
  {
    path: 'public',
    component: PublicLayoutComponent,
    children: [
      { path: 'home', loadComponent: () => import('./features/public/home/home.component').then(m => m.HomeComponent) },
      { path: 'nosotros', loadComponent: () => import('./features/public/nosotros/nosotros.component').then(m => m.NosotrosComponent) },
      { path: 'staff', loadComponent: () => import('./features/public/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'obras-sociales', loadComponent: () => import('./features/public/obras-sociales/obras-sociales.component').then(m => m.ObrasSocialesComponent) },
      { path: 'contacto', loadComponent: () => import('./features/public/contacto/contacto.component').then(m => m.ContactoComponent) },

      {
      path: 'acerca-de',
      loadComponent: () => import('./features/public/acerca-de/acerca-de.component').then(m => m.AcercaDeComponent)
    },
      {
        path: 'solicitar-turno',
        canActivate: [invitadoOPacienteGuard],
        loadComponent: () => import('./features/public/solicitar-turno/solicitar-turno.component').then(m => m.SolicitarTurnoComponent)
      },

      // ÁREA PRIVADA PACIENTE
      {
        path: 'mis-turnos',
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'sin_rol'] },
        loadComponent: () => import('./features/paciente/mis-turnos/mis-turnos.component').then(m => m.MisTurnosComponent)
      },
      {
        path: 'mi-perfil',
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'sin_rol'] },
        loadComponent: () => import('./features/paciente/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent)
      },
      {
        path: 'mi-billetera',
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'sin_rol'] },
        loadComponent: () => import('./features/paciente/billetera/billetera.component').then(m => m.BilleteraComponent)
      },
      {
        path: 'mis-mediciones', // ✅ RUTA NUEVA
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'sin_rol'] },
        loadComponent: () => import('./features/paciente/mis-mediciones/mis-mediciones.component').then(m => m.MisMedicionesComponent)
      },
      {
        path: 'mi-historial',
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'sin_rol'] },
        loadComponent: () => import('./features/paciente/mi-historial/mi-historial.component').then(m => m.MiHistorialComponent)
      },

      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },



  {
    // ✅ CAMBIO: Ruta directa, SIN PublicLayout ni children
    path: 'sala-virtual/:idTurno',
    ...canActivate(() => redirectUnauthorizedTo(['/auth/login'])),
    loadComponent: () => import('./features/medico/components/sala-video/sala-video.component').then(m => m.SalaVideoComponent)
  },


  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/public/home' }
];
