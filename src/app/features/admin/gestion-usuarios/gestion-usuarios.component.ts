import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { UsuarioService } from './usuario.service';
import { NotificacionService } from '../../../core/services/notificaciones.service';
import { ImageService } from '../../../core/services/image.service';

// Servicios de Perfiles
import { MedicoService } from '../gestion-medicos/medico.service';
import { EmpleadoService } from '../gestion-empleados/empleado.service';
import { PacienteService } from '../gestion-pacientes/paciente.service';

import { Rol, Usuario } from '../../../core/interfaces/usuario.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faSearch, faEdit, faTrash, faUndo, faCamera,
  faTimes, faUserMd, faUserTie, faUserInjured, faLock, faIdCard
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-gestion-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FaIconComponent],
  templateUrl: './gestion-usuarios.component.html',
  styleUrls: ['./gestion-usuarios.component.scss']
})
export class GestionUsuariosComponent {
  private userService = inject(UsuarioService);
  private notificationService = inject(NotificacionService);
  private imageService = inject(ImageService);
  private fb = inject(FormBuilder);

  // Inyección de servicios de perfiles
  private medicoService = inject(MedicoService);
  private empleadoService = inject(EmpleadoService);
  private pacienteService = inject(PacienteService);

  readonly defaultImage = 'assets/user-default.jpg';
  icons = { faSearch, faEdit, faTrash, faUndo, faCamera, faTimes, faUserMd, faUserTie, faUserInjured, faLock, faIdCard };

  // Datos
  usersSignal = toSignal(this.userService.obtenerTodosLosUsuarios(), { initialValue: [] as Usuario[] });
  searchTerm = signal('');
  roleFilter = signal<Rol | ''>('');
  showInactive = signal(false);

  // Modales y Estado
  isModalOpen = signal(false);
  isRoleLocked = signal(false);
  imagePreview = signal<string | null>(null);

  selectedUser: Usuario | null = null;

  // Variables temporales para no perder datos al editar
  tempMedicoProfile: any = null;
  tempEmpleadoProfile: any = null;

  // Signals para mostrar formularios específicos
  showMedicoForm = signal(false);
  showEmpleadoForm = signal(false);

  userForm: FormGroup;

  // Filtro
  filteredUsers = computed(() => {
    const users = this.usersSignal();
    const search = this.searchTerm().toLowerCase();
    const role = this.roleFilter();
    const showInactive = this.showInactive();

    return users.filter(user => {
      const matchesSearch = user.displayName?.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
      const matchesRole = role ? user.role === role : true;
      const matchesActive = showInactive ? true : user.estado === 'Activo';
      return matchesSearch && matchesRole && matchesActive;
    });
  });

  constructor() {
    this.userForm = this.fb.group({
      displayName: ['', Validators.required],
      role: ['', Validators.required],
      // Campos Médicos
      matricula: [''],
      especialidad: [''],
      // Campos Empleados
      cuil: [''],
      puesto: [''],
      esJefe: [false] // ✅ Interruptor de Jefe
    });

    // Lógica dinámica de validadores según el rol seleccionado
    this.userForm.get('role')?.valueChanges.subscribe((newRole: Rol) => {
      this.updateFormValidators(newRole);
    });
  }

  updateFormValidators(role: Rol) {
    // 1. Resetear visibilidad
    this.showMedicoForm.set(role === 'medico');
    this.showEmpleadoForm.set(role === 'empleado');

    // 2. Limpiar validadores previos de campos específicos
    const controlesEspeciales = ['matricula', 'especialidad', 'cuil', 'puesto'];
    controlesEspeciales.forEach(c => {
      this.userForm.get(c)?.clearValidators();
      this.userForm.get(c)?.updateValueAndValidity();
    });

    // 3. Asignar validadores según rol
    if (role === 'medico') {
      this.userForm.get('matricula')?.setValidators([Validators.required]);
      this.userForm.get('especialidad')?.setValidators([Validators.required]);
    }
    else if (role === 'empleado') {
      this.userForm.get('cuil')?.setValidators([Validators.required, Validators.minLength(11)]);
      this.userForm.get('puesto')?.setValidators([Validators.required]);
    }

    this.userForm.updateValueAndValidity();
  }

  handleImageError(event: any) { event.target.src = this.defaultImage; }

  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await this.imageService.compressAndConvertToBase64(file);
        this.imagePreview.set(base64);
      } catch (error) {
        this.notificationService.showAlertError('Error', 'Imagen inválida');
      }
    }
  }

  // =======================================================
  // 🔓 ABRIR MODAL (CARGA DE DATOS)
  // =======================================================
  async openEditModal(user: Usuario) {
    this.selectedUser = user;
    this.tempMedicoProfile = null;
    this.tempEmpleadoProfile = null;

    // Bloqueo de rol para usuarios operativos existentes
    const rolesBloqueados: Rol[] = ['medico', 'administrador', 'empleado', 'paciente'];
    this.isRoleLocked.set(rolesBloqueados.includes(user.role));
    this.isRoleLocked() ? this.userForm.get('role')?.disable() : this.userForm.get('role')?.enable();

    // Cargar datos base
    this.userForm.patchValue({
      displayName: user.displayName,
      role: user.role
    });
    this.updateFormValidators(user.role);
    this.imagePreview.set(user.fotoURL || this.defaultImage);

    // Cargar Datos Específicos según Rol
    if (user.role === 'medico') {
      const perfil = await this.medicoService.obtenerMedicoPorId(user.uid);
      if (perfil) {
        this.tempMedicoProfile = perfil; // Guardamos para no perder la agenda
        this.userForm.patchValue({
          matricula: perfil.matricula,
          especialidad: perfil.especialidades?.[0] || ''
        });
      }
    }
    else if (user.role === 'empleado') {
      const perfil = await this.empleadoService.obtenerPerfil(user.uid);
      if (perfil) {
        this.tempEmpleadoProfile = perfil; // Guardamos para no perder la jornada
        this.userForm.patchValue({
          cuil: perfil.cuil,
          puesto: perfil.puesto,
          esJefe: perfil.esJefe || false // ✅ Cargamos si es jefe
        });
      }
    }

    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.selectedUser = null;
    this.tempMedicoProfile = null;
    this.tempEmpleadoProfile = null;
    this.userForm.reset();
    this.imagePreview.set(null);
    this.showMedicoForm.set(false);
    this.showEmpleadoForm.set(false);
  }

  // =======================================================
  // 💾 GUARDAR CAMBIOS (ACTUALIZACIÓN DE PERFILES)
  // =======================================================
  async saveChanges() {
    if (this.userForm.invalid || !this.selectedUser) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formRaw = this.userForm.getRawValue();
    const roleValue = formRaw.role;
    const userId = this.selectedUser.uid;
    const fotoFinal = this.imagePreview() === this.defaultImage ? '' : this.imagePreview()!;

    // 1. Actualizar Usuario Auth (Colección Usuarios)
    const updateData: Partial<Usuario> = {
      role: roleValue,
      displayName: formRaw.displayName,
      fotoURL: fotoFinal
    };

    try {
      await this.userService.actualizarUsuario(userId, updateData);

      // 2. Crear/Actualizar Perfil en la colección específica
      if (roleValue === 'medico') {
        const perfilViejo = this.tempMedicoProfile || {};
        await this.medicoService.crearPerfil({
          uid: userId,
          // Datos visuales (Duplicados para independencia)
          nombre: formRaw.displayName,
          foto: fotoFinal,
          // Datos médicos
          matricula: formRaw.matricula,
          especialidades: [formRaw.especialidad],
          // Datos preservados
          duracionTurno: perfilViejo.duracionTurno || 30,
          valorConsulta: perfilViejo.valorConsulta || 0,
          disponibilidad: perfilViejo.disponibilidad || [],
          estado: 'Activo'
        });
      }
      else if (roleValue === 'empleado') {
        const perfilViejo = this.tempEmpleadoProfile || {};

        await this.empleadoService.crearPerfil({
          uid: userId,
          // ✅ Datos visuales (Duplicados para independencia)
          nombre: formRaw.displayName,
          foto: fotoFinal,
          // ✅ Datos laborales del formulario
          cuil: formRaw.cuil,
          puesto: formRaw.puesto,
          esJefe: formRaw.esJefe, // Aquí definimos si es jefe
          // ✅ Datos preservados (Horarios)
          jornada: perfilViejo.jornada || [],
          estado: 'Activo'
        });
      }
      else if (roleValue === 'paciente') {
        // Los pacientes usualmente se registran solos, pero por si acaso
        await this.pacienteService.crearPaciente({
          uid: userId,
          nombreCompleto: formRaw.displayName,
          saldoCuenta: 0
        });
      }

      this.notificationService.showSuccessToast('Datos guardados correctamente');
      this.closeModal();

    } catch (error) {
      this.notificationService.showAlertError('Error', 'Fallo al guardar cambios.');
    }
  }

  async toggleUserStatus(user: Usuario) {
    const nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const action = user.estado === 'Activo' ? 'desactivar' : 'activar';
    const confirm = await this.notificationService.showConfirm('Confirmar', `¿Deseas ${action} a ${user.displayName}?`, `Sí, ${action}`);

    if (confirm.isConfirmed) {
      try {
        await this.userService.cambiarEstado(user.uid, user.role, nuevoEstado);
        this.notificationService.showSuccessToast(`Usuario ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'}`);
      } catch (error) {
        this.notificationService.showAlertError('Error', 'Fallo al cambiar estado.');
      }
    }
  }

  onSearch(e: Event) { this.searchTerm.set((e.target as HTMLInputElement).value); }
  onRoleFilter(e: Event) { this.roleFilter.set((e.target as HTMLSelectElement).value as Rol | ''); }
  toggleInactive(e: Event) { this.showInactive.set((e.target as HTMLInputElement).checked); }
}
