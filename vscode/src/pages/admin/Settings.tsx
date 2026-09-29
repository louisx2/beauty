import { useState, useEffect } from 'react';
import { useSettingsStore, type BankAccount } from '../../store/settingsStore';
import { supabase } from '../../lib/supabase';
import { paquetesSinSello, type EstiloPaquetes } from '../../site/landing/paquetes';
import { Save, AlertCircle, Building2, CreditCard, DollarSign, User as UserIcon, Phone, Plus, Trash2, Star, Globe, ExternalLink } from 'lucide-react';
import './Settings.css';

// estilos de la sección de paquetes de la página principal (spec §6.4)
const ESTILOS: { id: EstiloPaquetes; nombre: string; desc: string }[] = [
  { id: 'membresia', nombre: 'Membresía', desc: 'Tarjetas chocolate con el logo, como una tarjeta de socia.' },
  { id: 'menu', nombre: 'Menú con foto', desc: 'Una fila por paquete con la foto del servicio. Es el estilo recomendado.' },
  { id: 'ahorro', nombre: 'Ahorro', desc: 'Tarjetas con el sello "Ahorras X %" y el precio suelto tachado.' },
];

// en el dominio del panel (app.…) la página pública vive en el dominio principal
const URL_PAQUETES = typeof window !== 'undefined' && window.location.hostname.startsWith('app.')
  ? `https://${window.location.hostname.slice(4)}/#s-paquetes`
  : '/#s-paquetes';

export default function Settings() {
  const { settings, fetchSettings, updateSettings, cargado, loading: cargando } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [intentado, setIntentado] = useState(false); // ya terminó el primer intento de cargar la configuración

  const [form, setForm] = useState({
    deposit_amount: 500,
    bank_name: '',
    account_number: '',
    account_name: '',
    bank_accounts: [] as BankAccount[],
    whatsapp_number: '',
    package_deposit_type: 'fixed' as 'fixed' | 'percentage',
    package_deposit_value: 500,
    estilo_paquetes: 'menu' as EstiloPaquetes,
    show_welcome_card: true,
    show_stats_cards: true
  });

  useEffect(() => {
    fetchSettings().finally(() => setIntentado(true));
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setForm({
        deposit_amount: settings.deposit_amount,
        bank_name: settings.bank_name,
        account_number: settings.account_number,
        account_name: settings.account_name,
        bank_accounts: settings.bank_accounts || [],
        whatsapp_number: settings.whatsapp_number,
        package_deposit_type: settings.package_deposit_type,
        package_deposit_value: settings.package_deposit_value,
        estilo_paquetes: settings.estilo_paquetes,
        show_welcome_card: settings.show_welcome_card,
        show_stats_cards: settings.show_stats_cards
      });
    }
  }, [settings]);

  // cuántos paquetes activos saldrían sin sello en el estilo Ahorro (su servicio no tiene precio)
  const [conteo, setConteo] = useState<{ total: number; sinSello: number } | null>(null);
  useEffect(() => {
    let vivo = true;
    supabase.from('session_packages').select('sessions, price, services(price)').eq('active', true).then(({ data, error }) => {
      if (!vivo || error) return;
      type Fila = { sessions: number | string | null; price: number | string | null; services: { price: number | string | null } | { price: number | string | null }[] | null };
      const paquetes = ((data ?? []) as unknown as Fila[]).map((p) => {
        const sv = Array.isArray(p.services) ? p.services[0] : p.services;
        return { precio: Number(p.price) || 0, sesiones: Number(p.sessions) || 0, precioServicio: Number(sv?.price) || 0 };
      });
      setConteo({ total: paquetes.length, sinSello: paquetesSinSello(paquetes) });
    });
    return () => { vivo = false; };
  }, []);

  const handleAddBankAccount = () => {
    setForm(prev => ({
      ...prev,
      bank_accounts: [
        ...prev.bank_accounts,
        { bank_name: '', account_number: '', account_name: '' }
      ]
    }));
  };

  const handleRemoveBankAccount = (index: number) => {
    setForm(prev => ({
      ...prev,
      bank_accounts: prev.bank_accounts.filter((_, i) => i !== index)
    }));
  };

  const handleBankAccountChange = (index: number, field: keyof BankAccount, value: string) => {
    setForm(prev => {
      const newAccounts = [...prev.bank_accounts];
      newAccounts[index] = { ...newAccounts[index], [field]: value };
      return { ...prev, bank_accounts: newAccounts };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    const ok = await updateSettings(form);
    if (ok) {
      setSuccessMsg('Configuración guardada correctamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <div>
          <h1 className="settings-page__title">Configuración del Sistema</h1>
          <p className="settings-page__subtitle">Administra los datos de pago y depósitos para las reservas</p>
        </div>
        <button 
          className="settings-page__save-btn" 
          onClick={handleSubmit} 
          disabled={loading || !cargado}
        >
          <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {successMsg && (
        <div className="settings-success" style={{ marginBottom: 24 }}>
          <AlertCircle size={18} />
          {successMsg}
        </div>
      )}

      {intentado && !cargando && !cargado && (
        <div className="settings-error" role="alert" style={{ marginBottom: 24 }}>
          <AlertCircle size={18} />
          No se pudo cargar la configuración, así que no se puede guardar. Recarga la página.
        </div>
      )}

      <div className="settings-grid">
        {/* Depósito Servicios */}
        <div className="settings-card settings-card--primary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><DollarSign size={20} /> Reserva de Servicios</h3>
            <p className="settings-card__desc">Monto fijo que las clientas deben transferir para separar una cita de un servicio individual.</p>
          </div>
          <div className="settings-field">
            <label>Monto de Separación (RD$)</label>
            <div className="settings-input-wrap">
              <DollarSign size={16} />
              <input
                type="number"
                min="0"
                step="100"
                className="settings-input has-icon"
                value={form.deposit_amount}
                onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })}
                required
              />
            </div>
          </div>
        </div>

        {/* Depósito Paquetes */}
        <div className="settings-card settings-card--secondary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><DollarSign size={20} /> Reserva de Paquetes</h3>
            <p className="settings-card__desc">Elige cómo calcular el depósito cuando una clienta reserva un paquete completo.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
            <div className="settings-field">
              <label>Tipo de Depósito</label>
              <select
                className="settings-input"
                value={form.package_deposit_type}
                onChange={(e) => setForm({ ...form, package_deposit_type: e.target.value as 'fixed' | 'percentage' })}
              >
                <option value="fixed">Monto Fijo (RD$)</option>
                <option value="percentage">Porcentaje del Total (%)</option>
              </select>
            </div>
            <div className="settings-field">
              <label>{form.package_deposit_type === 'fixed' ? 'Monto (RD$)' : 'Porcentaje (%)'}</label>
              <div className="settings-input-wrap">
                <DollarSign size={16} />
                <input
                  type="number"
                  min="0"
                  max={form.package_deposit_type === 'percentage' ? 100 : undefined}
                  className="settings-input has-icon"
                  value={form.package_deposit_value}
                  onChange={(e) => setForm({ ...form, package_deposit_value: Number(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Datos bancarios */}
        <div className="settings-card settings-card--tertiary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><Building2 size={20} /> Datos Bancarios</h3>
            <p className="settings-card__desc">Se muestran a la clienta al finalizar su reserva en la web.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {form.bank_accounts.map((account, index) => (
              <div key={index} className="settings-bank-card">
                <div className="settings-bank-card__header">
                  <h4 className="settings-bank-card__title">Cuenta Bancaria {index + 1}</h4>
                  {form.bank_accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBankAccount(index)}
                      className="settings-bank-card__delete-btn"
                      title="Eliminar cuenta"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="settings-field">
                  <label>Banco</label>
                  <div className="settings-input-wrap">
                    <Building2 size={16} />
                    <input
                      type="text"
                      className="settings-input has-icon"
                      value={account.bank_name || ''}
                      onChange={(e) => handleBankAccountChange(index, 'bank_name', e.target.value)}
                      placeholder="Ej. Banco Popular"
                      required
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Número de Cuenta</label>
                  <div className="settings-input-wrap">
                    <CreditCard size={16} />
                    <input
                      type="text"
                      className="settings-input has-icon"
                      value={account.account_number || ''}
                      onChange={(e) => handleBankAccountChange(index, 'account_number', e.target.value)}
                      placeholder="Ej. 012345678"
                      required
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Nombre del Titular</label>
                  <div className="settings-input-wrap">
                    <UserIcon size={16} />
                    <input
                      type="text"
                      className="settings-input has-icon"
                      value={account.account_name || ''}
                      onChange={(e) => handleBankAccountChange(index, 'account_name', e.target.value)}
                      placeholder="Ej. María López"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddBankAccount}
              className="settings-bank-card__add-btn"
            >
              <Plus size={16} />
              Agregar otra cuenta bancaria
            </button>

            <div className="settings-field">
              <label>WhatsApp de Confirmación</label>
              <div className="settings-input-wrap">
                <Phone size={16} />
                <input
                  type="text"
                  className="settings-input has-icon"
                  value={form.whatsapp_number}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                    let formatted = raw;
                    if (raw.length > 3 && raw.length <= 6) formatted = `${raw.slice(0,3)}-${raw.slice(3)}`;
                    else if (raw.length > 6) formatted = `${raw.slice(0,3)}-${raw.slice(3,6)}-${raw.slice(6)}`;
                    setForm({ ...form, whatsapp_number: formatted });
                  }}
                  placeholder="829-000-0000"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Página web */}
        <div className="settings-card settings-card--secondary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><Globe size={20} /> Página web</h3>
            <p className="settings-card__desc">Cómo se ven los paquetes en la página principal. Se publica al guardar.</p>
          </div>
          <fieldset className="settings-estilos">
            <legend>Estilo de los paquetes</legend>
            {ESTILOS.map((e) => (
              <label key={e.id} className={`settings-estilo ${form.estilo_paquetes === e.id ? 'is-on' : ''}`}>
                <input type="radio" name="estilo_paquetes" value={e.id} checked={form.estilo_paquetes === e.id}
                  onChange={() => setForm({ ...form, estilo_paquetes: e.id })} />
                <span className={`settings-estilo__mini settings-estilo__mini--${e.id}`} aria-hidden="true"><i /><i /><i /></span>
                <span className="settings-estilo__txt"><b>{e.nombre}</b><small>{e.desc}</small></span>
              </label>
            ))}
          </fieldset>
          <div role="status" className="settings-estilos__estado">
            {form.estilo_paquetes === 'ahorro' && conteo && conteo.sinSello > 0 && (
              <p className="settings-estilos__aviso">
                <AlertCircle size={16} />
                {conteo.sinSello} de {conteo.total} {conteo.total === 1 ? 'paquete no mostrará' : 'paquetes no mostrarán'} el sello
                de ahorro: su servicio no tiene precio cargado en Servicios o el paquete no sale más barato que las sesiones sueltas.
              </p>
            )}
          </div>
          <a className="settings-estilos__ver" href={URL_PAQUETES} target="_blank" rel="noopener noreferrer">
            Ver los paquetes en la página <ExternalLink size={14} />
          </a>
        </div>

        {/* Preferencias de Interfaz */}
        <div className="settings-card settings-card--primary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><Star size={20} /> Preferencias del Dashboard</h3>
            <p className="settings-card__desc">Elige qué secciones deseas visualizar en tu panel de control principal.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <label className="settings-checkbox-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
              <input
                type="checkbox"
                checked={form.show_welcome_card}
                onChange={(e) => setForm({ ...form, show_welcome_card: e.target.checked })}
                style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer' }}
              />
              Mostrar Tarjeta de Bienvenida
            </label>
            <label className="settings-checkbox-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>
              <input
                type="checkbox"
                checked={form.show_stats_cards}
                onChange={(e) => setForm({ ...form, show_stats_cards: e.target.checked })}
                style={{ width: '18px', height: '18px', borderRadius: '4px', cursor: 'pointer' }}
              />
              Mostrar Tarjetas de Estadísticas (Bento)
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
