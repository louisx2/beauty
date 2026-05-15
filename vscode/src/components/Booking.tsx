import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, User, Phone, MessageCircle, Send, Sparkles, AlertCircle, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettingsStore } from '../store/settingsStore';
import './Booking.css';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

interface Service {
  id: string;
  name: string;
  duration: number;
}

interface Staff {
  id: string;
  name: string;
  working_days: string[];
  working_start: string;
  working_end: string;
  service_ids: string[];
}

export default function Booking() {
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  
  const [form, setForm] = useState({
    name: '', phone: '', serviceId: '', staffId: '', date: '', time: '', notes: '',
  });
  
  const { settings, fetchSettings } = useSettingsStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Cargar datos base
  useEffect(() => {
    async function loadData() {
      const [svcRes, staffRes] = await Promise.all([
        supabase.from('services').select('id, name, duration').eq('active', true),
        supabase.from('staff').select('id, name, working_days, working_start, working_end, service_ids').eq('active', true)
      ]);
      if (svcRes.data) setServices(svcRes.data);
      if (staffRes.data) setStaffList(staffRes.data);
    }
    loadData();
  }, []);

  // Buscar citas cuando cambia la fecha o la empleada
  useEffect(() => {
    if (!form.date || !form.staffId) return;

    const staffMember = staffList.find(s => s.id === form.staffId);
    if (!staffMember) return;

    const fetchAppointments = async () => {
      setLoadingSlots(true);
      // Buscamos las citas de esa empleada en esa fecha
      const { data } = await supabase
        .from('appointments')
        .select('time, duration, status')
        .eq('date', form.date)
        .eq('employee', staffMember.name)
        .neq('status', 'cancelled');
      
      setAppointments(data || []);
      setLoadingSlots(false);
      setForm(prev => ({ ...prev, time: '' })); // Reset time
    };

    fetchAppointments();
  }, [form.date, form.staffId, staffList]);

  // Derivados
  const selectedService = services.find(s => s.id === form.serviceId);
  const selectedStaff = staffList.find(s => s.id === form.staffId);

  // Filtrar empleadas que pueden hacer el servicio seleccionado
  const availableStaff = useMemo(() => {
    if (!form.serviceId) return [];
    return staffList.filter(s => {
      const serviceIds = s.service_ids || [];
      return serviceIds.length === 0 || serviceIds.includes(form.serviceId);
    });
  }, [form.serviceId, staffList]);

  // Calcular slots disponibles
  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedStaff || !form.date) return [];

    const dateObj = new Date(`${form.date}T12:00:00`);
    const dayName = WEEKDAYS[dateObj.getDay()];

    const workingDays = selectedStaff.working_days || [];
    if (!workingDays.includes(dayName)) {
      return []; // No trabaja ese día
    }

    const startMinutes = timeToMinutes(selectedStaff.working_start);
    const endMinutes = timeToMinutes(selectedStaff.working_end);
    const serviceDuration = selectedService.duration || 45;

    const slots: string[] = [];
    let current = startMinutes;

    while (current + serviceDuration <= endMinutes) {
      // Verificar si hay choque con citas existentes
      const overlap = appointments.some(appt => {
        const apptStart = timeToMinutes(appt.time);
        const apptEnd = apptStart + (appt.duration || 45);
        return (current < apptEnd && current + serviceDuration > apptStart);
      });

      if (!overlap) {
        slots.push(minutesToTime(current));
      }
      current += 30; // Intervalos de 30 mins
    }

    return slots;
  }, [selectedService, selectedStaff, form.date, appointments]);

  const isDayOff = form.date && selectedStaff && !(selectedStaff.working_days || []).includes(WEEKDAYS[new Date(`${form.date}T12:00:00`).getDay()]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedStaff) return;
    
    setSending(true);

    const { data: appt, error } = await supabase.from('appointments').insert({
      client_name: form.name,
      client_phone: form.phone,
      service: selectedService.name,
      employee: selectedStaff.name,
      date: form.date,
      time: form.time,
      duration: selectedService.duration,
      status: 'pending',
      notes: form.notes || '',
      source: 'web',
    }).select().single();

    if (!error && appt) {
      setSuccess(true);
      
      // WhatsApp notification
      const msg = `Hola, quiero solicitar una cita:\n\n` +
        `👤 Nombre: ${form.name}\n` +
        `📞 Teléfono: ${form.phone}\n` +
        `💆 Servicio: ${selectedService.name}\n` +
        `👩‍⚕️ Con: ${selectedStaff.name}\n` +
        `📅 Fecha: ${form.date}\n` +
        `🕐 Hora: ${form.time}\n` +
        `📝 Notas: ${form.notes || 'Ninguna'}\n\n` +
        `⚠️ Sé que debo enviar el comprobante de pago/depósito por esta vía para confirmar mi cita.`;
      
      const phone = settings?.whatsapp_number || '18293224014';
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
    
    setSending(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (success) {
    return (
      <section className="booking" id="agendar">
        <div className="booking__inner">
          <div className="booking__success">
            <div className="booking__success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2>¡Tu cita está pre-reservada!</h2>
            <div className="booking__success-box">
              <p>Tu solicitud ha sido guardada en nuestro sistema con estado <strong>Pendiente</strong>.</p>
              
              <div className="booking__bank-details">
                <div className="booking__bank-header">
                  <span className="booking__bank-title">Depositar para confirmar</span>
                  <span className="booking__bank-amount">RD$ {settings?.deposit_amount || 500}</span>
                </div>
                
                <div className="booking__bank-grid">
                  <div className="booking__bank-item">
                    <span className="booking__bank-label">Banco</span>
                    <span className="booking__bank-value">{settings?.bank_name || 'Banco Popular'}</span>
                  </div>
                  
                  <div className="booking__bank-item">
                    <span className="booking__bank-label">Cuenta</span>
                    <div className="booking__bank-copy-group">
                      <span className="booking__bank-value">{settings?.account_number || '123456789'}</span>
                      <button 
                        className="booking__bank-copy-btn"
                        onClick={() => copyToClipboard(settings?.account_number || '123456789', 'account')}
                        title="Copiar número de cuenta"
                      >
                        {copiedField === 'account' ? <CheckCircle2 size={16} className="text-green" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="booking__bank-item">
                    <span className="booking__bank-label">A nombre de</span>
                    <span className="booking__bank-value">{settings?.account_name || 'Anadsll Beauty Esthetic'}</span>
                  </div>
                </div>
              </div>

              <div className="booking__success-warning">
                <AlertCircle size={16} />
                <p><strong>Por favor, envía tu comprobante por WhatsApp para que recepción pueda confirmar tu reserva.</strong></p>
              </div>

              <p style={{ textAlign: 'center', marginTop: '16px' }}><strong>Te notificaremos por WhatsApp cuando tu cita esté confirmada.</strong></p>
            </div>
            
            <div className="booking__success-actions">
              <a 
                href={`https://wa.me/${settings?.whatsapp_number || '18293224014'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ExternalLink size={18} />
                Enviar comprobante por WhatsApp
              </a>
              <button className="btn-secondary" onClick={() => {
                setSuccess(false);
                setForm({ name: '', phone: '', serviceId: '', staffId: '', date: '', time: '', notes: '' });
              }} style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="booking" id="agendar">
      <div className="booking__inner">
        <div className="booking__info">
          <span className="section-tag">Agendar Cita</span>
          <h2 className="booking__title">
            Reserva tu <span className="gradient-text">cita</span> ahora
          </h2>
          <p className="booking__text">
            Selecciona el servicio y tu especialista favorita para ver su disponibilidad en tiempo real.
          </p>

          <div className="booking__benefits">
            <div className="booking__benefit">
              <Calendar size={20} />
              <span>Agenda según disponibilidad real</span>
            </div>
            <div className="booking__benefit">
              <MessageCircle size={20} />
              <span>Confirmación por WhatsApp</span>
            </div>
            <div className="booking__benefit">
              <Clock size={20} />
              <span>Horarios adaptados a cada especialista</span>
            </div>
          </div>
        </div>

        <form className="booking__form glass" onSubmit={handleSubmit} id="booking-form">
          {/* 1. Datos Personales */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-name"><User size={16} /> Nombre</label>
              <input type="text" id="booking-name" placeholder="Tu nombre" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="booking__field">
              <label htmlFor="booking-phone"><Phone size={16} /> Teléfono</label>
              <input type="tel" id="booking-phone" placeholder="829-000-0000" required value={form.phone} onChange={e => setForm({...form, phone: formatPhone(e.target.value)})} />
            </div>
          </div>

          {/* 2. Servicio y Especialista */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-service"><Sparkles size={16} /> Servicio</label>
              <select id="booking-service" required value={form.serviceId} onChange={e => {
                setForm({...form, serviceId: e.target.value, staffId: '', date: '', time: ''});
              }}>
                <option value="">Selecciona un servicio</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration}m)</option>)}
              </select>
            </div>
            
            <div className="booking__field">
              <label htmlFor="booking-staff"><User size={16} /> Especialista</label>
              <select id="booking-staff" required value={form.staffId} onChange={e => setForm({...form, staffId: e.target.value, time: ''})} disabled={!form.serviceId}>
                <option value="">Selecciona especialista</option>
                {availableStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* 3. Fecha y Hora */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-date"><Calendar size={16} /> Fecha</label>
              <input 
                type="date" id="booking-date" required 
                min={new Date().toISOString().split('T')[0]}
                value={form.date} onChange={e => setForm({...form, date: e.target.value, time: ''})} 
                disabled={!form.staffId}
              />
            </div>
          </div>

          {/* Slots de Hora */}
          {form.date && selectedStaff && (
            <div className="booking__field">
              <label><Clock size={16} /> Horas Disponibles</label>
              
              {isDayOff ? (
                <div className="booking__alert">
                  <AlertCircle size={16} /> {selectedStaff.name} no trabaja este día.
                </div>
              ) : loadingSlots ? (
                <div className="booking__loading">Buscando horarios...</div>
              ) : availableSlots.length === 0 ? (
                <div className="booking__alert">
                  <AlertCircle size={16} /> No hay horarios libres para esta fecha.
                </div>
              ) : (
                <div className="booking__slots">
                  {availableSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      className={`booking__slot ${form.time === time ? 'booking__slot--active' : ''}`}
                      onClick={() => setForm({ ...form, time })}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="booking__field">
            <label htmlFor="booking-notes">📝 Notas adicionales</label>
            <textarea id="booking-notes" placeholder="Algo que debamos saber..." rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} disabled={sending || !form.time}>
            <Send size={16} />
            {sending ? 'Procesando...' : 'Solicitar Cita'}
          </button>
        </form>
      </div>
    </section>
  );
}

// Helpers
function timeToMinutes(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
