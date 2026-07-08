import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStaffStore, type StaffMember, type StaffRole, type StaffStats, WEEKDAYS } from '../../store/staffStore';
import { useServiceStore } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import {
  Plus, Search, User, UserPlus, Phone, Mail, Edit2, Trash2, X,
  Clock, Shield, Sparkles, CheckCircle2, XCircle, AlertCircle,
  Percent, Calendar, TrendingUp, Filter, Key, Lock, Unlock, UserCog,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format12h } from '../../lib/timeFormat';
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
  serviceIds: [], active: true, avatarUrl: null,
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

const SQL_MIGRATION_CODE = `-- Ejecuta esto en Supabase SQL Editor para habilitar la gestión de inicios de sesión
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.list_staff_logins()
RETURNS TABLE (id UUID, email VARCHAR, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN QUERY SELECT u.id, u.email, u.created_at, u.last_sign_in_at FROM auth.users u;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_staff_user(user_email TEXT, user_password TEXT, user_name TEXT, user_role TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  encrypted_pass TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RAISE EXCEPTION 'El correo electrónico ya está registrado.';
  END IF;
  encrypted_pass := extensions.crypt(user_password, extensions.gen_salt('bf', 10));
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, is_super_admin)
  VALUES ('00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', user_email, encrypted_pass, now(), '{"provider": "email", "providers": ["email"]}'::jsonb, jsonb_build_object('name', user_name, 'role', user_role), now(), now(), '', '', '', false);
  INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (new_user_id::text, new_user_id, jsonb_build_object('sub', new_user_id, 'email', user_email), 'email', now(), now(), now());
  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_user_password(user_email TEXT, new_password TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE encrypted_pass TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  encrypted_pass := extensions.crypt(new_password, extensions.gen_salt('bf', 10));
  UPDATE auth.users SET encrypted_password = encrypted_pass, updated_at = now() WHERE email = user_email;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff_user(user_email TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = auth.jwt() ->> 'email' AND role = 'admin' AND active = true) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  DELETE FROM auth.users WHERE email = user_email;
  RETURN FOUND;
END;
$$;`;

export default function Staff() {
  const { staff, loading, fetchStaff, addStaff, updateStaff, deleteStaff, fetchStaffStats } = useStaffStore();
  const { services, fetchAll: fetchServices } = useServiceStore();
  const { user } = useAuthStore();

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
  const [uploading, setUploading] = useState(false);

  // Stats for all staff loaded concurrently
  const [memberStats, setMemberStats] = useState<Record<string, StaffStats>>({});

  // Credentials / Logins state
  const [logins, setLogins] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([]);
  const [userManagementEnabled, setUserManagementEnabled] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStaff, setLoginStaff] = useState<StaffMember | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  const loadLogins = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_staff_logins');
      if (error) {
        console.warn('list_staff_logins is not available:', error.message);
        setUserManagementEnabled(false);
        return;
      }
      setLogins(data || []);
      setUserManagementEnabled(true);
    } catch (err) {
      console.warn('Failed to load logins:', err);
      setUserManagementEnabled(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff().catch(() => toast.error('Error al cargar empleadas'));
    fetchServices();
    loadLogins();
  }, [fetchStaff, fetchServices, loadLogins]);

  // Load stats for each staff member on fetch
  useEffect(() => {
    if (staff.length > 0) {
      staff.forEach(async (m) => {
        try {
          const s = await fetchStaffStats(m.name);
          setMemberStats((prev) => ({ ...prev, [m.name]: s }));
        } catch {
          // Ignore stats error for individual staff members
        }
      });
    }
  }, [staff, fetchStaffStats]);

  const hasLogin = useCallback((email: string | null) => {
    if (!email) return false;
    return logins.some((l) => l.email.toLowerCase() === email.toLowerCase());
  }, [logins]);

  const getLoginDetails = useCallback((email: string | null) => {
    if (!email) return null;
    return logins.find((l) => l.email.toLowerCase() === email.toLowerCase()) || null;
  }, [logins]);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      toast.success('Foto cargada temporalmente. Guarda la ficha para aplicar.');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (m: StaffMember) => {
    setEditingId(m.id);
    setForm({
      name: m.name, role: m.role, phone: m.phone, email: m.email,
      commissionPct: m.commissionPct,
      workingDays: [...m.workingDays], workingStart: m.workingStart,
      workingEnd: m.workingEnd, serviceIds: [...m.serviceIds], active: m.active,
      avatarUrl: m.avatarUrl || null,
    });
    setErrors({});
    setShowModal(true);
  };

  const openManageLogin = (m: StaffMember) => {
    setLoginStaff(m);
    setLoginPassword('');
    setShowLoginModal(true);
  };

  const handleCreateLogin = async () => {
    if (!loginStaff || !loginStaff.email) return;
    if (loginPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoginSubmitting(true);
    try {
      const { error } = await supabase.rpc('create_staff_user', {
        user_email: loginStaff.email,
        user_password: loginPassword,
        user_name: loginStaff.name,
        user_role: loginStaff.role,
      });

      if (error) throw error;
      toast.success('Acceso de login habilitado correctamente.');
      loadLogins();
      setShowLoginModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al habilitar acceso');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!loginStaff || !loginStaff.email) return;
    if (loginPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoginSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('update_staff_user_password', {
        user_email: loginStaff.email,
        new_password: loginPassword,
      });

      if (error) throw error;
      if (data) {
        toast.success('Contraseña actualizada correctamente.');
        setShowLoginModal(false);
      } else {
        toast.error('No se pudo encontrar el usuario en Supabase Auth.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar contraseña');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleDeleteLogin = async () => {
    if (!loginStaff || !loginStaff.email) return;
    if (!window.confirm(`¿Estás segura de revocar el acceso a ${loginStaff.name}? La cuenta en Supabase Auth será eliminada.`)) return;
    
    setLoginSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('delete_staff_user', {
        user_email: loginStaff.email,
      });

      if (error) throw error;
      if (data) {
        toast.success('Acceso revocado correctamente.');
        loadLogins();
        setShowLoginModal(false);
      } else {
        toast.error('No se pudo eliminar el usuario de Supabase Auth.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al revocar acceso');
    } finally {
      setLoginSubmitting(false);
    }
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
      case 'admin': return 'staff-card__role-badge staff-card__role-badge--admin';
      case 'receptionist': return 'staff-card__role-badge staff-card__role-badge--receptionist';
      default: return 'staff-card__role-badge staff-card__role-badge--specialist';
    }
  };

  const avatarGradientClass = (role: StaffRole) => {
    switch (role) {
      case 'admin': return 'staff-card__avatar--admin';
      case 'receptionist': return 'staff-card__avatar--receptionist';
      default: return 'staff-card__avatar--specialist';
    }
  };

  return (
    <div className="staff-page">
      {/* Header */}
      <div className="staff-page__header">
        <div>
          <h1 className="staff-page__title">Equipo y Colaboradoras</h1>
          <p className="staff-page__subtitle">
            {activeCount} activas{inactiveCount > 0 && ` · ${inactiveCount} inactivas`}
          </p>
        </div>
        <div className="staff-page__header-actions">
          {user?.role === 'admin' && (
            <button className="staff-page__add-btn" onClick={openCreate} id="btn-new-staff">
              <UserPlus size={18} /> Agregar
            </button>
          )}
        </div>
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
        >
          <Filter size={14} />
          {showInactive ? 'Todas' : 'Solo activas'}
        </button>
      </div>

      {loading && <div className="staff-page__loading">Cargando equipo...</div>}

      {/* Cards Grid */}
      <div className="staff-grid">
        {filtered.length === 0 ? (
          <div className="staff-page__empty">
            <User size={48} />
            <p>{search || roleFilter !== 'all' ? 'No se encontraron resultados' : 'No hay empleadas registradas'}</p>
          </div>
        ) : (
          filtered.map((m) => {
            const stats = memberStats[m.name] || null;
            return (
              <div
                key={m.id}
                className={`staff-card ${!m.active ? 'staff-card--inactive' : ''}`}
              >
                <div className="staff-card__header">
                  <div className={`staff-card__avatar ${avatarGradientClass(m.role)}`} style={{ padding: 0, overflow: 'hidden' }}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      m.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                    <span className={`staff-card__status-dot ${m.active ? 'staff-card__status-dot--active' : ''}`} />
                  </div>
                  <div className="staff-card__name-role">
                    <h3>{m.name}</h3>
                    <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                  </div>
                </div>

                <div className="staff-card__body">
                  {/* Quick Stats Grid */}
                  <div className="staff-card__stats">
                    <div className="staff-card__stat-item">
                      <span className="staff-card__stat-val">{stats?.completedAppointments ?? 0}/{stats?.totalAppointments ?? 0}</span>
                      <span className="staff-card__stat-lbl">Citas</span>
                    </div>
                    <div className="staff-card__stat-item">
                      <span className="staff-card__stat-val text-info">{stats?.upcomingAppointments ?? 0}</span>
                      <span className="staff-card__stat-lbl">Próximas</span>
                    </div>
                    <div className="staff-card__stat-item">
                      <span className="staff-card__stat-val text-success">{m.commissionPct > 0 ? `${m.commissionPct}%` : '—'}</span>
                      <span className="staff-card__stat-lbl">Comisión</span>
                    </div>
                  </div>

                  {/* Info List */}
                  <div className="staff-card__info-list">
                    <div className="staff-card__info-item">
                      <Phone size={13} />
                      <span>{m.phone || 'Sin teléfono'}</span>
                    </div>
                    <div className="staff-card__info-item">
                      <Mail size={13} />
                      <span className="staff-card__email-text">{m.email || 'Sin correo'}</span>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="staff-card__schedule">
                    <div className="staff-card__schedule-days">
                      {WEEKDAYS.map((d) => {
                        const isWorking = m.workingDays.includes(d.key);
                        return (
                          <span
                            key={d.key}
                            className={`staff-card__day-dot ${isWorking ? 'staff-card__day-dot--active' : ''}`}
                            title={d.label}
                          >
                            {d.label[0]}
                          </span>
                        );
                      })}
                    </div>
                    <div className="staff-card__schedule-hours">
                      <Clock size={12} />
                      <span>{format12h(m.workingStart)} — {format12h(m.workingEnd)}</span>
                    </div>
                  </div>

                  {/* Services tags */}
                  <div className="staff-card__services">
                    <h4 className="staff-card__section-title">Servicios que realiza</h4>
                    <div className="staff-card__services-tags">
                      {m.serviceIds.length === 0 ? (
                        <span className="staff-card__service-tag staff-card__service-tag--all">
                          Todos los servicios
                        </span>
                      ) : (
                        staffServices(m).slice(0, 3).map((s) => (
                          <span key={s.id} className="staff-card__service-tag">
                            <Sparkles size={10} /> {s.name}
                          </span>
                        ))
                      )}
                      {m.serviceIds.length > 3 && (
                        <span className="staff-card__service-tag staff-card__service-tag--more">
                          +{m.serviceIds.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="staff-card__footer">
                  {/* Credentials / login status */}
                  <div className="staff-card__login-status">
                    {m.email ? (
                      hasLogin(m.email) ? (
                        <span className="staff-card__login-badge staff-card__login-badge--active" title="Acceso habilitado">
                          <Lock size={11} /> Login Activo
                        </span>
                      ) : (
                        <span className="staff-card__login-badge staff-card__login-badge--inactive" title="Sin cuenta de acceso">
                          <Unlock size={11} /> Sin Acceso
                        </span>
                      )
                    ) : (
                      <span className="staff-card__login-badge staff-card__login-badge--noemail" title="Introduce un email para habilitar acceso">
                        <AlertCircle size={11} /> Falta Email
                      </span>
                    )}
                  </div>

                  <div className="staff-card__actions">
                    {user?.role === 'admin' && (
                      <>
                        {m.email && (
                          <button
                            className={`staff-card__action-btn staff-card__action-btn--login ${hasLogin(m.email) ? 'staff-card__action-btn--active-login' : ''}`}
                            onClick={() => openManageLogin(m)}
                            title="Administrar acceso a la plataforma"
                          >
                            <Key size={14} />
                          </button>
                        )}
                        <button
                          className="staff-card__action-btn"
                          onClick={() => openEdit(m)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="staff-card__action-btn staff-card__action-btn--danger"
                          onClick={() => { setSelected(m); setShowDeleteConfirm(true); }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
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
                Esta acción removerá su ficha de empleada de la base de datos.
              </p>
              {hasLogin(selected.email) && (
                <div className="staff-delete-modal__warning" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.15)' }}>
                  <Shield size={14} />
                  Atención: Esta empleada tiene un inicio de sesión activo. Su login también debe ser revocado.
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
              {/* Avatar Selector */}
              <div className="staff-avatar-upload">
                <div className="staff-avatar-upload__preview">
                  {uploading ? (
                    <div className="staff-avatar-upload__loading">Cargando...</div>
                  ) : form.avatarUrl ? (
                    <img src={form.avatarUrl} alt="Vista previa" />
                  ) : (
                    <User size={32} />
                  )}
                </div>
                <div className="staff-avatar-upload__actions">
                  <label className="staff-avatar-upload__label">
                    Subir foto
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {form.avatarUrl && (
                    <button
                      type="button"
                      className="staff-avatar-upload__remove"
                      onClick={() => setForm({ ...form, avatarUrl: null })}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

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
                  <select
                    value={form.role}
                    onChange={(e) => {
                      const newRole = e.target.value as StaffRole;
                      setForm({
                        ...form,
                        role: newRole,
                        serviceIds: newRole === 'receptionist' ? [] : form.serviceIds
                      });
                    }}
                  >
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
                    {HOURS.map((h) => <option key={h} value={h}>{format12h(h)}</option>)}
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
                    {HOURS.filter((h) => h > form.workingStart).map((h) => <option key={h} value={h}>{format12h(h)}</option>)}
                  </select>
                  {errors.schedule && <span className="field-error"><AlertCircle size={12} /> {errors.schedule}</span>}
                </div>
              </div>

              {/* Services */}
              {(form.role === 'specialist' || form.role === 'admin') && (
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
              )}

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

      {/* SQL Migration Help Modal */}
      {showSqlHelp && (
        <div className="modal-overlay" onClick={() => setShowSqlHelp(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2><Shield size={20} /> Configuración de Base de Datos para Logins</h2>
              <button className="modal__close" onClick={() => setShowSqlHelp(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="sql-help-modal-body">
              <p>
                Para habilitar la creación y administración de usuarios (inicio de sesión) directamente
                desde este panel, es necesario instalar funciones administrativas especiales en la base de datos de Supabase.
              </p>
              <p>
                Copia el código SQL a continuación y pégalo en el <strong>SQL Editor</strong> de tu Supabase Dashboard,
                luego ejecútalo haciendo clic en <strong>Run</strong>.
              </p>
              <div className="sql-code-container">
                <pre><code>{SQL_MIGRATION_CODE}</code></pre>
              </div>
              <div className="modal__actions">
                <button
                  type="button"
                  className="modal__submit-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(SQL_MIGRATION_CODE);
                    toast.success('SQL copiado al portapapeles');
                  }}
                >
                  Copiar Código SQL
                </button>
                <button type="button" className="modal__cancel-btn" onClick={() => setShowSqlHelp(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Login Credentials Management Modal */}
      {showLoginModal && loginStaff && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2><UserCog size={18} /> Gestionar Acceso de Login</h2>
              <button className="modal__close" onClick={() => setShowLoginModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal__form" style={{ padding: '20px 24px' }}>
              <div className="login-details-summary">
                <p><strong>Colaboradora:</strong> {loginStaff.name}</p>
                <p><strong>Rol asignado:</strong> {roleLabel(loginStaff.role)}</p>
                <p><strong>Correo electrónico:</strong> {loginStaff.email}</p>
              </div>

              {!userManagementEnabled ? (
                <div className="sql-warning-banner">
                  <AlertCircle size={20} />
                  <div>
                    <strong>Instalación pendiente:</strong>
                    <p>Las funciones de acceso no están instaladas en la base de datos.</p>
                    <button
                      type="button"
                      className="sql-warning-banner__btn"
                      onClick={() => {
                        setShowLoginModal(false);
                        setShowSqlHelp(true);
                      }}
                    >
                      Ver instrucciones SQL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {hasLogin(loginStaff.email) ? (
                    /* Existing Login account options */
                    <div className="login-status-details">
                      <div className="login-status-details__active">
                        <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                        <span>Tiene acceso activo a la plataforma.</span>
                      </div>
                      
                      {getLoginDetails(loginStaff.email)?.last_sign_in_at && (
                        <p className="login-status-details__last-login">
                          Última conexión: {new Date(getLoginDetails(loginStaff.email)!.last_sign_in_at!).toLocaleString('es-DO')}
                        </p>
                      )}

                      <div className="modal__field" style={{ marginTop: 16 }}>
                        <label><Key size={14} /> Nueva Contraseña</label>
                        <input
                          type="password"
                          placeholder="Mínimo 6 caracteres para cambiar"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>

                      <div className="login-status-actions">
                        <button
                          type="button"
                          className="modal__submit-btn"
                          onClick={handleUpdatePassword}
                          disabled={loginSubmitting}
                          style={{ flex: 1 }}
                        >
                          {loginSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
                        </button>
                        <button
                          type="button"
                          className="login-status-actions__revoke"
                          onClick={handleDeleteLogin}
                          disabled={loginSubmitting}
                        >
                          <XCircle size={14} /> Revocar Acceso
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* No Login account options */
                    <div className="login-status-details">
                      <div className="login-status-details__inactive">
                        <AlertCircle size={16} style={{ color: '#fbbf24' }} />
                        <span>Sin acceso configurado. Puede crear una contraseña abajo para darle acceso.</span>
                      </div>

                      <div className="modal__field" style={{ marginTop: 16 }}>
                        <label><Key size={14} /> Contraseña de Acceso *</label>
                        <input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>

                      <div className="modal__actions" style={{ marginTop: 24, padding: 0 }}>
                        <button
                          type="button"
                          className="modal__cancel-btn"
                          onClick={() => setShowLoginModal(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="modal__submit-btn"
                          onClick={handleCreateLogin}
                          disabled={loginSubmitting}
                        >
                          {loginSubmitting ? 'Creando acceso...' : 'Habilitar Acceso'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

