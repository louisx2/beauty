import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, User, Phone, MessageCircle, Send,
  Sparkles, AlertCircle, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettingsStore } from '../store/settingsStore';
import './Booking.css';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

interface Service {
  id: string;
  name: string;
  duration: number;
}

interface StaffMember {
  id: string;
  name: string;
  working_days: string[];
  working_start: string;
  working_end: string;
  service_ids: string[];
}

interface ExistingAppt {
  time: string;
  duration: number;
  status: string;
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
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

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Booking() {
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [existingAppts, setExistingAppts] = useState<ExistingAppt[]>([]);

  const [form, setForm] = useState({
    name: '', phone: '', serviceId: '', staffId: '', date: '', time: '', notes: '',
  });

  const { settings, fetchSettings } = useSettingsStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Load base data once
  useEffect(() => {
    async function loadData() {
      const [svcRes, staffRes] = await Promise.all([
        supabase.from('services').select('id, name, duration').eq('active', true).order('name'),
        supabase
          .from('staff')
          .select('id, name, working_days, working_start, working_end, service_ids')
          .eq('active', true)
          .order('name'),
      ]);
      if (svcRes.data) setServices(svcRes.data as Service[]);
      if (staffRes.data) setStaffList(staffRes.data as StaffMember[]);
    }
    loadData();
  }, []);

  // Reload taken slots whenever date or staff changes
  useEffect(() => {
    if (!form.date || !form.staffId) return;

    const staffMember = staffList.find((s) => s.id === form.staffId);
    if (!staffMember) return;

    setLoadingSlots(true);
    setForm((prev) => ({ ...prev, time: '' }));

    supabase
      .from('appointments')
      .select('time, duration, status')
      .eq('date', form.date)
      .eq('employee', staffMember.name)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        setExistingAppts((data as ExistingAppt[]) ?? []);
        setLoadingSlots(false);
      });
  }, [form.date, form.staffId, staffList]);

  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedStaff = staffList.find((s) => s.id === form.staffId);

  // Only show staff who can perform the selected service
  const availableStaff = useMemo(() => {
    if (!form.serviceId) return [];
    return staffList.filter((s) => {
      const ids = s.service_ids ?? [];
      return ids.length === 0 || ids.includes(form.serviceId);
    });
  }, [form.serviceId, staffList]);

  // Build list of available time slots
  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedStaff || !form.date) return [];

    const dateObj = new Date(`${form.date}T12:00:00`);
    const dayName = WEEKDAYS[dateObj.getDay()];
    const workingDays = selectedStaff.working_days ?? [];

    if (!workingDays.includes(dayName)) return [];

    const startMin = timeToMinutes(selectedStaff.working_start);
    const endMin = timeToMinutes(selectedStaff.working_end);
    const duration = selectedService.duration ?? 45;

    // For today, never show slots that have already started (with 15-min buffer)
    const today = getTodayStr();
    let nowBuffer = 0;
    if (form.date === today) {
      const now = new Date();
      nowBuffer = now.getHours() * 60 + now.getMinutes() + 15;
    }

    const slots: string[] = [];
    let cursor = startMin;

    while (cursor + duration <= endMin) {
      // Skip past slots for today
      if (cursor >= nowBuffer) {
        const overlap = existingAppts.some((a) => {
          const apptStart = timeToMinutes(a.time);
          const apptEnd = apptStart + (a.duration ?? 45);
          return cursor < apptEnd && cursor + duration > apptStart;
        });
        if (!overlap) slots.push(minutesToTime(cursor));
      }
      cursor += 30;
    }

    return slots;
  }, [selectedService, selectedStaff, form.date, existingAppts]);

  const isDayOff =
    form.date &&
    selectedStaff &&
    !(selectedStaff.working_days ?? []).includes(
      WEEKDAYS[new Date(`${form.date}T12:00:00`).getDay()]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedStaff || !form.time) return;

    setSending(true);
    setBookingError('');

    try {
      const { data: appt, error } = await supabase
        .from('appointments')
        .insert({
          client_name: form.name.trim(),
          client_phone: form.phone.trim(),
          service: selectedService.name,
          employee: selectedStaff.name,
          date: form.date,
          time: form.time,
          duration: selectedService.duration,
          status: 'pending',
          notes: form.notes.trim() || '',
          source: 'web',
        })
        .select()
        .single();

      if (error || !appt) {
        console.error('[booking] insert error:', error);
        setBookingError(
          'Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp.'
        );
        return;
      }

      const waMsg =
        `Hola, acabo de reservar una cita:\n\n` +
        `👤 Nombre: ${form.name}\n` +
        `📞 Teléfono: ${form.phone}\n` +
        `💆 Servicio: ${selectedService.name}\n` +
        `👩‍⚕️ Con: ${selectedStaff.name}\n` +
        `📅 Fecha: ${form.date}\n` +
        `🕐 Hora: ${form.time}\n` +
        `📝 Notas: ${form.notes.trim() || 'Ninguna'}\n\n` +
        `Adjunto el comprobante de depósito para confirmar mi cita.`;
      setWhatsappMsg(waMsg);
      setSuccess(true);
      // WhatsApp NOT opened automatically — client clicks the button manually
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetForm = () => {
    setSuccess(false);
    setBookingError('');
    setForm({ name: '', phone: '', serviceId: '', staffId: '', date: '', time: '', notes: '' });
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
              <p>
                Tu solicitud fue guardada con estado <strong>Pendiente</strong>.
              </p>

              <div className="booking__bank-details">
                <div className="booking__bank-header">
                  <span className="booking__bank-title">Depositar para confirmar</span>
                  <span className="booking__bank-amount">
                    RD$ {settings?.deposit_amount ?? 500}
                  </span>
                </div>

                <div className="booking__bank-grid">
                  <div className="booking__bank-item">
                    <span className="booking__bank-label">Banco</span>
                    <span className="booking__bank-value">
                      {settings?.bank_name || 'Banco Popular'}
                    </span>
                  </div>

                  <div className="booking__bank-item">
                    <span className="booking__bank-label">Cuenta</span>
                    <div className="booking__bank-copy-group">
                      <span className="booking__bank-value">
                        {settings?.account_number || '123456789'}
                      </span>
                      <button
                        className="booking__bank-copy-btn"
                        onClick={() =>
                          copyToClipboard(settings?.account_number || '123456789', 'account')
                        }
                        title="Copiar número de cuenta"
                      >
                        {copiedField === 'account' ? (
                          <CheckCircle2 size={16} className="text-green" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="booking__bank-item">
                    <span className="booking__bank-label">A nombre de</span>
                    <span className="booking__bank-value">
                      {settings?.account_name || 'Anadsll Beauty Esthetic'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="booking__success-warning">
                <AlertCircle size={16} />
                <p>
                  <strong>
                    Envía tu comprobante por WhatsApp para que recepción confirme tu reserva.
                  </strong>
                </p>
              </div>
            </div>

            <div className="booking__success-actions">
              <a
                href={`https://wa.me/${settings?.whatsapp_number || '18293224014'}?text=${encodeURIComponent(whatsappMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ExternalLink size={18} />
                Enviar comprobante por WhatsApp
              </a>
              <button
                className="btn-secondary"
                onClick={resetForm}
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
              >
                Hacer otra reserva
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
            Selecciona el servicio y tu especialista favorita para ver la disponibilidad en tiempo
            real.
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
          {bookingError && (
            <div className="booking__alert">
              <AlertCircle size={16} />
              {bookingError}
            </div>
          )}

          {/* Personal data */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-name">
                <User size={16} /> Nombre
              </label>
              <input
                type="text"
                id="booking-name"
                placeholder="Tu nombre completo"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="booking__field">
              <label htmlFor="booking-phone">
                <Phone size={16} /> Teléfono
              </label>
              <input
                type="tel"
                id="booking-phone"
                placeholder="829-000-0000"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              />
            </div>
          </div>

          {/* Service & Staff */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-service">
                <Sparkles size={16} /> Servicio
              </label>
              <select
                id="booking-service"
                required
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value, staffId: '', date: '', time: '' })
                }
              >
                <option value="">Selecciona un servicio</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="booking__field">
              <label htmlFor="booking-staff">
                <User size={16} /> Especialista
              </label>
              <select
                id="booking-staff"
                required
                disabled={!form.serviceId}
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value, date: '', time: '' })}
              >
                <option value="">Selecciona especialista</option>
                {availableStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="booking__row">
            <div className="booking__field">
              <label htmlFor="booking-date">
                <Calendar size={16} /> Fecha
              </label>
              <input
                type="date"
                id="booking-date"
                required
                disabled={!form.staffId}
                min={getTodayStr()}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value, time: '' })}
              />
            </div>
          </div>

          {/* Time slots */}
          {form.date && selectedStaff && (
            <div className="booking__field">
              <label>
                <Clock size={16} /> Horas Disponibles
              </label>

              {isDayOff ? (
                <div className="booking__alert">
                  <AlertCircle size={16} /> {selectedStaff.name} no trabaja este día.
                </div>
              ) : loadingSlots ? (
                <div className="booking__loading">Buscando horarios disponibles...</div>
              ) : availableSlots.length === 0 ? (
                <div className="booking__alert">
                  <AlertCircle size={16} /> No hay horarios libres para esta fecha. Prueba otro
                  día.
                </div>
              ) : (
                <div className="booking__slots">
                  {availableSlots.map((time) => (
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
            <textarea
              id="booking-notes"
              placeholder="Alergias, primera vez, algo que debamos saber..."
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
            disabled={sending || !form.time}
          >
            <Send size={16} />
            {sending ? 'Procesando...' : 'Solicitar Cita'}
          </button>
        </form>
      </div>
    </sect