import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { X, CalendarOff, Trash2, Plus } from 'lucide-react';
import { useBlockStore } from '../store/blockStore';
import { useStaffStore } from '../store/staffStore';
import './ScheduleBlocksModal.css';

interface Props {
  onClose: () => void;
  /** Fecha que la agenda tiene abierta; se usa como valor inicial. */
  defaultDate: string;
}

const emptyForm = {
  staffId: '',        // '' = todo el salon
  startDate: '',
  endDate: '',
  allDay: true,
  startTime: '12:00',
  endTime: '13:00',
  reason: '',
};

function formatDate(d: string): string {
  const date = new Date(`${d}T12:00:00`);
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ScheduleBlocksModal({ onClose, defaultDate }: Props) {
  const { blocks, fetchBlocks, addBlock, deleteBlock } = useBlockStore();
  const { staff, fetchStaff } = useStaffStore();
  const [form, setForm] = useState({ ...emptyForm, startDate: defaultDate, endDate: defaultDate });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBlocks().catch((e) => toast.error(e.message));
    fetchStaff();
  }, [fetchBlocks, fetchStaff]);

  const staffById = useMemo(() => {
    const m: Record<string, string> = {};
    staff.forEach((s) => { m[s.id] = s.name; });
    return m;
  }, [staff]);

  // Solo bloqueos que aun no terminan: lo viejo no le sirve a nadie.
  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return blocks
      .filter((b) => b.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [blocks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Elige las fechas del bloqueo');
      return;
    }
    if (form.endDate < form.startDate) {
      toast.error('La fecha final no puede ser antes de la inicial');
      return;
    }
    if (!form.allDay && form.endTime <= form.startTime) {
      toast.error('La hora final debe ser después de la inicial');
      return;
    }

    setSaving(true);
    try {
      await addBlock({
        staffId: form.staffId || null,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.allDay ? null : form.startTime,
        endTime: form.allDay ? null : form.endTime,
        reason: form.reason.trim(),
      });
      toast.success('Horario bloqueado');
      setForm({ ...emptyForm, startDate: defaultDate, endDate: defaultDate });
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlock(id);
      toast.success('Bloqueo eliminado');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal blocks__modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2><CalendarOff size={20} /> Bloquear horario</h2>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        <p className="blocks__hint">
          Vacaciones, día libre, almuerzo o cierre del salón. Las horas bloqueadas
          dejan de ofrecerse en la reserva en línea.
        </p>

        <form onSubmit={handleSubmit} className="modal__form">
          <div className="modal__field">
            <label htmlFor="block-staff">¿A quién aplica?</label>
            <select
              id="block-staff"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value })}
            >
              <option value="">Todo el salón (feriado o cierre)</option>
              {staff.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="modal__row">
            <div className="modal__field">
              <label htmlFor="block-from">Desde</label>
              <input
                id="block-from"
                type="date"
                value={form.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;
                  setForm((f) => ({
                    ...f,
                    startDate,
                    // Mantener coherencia: si la final queda antes, se iguala.
                    endDate: f.endDate < startDate ? startDate : f.endDate,
                  }));
                }}
              />
            </div>
            <div className="modal__field">
              <label htmlFor="block-to">Hasta</label>
              <input
                id="block-to"
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <label className="blocks__checkbox">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            />
            <span>Todo el día</span>
          </label>

          {!form.allDay && (
            <div className="modal__row">
              <div className="modal__field">
                <label htmlFor="block-start">Hora inicio</label>
                <input
                  id="block-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div className="modal__field">
                <label htmlFor="block-end">Hora fin</label>
                <input
                  id="block-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="modal__field">
            <label htmlFor="block-reason">Motivo (opcional)</label>
            <input
              id="block-reason"
              type="text"
              placeholder="Vacaciones, cita médica, almuerzo..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <small>Solo lo ve el equipo, nunca las clientas.</small>
          </div>

          <button type="submit" className="blocks__submit" disabled={saving}>
            <Plus size={16} /> {saving ? 'Guardando...' : 'Bloquear'}
          </button>
        </form>

        <div className="blocks__list">
          <h3>Bloqueos activos</h3>
          {upcoming.length === 0 ? (
            <p className="blocks__empty">No hay horarios bloqueados.</p>
          ) : (
            upcoming.map((b) => (
              <div key={b.id} className="blocks__item">
                <div>
                  <strong>
                    {b.staffId ? (staffById[b.staffId] ?? 'Especialista') : 'Todo el salón'}
                  </strong>
                  <span className="blocks__dates">
                    {formatDate(b.startDate)}
                    {b.endDate !== b.startDate && ` → ${formatDate(b.endDate)}`}
                    {b.startTime && b.endTime ? ` · ${b.startTime} a ${b.endTime}` : ' · todo el día'}
                  </span>
                  {b.reason && <span className="blocks__reason">{b.reason}</span>}
                </div>
                <button
                  className="blocks__delete"
                  onClick={() => handleDelete(b.id)}
                  aria-label="Eliminar bloqueo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
