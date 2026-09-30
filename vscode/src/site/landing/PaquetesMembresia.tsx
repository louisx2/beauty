import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { LOGO_CLARO, MONOGRAMA } from '../brand';
import './PaquetesMembresia.css';

/**
 * Estilo A · Membresía: cada paquete es una tarjeta chocolate con el logo, como una tarjeta de socia.
 * Se inclina y brilla al pasar el mouse (spec §6.4-A). "Regalar un paquete" queda apagado (no se construye).
 */
export default function PaquetesMembresia({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <ul className="s-mc-grid">
      {paquetes.map((p, i) => {
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const esDestacado = i === destacado;
        return (
          <li key={p.id} className={`s-mc-item ${esDestacado ? 'is-pop' : ''}`}>
            {esDestacado && <span className="s-mc-badge" aria-hidden="true">Más elegido</span>}
            <div className="s-mc">
              <img className="s-mc-mono" src={MONOGRAMA} alt="" aria-hidden="true" />
              <div className="s-mc-top">
                <img className="s-mc-logo" src={LOGO_CLARO} alt="" aria-hidden="true" />
                <SesionesOvalos sesiones={p.sesiones} conTexto={false} />
              </div>
              <div className="s-mc-mid">
                <h3 className="s-display s-mc-nombre">
                  {nombreCorto(p.nombre)}{esDestacado && <span className="s-sr"> (el más elegido)</span>}
                </h3>
                {p.servicio && <p className="s-mc-svc">{p.servicio}</p>}
              </div>
              <div className="s-mc-bot">
                <b>{formatoRD(p.precio)}</b>
                <small>{p.sesiones} {p.sesiones === 1 ? 'sesión' : 'sesiones'}</small>
              </div>
            </div>
            <div className="s-mc-under">
              <span>{porSesion !== null ? `${formatoRD(porSesion)} por sesión` : ''}</span>
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to={`/reservar?paquete=${p.id}`}>
                Reservar <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
