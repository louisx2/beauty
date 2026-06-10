import React, { useState } from 'react';
import { useClientStore } from '../store/clientStore';
import { useAppointmentStore, type Appointment } from '../store/appointmentStore';
import toast from 'react-hot-toast';
import { X, Save } from 'lucide-react';

interface SaveClientModalProps {
  appointment: Appointment;
  onClose: () => void;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function SaveClientModal({ appointment, onClose }: SaveClientModalProps) {
  const { addClient } = useClientStore();
  const { updateAppointment } = useAppointmentStore();
  const [form, setForm] = useState({
    name: appointment.clientName,
    phone: formatPhone(appointment.clientPhone),
    email: '',
    cedula: '',
    notes: 'Registrada desde cita online',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nombre y teléfono son obligatorios');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create client
      const newClient = await addClient({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        cedula: form.cedula.trim() || null,
        skin_type: null,
        allergies: null,
        notes: form.notes,
        source: 'manual'
      });

      if (newClient) {
        // 2. Update appointment to link it
        await updateAppointment(appointment.id, {
          client_id: newClient.id,
          clientName: newClient.name,
          clientPhone: newClient.phone
        });
        toast.success('Clienta guardada permanentemente');
        onClose();
      } else {
        toast.error('Error al crear clienta');
      }
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>💾 Guardar Clienta Nueva</h2>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal__form" style={{ padding: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20, fontSize: '0.9rem' }}>
            Esta cita fue hecha sin un perfil de base de datos. Completa sus datos para registrarla oficialmente.
          </p>
          
          <div className="modal__field">
            <label>Nombre</label>
            <input 
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              autoFocus
            />
          </div>

          <div className="modal__field">
            <label>Teléfono</label>
            <input 
              value={form.phone}
              onChange={e => setForm({...form, phone: formatPhone(e.target.value)})}
              maxLength={12}
            />
          </div>

          <div className="modal__field">
            <label>Email (Opcional)</label>
            <input 
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>

          <div className="modal__field">
            <label>Cédula (Opcional)</label>
            <input 
              type="text"
              placeholder="001-0000000-0"
              value={form.cedula}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                let formatted = raw;
                if (raw.length > 3 && raw.length <= 10) formatted = `${raw.slice(0,3)}-${raw.slice(3)}`;
                else if (raw.length > 10) formatted = `${raw.slice(0,3)}-${raw.slice(3,10)}-${raw.slice(10)}`;
                setForm({...form, cedula: formatted});
              }}
              maxLength={13}
            />
          </div>

          <div className="modal__field">
            <label>Notas (Opcional)</label>
            <textarea 
              rows={2}
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
            />
          </div>

          <div className="modal__actions" style={{ marginTop: 24 }}>
            <button type="button" className="modal__cancel-btn" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={loading} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Save size={18} /> Guardar Clienta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
