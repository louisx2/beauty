import { useState } from 'react';
import toast from 'react-hot-toast';
import { Minus, Plus, X } from 'lucide-react';
import { useServiceStore, type ClientPackage } from '../../../store/serviceStore';

interface Props {
  paquete: ClientPackage;
  onCerrar: () => void;
}

/** Corregir un paquete vendido: cuántas sesiones lleva hechas (si algo se descontó de más o de menos) y sus notas. */
export default function EditarVendido({ paquete, onCerrar }: Props) {
  const updateClientPackage = useServiceStore((s) => s.updateClientPackage);
  const [hechas, setHechas] = useState(paquete.usedSessions);
  const [notas, setNotas] = useState(paquete.notes ?? '');
  const [guardando, setGuardando] = useState(false);
  const total = paquete.totalSessions;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const ok = await updateClientPackage(paquete.id, { usedSessions: hechas, notes: notas.trim() });
    setGuardando(false);
    if (!ok) return;
    toast.success('Paquete corregido');
    onCerrar();
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="evend-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="evend-tit">Corregir paquete</h2>
            <p className="abonos__sub">{paquete.clientName} · {paquete.packageName}</p>
          </div>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form className="modal__form" onSubmit={guardar}>
          <fieldset className="modal__field neg__grupo">
            <legend>Sesiones hechas</legend>
            <div className="evend__contador">
              <button type="button" className="neg__icono" onClick={() => setHechas(Math.max(0, hechas - 1))} disabled={hechas <= 0} aria-label="Una menos">
                <Minus size={18} />
              </button>
              <output aria-live="polite"><b>{hechas}</b> de {total}</output>
              <button type="button" className="neg__icono" onClick={() => setHechas(Math.min(total, hechas + 1))} disabled={hechas >= total} aria-label="Una más">
                <Plus size={18} />
              </button>
            </div>
            <div className="paq__puntos evend__puntos" aria-hidden="true">
              {Array.from({ length: Math.min(total, 50) }, (_, i) => <i key={i} className={i < hechas ? 'is-hecha' : ''} />)}
            </div>
            <p className="evend__nota">
              {hechas >= total ? 'Queda completado.' : `Le quedarán ${total - hechas}.`} Las sesiones se descuentan solas al completar la cita:
              corrige aquí solo si algo no cuadra.
            </p>
          </fieldset>
          <div className="modal__field">
            <label htmlFor="evend-notas">Notas</label>
            <textarea id="evend-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones…" />
          </div>
          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
