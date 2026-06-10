import toast from 'react-hot-toast';
import { MessageCircle } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../store/appointmentStore';
import { format12h } from './timeFormat';

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
      msg = `Hola ${appt.clientName}\n\nTu cita ha sido *confirmada*.\n\nFecha: ${dateLabel}\nHora: ${format12h(appt.time)}\nServicio: ${appt.service}\nEspecialista: ${appt.employee}\n\nTe esperamos en Anadsll Beauty Esthetic. Gracias!`;
      break;
    case 'cancelled':
      title = 'Cita cancelada';
      msg = `Hola ${appt.clientName},\n\nTe informamos que tu cita del ${dateLabel} a las ${format12h(appt.time)} ha sido *cancelada*.\n\nSi deseas reprogramar, por favor contactanos. Gracias!`;
      color = '#ef4444'; // red
      break;
    case 'completed':
      title = 'Cita completada';
      msg = `Hola ${appt.clientName}\n\nGracias por visitarnos hoy!\nEsperamos que hayas disfrutado tu servicio de ${appt.service}.\n\nNos encantaria volver a verte pronto.`;
      break;
    case 'no_show':
      title = 'No asistio';
      msg = `Hola ${appt.clientName},\n\nTe extranamos hoy en tu cita de las ${format12h(appt.time)}.\n\nPor favor contactanos para reprogramar.`;
      color = '#f59e0b'; // amber
      break;
    default:
      return; // Do not show toast for pending or in_progress automatically
  }

  const waUrl = `https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`;

  toast(
    (t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
          {title}
        </span>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => toast.dismiss(t.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: color, color: 'white', padding: '6px 14px',
            borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <MessageCircle size={14} /> Enviar notificacion por WhatsApp
        </a>
      </div>
    ),
    { duration: 8000 }
  );
}
