// Qué se puede hacer con una cita desde su tarjeta. Puro: se prueba con node --test.
import type { AppointmentStatus } from '../../../store/appointmentStore';

export type AccionCita = 'confirmar' | 'llego' | 'completar' | 'editar' | 'reprogramar' | 'no_asistio' | 'guardar_clienta' | 'cancelar';

export interface AccionPrincipal { accion: AccionCita; etiqueta: string; estado: AppointmentStatus }

/** El paso que sigue según el estado: es el botón con texto de la tarjeta. Una cita cerrada no tiene. */
export function accionPrincipal(estado: AppointmentStatus): AccionPrincipal | null {
  switch (estado) {
    case 'pending': return { accion: 'confirmar', etiqueta: 'Confirmar', estado: 'confirmed' };
    case 'confirmed': return { accion: 'llego', etiqueta: 'Llegó', estado: 'in_progress' };
    case 'in_progress': return { accion: 'completar', etiqueta: 'Completar', estado: 'completed' };
    default: return null;
  }
}

/** Lo que va en "Más acciones", en orden. Cancelar va siempre al final, lejos del resto. */
export function accionesSecundarias(estado: AppointmentStatus, tieneFicha: boolean): AccionCita[] {
  const lista: AccionCita[] = ['editar'];
  if (estado === 'pending' || estado === 'confirmed') lista.push('reprogramar');
  if (estado === 'confirmed') lista.push('no_asistio');
  if (!tieneFicha) lista.push('guardar_clienta');
  if (estado === 'pending' || estado === 'confirmed' || estado === 'in_progress') lista.push('cancelar');
  return lista;
}
