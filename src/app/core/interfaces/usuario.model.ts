// Definimos los roles finales y claros para nuestro sistema.
export type Rol = 'administrador' | 'medico' | 'empleado' | 'paciente' | 'sin_rol';

export interface Usuario {
  uid: string;
  email: string;
  role: Rol;
  displayName?: string;
  emailVerified: boolean;
  estado: 'Activo' | 'Inactivo';
  fotoURL?: string;
  masterKey?: string;
}
