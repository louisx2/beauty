import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, indiceDestacado, nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import { MONOGRAMA } from '../brand';
import { useRevela } from '../ui/useRevela';
import './Packages.css';

const PASOS = [
  { n: '01', t: 'Elige tu paquete', d: 'Según el tratamiento y las sesiones que tu piel necesita.' },
  { n: '02', t: 'Reserva en línea', d: 'Agenda tu primera sesión y las siguientes cuando te quede mejor.' },
  { n: '03', t: 'Sigue tu avance', d: 'En Mis citas ves cuántas sesiones llevas y cuántas te quedan.' },
];
const MAX_OVALOS = 10; // más de 10 sesiones se dicen con el número, sin llenar la fila

/** Paquetes en el estilo "Menú con foto" (spec §6.4-B) y la franja "Cómo funciona" (spec §5.4). */
export default function Packages({ paquetes }: { paquetes: PaquetePublico[] }) {
  const cabeza = useRevela<HTMLDivElement>();
  const filas = useRevela<HTMLDivElement>();
  const pasos = useRevela<HTMLOListElement>();
  const destacado = indiceDestacado(paquetes.length);

  return (
    <section className="s-sec s-pkg" id="s-paquetes" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Paquetes con sesiones</p>
          <h2 className="s-display s-h2">Ahorra con nuestros <em>paquetes</em></h2>
          <p className="s-lead">Compra tu paquete de sesiones y obtén resultados duraderos a un precio especial.</p>
        </div>

        <div className="s-prows s-rv" ref={filas}>
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
                  <div className="s-ovalos">
                    {Array.from({ length: Math.min(p.sesiones, MAX_OVALOS) }, (_, k) => <i key={k} aria-hidden="true" />)}
                    <span>{p.sesiones} {p.sesiones === 1 ? 'sesión' : 'sesiones'}</span>
                  </div>
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

        <ol className="s-how s-rv" ref={pasos}>
          {PASOS.map((s) => (
            <li key={s.n} className="s-how-paso">
              <b aria-hidden="true">{s.n}</b>
              <div><h4>{s.t}</h4><p>{s.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
