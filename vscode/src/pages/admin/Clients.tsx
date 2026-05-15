import { useState, useMemo, useEffect } from 'react';
import { useClientStore, type Client } from '../../store/clientStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import {
  Plus, Search, User, Phone, Mail, FileText,
  X, Edit2, Trash2, Heart, Shield, MessageCircle, ChevronRight, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Clients.css';

const SKIN_TYPES = ['Normal', 'Seca', 'Grasa', 'Mixta', 'Sensible'];

const emptyForm = {
  name: '', cedula: '', phone: '', email: '', skin_type: '', allergies: '', notes: '', source: 'manual' as string,
};

// ── Formatters ──────────────────────────────────────────────
/** Capitalizes each word: "maria jose" → "Maria Jose" */
function capitalizeName(val: string) {
  return val.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** RD phone format: 3 digits, dash, 3 digits, dash, 4 digits → 829-000-0000 */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** RD cédula format: 001-0000000-0 */
function formatCedula(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
}

// ── Validators ───────────────────────────────────────────────
function validateForm(form: typeof emptyForm) {
  const errors: Partial<typeof emptyForm> = {};
  if (!form.name.trim()) errors.name = 'El nombre es requerido';
  if (!form.phone.trim()) {
    errors.phone = 'El teléfono es requerido';
  } else if (form.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Teléfono inválido (10 dígitos)';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Correo electrónico inválido';
  }
  if (form.cedula && form.cedula.replace(/\D/g, '').length !== 11) {
    errors.cedula = 'Cédula inválida (11 dígitos)';
  }
  return errors;
}

export default function Clients() {
  const { clients, fetchClients, addClient, updateClient, deleteClient } = useClientStore();
  const { appointments, fetchAppointments } = useAppointmentStore();

  useEffect(() => { 
    fetchClients(); 
    fetchAppointments();
  }, [fetchClients, fetchAppointments]);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Partial<typeof emptyForm>>({});
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.cedula || '').includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (c: Client) => {
    setEditingId(c.id);
    setForm({ name: c.name, cedula: c.cedula || '', phone: c.phone, email: c.email || '', skin_type: c.skin_type || '', allergies: c.allergies || '', notes: c.notes || '', source: c.source });
    setErrors({});
    setShowModal(true);
    setSelectedClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim() || null,
        cedula: form.cedula.trim() || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
        skin_type: form.skin_type || null,
      };
      if (editingId) {
        await updateClient(editingId, payload);
        toast.success('Clienta actualizada correctamente');
      } else {
        await addClient(payload);
        toast.success('Clienta creada correctamente');
      }
      setShowModal(false);
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = (c: Client) => {
    const phone = c.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(`Hola ${c.name}, te escribimos de Anadsll Beauty Esthetic.`)}`, '_blank');
  };

  const clientAppointments = useMemo(() => {
    if (!selectedClient) return [];
    return appointments
      .filter((a) => a.clientPhone === selectedClient.phone || (a.client_id === selectedClient.id) || (a.clientName.toLowerCase() === selectedClient.name.toLowerCase()))
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [appointments, selectedClient]);

  const closeModal = () => { setShowModal(false); setErrors({}); };

  return (
    <div className="clients">
      {/* Header */}
      <div className="clients__header">
        <div>
          <h1 className="clients__title">CRM de Clientas</h1>
          <p className="clients__subtitle">{clients.length} clientas registradas</p>
        </div>
        <button className="appts__add-btn" onClick={openCreate} id="btn-new-client">
          <Plus size={18} /> Nueva Clienta
        </button>
      </div>

      {/* Search */}
      <div className="clients__search-bar">
        <div className="appts__search" style={{ maxWidth: 400 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="clients-search"
          />
        </div>
      </div>

      <div className="clients__layout">
        {/* Client List */}
        <div className="clients__list">
          {filtered.length === 0 ? (
            <div className="appts__empty">
              <User size={40} />
              <p>No se encontraron clientas</p>
            </div>
          ) : (
            filtered.map((c) => (
              <div
                className={`client-row ${selectedClient?.id === c.id ? 'client-row--selected' : ''}`}
                key={c.id}
                onClick={() => setSelectedClient(c)}
              >
                <div className="client-row__avatar">
                  {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="client-row__info">
                  <strong>{c.name}</strong>
                  <span><Phone size={12} /> {c.phone}</span>
                </div>
                <div className="client-row__meta">
                  <span className="client-row__skin">{c.skin_type || '—'}</span>
                  {c.allergies && <span className="client-row__allergy">⚠ Alergias</span>}
                </div>
                <ChevronRight size={16} className="client-row__chevron" />
              </div>
            ))
          )}
        </div>

        {/* Client Detail Panel */}
        {selectedClient ? (
          <div className="client-detail">
            <div className="client-detail__header">
              <div className="client-detail__avatar-lg">
                {selectedClient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <h2>{selectedClient.name}</h2>
              <span className="client-detail__since">Clienta desde {new Date(selectedClient.created_at).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</span>

              <div className="client-detail__actions">
                <button onClick={() => openEdit(selectedClient)} className="client-detail__btn"><Edit2 size={15} /> Editar</button>
                <button onClick={() => handleWhatsApp(selectedClient)} className="client-detail__btn client-detail__btn--wa"><MessageCircle size={15} /> WhatsApp</button>
                <button onClick={() => { deleteClient(selectedClient.id); setSelectedClient(null); }} className="client-detail__btn client-detail__btn--danger"><Trash2 size={15} /></button>
              </div>
            </div>

            <div className="client-detail__body">
              <div className="client-detail__section">
                <h4>Información Personal</h4>
                <div className="client-detail__grid">
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Shield size={13} /> Cédula</span>
                    <span className="client-detail__value">{selectedClient.cedula || '—'}</span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Phone size={13} /> Teléfono</span>
                    <span className="client-detail__value">{selectedClient.phone}</span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Mail size={13} /> Email</span>
                    <span className="client-detail__value">{selectedClient.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="client-detail__section">
                <h4>Información Clínica</h4>
                <div className="client-detail__grid">
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Heart size={13} /> Tipo de Piel</span>
                    <span className="client-detail__value">{selectedClient.skin_type || '—'}</span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label">⚠️ Alergias</span>
                    <span className="client-detail__value" style={selectedClient.allergies ? { color: '#fbbf24' } : {}}>{selectedClient.allergies || 'Ninguna'}</span>
                  </div>
                </div>
              </div>

              {selectedClient.notes && (
                <div className="client-detail__section">
                  <h4>Notas</h4>
                  <p className="client-detail__notes-text"><FileText size={13} /> {selectedClient.notes}</p>
                </div>
              )}

              <div className="client-detail__section">
                <h4>Historial de Citas</h4>
                {clientAppointments.length === 0 ? (
                  <p className="client-detail__notes-text">No hay citas registradas</p>
                ) : (
                  <div className="client-detail__history">
                    {clientAppointments.map((a) => (
                      <div key={a.id} className="history-item">
                        <div className="history-item__date">
                          <strong>{new Date(a.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          <span>{a.time}</span>
                        </div>
                        <div className="history-item__info">
                          <strong>{a.service}</strong>
                          <span>{a.employee}</span>
                        </div>
                        <span className={`badge badge--${a.status === 'completed' ? 'blue' : a.status === 'cancelled' || a.status === 'no_show' ? 'red' : 'green'}`}>
                          {a.status === 'completed' ? 'Completada' : a.status === 'cancelled' ? 'Cancelada' : a.status === 'no_show' ? 'No Asistió' : a.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="client-detail client-detail--empty">
            <User size={48} />
            <p>Selecciona una clienta para ver su ficha</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar Clienta' : 'Nueva Clienta'}</h2>
              <button className="modal__close" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form" id="client-form" noValidate>
              <div className="modal__row">
                <div className="modal__field">
                  <label><User size={14} /> Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Nombre de la clienta"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: capitalizeName(e.target.value) });
                      setErrors({ ...errors, name: undefined });
                    }}
                    className={errors.name ? 'input--error' : ''}
                  />
                  {errors.name && <span className="field-error"><AlertCircle size={12} /> {errors.name}</span>}
                </div>
                <div className="modal__field">
                  <label><Shield size={14} /> Cédula</label>
                  <input
                    type="text"
                    placeholder="001-0000000-0"
                    value={form.cedula}
                    onChange={(e) => {
                      setForm({ ...form, cedula: formatCedula(e.target.value) });
                      setErrors({ ...errors, cedula: undefined });
                    }}
                    className={errors.cedula ? 'input--error' : ''}
                    maxLength={13}
                  />
                  {errors.cedula && <span className="field-error"><AlertCircle size={12} /> {errors.cedula}</span>}
                </div>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label><Phone size={14} /> Teléfono *</label>
                  <input
                    type="tel"
                    placeholder="829-000-0000"
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: formatPhone(e.target.value) });
                      setErrors({ ...errors, phone: undefined });
                    }}
                    className={errors.phone ? 'input--error' : ''}
                    maxLength={12}
                  />
                  {errors.phone && <span className="field-error"><AlertCircle size={12} /> {errors.phone}</span>}
                </div>
                <div className="modal__field">
                  <label><Mail size={14} /> Email</label>
                  <input
                    type="email"
                    placeholder="correo@email.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value.toLowerCase().trim() });
                      setErrors({ ...errors, email: undefined });
                    }}
                    className={errors.email ? 'input--error' : ''}
                  />
                  {errors.email && <span className="field-error"><AlertCircle size={12} /> {errors.email}</span>}
                </div>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label><Heart size={14} /> Tipo de Piel</label>
                  <select value={form.skin_type} onChange={(e) => setForm({ ...form, skin_type: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {SKIN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal__field">
                <label>⚠️ Alergias</label>
                <input
                  type="text"
                  placeholder="Retinol, fragancias, etc."
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                />
              </div>
              <div className="modal__field">
                <label><FileText size={14} /> Notas</label>
                <textarea
                  placeholder="Observaciones importantes..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="client-submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingId ? 'Guardar' : 'Crear Clienta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
