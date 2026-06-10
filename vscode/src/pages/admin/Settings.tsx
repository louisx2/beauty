import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Save, AlertCircle, Building2, CreditCard, DollarSign, User as UserIcon, Phone } from 'lucide-react';
import './Settings.css';

export default function Settings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    deposit_amount: 500,
    bank_name: '',
    account_number: '',
    account_name: '',
    whatsapp_number: '',
    package_deposit_type: 'fixed' as 'fixed' | 'percentage',
    package_deposit_value: 500
  });

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setForm({
        deposit_amount: settings.deposit_amount,
        bank_name: settings.bank_name,
        account_number: settings.account_number,
        account_name: settings.account_name,
        whatsapp_number: settings.whatsapp_number,
        package_deposit_type: settings.package_deposit_type,
        package_deposit_value: settings.package_deposit_value
      });
    }
  }, [settings]);

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
          disabled={loading}
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
            <div className="settings-field">
              <label>Banco</label>
              <div className="settings-input-wrap">
                <Building2 size={16} />
                <input
                  type="text"
                  className="settings-input has-icon"
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
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
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
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
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  placeholder="Ej. María López"
                  required
                />
              </div>
            </div>

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
      </div>
    </div>
  );
}
