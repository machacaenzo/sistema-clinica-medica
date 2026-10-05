import { Firestore, collection, addDoc, Timestamp } from '@angular/fire/firestore';

import { Injectable, inject, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from '@angular/fire/auth';

// --- IMPORTS ---
import { Usuario } from '../interfaces/usuario.model';
// Nota: Ya no importamos Paciente ni PacienteService aquí porque la creación es "Lazy"
import { UsuarioService } from '../../features/admin/gestion-usuarios/usuario.service';
import { NotificacionService } from './notificaciones.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private notificationService: NotificacionService = inject(NotificacionService);
  private usuarioService: UsuarioService = inject(UsuarioService);
  private firestore = inject(Firestore);

  currentUser: WritableSignal<Usuario | null | undefined> = signal(undefined);

 constructor() {
    // Observador de estado de sesión (Se ejecuta al recargar o entrar)
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {

      if (firebaseUser) {
        // 1. Buscamos el documento en Firestore
        const userProfile = await this.usuarioService.obtenerUsuarioPorId(firebaseUser.uid);

        if (userProfile) {

          // 🔥 CORRECCIÓN DEL BUG: SINCRONIZACIÓN AUTOMÁTICA 🔥
          // Si Firebase dice TRUE pero Firestore dice FALSE -> Actualizamos la BD
          if (firebaseUser.emailVerified && !userProfile.emailVerified) {

            // A. Actualizamos Firestore en segundo plano
            await this.usuarioService.actualizarUsuario(userProfile.uid, { emailVerified: true });

            // B. Actualizamos el objeto local para que la App reaccione YA
            userProfile.emailVerified = true;
            console.log('✅ Sincronización: Email verificado actualizado en Base de Datos.');
          }

          // 2. Seteamos el usuario en la App (con el dato ya corregido)
          this.currentUser.set(userProfile);

          // 3. Lógica de Redirección de Seguridad
          // Si NO está verificado y NO está en la pantalla de verificar/login -> Mandarlo a verificar
          if (!userProfile.emailVerified &&
              !window.location.href.includes('verify-email') &&
              !window.location.href.includes('auth')) {
            this.router.navigate(['/auth/verify-email']);
          }

        } else {
           // Usuario en Auth pero borrado de la BD
           this.currentUser.set(null);
           await signOut(this.auth);
        }
      } else {
        this.currentUser.set(null);
      }
    });
  }

  private async registrarLog(user: any) { // Puede ser Usuario o any
    try {
      const col = collection(this.firestore, 'logs_ingresos');
      await addDoc(col, {
        uid: user.uid,
        email: user.email,
        rol: user.role || 'invitado', // ✅ AHORA SÍ LEEMOS EL ROL
        fecha: Timestamp.now(),
        navegador: navigator.userAgent
      });
      console.log('📝 Log registrado con rol:', user.role);
    } catch (e) {
      console.error('Error log:', e);
    }
  }
  /**
   * REGISTRO CON EMAIL/PASSWORD
   * Crea solo el Usuario base con rol 'sin_rol'.
   * NO crea perfil de paciente (eso se hace después).
   */
  async register(data: { email: string, password: string, nombreCompleto: string }): Promise<void> {
    try {
      const { email, password, nombreCompleto } = data;

      // 1. Crear en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const { user: firebaseUser } = userCredential;

      // 2. Crear documento en 'usuarios'
      const nuevoUsuario: Usuario = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        role: 'sin_rol', // <--- Nace neutro
        displayName: nombreCompleto,
        emailVerified: false,
        estado: 'Activo',
        fotoURL: '' // Inicializamos vacío para Base64 futuro
      };

      // 3. Guardar en Firestore
      await this.usuarioService.crearUsuario(nuevoUsuario);

      // 4. Verificar Email
      await sendEmailVerification(firebaseUser);

      // 5. Salir
      this.notificationService.showAlertSuccess(
        `¡Registro Exitoso, ${nombreCompleto}!`,
        'Hemos enviado un enlace a tu correo. Por favor, verifica tu cuenta.'
      );

      await signOut(this.auth);
      this.router.navigate(['/auth/login']);

    } catch (error: any) {
      this.handleAuthError(error);
      throw error;
    }
  }

/**
   * LOGIN CON EMAIL/PASSWORD
   */
  async login({ email, password }: { email: string; password: string }): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = userCredential.user;

      // 1. Verificar Email Obligatorio
      if (!firebaseUser.emailVerified) {
        this.notificationService.showAlertWarning(
          'Verifica tu cuenta',
          'Debes validar tu email antes de ingresar.'
        );
        await signOut(this.auth);
        this.router.navigate(['/auth/verify-email']);
        return;
      }

      // 2. Verificar Estado en Firestore
      const userProfile = await this.usuarioService.obtenerUsuarioPorId(firebaseUser.uid);

      if (userProfile && userProfile.estado === 'Activo') {

        // ✅ 3. REGISTRAR LOG DE INGRESO
        await this.registrarLog(userProfile); 

        this.notificationService.showSuccessToast(`¡Bienvenido, ${userProfile.displayName}!`);
        this.redirectToPanel(userProfile);

      } else if (userProfile && userProfile.estado === 'Inactivo') {
        await signOut(this.auth);
        this.notificationService.showAlertWarning('Cuenta Inactiva', 'Contacta al administrador.');
      } else {
        await signOut(this.auth);
        this.notificationService.showAlertError('Error', 'Perfil de usuario no encontrado.');
      }
    } catch (error: any) {
      this.handleAuthError(error);
    }
  }

  /**
   * LOGIN/REGISTRO CON GOOGLE
   */
  async loginWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);
      const firebaseUser = userCredential.user;

      // Verificar si ya existe en Firestore
      const existingUser = await this.usuarioService.obtenerUsuarioPorId(firebaseUser.uid);

      if (existingUser) {
        // --- USUARIO EXISTENTE ---
        if (existingUser.estado === 'Activo') {

          // ✅ REGISTRAR LOG
          await this.registrarLog(existingUser);

          this.notificationService.showSuccessToast(`¡Hola de nuevo, ${existingUser.displayName}!`);
          this.redirectToPanel(existingUser);
        } else {
          await signOut(this.auth);
          this.notificationService.showAlertWarning('Acceso Denegado', 'Tu cuenta está desactivada.');
        }
      } else {
        // --- USUARIO NUEVO ---
        const nuevoUsuario: Usuario = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          role: 'sin_rol',
          displayName: firebaseUser.displayName || 'Usuario Google',
          emailVerified: true,
          estado: 'Activo',
          fotoURL: ''
        };

        await this.usuarioService.crearUsuario(nuevoUsuario);

        // ✅ REGISTRAR LOG (Primer ingreso)
        await this.registrarLog(nuevoUsuario);

        this.notificationService.showAlertSuccess(`¡Bienvenido!`, 'Cuenta creada. Por favor completa tu perfil.');
        this.redirectToPanel(nuevoUsuario);
      }
    } catch (error) {
      this.notificationService.showAlertError('Error', 'No se pudo conectar con Google.');
    }
  }

  /**
   * LOGOUT
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/public/home']);
      this.notificationService.showSuccessToast('Has cerrado sesión');
    } catch (error) {
      console.error(error);
    }
  }

  // ... Resto de métodos (resetPassword, resendVerificationEmail) iguales ...
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.notificationService.showAlertSuccess('Correo Enviado', 'Revisa tu bandeja de entrada.');
      this.router.navigate(['/auth/login']);
    } catch (error: any) {
      this.handleAuthError(error);
    }
  }

  async resendVerificationEmail(): Promise<void> {
    const user = this.auth.currentUser;
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        this.notificationService.showAlertSuccess('Enviado', 'Nuevo enlace enviado.');
      } catch (error) {
        this.notificationService.showAlertError('Error', 'No se pudo reenviar.');
      }
    }
  }

  /**
   * REDIRECCIÓN POR ROL
   */
 public redirectToPanel(user: Usuario): void {
    switch (user.role) {

      case 'administrador':
        this.router.navigate(['/admin/dashboard']);
        break;

      case 'medico':
        this.router.navigate(['/medico/dashboard']);
        break;

      case 'empleado':
        this.router.navigate(['/empleado/mi-perfil']);
        break;

      case 'paciente':
        // ✅ CORRECCIÓN: Ahora va al Home Público, no a mis-turnos
        this.router.navigate(['/public/home']);
        break;

      case 'sin_rol':
        this.router.navigate(['/public/home']);
        break;

      default:
        this.router.navigate(['/public/home']);
        break;
    }
  }

  private handleAuthError(error: any): void {
    if (error.code === 'auth/email-already-in-use') {
      this.notificationService.showAlertError('Email registrado', 'Ese correo ya está en uso.');
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      this.notificationService.showAlertError('Credenciales inválidas', 'Correo o contraseña incorrectos.');
    } else {
      this.notificationService.showAlertError('Error', 'Ocurrió un error inesperado.');
    }
  }

  public getAuth(): Auth {
    return this.auth;
  }
}
