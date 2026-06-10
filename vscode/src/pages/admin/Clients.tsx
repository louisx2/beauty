import { useState, useMemo, useEffect } from 'react';
import { useClientStore, type Client } from '../../store/clientStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import {
  Plus, Search, User, Phone, Mail, FileText,
  X, Edit2, Trash2, Heart, Shield, MessageCircle, ChevronRight, AlertCircle, Calendar,
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

  const closeModal = () => { setShowModal(false); setErrors({}); };

  return (
    <div className="clients-page">
      <div className="clients-page__header">
        <div>
          <h1 className="clients-page__title">CRM de Clientas</h1>
          <p className="clients-page__subtitle">{clients.length} clientas registradas</p>
        </div>
        <button className="clients-page__add-btn" onClick={openCreate} id="btn-new-client">
          <Plus size={18} /> Nueva Clienta
        </button>
      </div>

      {/* Search */}
      <div className="clients-filters">
        <div className="clients-filters__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="clients-search"
          />
        </div>
      </div>

      <div className="clients-grid">
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' }}>
            <User size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No se encontraron clientas</p>
          </div>
        ) : (
          filtered.map((c) => {
            const clientAppts = appointments.filter((a) => a.client_id === c.id);
            const completedAppts = clientAppts.filter(a => a.status === 'completed').length;
            const pendingAppts = clientAppts.filter(a => a.status === 'pending' || a.status === 'confirmed').length;

            return (
              <div className="client-card" key={c.id}>
                <div className="client-card__header">
                  <div className="client-card__avatar">
                    {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="client-card__info">
                    <h3 className="client-card__name">{c.name}</h3>
                    <div className="client-card__role">
                      <Calendar size={12} />
                      Desde {new Date(c.created_at).toLocaleDateString('es-DO', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="client-card__stats">
                  <div className="client-card__stat">
                    <span className="client-card__stat-label">Total Citas</span>
                    <span className="client-card__stat-value">{clientAppts.length}</span>
                  </div>
                  <div className="client-card__stat">
                    <span className="client-card__stat-label">Completadas</span>
                    <span className="client-card__stat-value" style={{ color: '#4ade80' }}>{completedAppts}</span>
                  </div>
                  <div className="client-card__stat">
                    <span className="client-card__stat-label">Pendientes</span>
                    <span className="client-card__stat-value" style={{ color: '#fbbf24' }}>{pendingAppts}</span>
                  </div>
                </div>

                <div className="client-card__details">
                  <div className="client-card__detail-item">
                    <Phone size={14} /> {c.phone}
                  </div>
                  {c.email && (
                    <div className="client-card__detail-item">
                      <Mail size={14} /> {c.email}
                    </div>
                  )}
                  {c.skin_type && (
                    <div className="client-card__detail-item">
                      <Heart size={14} /> Piel: {c.skin_type}
                    </div>
                  )}
                </div>

                <div className="client-card__actions">
                  <button onClick={() => openEdit(c)} className="client-card__btn client-card__btn--primary">
                    <Edit2 size={15} /> Editar
                  </button>
                  <button onClick={() => handleWhatsApp(c)} className="client-card__btn client-card__btn--wa">
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button onClick={() => deleteClient(c.id)} className="client-card__btn" style={{ flex: 0, padding: '8px 12px', color: '#f87171' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
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
