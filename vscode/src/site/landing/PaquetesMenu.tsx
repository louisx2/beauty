import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { MONOGRAMA } from '../brand';
import './PaquetesMenu.css';

/** Estilo B · Menú con foto: una fila por paquete con la foto del servicio en arco (spec §6.4-B). */
export default function PaquetesMenu({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <div className="s-prows">
      {paquetes.map((p, i) => {
        const foto = fotoDePaquete(p.nombre, p.servicio);
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const esDestacado = i === destacado;
        return (
          <article key={p.id} className="s-prow">
            <div className={`s-arco s-prow-foto ${foto ? '' : 'is-ph'}`}>
              <img src={foto ?? MONOGRAMA} alt="" loading="lazy" />
            </div>
            <div className="s-prow-tx">
              <h3 className="s-display">{nombreCorto(p.nombre)}{esDestacado && <> <span className="s-tag">Más elegido</span></>}</h3>
              {p.servicio && <p className="s-prow-inc">{p.servicio}</p>}
              <SesionesOvalos sesiones={p.sesiones} />
            </div>
            <div className="s-prow-precio">
              <b>{formatoRD(p.precio)}</b>
              {porSesion !== null && <span>{formatoRD(porSesion)} por sesión</span>}
            </div>
            <div className="s-prow-go">
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to="/reservar">
                Reservar paquete <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
