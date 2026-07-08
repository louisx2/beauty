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

interface SessionPackage {
  id: string;
  name: string;
  service_id: string;
  services: {
    duration: number;
    name: string;
  };
}

interface ExistingAppt {
  time: string;
  duration: number;
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
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Booking() {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [existingAppts, setExistingAppts] = useState<ExistingAppt[]>([]);

  const [bookingType, setBookingType] = useState<'service' | 'package'>('service');
  const [form, setForm] = useState({
    name: '', phone: '', serviceId: '', packageId: '', staffId: '', date: '', time: '', notes: '',
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
      const [svcRes, staffRes, pkgRes] = await Promise.all([
        supabase.from('services').select('id, name, duration').eq('active', true).order('name'),
        supabase
          .from('staff')
          .select('id, name, working_days, working_start, working_end, service_ids')
          .eq('active', true)
          .eq('role', 'specialist')
          .order('name'),
        supabase
          .from('session_packages')
          .select('id, name, service_id, services(duration, name)')
          .eq('active', true)
          .order('name'),
      ]);
      if (svcRes.data) setServices(svcRes.data as Service[]);
      if (staffRes.data) setStaffList(staffRes.data as StaffMember[]);
      if (pkgRes.data) setPackages(pkgRes.data as SessionPackage[]);
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

    // RPC segura: devuelve solo hora y duración ocupadas, sin datos de clientas
    supabase
      .rpc('get_busy_slots', { p_date: form.date, p_employee: staffMember.name })
      .then(({ data }) => {
        setExistingAppts((data as ExistingAppt[]) ?? []);
        setLoadingSlots(false);
      });
  }, [form.date, form.staffId, staffList]);

  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedPkg = packages.find((p) => p.id === form.packageId);
  const selectedStaff = staffList.find((s) => s.id === form.staffId);

  const effectiveServiceId = bookingType === 'package' ? selectedPkg?.service_id : form.serviceId;
  const effectiveServiceName = bookingType === 'package' ? `Paquete: ${selectedPkg?.name}` : selectedService?.name;
  const effectiveDuration = bookingType === 'package' ? selectedPkg?.services?.duration : selectedService?.duration;

  // Only show staff who can perform the selected service
  const availableStaff = useMemo(() => {
    if (!effectiveServiceId) return [];
    return staffList.filter((s) => {
      const ids = s.service_ids ?? [];
      return ids.length === 0 || ids.includes(effectiveServiceId);
    });
  }, [effectiveServiceId, staffList]);

  // Build list of available time slots
  const availableSlots = useMemo(() => {
    if (!effectiveServiceId || !selectedStaff || !form.date) return [];

    const dateObj = new Date(`${form.date}T12:00:00`);
    const dayName = WEEKDAYS[dateObj.getDay()];
    const workingDays = selectedStaff.working_days ?? [];

    if (!workingDays.includes(dayName)) return [];

    const startMin = timeToMinutes(selectedStaff.working_start);
    const endMin = timeToMinutes(selectedStaff.working_end);
    const duration = effectiveDuration ?? 45;

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
  }, [effectiveServiceId, selectedStaff, form.date, existingAppts, effectiveDuration]);

  const isDayOff =
    form.date &&
    selectedStaff &&
    !(selectedStaff.working_days ?? []).includes(
      WEEKDAYS[new Date(`${form.date}T12:00:00`).getDay()]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveServiceName || !effectiveDuration || !selectedStaff || !form.time) return;

    if (form.date < getTodayStr()) {
      setBookingError('No puedes reservar una cita en una fecha pasada.');
      return;
    }

    setSending(true);
    setBookingError('');

    try {
      // Sin .select(): anon ya no puede leer la tabla, solo insertar (source='web')
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_name: form.name.trim(),
          client_phone: form.phone.trim(),
          service: effectiveServiceName,
          employee: selectedStaff.name,
          date: form.date,
          time: form.time,
          duration: effectiveDuration,
          status: 'pending',
          notes: form.notes.trim() || '',
          source: 'web',
        });

      if (error) {
        console.error('[booking] insert error:', error);
        setBookingError(
          'Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contactanos por WhatsApp.'
        );
        return;
      }

      const waMsg =
        `Hola, acabo de reservar una cita:\n\n` +
        `Nombre: ${form.name}\n` +
        `Telefono: ${form.phone}\n` +
        `Servicio: ${effectiveServiceName}\n` +
        `Con: ${selectedStaff.name}\n` +
        `Fecha: ${form.date}\n` +
        `Hora: ${form.time}\n` +
        `Notas: ${form.notes.trim() || 'Ninguna'}\n\n` +
        `Adjunto el comprobante de deposito para confirmar mi cita.`;
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
    setForm({ name: '', phone: '', serviceId: '', packageId: '', staffId: '', date: '', time: '', notes: '' });
  };

  if (success) {
    return (
      <section className="booking" id="agendar">
        <div className="booking__inner">
          <div className="booking__success">
            <div className="booking__success-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2>¡Tu cita esta pre-reservada!</h2>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {(settings?.bank_accounts && settings.bank_accounts.length > 0
                    ? settings.bank_accounts
                    : [{
                        bank_name: settings?.bank_name || 'Banco Popular',
                        account_number: settings?.account_number || '123456789',
                        account_name: settings?.account_name || 'Anadsll Beauty Esthetic'
                      }]
                  ).map((account, index) => (
                    <div key={index} className="booking__bank-grid" style={{ marginBottom: '0' }}>
                      <div className="booking__bank-item">
                        <span className="booking__bank-label">Banco</span>
                        <span className="booking__bank-value">
                          {account.bank_name}
                        </span>
                      </div>

                      <div className="booking__bank-item">
                        <span className="booking__bank-label">Cuenta</span>
                        <div className="booking__bank-copy-group">
                          <span className="booking__bank-value">
                            {account.account_number}
                          </span>
                          <button
                            className="booking__bank-copy-btn"
                            onClick={() =>
                              copyToClipboard(account.account_number, `account-${index}`)
                            }
                            title="Copiar numero de cuenta"
                          >
                            {copiedField === `account-${index}` ? (
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
                          {account.account_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="booking__success-warning">
                <AlertCircle size={16} />
                <p>
                  <strong>
                    Envia tu comprobante por WhatsApp para que recepcion confirme tu reserva.
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
              <span>Agenda segun disponibilidad real</span>
            </div>
            <div className="booking__benefit">
              <MessageCircle size={20} />
              <span>Confirmacion por WhatsApp</span>
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
                <User size={16} /> Nombre completo
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
                <Phone size={16} /> Telefono
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

          {/* Booking Type Toggle */}
          <div style={{ marginBottom: '1.5rem', width: '100%' }}>
            <div className="booking__field">
              <label>¿Qué deseas reservar?</label>
              <div className="booking__type-toggle-wrapper">
                <div 
                  className="booking__type-toggle-slider" 
                  style={{ transform: bookingType === 'service' ? 'translateX(0)' : 'translateX(100%)' }}
                />
                <button
                  type="button"
                  className={`booking__type-toggle-btn ${bookingType === 'service' ? 'active' : ''}`}
                  onClick={() => {
                    setBookingType('service');
                    setForm({ ...form, packageId: '', staffId: '', date: '', time: '' });
                  }}
                >
                  Servicio Individual
                </button>
                <button
                  type="button"
                  className={`booking__type-toggle-btn ${bookingType === 'package' ? 'active' : ''}`}
                  onClick={() => {
                    setBookingType('package');
                    setForm({ ...form, serviceId: '', staffId: '', date: '', time: '' });
                  }}
                >
                  Paquete de Sesiones
                </button>
              </div>
            </div>
          </div>

          {/* Service / Package & Staff */}
          <div className="booking__row">
            <div className="booking__field" style={{ display: bookingType === 'service' ? undefined : 'none' }}>
              <label htmlFor="booking-service">
                <Sparkles size={16} /> Servicio
              </label>
              <select
                id="booking-service"
                required={bookingType === 'service'}
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
            <div className="booking__field" style={{ display: bookingType === 'package' ? undefined : 'none' }}>
              <label htmlFor="booking-package">
                <Sparkles size={16} /> Paquete
              </label>
              <select
                id="booking-package"
                required={bookingType === 'package'}
                value={form.packageId}
                onChange={(e) =>
                  setForm({ ...form, packageId: e.target.value, staffId: '', date: '', time: '' })
                }
              >
                <option value="">Selecciona un paquete</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.services?.duration} min/sesión)
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
                disabled={!effectiveServiceId}
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
          <div className="booking__field" style={{ minHeight: '130px' }}>
            <label>
              <Clock size={16} /> Horas Disponibles
            </label>

            {!(form.date && selectedStaff) ? (
              <div className="booking__alert" style={{ background: 'transparent', border: '1px dashed #cbd5e1', color: '#64748b', justifyContent: 'center', marginTop: '4px' }}>
                Selecciona especialista y fecha para ver los horarios.
              </div>
            ) : isDayOff ? (
              <div className="booking__alert">
                <AlertCircle size={16} /> {selectedStaff.name} no trabaja este dia.
              </div>
            ) : loadingSlots ? (
              <div className="booking__loading">Buscando horarios disponibles...</div>
            ) : availableSlots.length === 0 ? (
              <div className="booking__alert">
                <AlertCircle size={16} /> No hay horarios libres para esta fecha. Prueba otro
                dia.
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
    </section>
  );
}
