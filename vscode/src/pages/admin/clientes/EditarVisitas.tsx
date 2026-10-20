import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useClientStore, type Client } from '../../../store/clientStore';
import type { Visitas } from './record';

const MAXIMO = 9999;

interface Props {
  clienta: Client;
  visitas: Visitas;
  onCerrar: () => void;
}

/**
 * Las visitas de antes sin detalle, al tocar "Visitas" en la ficha: las veces que vino antes del sistema y no están
 * en su historial previo. Se suman a las del sistema y a las del historial, que ya se cuentan solas.
 */
export default function EditarVisitas({ clienta, visitas, onCerrar }: Props) {
  const updateClient = useClientStore((s) => s.updateClient);
  const [texto, setTexto] = useState(String(visitas.sinDetalle));
  const [guardando, setGuardando] = useState(false);
  const n = Math.min(MAXIMO, Math.max(0, parseInt(texto, 10) || 0));
  const total = visitas.enSistema + visitas.enHistorial + n;

  const guardar = async () => {
    if (n === visitas.sinDetalle) return onCerrar();
    setGuardando(true);
    const ok = await updateClient(clienta.id, { visitas_previas: n });
    setGuardando(false);
    if (ok) onCerrar();
  };

  return (
    <section className="ficha__tarjeta" aria-labelledby="ficha-visitas-antes">
      <h3 id="ficha-visitas-antes" className="ficha__tit">Visitas de antes, sin detalle</h3>
      <p className="ficha__ayuda">
        Las veces que vino antes del sistema y no están en su historial previo. Lo que se agrega al historial ya se cuenta solo.
      </p>
      <div className="ficha__contador">
        <button type="button" className="ficha__btn ficha__btn--icono" onClick={() => setTexto(String(n - 1))} disabled={n === 0}
          aria-label="Una visita menos">
          <Minus size={18} aria-hidden="true" />
        </button>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={texto} aria-label="Visitas de antes sin detalle"
          onChange={(e) => setTexto(e.target.value.replace(/\D/g, '').slice(0, 4))} onFocus={(e) => e.target.select()} />
        <button type="button" className="ficha__btn ficha__btn--icono" onClick={() => setTexto(String(n + 1))} disabled={n === MAXIMO}
          aria-label="Una visita más">
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
      <p className="ficha__desglose">
        {visitas.enSistema} en el sistema · {visitas.enHistorial} del historial previo · {n} sin detalle = <b>{total} {total === 1 ? 'visita' : 'visitas'}</b>
      </p>
      <div className="ficha__fila-botones">
        <button type="button" className="ficha__btn" onClick={onCerrar} disabled={guardando}>Cancelar</button>
        <button type="button" className="ficha__btn ficha__btn--principal" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </section>
  );
}
