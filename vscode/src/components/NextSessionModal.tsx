import { useState, useEffect } from 'react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useStaffStore } from '../store/staffStore';
import { useAuthStore } from '../store/authStore';
import { X, CalendarPlus, AlertCircle } from 'lucide-react';
import { format12h } from '../lib/timeFormat';
import toast from 'react-hot-toast';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getAvailableHours(dateStr: string): string[] {
  const ALL_HOURS = Array.from({ length: 11 }, (_, i) => {
    const h = i + 8;
    return `${String(h).padStart(2, '0')}:00`;
  }).flatMap((h) => [h, h.replace(':00', ':30')]);
  
  const today = getTodayStr();
  if (dateStr !== today) return ALL_HOURS;
  
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return ALL_HOURS.filter((h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm > nowMinutes;
  });
}

export default function NextSessionModal() {
  const { completedApptForNextSession: appt, clearNextSessionPrompt, addAppointment } = useAppointmentStore();
  const { staff } = useStaffStore();
  const { user } = useAuthStore();

  // Las especialistas solo pueden agendar la siguiente sesión consigo mismas
  const isSpecialist = user?.role === 'specialist';
  
  const [date, setDate] = useState(getTodayStr());
  const [time, setTime] = useState('09:00');
  const [employee, setEmployee] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appt) {
      setEmployee(isSpecialist ? (user?.name ?? appt.employee) : appt.employee);
      setDate(getTodayStr());
      setTime('09:00');
    }
  }, [appt, isSpecialist, user?.name]);

  if (!appt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !date || !time) return;
    
    setSubmitting(true);
    try {
      const payload = {
        clientName: appt.clientName,
        clientPhone: appt.clientPhone,
        service: appt.service,
        employee,
        date,
        time,
        duration: appt.duration,
        status: 'pending' as const,
        notes: appt.notes || '',
        source: 'manual'
      };
      
      const newAppt = await addAppointment(payload);

      if (newAppt) {
        toast.success(`Siguiente sesión agendada para ${appt.clientName}`);
        clearNextSessionPrompt();
      } else {
        toast.error('No se pudo crear la cita. Intenta de nuevo.');
      }
    } catch (err) {
      toast.error('Error al agendar la sesión');
    } finally {
      setSubmitting(false);
    }
  };

  const activeSpecialists = staff.filter(s => s.active && s.role === 'specialist');

  return (
    <div className="modal-overlay" onClick={clearNextSessionPrompt}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Agendar Siguiente Sesión</h2>
          <button className="modal__close" onClick={clearNextSessionPrompt}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '0 0 16px', margin: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--rose)', marginBottom: 12 }}>
            <CalendarPlus size={18} />
            <strong>¡Servicio Completado!</strong>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            Esta cita pertenece a un paquete o tratamiento continuo ({appt.service}). 
            ¿Deseas agendar la próxima sesión para <strong>{appt.clientName}</strong> ahora mismo?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__field">
            <label>Especialista</label>
            {isSpecialist ? (
              <input type="text" value={employee} disabled readOnly />
            ) : (
              <select required value={employee} onChange={(e) => setEmployee(e.target.value)}>
                <option value="">Seleccionar especialista</option>
                {activeSpecialists.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>
          
          <div className="modal__row">
            <div className="modal__field">
              <label>Fecha</label>
              <input
                type="date"
                required
                min={getTodayStr()}
                value={date}
                onChange={(e) => { setDate(e.target.value); setTime(''); }}
              />
            </div>
            <div className="modal__field">
              <label>Hora</label>
              <select
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {getAvailableHours(date).map((h) => (
                  <option key={h} value={h}>{format12h(h)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal__actions" style={{ marginTop: 24 }}>
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={clearNextSessionPrompt}>
              No, en otro momento
            </button>
            <button type="submit" className="modal__submit-btn" disabled={submitting || !time}>
              {submitting ? 'Agendando...' : 'Agendar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
