// Acciones sobre una cita, iguales en Citas y en el Dashboard: el paso que sigue, el menú "⋯" y cancelar
// (siempre con confirmación y con el aviso a la clienta).
import type { ReactNode } from 'react';
import { Ban, CalendarClock, CheckCheck, CheckCircle2, Edit2, Save, UserCheck, XCircle } from 'lucide-react';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { notifyStatusChange } from '../../../lib/whatsapp';
import type { ItemMenu } from '../../../components/MenuAcciones';
import { accionPrincipal, accionesSecundarias, type AccionCita, type AccionPrincipal } from './acciones';

export const ICONO_PRINCIPAL: Partial<Record<AccionCita, ReactNode>> = {
  confirmar: <CheckCircle2 size={18} aria-hidden="true" />,
  llego: <UserCheck size={18} aria-hidden="true" />,
  completar: <CheckCheck size={18} aria-hidden="true" />,
};

interface Opciones {
  editar: (cita: Appointment) => void;
  guardarClienta: (cita: Appointment) => void;
  /** Sin esta función el menú no ofrece "Reprogramar". */
  reprogramar?: (cita: Appointment) => void;
}

export function useAccionesCita({ editar, guardarClienta, reprogramar }: Opciones) {
  const { updateStatus } = useAppointmentStore();

  /** Confirmar, Llegó o Completar: cambia el estado y ofrece avisarle a la clienta por WhatsApp. */
  const avanzar = (cita: Appointment, paso: AccionPrincipal) => {
    updateStatus(cita.id, paso.estado);
    notifyStatusChange(cita, paso.estado);
  };

  const cancelar = (cita: Appointment) => {
    if (cita.status === 'cancelled' || cita.status === 'completed') return;
    if (!window.confirm(`¿Estás segura de que deseas cancelar la cita de ${cita.clientName}?`)) return;
    updateStatus(cita.id, 'cancelled');
    notifyStatusChange(cita, 'cancelled');
  };

  const item = (cita: Appointment, accion: AccionCita): ItemMenu | null => {
    switch (accion) {
      case 'editar': return { id: accion, etiqueta: 'Editar', icono: <Edit2 size={16} aria-hidden="true" />, onSelect: () => editar(cita) };
      case 'reprogramar':
        return reprogramar ? { id: accion, etiqueta: 'Reprogramar', icono: <CalendarClock size={16} aria-hidden="true" />, onSelect: () => reprogramar(cita) } : null;
      case 'no_asistio':
        return { id: accion, etiqueta: 'No asistió', icono: <Ban size={16} aria-hidden="true" />, onSelect: () => { updateStatus(cita.id, 'no_show'); notifyStatusChange(cita, 'no_show'); } };
      case 'guardar_clienta': return { id: accion, etiqueta: 'Guardar clienta', icono: <Save size={16} aria-hidden="true" />, onSelect: () => guardarClienta(cita) };
      case 'cancelar': return { id: accion, etiqueta: 'Cancelar cita', icono: <XCircle size={16} aria-hidden="true" />, peligro: true, onSelect: () => cancelar(cita) };
      default: return null; // el paso que sigue tiene su propio botón (o va primero con conPrincipal)
    }
  };

  /** Opciones del menú "⋯". Con conPrincipal, el paso que sigue va primero (donde no hay botón aparte). */
  const itemsDe = (cita: Appointment, { conPrincipal = false, extra = [] }: { conPrincipal?: boolean; extra?: ItemMenu[] } = {}): ItemMenu[] => {
    const paso = conPrincipal ? accionPrincipal(cita.status) : null;
    const primero: ItemMenu[] = paso
      ? [{ id: paso.accion, etiqueta: paso.etiqueta, icono: ICONO_PRINCIPAL[paso.accion], onSelect: () => avanzar(cita, paso) }]
      : [];
    const resto = accionesSecundarias(cita.status, !!cita.client_id)
      .map((a) => item(cita, a))
      .filter((i): i is ItemMenu => i !== null);
    return [...primero, ...extra, ...resto];
  };

  return { avanzar, cancelar, itemsDe };
}
