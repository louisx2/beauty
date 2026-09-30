import { Link } from 'react-router-dom';
import SesionesOvalos from '../ui/SesionesOvalos';
import type { PaqueteVista } from './portal';
import './MisPaquetes.css';

/** Mis paquetes (spec §6.3): nombre, servicio y fecha de compra, las sesiones en ovalitos (llenos los usados) y
 *  "Reservar mi próxima sesión". Los terminados se muestran sin botón. Con `fallo` (no se pudieron cargar) solo el aviso. */
export default function MisPaquetes({ paquetes, fallo = false }: { paquetes: PaqueteVista[]; fallo?: boolean }) {
  if (fallo) {
    return <p className="s-pk-vacio" role="status">No pudimos cargar tus paquetes ahora. Intenta de nuevo en un momento.</p>;
  }
  if (!paquetes.length) {
    return <p className="s-pk-vacio">No tienes paquetes activos.</p>;
  }
  return (
    <ul className="s-pks">
      {paquetes.map((p) => (
        <li key={p.id} className={`s-pk ${p.terminado ? 'is-terminado' : ''}`}>
          <h3>{p.nombre}</h3>
          <span>{[p.servicio, p.desde].filter(Boolean).join(' · ')}</span>
          <SesionesOvalos sesiones={p.total} usadas={p.usadas} conTexto={false} className="s-pk-ovalos" />
          <p>{p.texto}</p>
          {p.reservar && (
            <Link className="s-btn s-btn-solid s-btn-sm" to={p.reservar}>
              Reservar mi próxima sesión <span className="s-ar" aria-hidden="true">→</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
