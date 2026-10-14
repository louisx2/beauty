import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffStore, type StaffMember, type StaffRole, WEEKDAYS } from '../../store/staffStore';
import { useServiceStore } from '../../store/serviceStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import {
  User, UserPlus, Phone, Mail, X, Clock, Shield, Sparkles, CheckCircle2, XCircle, AlertCircle,
  Percent, Key, UserCog, Globe, Search, CalendarDays, Pencil, Power, Trash2, MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format12h } from '../../lib/timeFormat';
import { destinoWhatsApp, enlaceLlamar, enlaceWhatsApp } from '../../lib/enlaces';
import { useAhora } from '../../lib/useAhora';
import { textoONull } from '../../site/landing/equipo';
import { sinTildes } from '../../site/reservar/servicios';
import { capitalizarNombre } from '../../lib/nombres';
import { reducirFoto } from '../../lib/fotos';
import { atiendeClientas } from '../../lib/quienAtiende';
import MenuAcciones, { type ItemMenu } from '../../components/MenuAcciones';
import Confirmar from '../../components/Confirmar';
import { iniciales } from './clientes/ficha';
import { primerNombre } from './citas/proximaCita';
import { aHora } from './hoy/dia';
import { hoyDe, mesDe } from './negocio/equipo';
import './negocio/Negocio.css';
import './Staff.css';

const ROLES: { key: StaffRole; label: string }[] = [
  { key: 'specialist',   label: 'Especialista' },
  { key: 'receptionist', label: 'Recepcionista' },
  { key: 'admin',        label: 'Administradora' },
];

const ROLE_FILTERS: { key: StaffRole | 'all'; label: string }[] = [
  { key: 'all',          label: 'Todas' },
  { key: 'specialist',   label: 'Especialistas' },
  { key: 'receptionist', label: 'Recepción' },
  { key: 'admin',        label: 'Administración' },
];

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${String(h).padStart(2, '0')}:00`;
});

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

const emptyForm: Omit<StaffMember, 'id' | 'createdAt'> = {
  name: '', role: 'specialist', phone: '', email: null,
  commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  workingStart: '09:00', workingEnd: '18:00',
  serviceIds: [], active: true, avatarUrl: null,
  mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null,
};

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
  // los días solo hacen falta a quien atiende: recepción y la cuenta de soporte pueden quedar sin días
  if (form.workingDays.length === 0 && atiendeClientas(form)) {
    errors.workingDays = 'Selecciona al menos un día de trabajo';
  }
  if (form.workingStart >= form.workingEnd) {
    errors.schedule = 'Debe ser después de la hora de entrada';
  }
  if (form.commissionPct < 0 || form.commissionPct > 100) {
    errors.commission = 'La comisión debe estar entre 0% y 100%';
  }
  return errors;
}

/**
 * Equipo: quién trabaja en el salón. De cada una, qué está haciendo hoy (en cabina, quién le sigue, o si hoy no
 * trabaja), cómo va su mes (citas, lo que cobró y su comisión), su horario y lo que hace. Desde aquí se ve su agenda,
 * se edita su ficha y se maneja su acceso al panel. Todo sale de las citas ya cargadas: no hay una consulta por persona.
 */
export default function Staff() {
  const { staff, loading, fetchStaff, addStaff, updateStaff, deleteStaff } = useStaffStore();
  const { services, fetchAll: fetchServices } = useServiceStore();
  const appointments = useAppointmentStore((s) => s.appointments);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { hoy } = useAhora();
  const esAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<StaffRole | 'all'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<StaffErrors>({});
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [revocar, setRevocar] = useState(false);

  // Credentials / Logins state
  const [logins, setLogins] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([]);
  const [userManagementEnabled, setUserManagementEnabled] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStaff, setLoginStaff] = useState<StaffMember | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

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
    fetchStaff().catch(() => toast.error('Error al cargar el equipo'));
    fetchServices();
    loadLogins();
  }, [fetchStaff, fetchServices, loadLogins]);

  const hasLogin = useCallback((email: string | null) => {
    if (!email) return false;
    return logins.some((l) => l.email.toLowerCase() === email.toLowerCase());
  }, [logins]);

  const getLoginDetails = useCallback((email: string | null) => {
    if (!email) return null;
    return logins.find((l) => l.email.toLowerCase() === email.toLowerCase()) || null;
  }, [logins]);

  const filtered = useMemo(() => {
    const palabras = sinTildes(search.trim()).split(/\s+/).filter(Boolean);
    const digitos = search.replace(/\D/g, '');
    return staff
      .filter((m) => showInactive || m.active)
      .filter((m) => roleFilter === 'all' || m.role === roleFilter)
      .filter((m) => palabras.every((p) => sinTildes(`${m.name} ${m.email ?? ''}`).includes(p))
        || (digitos.length >= 3 && m.phone.replace(/\D/g, '').includes(digitos)))
      // las activas primero; entre ellas, por nombre
      .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'es'));
  }, [staff, search, roleFilter, showInactive]);

  const activeCount = staff.filter((m) => m.active).length;
  const inactiveCount = staff.filter((m) => !m.active).length;
  const cuantasDe = (rol: StaffRole | 'all') => staff.filter((m) => (showInactive || m.active) && (rol === 'all' || m.role === rol)).length;
  // hoy y el mes de cada una, de las citas ya cargadas
  const delDia = useMemo(() => new Map(staff.map((m) => [m.id, hoyDe(m, appointments, hoy)])), [staff, appointments, hoy]);
  const delMes = useMemo(() => new Map(staff.map((m) => [m.id, mesDe(m, appointments, services, hoy)])), [staff, appointments, services, hoy]);

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
      // la foto de un teléfono pesa 2–6 MB y en la web se ve a 150–300 px: se reduce antes de subir
      const foto = await reducirFoto(file);
      const ext = foto.type === 'image/jpeg' ? 'jpg' : file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, foto, { contentType: foto.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      toast.success('Foto cargada temporalmente. Guarda la ficha para aplicar.');
    } catch (err) {
      toast.error((err as { message?: string } | null)?.message || 'Error al subir la imagen');
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
      mostrarEnWeb: m.mostrarEnWeb, cargoWeb: m.cargoWeb, especialidadesWeb: m.especialidadesWeb,
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
    } catch (err) {
      toast.error((err as { message?: string } | null)?.message || 'Error al habilitar acceso');
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
    } catch (err) {
      toast.error((err as { message?: string } | null)?.message || 'Error al cambiar contraseña');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleDeleteLogin = async () => {
    if (!loginStaff || !loginStaff.email) return;
    setLoginSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('delete_staff_user', {
        user_email: loginStaff.email,
      });

      if (error) throw error;
      if (data) {
        toast.success('Acceso revocado correctamente.');
        loadLogins();
        setRevocar(false);
        setShowLoginModal(false);
      } else {
        toast.error('No se pudo eliminar el usuario de Supabase Auth.');
      }
    } catch (err) {
      toast.error((err as { message?: string } | null)?.message || 'Error al revocar acceso');
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
        cargoWeb: textoONull(form.cargoWeb),
        especialidadesWeb: textoONull(form.especialidadesWeb),
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
    if (!selected || eliminando) return;
    setEliminando(true);
    try {
      // Si tiene acceso al panel, primero se borra el acceso: así no queda un login suelto, sin ficha, que ya no
      // se puede revocar desde aquí. Si falla (o es la cuenta de quien está dentro), la ficha no se toca.
      if (selected.email && hasLogin(selected.email)) {
        const { data, error } = await supabase.rpc('delete_staff_user', { user_email: selected.email });
        if (error) throw error;
        if (!data) throw new Error('No se pudo borrar su acceso al panel.');
        loadLogins();
      }
      await deleteStaff(selected.id);
      setSelected(null);
      setShowDeleteConfirm(false);
      toast.success('Empleada eliminada');
    } catch (err) {
      toast.error((err as { message?: string } | null)?.message || 'Error al eliminar empleada');
    } finally {
      setEliminando(false);
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

  const accionesDe = (m: StaffMember): ItemMenu[] => {
    const items: ItemMenu[] = [];
    if (atiendeClientas(m)) items.push({ id: 'agenda', etiqueta: 'Ver su agenda', icono: <CalendarDays size={16} />, onSelect: () => navigate(`/admin/citas?con=${m.id}`) });
    if (!esAdmin) return items;
    items.push({ id: 'editar', etiqueta: 'Editar ficha', icono: <Pencil size={16} />, onSelect: () => openEdit(m) });
    if (m.email) items.push({ id: 'acceso', etiqueta: hasLogin(m.email) ? 'Acceso al panel' : 'Darle acceso al panel', icono: <Key size={16} />, onSelect: () => openManageLogin(m) });
    items.push({ id: 'activar', etiqueta: m.active ? 'Desactivar' : 'Activar', icono: <Power size={16} />, onSelect: () => handleToggleActive(m) });
    items.push({ id: 'borrar', etiqueta: 'Eliminar', icono: <Trash2 size={16} />, peligro: true, onSelect: () => { setSelected(m); setShowDeleteConfirm(true); } });
    return items;
  };

  return (
    <div className="neg equipo">
      <header className="neg__cabeza">
        <div>
          <h1 className="neg__titulo">Equipo</h1>
          <p className="neg__sub">
            {activeCount === 1 ? '1 activa' : `${activeCount} activas`}{inactiveCount > 0 && ` · ${inactiveCount} inactiva${inactiveCount === 1 ? '' : 's'}`}
          </p>
        </div>
        {esAdmin && (
          <div className="neg__botones">
            <button type="button" className="neg__btn neg__btn--principal" onClick={openCreate} id="btn-new-staff">
              <UserPlus size={18} aria-hidden="true" /> Agregar al equipo
            </button>
          </div>
        )}
      </header>

      <div className="neg__barra">
        <label className="neg__buscar">
          <Search size={18} aria-hidden="true" />
          <span className="neg__oculto">Buscar en el equipo</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, teléfono o correo" id="staff-search" />
          {search && <button type="button" className="neg__borrar" onClick={() => setSearch('')} aria-label="Borrar la búsqueda"><X size={18} /></button>}
        </label>
        {inactiveCount > 0 && (
          <label className="neg__ver">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Ver también las inactivas
          </label>
        )}
      </div>

      <div className="neg__chips" role="group" aria-label="Rol">
        {ROLE_FILTERS.map((rf) => (
          <button key={rf.key} type="button" className={`neg__chip ${roleFilter === rf.key ? 'is-on' : ''}`} aria-pressed={roleFilter === rf.key}
            onClick={() => setRoleFilter(rf.key)}>
            {rf.label} <b>{cuantasDe(rf.key)}</b>
          </button>
        ))}
      </div>

      {loading && staff.length === 0 ? (
        <p className="neg__sub">Cargando el equipo…</p>
      ) : filtered.length === 0 ? (
        <div className="neg__vacio">
          <User size={32} aria-hidden="true" />
          <p>{search || roleFilter !== 'all' ? 'Nadie con eso.' : 'Todavía no hay nadie en el equipo.'}</p>
        </div>
      ) : (
        <ul className="neg__grilla equipo__lista">
          {filtered.map((m) => {
            const atiende = atiendeClientas(m);
            const dia = delDia.get(m.id);
            const mes = delMes.get(m.id);
            const suyos = staffServices(m);
            return (
              <li key={m.id} className={`neg__tarjeta persona ${m.active ? '' : 'is-apagada'}`}>
                <div className="persona__cabeza">
                  <span className={`persona__foto persona__foto--${m.role}`} aria-hidden="true">
                    {m.avatarUrl ? <img src={m.avatarUrl} alt="" /> : iniciales(m.name)}
                  </span>
                  <div className="persona__quien">
                    <h3>{m.name}</h3>
                    <div className="persona__etiquetas">
                      <span className="neg__etiqueta">{roleLabel(m.role)}</span>
                      {!m.active && <span className="neg__etiqueta neg__etiqueta--peligro">Inactiva</span>}
                      {m.active && m.mostrarEnWeb && <span className="neg__etiqueta neg__etiqueta--suave" title="Sale en «Nuestro equipo» de la página web"><Globe size={12} aria-hidden="true" /> En la web</span>}
                    </div>
                  </div>
                  {accionesDe(m).length > 0 && <MenuAcciones etiqueta={`Más acciones para ${m.name}`} items={accionesDe(m)} />}
                </div>

                {m.active && atiende && dia && (
                  <div className={`persona__hoy ${dia.enCabina ? 'is-ocupada' : ''}`}>
                    {!dia.trabaja && dia.servicios === 0 ? (
                      <span>Hoy no trabaja</span>
                    ) : dia.enCabina ? (
                      <span><i aria-hidden="true" /> En cabina con <b>{primerNombre(dia.enCabina.cita.clientName)}</b> · {dia.enCabina.servicio}</span>
                    ) : dia.siguiente ? (
                      <span>Sigue a las <b>{format12h(aHora(dia.siguiente.inicio))}</b>: {primerNombre(dia.siguiente.cita.clientName)}</span>
                    ) : (
                      <span>{dia.servicios === 0 ? 'Libre todo el día' : 'Ya terminó lo de hoy'}</span>
                    )}
                    {dia.servicios > 0 && <small>{dia.servicios === 1 ? '1 servicio hoy' : `${dia.servicios} servicios hoy`}</small>}
                  </div>
                )}

                {(atiende || (mes && mes.atendidas > 0)) && mes && (
                  <dl className="persona__mes">
                    <div><dt>Citas del mes</dt><dd>{mes.atendidas}</dd></div>
                    {esAdmin && <div><dt>Cobrado</dt><dd>{rd(mes.ingresos)}</dd></div>}
                    {esAdmin && <div><dt>Comisión{m.commissionPct > 0 && ` (${m.commissionPct} %)`}</dt><dd>{m.commissionPct > 0 ? rd(mes.comision) : '—'}</dd></div>}
                    <div><dt>Por venir</dt><dd>{mes.proximos}</dd></div>
                  </dl>
                )}

                <div className="persona__horario">
                  <div className="persona__dias" aria-label={`Trabaja: ${WEEKDAYS.filter((d) => m.workingDays.includes(d.key)).map((d) => d.label).join(', ') || 'ningún día'}`}>
                    {WEEKDAYS.map((d) => (
                      <span key={d.key} className={m.workingDays.includes(d.key) ? 'is-on' : ''} aria-hidden="true">{d.label.slice(0, 2)}</span>
                    ))}
                  </div>
                  <span className="persona__horas"><Clock size={14} aria-hidden="true" /> {format12h(m.workingStart)} – {format12h(m.workingEnd)}</span>
                </div>

                <p className="persona__servicios">
                  <Sparkles size={14} aria-hidden="true" />
                  {!atiende ? 'No atiende clientas'
                    : m.serviceIds.length === 0 ? 'Hace todos los servicios'
                      : `${suyos.length === 1 ? 'Hace 1 servicio' : `Hace ${suyos.length} servicios`}: ${suyos.slice(0, 3).map((s) => s.name).join(', ')}${suyos.length > 3 ? '…' : ''}`}
                </p>

                <div className="neg__acciones">
                  {m.phone && (
                    <>
                      <a className="neg__icono" href={enlaceLlamar(m.phone)} aria-label={`Llamar a ${m.name}`}><Phone size={18} /></a>
                      <a className="neg__icono" href={enlaceWhatsApp(m.phone, `Hola ${primerNombre(m.name)}`)} target={destinoWhatsApp()} rel="noopener noreferrer"
                        aria-label={`Escribirle a ${m.name} por WhatsApp`}><MessageCircle size={18} /></a>
                    </>
                  )}
                  {esAdmin && (
                    <span className={`persona__acceso ${hasLogin(m.email) ? 'is-on' : ''}`}>
                      {!m.email ? 'Sin correo' : hasLogin(m.email) ? 'Con acceso' : 'Sin acceso'}
                    </span>
                  )}
                  <span className="neg__espacio" />
                  {atiende && m.active && (
                    <button type="button" className="neg__btn neg__btn--chico" onClick={() => navigate(`/admin/citas?con=${m.id}`)}>
                      <CalendarDays size={16} aria-hidden="true" /> Su agenda
                    </button>
                  )}
                  {esAdmin && !(atiende && m.active) && (
                    <button type="button" className="neg__btn neg__btn--chico" onClick={() => openEdit(m)}>
                      <Pencil size={16} aria-hidden="true" /> Editar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showDeleteConfirm && selected && (
        <Confirmar titulo={`¿Eliminar a ${selected.name}?`} boton="Eliminar del equipo" peligro ocupado={eliminando}
          onSi={handleDelete} onNo={() => setShowDeleteConfirm(false)}>
          <p>Se borra su ficha del equipo. Sus citas pasadas se quedan como están.</p>
          {hasLogin(selected.email) && <p><Shield size={14} aria-hidden="true" /> Tiene acceso al panel ({selected.email}): también se borra y ya no podrá entrar.</p>}
          {selected.active && <p>Si solo dejó de trabajar aquí, mejor desactívala: se conserva todo.</p>}
        </Confirmar>
      )}

      {revocar && loginStaff && (
        <Confirmar titulo={`¿Quitarle el acceso a ${loginStaff.name}?`} boton="Quitar acceso" peligro ocupado={loginSubmitting}
          onSi={handleDeleteLogin} onNo={() => setRevocar(false)}>
          <p>Ya no podrá entrar al panel con {loginStaff.email}. Su ficha del equipo se queda.</p>
        </Confirmar>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar ficha' : 'Agregar al equipo'}</h2>
              <button type="button" className="modal__close" onClick={closeModal} aria-label="Cerrar">
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
                  <label><User size={14} /> Nombre completo *</label>
                  <input
                    type="text"
                    placeholder="Nombre de la empleada"
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: capitalizarNombre(e.target.value) });
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
                    <span className="staff-toggle__txt">
                      {form.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Days */}
              <div className="modal__field">
                <label><Clock size={14} /> Días de trabajo</label>
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
                  <label>Hora de entrada</label>
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
                  {/* la última cita puede empezar a esta hora aunque termine después (así lo pide la reserva) */}
                  <label>Toma citas hasta</label>
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
                        ? form.role === 'admin'
                          ? ' — sin selección = no atiende clientas'
                          : ' — sin selección = puede hacer todos'
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

              {/* Página web (spec §6.5): quién sale en "Nuestro equipo" */}
              <fieldset className="staff-web">
                <legend className="staff-web__titulo"><Globe size={14} /> Página web</legend>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.mostrarEnWeb}
                    onChange={(e) => setForm({ ...form, mostrarEnWeb: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                  <span className="staff-toggle__txt">Mostrar en la página web</span>
                </label>
                {form.mostrarEnWeb && (
                  <>
                    <div className="modal__row">
                      <div className="modal__field">
                        <label htmlFor="staff-cargo-web">Cargo para la web</label>
                        <input
                          id="staff-cargo-web"
                          type="text"
                          maxLength={60}
                          placeholder="Médico estético y cosmiatra"
                          value={form.cargoWeb ?? ''}
                          onChange={(e) => setForm({ ...form, cargoWeb: e.target.value })}
                        />
                      </div>
                      <div className="modal__field">
                        <label htmlFor="staff-especialidades-web">Especialidades para la web</label>
                        <input
                          id="staff-especialidades-web"
                          type="text"
                          maxLength={80}
                          placeholder="Facial · Medicina estética"
                          value={form.especialidadesWeb ?? ''}
                          onChange={(e) => setForm({ ...form, especialidadesWeb: e.target.value })}
                        />
                      </div>
                    </div>
                    {(!form.active || !form.avatarUrl) && (
                      <p className="staff-web__aviso">
                        {!form.active && 'Está inactiva: no saldrá en la web hasta activarla. '}
                        {!form.avatarUrl && 'Sin foto, la web muestra sus iniciales.'}
                      </p>
                    )}
                  </>
                )}
              </fieldset>

              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="modal__submit-btn" id="staff-submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Login Credentials Management Modal */}
      {showLoginModal && loginStaff && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2><UserCog size={18} /> Acceso al panel</h2>
              <button type="button" className="modal__close" onClick={() => setShowLoginModal(false)} aria-label="Cerrar">
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
                <div className="staff-aviso-acceso" role="alert">
                  <AlertCircle size={20} />
                  <div>
                    <strong>No pudimos cargar los accesos.</strong>
                    <p>Revisa la conexión e intenta de nuevo. Si sigue pasando, avísale a soporte.</p>
                    <button type="button" className="staff-aviso-acceso__btn" onClick={() => loadLogins()}>
                      Intentar de nuevo
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
                        <label><Key size={14} /> Nueva contraseña</label>
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
                          {loginSubmitting ? 'Cambiando...' : 'Cambiar contraseña'}
                        </button>
                        <button
                          type="button"
                          className="login-status-actions__revoke"
                          onClick={() => setRevocar(true)}
                          disabled={loginSubmitting}
                        >
                          <XCircle size={14} /> Quitar acceso
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
                        <label><Key size={14} /> Contraseña de acceso *</label>
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
                          {loginSubmitting ? 'Creando acceso...' : 'Habilitar acceso'}
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
