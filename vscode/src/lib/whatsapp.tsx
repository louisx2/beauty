import toast from 'react-hot-toast';
import { MessageCircle } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../store/appointmentStore';
import { format12h } from './timeFormat';
import { destinoWhatsApp, enlaceWhatsApp } from './enlaces';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function notifyStatusChange(appt: Appointment, status: AppointmentStatus) {
  const phone = appt.clientPhone.replace(/[^0-9]/g, '');
  const dateLabel = formatDate(appt.date);
  
  let msg = '';
  let title = '';
  let color = '#25D366';

  switch (status) {
    case 'confirmed':
      title = 'Cita confirmada';
      msg = `Hola ${appt.clientName}\n\nTu cita ha sido *confirmada*.\n\nFecha: ${dateLabel}\nHora: ${format12h(appt.time)}\nServicio: ${appt.service}\nEspecialista: ${appt.employee}\n\nTe esperamos en Anadsll Beauty Esthetic. ¡Gracias!`;
      break;
    case 'cancelled':
      title = 'Cita cancelada';
      msg = `Hola ${appt.clientName},\n\nTe informamos que tu cita del ${dateLabel} a las ${format12h(appt.time)} ha sido *cancelada*.\n\nSi deseas reprogramarla, por favor contáctanos. ¡Gracias!`;
      color = '#ef4444'; // red
      break;
    case 'completed':
      title = 'Cita completada';
      msg = `Hola ${appt.clientName}\n\n¡Gracias por visitarnos hoy!\nEsperamos que hayas disfrutado tu servicio de ${appt.service}.\n\nNos encantaría volver a verte pronto.`;
      break;
    case 'no_show':
      title = 'No asistió';
      msg = `Hola ${appt.clientName},\n\nTe extrañamos hoy en tu cita de las ${format12h(appt.time)}.\n\nPor favor contáctanos para reprogramarla.`;
      color = '#f59e0b'; // amber
      break;
    default:
      return; // Do not show toast for pending or in_progress automatically
  }

  avisoWhatsApp(phone, title, msg, color);
}

/** Al mover una cita: el mensaje con el nuevo día y la nueva hora, listo para mandarle. */
export function notifyRescheduled(appt: Appointment) {
  const msg = `Hola ${appt.clientName}\n\nTu cita se *movió* a:\n\nFecha: ${formatDate(appt.date)}\nHora: ${format12h(appt.time)}\nServicio: ${appt.service}\nEspecialista: ${appt.employee}\n\nTe esperamos en Anadsll Beauty Esthetic. ¡Gracias!`;
  avisoWhatsApp(appt.clientPhone.replace(/[^0-9]/g, ''), 'Cita movida', msg, '#25D366');
}

function avisoWhatsApp(phone: string, title: string, msg: string, color: string) {
  const waUrl = enlaceWhatsApp(phone, msg);

  toast(
    (t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
          {title}
        </span>
        <a
          href={waUrl}
          target={destinoWhatsApp()}
          rel="noopener noreferrer"
          onClick={() => toast.dismiss(t.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: color, color: 'white', padding: '6px 14px',
            borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <MessageCircle size={14} /> Avisarle por WhatsApp
        </a>
      </div>
    ),
    { duration: 8000 }
  );
}
