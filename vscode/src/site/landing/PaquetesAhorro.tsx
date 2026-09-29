import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, nombreCorto, porcentajeAhorro, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { MONOGRAMA } from '../brand';
import './PaquetesAhorro.css';

/**
 * Estilo C · Ahorro: foto, sello "Ahorras X %", precio por sesión grande y el precio suelto tachado
 * (spec §6.4-C). Si el servicio del paquete no tiene precio, esa tarjeta sale sin sello ni precio tachado.
 */
export default function PaquetesAhorro({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <ul className="s-sc-grid">
      {paquetes.map((p, i) => {
        const foto = fotoDePaquete(p.nombre, p.servicio);
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const ahorro = porcentajeAhorro(p);
        const esDestacado = i === destacado;
        return (
          <li key={p.id} className={`s-sc ${esDestacado ? 'is-pop' : ''}`}>
            <div className={`s-sc-img ${foto ? '' : 'is-ph'}`}>
              <img src={foto ?? MONOGRAMA} alt="" loading="lazy" />
              {esDestacado && <span className="s-sc-flag">Más elegido</span>}
              {ahorro !== null && <span className="s-sc-sello" aria-hidden="true"><small>Ahorras</small><b>{ahorro}%</b></span>}
              <SesionesOvalos sesiones={p.sesiones} className="s-sc-ovalos" />
            </div>
            <div className="s-sc-bd">
              <h3 className="s-display">{nombreCorto(p.nombre)}</h3>
              {p.servicio && <p className="s-sc-inc">{p.servicio}</p>}
              {porSesion !== null && <p className="s-sc-per"><b>{formatoRD(porSesion)}</b><span>por sesión</span></p>}
              {ahorro !== null && (
                <p className="s-sc-antes">
                  <s>{formatoRD(p.precioServicio)}</s> precio de la sesión suelta<span className="s-sr">, ahorras {ahorro} por ciento</span>
                </p>
              )}
              <p className="s-sc-total">
                Total <b>{formatoRD(p.precio)}</b> por {p.sesiones === 1 ? 'la sesión' : `las ${p.sesiones} sesiones`}
              </p>
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to="/reservar">
                Reservar paquete <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
