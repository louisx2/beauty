// Nombre de cada estado de una cita, el mismo en todo el panel (antes "En Proceso" en Citas y "En Curso" en Recepción).
import type { AppointmentStatus } from '../store/appointmentStore';

export const ETIQUETA_ESTADO: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};
