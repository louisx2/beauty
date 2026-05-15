import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Save, AlertCircle, Building2, CreditCard, DollarSign, User as UserIcon, Phone } from 'lucide-react';
import './Appointments.css'; // Reusing layout styles

export default function Settings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [form, setForm] = useState({
    deposit_amount: 500,
    bank_name: '',
    account_number: '',
    account_name: '',
    whatsapp_number: ''
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
        whatsapp_number: settings.whatsapp_number
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
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Configuración del Sistema</h1>
          <p className="admin-subtitle">Administra los datos de pago y depósitos para las reservas</p>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: '600px' }}>
        <div className="admin-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <h3 style={{ color: 'var(--espresso)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} className="text-camel" />
                Monto de Depósito
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '12px' }}>
                Este es el monto fijo que las clientas deben transferir para confirmar su cita.
              </p>
              <div className="form-group">
                <label>Monto (RD$)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="form-input"
                  value={form.deposit_amount}
                  onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--camel-light)', margin: '10px 0' }} />

            <div>
              <h3 style={{ color: 'var(--espresso)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} className="text-camel" />
                Datos Bancarios
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: '12px' }}>
                Estas cuentas se mostrarán a la clienta al finalizar su reserva en la web.
              </p>
              
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Banco</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--camel)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="Ej. Banco Popular"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label>Número de Cuenta</label>
                <div style={{ position: 'relative' }}>
                  <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--camel)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={form.account_number}
                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>A nombre de</label>
                <div style={{ position: 'relative' }}>
                  <UserIcon size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--camel)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={form.account_name}
                    onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--camel-light)', margin: '10px 0' }} />

            <div>
              <h3 style={{ color: 'var(--espresso)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={20} className="text-camel" />
                WhatsApp de Recepción
              </h3>
              <div className="form-group">
                <label>Número con código de país (Ej. 18293224014)</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.whatsapp_number}
                  onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                  required
                />
              </div>
            </div>

            {successMsg && (
              <div className="alert alert--success" style={{ marginTop: '10px' }}>
                {successMsg}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ alignSelf: 'flex-start', marginTop: '10px' }}
              disabled={loading}
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
