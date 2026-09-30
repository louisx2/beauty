import { useState } from 'react';
import {
  Calendar, Clock, User, Phone, MessageCircle, Send,
  Sparkles, AlertCircle, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { format12h } from '../lib/timeFormat';
import { isoLocal } from '../site/reservar/calendario';
import { formatoTelefono as formatPhone } from '../site/reservar/datos';
import { minutesToTime, timeToMinutes } from '../site/reservar/disponibilidad';
import { useBooking } from '../site/reservar/useBooking';
import './Booking.css';

/** El diseño anterior de /reservar (spec §8). La lógica vive en useBooking y es la misma de la reserva nueva. */
export default function Booking() {
  const {
    services, packages, staffList, picks, setPicks, bookingType, cambiarTipo, form, setForm,
    settings, sending, loadingSlots, success, bookingError, whatsappMsg,
    selectedPkg, elegidos, duracionTotal, availableSlots, planElegido, isDayOff, submit, reset,
  } = useBooking();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetForm = reset;

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
                  onClick={() => cambiarTipo('service')}
                >
                  Servicios
                </button>
                <button
                  type="button"
                  className={`booking__type-toggle-btn ${bookingType === 'package' ? 'active' : ''}`}
                  onClick={() => cambiarTipo('package')}
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
                onChange={(e) => {
                  setPicks([{ serviceId: '', staffId: '' }]);
                  setForm({ ...form, packageId: e.target.value, time: '' });
                }}
              >
                <option value="">Selecciona un paquete</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.services?.duration} min/sesión)
                  </option>
                ))}
              </select>
            </div>

            <div className="booking__field" style={{ display: bookingType === 'package' ? undefined : 'none' }}>
              <label htmlFor="booking-package-staff">
                <User size={16} /> Especialista
              </label>
              <select
                id="booking-package-staff"
                value={picks[0]?.staffId ?? ''}
                disabled={!selectedPkg}
                onChange={(e) => {
                  const v = e.target.value;
                  setPicks([{ serviceId: '', staffId: v }]);
                  setForm((f) => ({ ...f, time: '' }));
                }}
              >
                <option value="">Cualquier especialista</option>
                {selectedPkg &&
                  staffList
                    .filter((m) => {
                      const ids = m.service_ids ?? [];
                      return ids.length === 0 || ids.includes(selectedPkg.service_id);
                    })
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
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
                // La especialista se elige por servicio (o "cualquiera"), asi que
                // basta con tener al menos un servicio o paquete elegido.
                disabled={elegidos.length === 0}
                min={isoLocal(new Date())}
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
