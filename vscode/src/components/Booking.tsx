import { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Clock, User, Phone, MessageCircle, Send,
  Sparkles, AlertCircle, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format12h } from '../lib/timeFormat';
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

interface PublicBlock {
  staff_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
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
  /** Un servicio elegido por la clienta. staffId vacio = "cualquiera disponible". */
  const [picks, setPicks] = useState<{ serviceId: string; staffId: string }[]>([
    { serviceId: '', staffId: '' },
  ]);
  /** Horas ya ocupadas de cada especialista ese dia. */
  const [busyByStaff, setBusyByStaff] = useState<Record<string, ExistingAppt[]>>({});

  const [bookingType, setBookingType] = useState<'service' | 'package'>('service');
  const [form, setForm] = useState({
    name: '', phone: '', serviceId: '', packageId: '', staffId: '', date: '', time: '', notes: '',
  });

  const { settings, fetchSettings } = useSettingsStore();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blocks, setBlocks] = useState<PublicBlock[]>([]);
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
          .in('role', ['specialist', 'admin'])
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

  // Al cambiar el dia se trae la agenda ocupada de TODAS las especialistas:
  // una cita puede repartirse entre varias, asi que hay que saber de todas.
  useEffect(() => {
    if (!form.date || staffList.length === 0) return;

    setLoadingSlots(true);
    setForm((prev) => ({ ...prev, time: '' }));

    Promise.all(
      staffList.map((m) =>
        supabase
          .rpc('get_busy_slots', { p_date: form.date, p_employee: m.name })
          .then(({ data }) => [m.id, (data as ExistingAppt[]) ?? []] as const),
      ),
    ).then((pares) => {
      setBusyByStaff(Object.fromEntries(pares));
      setExistingAppts(pares.flatMap(([, v]) => v));
      setLoadingSlots(false);
    });

    // Bloqueos de horario: vacaciones, dia libre, almuerzo o cierre del salon.
    // La vista publica solo expone los horarios, nunca el motivo.
    supabase
      .from('schedule_blocks_public')
      .select('staff_id, start_date, end_date, start_time, end_time')
      .lte('start_date', form.date)
      .gte('end_date', form.date)
      .then(({ data }) => setBlocks((data as PublicBlock[]) ?? []));
  }, [form.date, staffList]);

  const selectedPkg = packages.find((p) => p.id === form.packageId);

  /** Servicios de esta reserva, en orden. Un paquete cuenta como uno solo. */
  const elegidos = useMemo(() => {
    if (bookingType === 'package') {
      if (!selectedPkg) return [];
      return [{
        serviceId: selectedPkg.service_id,
        staffId: picks[0]?.staffId ?? '',
        nombre: `Paquete: ${selectedPkg.name}`,
        duracion: selectedPkg.services?.duration ?? 45,
      }];
    }
    return picks
      .filter((p) => p.serviceId)
      .map((p) => {
        const sv = services.find((x) => x.id === p.serviceId);
        return {
          serviceId: p.serviceId,
          staffId: p.staffId,
          nombre: sv?.name ?? '',
          duracion: sv?.duration ?? 45,
        };
      });
  }, [bookingType, selectedPkg, picks, services]);

  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);

  /** Quien puede hacer un servicio. Primero quienes lo tienen asignado en su
   *  catalogo; despues quienes no tienen catalogo (la dueña, que puede todo),
   *  para no cargarle a ella el trabajo que cubre el equipo. */
  const quienPuede = (serviceId: string) => {
    const propias = staffList.filter((m) => (m.service_ids ?? []).includes(serviceId));
    const comodin = staffList.filter((m) => (m.service_ids ?? []).length === 0);
    return [...propias, ...comodin];
  };

  /** ¿Esta libre esa persona en ese tramo? Mira su horario de trabajo, sus
   *  citas y los bloqueos (vacaciones, almuerzo, feriado del salon). */
  const estaLibre = (m: StaffMember, desde: number, dur: number, dia: string) => {
    const dayName = WEEKDAYS[new Date(`${dia}T12:00:00`).getDay()];
    if (!(m.working_days ?? []).includes(dayName)) return false;
    if (desde < timeToMinutes(m.working_start)) return false;
    if (desde + dur > timeToMinutes(m.working_end)) return false;

    const ocupada = (busyByStaff[m.id] ?? []).some((a) => {
      const ini = timeToMinutes(String(a.time).slice(0, 5));
      return desde < ini + (a.duration ?? 45) && desde + dur > ini;
    });
    if (ocupada) return false;

    return !blocks.some((b) => {
      if (b.staff_id && b.staff_id !== m.id) return false;
      if (!b.start_time || !b.end_time) return true;
      const bIni = timeToMinutes(b.start_time.slice(0, 5));
      const bFin = timeToMinutes(b.end_time.slice(0, 5));
      return desde < bFin && desde + dur > bIni;
    });
  };

  /** Intenta repartir todos los servicios en cadena desde una hora dada.
   *  Devuelve quien hace cada uno, o null si no cabe. */
  const repartirDesde = (inicio: number, dia: string) => {
    let cursor = inicio;
    const plan: { serviceId: string; nombre: string; duracion: number; staff: StaffMember }[] = [];
    const ocupadasAqui: Record<string, number[][]> = {};

    for (const e of elegidos) {
      const candidatas = e.staffId
        ? staffList.filter((m) => m.id === e.staffId)
        : quienPuede(e.serviceId);

      const libre = candidatas.find((m) => {
        if (!estaLibre(m, cursor, e.duracion, dia)) return false;
        // Tampoco puede estar haciendo otro servicio de ESTA misma cita
        return !(ocupadasAqui[m.id] ?? []).some(([a, b]) => cursor < b && cursor + e.duracion > a);
      });

      if (!libre) return null;
      (ocupadasAqui[libre.id] ??= []).push([cursor, cursor + e.duracion]);
      plan.push({ serviceId: e.serviceId, nombre: e.nombre, duracion: e.duracion, staff: libre });
      cursor += e.duracion;
    }
    return plan;
  };

  /** Horas a las que cabe la visita completa, con el reparto ya resuelto. */
  const slotsConPlan = useMemo(() => {
    if (elegidos.length === 0 || !form.date || duracionTotal === 0) return [];

    const apertura = Math.min(...staffList.map((m) => timeToMinutes(m.working_start)), 9 * 60);
    const cierre = Math.max(...staffList.map((m) => timeToMinutes(m.working_end)), 18 * 60);

    // Hoy nunca se ofrecen horas que ya pasaron (con 15 minutos de margen)
    let desdeAhora = 0;
    if (form.date === getTodayStr()) {
      const now = new Date();
      desdeAhora = now.getHours() * 60 + now.getMinutes() + 15;
    }

    const salida: { hora: string; plan: NonNullable<ReturnType<typeof repartirDesde>> }[] = [];
    for (let cursor = apertura; cursor + duracionTotal <= cierre; cursor += 30) {
      if (cursor < desdeAhora) continue;
      const plan = repartirDesde(cursor, form.date);
      if (plan) salida.push({ hora: minutesToTime(cursor), plan });
    }
    return salida;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegidos, form.date, duracionTotal, staffList, busyByStaff, blocks]);

  const availableSlots = useMemo(() => slotsConPlan.map((s) => s.hora), [slotsConPlan]);
  const planElegido = slotsConPlan.find((s) => s.hora === form.time)?.plan ?? null;

  // No hay ni un hueco en todo el dia: o nadie trabaja, o esta todo tomado
  const isDayOff = Boolean(form.date) && elegidos.length > 0 && slotsConPlan.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planElegido || !form.time) return;

    if (form.date < getTodayStr()) {
      setBookingError('No puedes reservar una cita en una fecha pasada.');
      return;
    }

    setSending(true);
    setBookingError('');

    try {
      // La lista de horarios se cargo hace rato: alguien pudo tomar la hora
      // mientras la clienta llenaba el formulario. Se relee antes de guardar.
      const frescos = await Promise.all(
        planElegido.map((linea) =>
          supabase
            .rpc('get_busy_slots', { p_date: form.date, p_employee: linea.staff.name })
            .then(({ data }) => [linea.staff.id, (data as ExistingAppt[]) ?? []] as const),
        ),
      );
      const agendaFresca = Object.fromEntries(frescos);

      let cursor = timeToMinutes(form.time);
      const seOcupo = planElegido.some((linea) => {
        const choca = (agendaFresca[linea.staff.id] ?? []).some((a) => {
          const ini = timeToMinutes(String(a.time).slice(0, 5));
          return cursor < ini + (a.duration ?? 45) && cursor + linea.duracion > ini;
        });
        cursor += linea.duracion;
        return choca;
      });

      if (seOcupo) {
        setBusyByStaff((prev) => ({ ...prev, ...agendaFresca }));
        setForm((prev) => ({ ...prev, time: '' }));
        setBookingError('Ese horario se acaba de ocupar. Por favor elige otra hora.');
        return;
      }

      // Cita y servicios en una sola transaccion: si un servicio choca, no
      // queda una cita a medias.
      const { error } = await supabase.rpc('save_appointment', {
        p_id: null,
        p_client_id: null,
        p_client_name: form.name.trim(),
        p_client_phone: form.phone.trim(),
        p_date: form.date,
        p_time: form.time,
        p_status: 'pending',
        p_notes: form.notes.trim() || '',
        p_source: 'web',
        p_services: planElegido.map((linea) => ({
          service_id: bookingType === 'package' ? null : linea.serviceId,
          service_name: linea.nombre,
          employee: linea.staff.name,
          duration: linea.duracion,
          price: 0,
        })),
      });

      if (error) {
        console.error('[booking] insert error:', error);
        // 23P01 = la base rechazo la cita porque otra persona tomo ese horario
        // en el mismo instante. Es el unico caso que la clienta puede resolver.
        if (error?.code === '23P01') {
          setForm((prev) => ({ ...prev, time: '' }));
          setBookingError('Ese horario se acaba de ocupar. Por favor elige otra hora.');
        } else {
          setBookingError(
            'Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contactanos por WhatsApp.'
          );
        }
        return;
      }

      const detalle = planElegido
        .map((l) => `- ${l.nombre} con ${l.staff.name}`)
        .join('\n');

      const waMsg =
        `Hola, acabo de reservar una cita:\n\n` +
        `Nombre: ${form.name}\n` +
        `Telefono: ${form.phone}\n` +
        `${planElegido.length > 1 ? 'Servicios' : 'Servicio'}:\n${detalle}\n` +
        `Fecha: ${form.date}\n` +
        `Hora: ${format12h(form.time)}\n` +
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
            <div className="booking__field booking__field--full" style={{ display: bookingType === 'service' ? undefined : 'none' }}>
              <label htmlFor="booking-service">
                <Sparkles size={16} /> Servicios
              </label>

              {picks.map((pick, i) => {
                const sv = services.find((x) => x.id === pick.serviceId);
                const posibles = pick.serviceId
                  ? staffList.filter((m) => {
                      const ids = m.service_ids ?? [];
                      return ids.length === 0 || ids.includes(pick.serviceId);
                    })
                  : [];
                return (
                  <div className="booking__pick" key={i}>
                    <select
                      id={i === 0 ? 'booking-service' : `booking-service-${i}`}
                      required={bookingType === 'service' && i === 0}
                      value={pick.serviceId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPicks((ps) => ps.map((p, idx) => (idx === i ? { serviceId: v, staffId: '' } : p)));
                        setForm((f) => ({ ...f, time: '' }));
                      }}
                    >
                      <option value="">Selecciona un servicio</option>
                      {services.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.duration} min)
                        </option>
                      ))}
                    </select>

                    <select
                      className="booking__pick-staff"
                      value={pick.staffId}
                      disabled={!pick.serviceId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPicks((ps) => ps.map((p, idx) => (idx === i ? { ...p, staffId: v } : p)));
                        setForm((f) => ({ ...f, time: '' }));
                      }}
                    >
                      <option value="">Cualquier especialista</option>
                      {posibles.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {picks.length > 1 && (
                      <button
                        type="button"
                        className="booking__pick-remove"
                        onClick={() => {
                          setPicks((ps) => ps.filter((_, idx) => idx !== i));
                          setForm((f) => ({ ...f, time: '' }));
                        }}
                        aria-label={`Quitar ${sv?.name ?? 'servicio'}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="booking__picks-footer">
                <button
                  type="button"
                  className="booking__pick-add"
                  onClick={() => setPicks((ps) => [...ps, { serviceId: '', staffId: '' }])}
                >
                  + Agregar otro servicio
                </button>
                {duracionTotal > 0 && (
                  <span className="booking__picks-total">
                    {duracionTotal} min en total
                  </span>
                )}
              </div>
            </div>

            <div className="booking__field" style={{ display: bookingType === 'package' ? undefined : 'none' }}>
              <label htmlFor="booking-package">
                <Sparkles size={16} /> Paquete
              </label>
              <select
                id="booking-package"
                required={bookingType === 'package'}
                value={form.packageId}
                onChange={(e) => setForm({ ...form, packageId: e.target.value, date: '', time: '' })}
              >
                <option value="">Selecciona un paquete</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.services?.duration} min/sesión)
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

            {!(form.date && elegidos.length > 0) ? (
              <div className="booking__alert" style={{ background: 'transparent', border: '1px dashed #cbd5e1', color: '#64748b', justifyContent: 'center', marginTop: '4px' }}>
                Elige los servicios y la fecha para ver los horarios.
              </div>
            ) : loadingSlots ? (
              <div className="booking__loading">Buscando horarios disponibles...</div>
            ) : isDayOff ? (
              <div className="booking__alert">
                <AlertCircle size={16} />{' '}
                {elegidos.length > 1
                  ? 'Ese día no hay un hueco donde quepan todos los servicios seguidos. Prueba otra fecha o quita alguno.'
                  : 'No hay horarios libres para esta fecha. Prueba otro día.'}
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
                    {format12h(time)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {planElegido && planElegido.length > 1 && (
            <div className="booking__plan">
              <span className="booking__plan-title">Tu visita quedaría así</span>
              {planElegido.map((l, idx) => {
                const inicio = timeToMinutes(form.time) +
                  planElegido.slice(0, idx).reduce((t, x) => t + x.duracion, 0);
                return (
                  <span className="booking__plan-line" key={idx}>
                    <strong>{format12h(minutesToTime(inicio))}</strong> {l.nombre}
                    <em> con {l.staff.name}</em>
                  </span>
                );
              })}
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
    </section>
  );
}
