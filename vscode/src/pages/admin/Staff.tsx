import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStaffStore, type StaffMember, type StaffRole, type StaffStats, WEEKDAYS } from '../../store/staffStore';
import { useServiceStore } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import {
  Plus, Search, User, Phone, Mail, Edit2, Trash2, X,
  Clock, Shield, Sparkles, CheckCircle2, XCircle, AlertCircle,
  Percent, Calendar, TrendingUp, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './Staff.css';

const ROLES: { key: StaffRole; label: string }[] = [
  { key: 'specialist',   label: 'Especialista' },
  { key: 'receptionist', label: 'Recepcionista' },
  { key: 'admin',        label: 'Administradora' },
];

const ROLE_FILTERS = [
  { key: 'all',          label: 'Todas' },
  { key: 'specialist',   label: 'Especialistas' },
  { key: 'receptionist', label: 'Recepcionistas' },
  { key: 'admin',        label: 'Admin' },
];

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${String(h).padStart(2, '0')}:00`;
});

const emptyForm: Omit<StaffMember, 'id' | 'createdAt'> = {
  name: '', role: 'specialist', phone: '', email: null,
  commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  workingStart: '09:00', workingEnd: '18:00',
  serviceIds: [], active: true,
};

function capitalizeName(val: string) {
  return val.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface StaffErrors {
  name?: string;
  phone?: string;
  email?: string;
  workingDays?: string;
  schedule?: string;
  commission?: string;
}

function validateStaffForm(form: Omit<StaffMember, 'id' | 'createdAt'>): StaffErrors {
  const errors: StaffErrors = {};
  if (!form.name.trim()) errors.name = 'El nombre es requerido';
  if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
    errors.phone = 'Teléfono inválido (10 dígitos)';
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Correo electrónico inválido';
  }
  if (form.workingDays.length === 0) {
    errors.workingDays = 'Selecciona al menos un día de trabajo';
  }
  if (form.workingStart >= form.workingEnd) {
    errors.schedule = 'La hora de salida debe ser después de la entrada';
  }
  if (form.commissionPct < 0 || form.commissionPct > 100) {
    errors.commission = 'La comisión debe estar entre 0% y 100%';
  }
  return errors;
}

export default function Staff() {
  const { staff, loading, fetchStaff, addStaff, updateStaff, deleteStaff, fetchStaffStats } = useStaffStore();
  const { services, fetchAll: fetchServices } = useServiceStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchStaff().catch(() => toast.error('Error al cargar empleadas'));
    fetchServices();
  }, [fetchStaff, fetchServices]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<StaffErrors>({});
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = useCallback(async (member: StaffMember) => {
    setLoadingStats(true);
    try {
      const s = await fetchStaffStats(member.name);
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [fetchStaffStats]);

  const handleSelect = useCallback((m: StaffMember) => {
    setSelected(m);
    loadStats(m);
  }, [loadStats]);

  useEffect(() => {
    if (selected) {
      const updated = staff.find((m) => m.id === selected.id);
      if (updated) setSelected(updated);
      else setSelected(null);
    }
  }, [staff]);

  const filtered = useMemo(() => {
    let result = staff;
    if (!showInactive) result = result.filter((m) => m.active);
    if (roleFilter !== 'all') result = result.filter((m) => m.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.phone.includes(q) || (m.email && m.email.toLowerCase().includes(q))
      );
    }
    return result;
  }, [staff, search, roleFilter, showInactive]);

  const activeCount = staff.filter((m) => m.active).length;
  const inactiveCount = staff.filter((m) => !m.active).length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name, role: m.role, phone: m.phone, email: m.email,
      commissionPct: m.commissionPct,
      workingDays: [...m.workingDays], workingStart: m.workingStart,
      workingEnd: m.workingEnd, serviceIds: [...m.serviceIds], active: m.active,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStaffForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || null,
      };
      if (editingId) {
        const updated = await updateStaff(editingId, payload);
        if (selected?.id === editingId) {
          setSelected(updated);
          loadStats(updated);
        }
        toast.success('Empleada actualizada correctamente');
      } else {
        await addStaff(payload);
        toast.success('Empleada creada correctamente');
      }
      setShowModal(false);
    } catch {
      toast.error('Ocurrió un error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (m: StaffMember) => {
    try {
      await updateStaff(m.id, { active: !m.active });
      toast.success(m.active ? 'Empleada desactivada' : 'Empleada activada');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteStaff(selected.id);
      setSelected(null);
      setStats(null);
      setShowDeleteConfirm(false);
      toast.success('Empleada eliminada');
    } catch {
      toast.error('Error al eliminar empleada');
    }
  };

  const toggleDay = (day: string) => {
    const days = form.workingDays.includes(day)
      ? form.workingDays.filter((d) => d !== day)
      : [...form.workingDays, day];
    setForm({ ...form, workingDays: days });
    setErrors({ ...errors, workingDays: undefined });
  };

  const toggleService = (id: string) => {
    const ids = form.serviceIds.includes(id)
      ? form.serviceIds.filter((s) => s !== id)
      : [...form.serviceIds, id];
    setForm({ ...form, serviceIds: ids });
  };

  const roleLabel = (role: StaffRole) =>
    ROLES.find((r) => r.key === role)?.label || role;

  const staffServices = (m: StaffMember) =>
    services.filter((s) => m.serviceIds.includes(s.id));

  const closeModal = () => { setShowModal(false); setErrors({}); };

  const roleBadgeClass = (role: StaffRole) => {
    switch (role) {
      case 'admin': return 'staff-role-badge staff-role-badge--admin';
      case 'receptionist': return 'staff-role-badge staff-role-badge--receptionist';
      default: return 'staff-role-badge staff-role-badge--specialist';
    }
  };

  return (
    <div className="staff-page">
      {/* Header */}
      <div className="staff-page__header">
        <div>
          <h1 className="clients__title">Personal</h1>
          <p className="clients__subtitle">
            {activeCount} activas{inactiveCount > 0 && ` · ${inactiveCount} inactivas`}
          </p>
        </div>
        {user?.role === 'admin' && (
          <button className="appts__add-btn" onClick={openCreate} id="btn-new-staff">
            <Plus size={18} /> Nueva Empleada
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="staff-filters">
        <div className="staff-filters__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="staff-search"
          />
        </div>
        <div className="staff-filters__roles">
          {ROLE_FILTERS.map((rf) => (
            <button
              key={rf.key}
              className={`staff-filter-tab ${roleFilter === rf.key ? 'staff-filter-tab--active' : ''}`}
              onClick={() => setRoleFilter(rf.key)}
            >
              {rf.label}
            </button>
          ))}
        </div>
        <button
          className={`staff-filter-inactive ${showInactive ? 'staff-filter-inactive--on' : ''}`}
          onClick={() => setShowInactive(!showInactive)}
          title={showInactive ? 'Ocultar inactivas' : 'Mostrar inactivas'}
        >
          <Filter size={14} />
          {showInactive ? 'Todas' : 'Solo activas'}
        </button>
      </div>

      {loading && <div className="staff-page__loading">Cargando...</div>}

      {/* Split layout */}
      <div className="clients__layout">
        {/* Left: List */}
        <div className="clients__list">
          {filtered.length === 0 ? (
            <div className="appts__empty">
              <User size={40} />
              <p>{search || roleFilter !== 'all' ? 'No se encontraron resultados' : 'No hay empleadas registradas'}</p>
            </div>
          ) : (
            filtered.map((m) => (
              <div
                key={m.id}
                className={`client-row ${selected?.id === m.id ? 'client-row--selected' : ''} ${!m.active ? 'client-row--inactive' : ''}`}
                onClick={() => handleSelect(m)}
              >
                <div className={`client-row__avatar ${!m.active ? 'client-row__avatar--inactive' : ''}`}>
                  {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="client-row__info">
                  <strong>{m.name}</strong>
                  <span><Phone size={12} /> {m.phone || '—'}</span>
                </div>
                <div className="client-row__meta">
                  <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                  {!m.active && <span className="staff-inactive-badge">Inactiva</span>}
                  {m.commissionPct > 0 && (
                    <span className="staff-commission-mini">
                      <Percent size={10} /> {m.commissionPct}%
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Detail */}
        {selected ? (
          <div className="client-detail">
            <div className="client-detail__header">
              <div className={`client-detail__avatar-lg ${!selected.active ? 'client-row__avatar--inactive' : ''}`}>
                {selected.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <h2>{selected.name}</h2>
              <span className={roleBadgeClass(selected.role)} style={{ fontSize: '0.8rem', padding: '4px 14px' }}>
                {roleLabel(selected.role)}
              </span>

              {user?.role === 'admin' && (
                <div className="client-detail__actions">
                  <button onClick={() => openEdit(selected)} className="client-detail__btn">
                    <Edit2 size={15} /> Editar
                  </button>
                  <button
                    onClick={() => handleToggleActive(selected)}
                    className={`client-detail__btn ${selected.active ? '' : 'client-detail__btn--wa'}`}
                  >
                    {selected.active ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                    {selected.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="client-detail__btn client-detail__btn--danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="client-detail__body">
              {/* Stats */}
              {stats && !loadingStats && (
                <div className="staff-stats">
                  <div className="staff-stat-card">
                    <Calendar size={16} />
                    <div>
                      <span className="staff-stat-card__value">{stats.totalAppointments}</span>
                      <span className="staff-stat-card__label">Total Citas</span>
                    </div>
                  </div>
                  <div className="staff-stat-card staff-stat-card--success">
                    <CheckCircle2 size={16} />
                    <div>
                      <span className="staff-stat-card__value">{stats.completedAppointments}</span>
                      <span className="staff-stat-card__label">Completadas</span>
                    </div>
                  </div>
                  <div className="staff-stat-card staff-stat-card--info">
                    <TrendingUp size={16} />
                    <div>
                      <span className="staff-stat-card__value">{stats.upcomingAppointments}</span>
                      <span className="staff-stat-card__label">Próximas</span>
                    </div>
                  </div>
                  <div className="staff-stat-card staff-stat-card--warning">
                    <XCircle size={16} />
                    <div>
                      <span className="staff-stat-card__value">{stats.cancelledAppointments}</span>
                      <span className="staff-stat-card__label">Canceladas</span>
                    </div>
                  </div>
                </div>
              )}
              {loadingStats && (
                <div className="staff-stats-loading">Cargando estadísticas...</div>
              )}

              {/* Contacto */}
              <div className="client-detail__section">
                <h4>Contacto</h4>
                <div className="client-detail__grid">
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Phone size={13} /> Teléfono</span>
                    <span className="client-detail__value">{selected.phone || '—'}</span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Mail size={13} /> Email</span>
                    <span className="client-detail__value">{selected.email || '—'}</span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Shield size={13} /> Estado</span>
                    <span className="client-detail__value" style={{ color: selected.active ? '#4ade80' : '#f87171' }}>
                      {selected.active ? '● Activa' : '● Inactiva'}
                    </span>
                  </div>
                  <div className="client-detail__item">
                    <span className="client-detail__label"><Percent size={13} /> Comisión</span>
                    <span className="client-detail__value">
                      {selected.commissionPct > 0 ? `${selected.commissionPct}%` : 'Sin comisión'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Horario */}
              <div className="client-detail__section">
                <h4>Horario de Trabajo</h4>
                <div className="staff-schedule-display">
                  <div className="staff-schedule-display__days">
                    {WEEKDAYS.map((d) => (
                      <span
                        key={d.key}
                        className={`staff-day-chip ${selected.workingDays.includes(d.key) ? 'staff-day-chip--on' : ''}`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div className="staff-schedule-display__hours">
                    <Clock size={14} />
                    {selected.workingStart} — {selected.workingEnd}
                  </div>
                </div>
              </div>

              {/* Servicios asignados */}
              <div className="client-detail__section">
                <h4>Servicios que Realiza</h4>
                {staffServices(selected).length === 0 ? (
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem' }}>
                    Sin restricción — puede realizar todos los servicios
                  </p>
                ) : (
                  <div className="staff-services-list">
                    {staffServices(selected).map((s) => (
                      <span key={s.id} className="staff-service-tag">
                        <Sparkles size={11} /> {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="client-detail client-detail--empty">
            <User size={48} />
            <p>Selecciona una empleada para ver su perfil</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && selected && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal staff-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff-delete-modal__content">
              <div className="staff-delete-modal__icon">
                <AlertCircle size={32} />
              </div>
              <h3>Eliminar Empleada</h3>
              <p>
                ¿Estás segura de que deseas eliminar a <strong>{selected.name}</strong>?
                Esta acción no se puede deshacer.
              </p>
              {stats && stats.upcomingAppointments > 0 && (
                <div className="staff-delete-modal__warning">
                  <AlertCircle size={14} />
                  Esta empleada tiene <strong>{stats.upcomingAppointments}</strong> cita{stats.upcomingAppointments > 1 ? 's' : ''} próxima{stats.upcomingAppointments > 1 ? 's' : ''}.
                  Considera desactivarla en lugar de eliminarla.
                </div>
              )}
              <div className="staff-delete-modal__actions">
                <button
                  className="modal__cancel-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </button>
                <button
                  className="staff-delete-modal__confirm"
                  onClick={handleDelete}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar Empleada' : 'Nueva Empleada'}</h2>
              <button className="modal__close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal__form" id="staff-form" noValidate>
              <div className="modal__row">
                <div className="modal__field">
                  <label><User size={14} /> Nombre Completo *</label>
                  <input
                    type="text"
                    placeholder="Nombre de la empleada"
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
                  <label><Shield size={14} /> Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                    {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal__row">
                <div className="modal__field">
                  <label><Phone size={14} /> Teléfono</label>
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
                    value={form.email || ''}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value.toLowerCase().trim() || null });
                      setErrors({ ...errors, email: undefined });
                    }}
                    className={errors.email ? 'input--error' : ''}
                  />
                  {errors.email && <span className="field-error"><AlertCircle size={12} /> {errors.email}</span>}
                </div>
              </div>

              {/* Commission */}
              <div className="modal__row">
                <div className="modal__field">
                  <label><Percent size={14} /> Comisión (%)</label>
                  <div className="staff-commission-input">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="0"
                      value={form.commissionPct || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setForm({ ...form, commissionPct: val });
                        setErrors({ ...errors, commission: undefined });
                      }}
                      className={errors.commission ? 'input--error' : ''}
                    />
                    <span className="staff-commission-input__suffix">%</span>
                  </div>
                  {errors.commission && <span className="field-error"><AlertCircle size={12} /> {errors.commission}</span>}
                </div>
                <div className="modal__field" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
                  <label>Estado</label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                    <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                      {form.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Days */}
              <div className="modal__field">
                <label><Clock size={14} /> Días de Trabajo</label>
                <div className="staff-day-picker">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.key} type="button"
                      className={`staff-day-btn ${form.workingDays.includes(d.key) ? 'staff-day-btn--on' : ''}`}
                      onClick={() => toggleDay(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {errors.workingDays && <span className="field-error"><AlertCircle size={12} /> {errors.workingDays}</span>}
              </div>

              {/* Schedule */}
              <div className="modal__row">
                <div className="modal__field">
                  <label>Hora de Entrada</label>
                  <select
                    value={form.workingStart}
                    onChange={(e) => {
                      setForm({ ...form, workingStart: e.target.value });
                      setErrors({ ...errors, schedule: undefined });
                    }}
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="modal__field">
                  <label>Hora de Salida</label>
                  <select
                    value={form.workingEnd}
                    onChange={(e) => {
                      setForm({ ...form, workingEnd: e.target.value });
                      setErrors({ ...errors, schedule: undefined });
                    }}
                    className={errors.schedule ? 'input--error' : ''}
                  >
                    {HOURS.filter((h) => h > form.workingStart).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {errors.schedule && <span className="field-error"><AlertCircle size={12} /> {errors.schedule}</span>}
                </div>
              </div>

              {/* Services */}
              <div className="modal__field">
                <label>
                  <Sparkles size={14} /> Servicios que Realiza
                  <span className="staff-modal__hint">
                    {form.serviceIds.length === 0
                      ? ' — sin selección = puede hacer todos'
                      : ` (${form.serviceIds.length} seleccionados)`}
                  </span>
                </label>
                <div className="staff-services-picker">
                  {services.filter((s) => s.active).map((s) => (
                    <button
                      key={s.id} type="button"
                      className={`staff-service-btn ${form.serviceIds.includes(s.id) ? 'staff-service-btn--on' : ''}`}
                      onClick={() => toggleService(s.id)}
                    >
                      {form.serviceIds.includes(s.id) ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="modal__submit-btn" id="staff-submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Empleada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
