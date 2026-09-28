import { useCallback, useMemo, useState } from 'react';
import { servicesMenu } from '../../data/servicesMenu';
import { construirCatalogo, type ServicioPublico } from './catalogo';
import Catalog from './Catalog';
import Desplegable from '../ui/Desplegable';
import { useRevela } from '../ui/useRevela';
import { clicEspecial } from '../header/navegacion';
import './Services.css';

// los 4 destacados de la spec §5.3, con los textos del boceto
const DESTACADOS = [
  { id: 'limpieza-facial', titulo: 'Limpieza facial', texto: 'Profunda, hidrafacial, peeling y más: el protocolo justo para tu tipo de piel.' },
  { id: 'depilacion-laser', titulo: 'Depilación láser', texto: 'Resultados progresivos y seguros, en áreas pequeñas o grandes.' },
  { id: 'cejas-pestanas', titulo: 'Cejas y pestañas', texto: 'Laminado, lifting, extensiones pelo a pelo y diseño con hilo.' },
  { id: 'maquillaje', titulo: 'Maquillaje', texto: 'Express, social, quinceañera y novia, con acabado profesional.' },
];

/** Servicios: 4 destacados y el catálogo completo, cerrado tras "Ver todos los servicios" (spec §5.3). */
export default function Services({ servicios }: { servicios: ServicioPublico[] }) {
  const catalogo = useMemo(() => construirCatalogo(servicesMenu, servicios), [servicios]);
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState('limpieza-facial');
  const [pedido, setPedido] = useState(0);
  const cabeza = useRevela<HTMLDivElement>();
  const tarjetas = useRevela<HTMLDivElement>();
  const boton = useRevela<HTMLDivElement>();

  // tocar un destacado abre el catálogo justo en esa especialidad
  const abrirEn = useCallback((id: string) => {
    setElegida(id);
    setAbierto(true);
    setPedido((n) => n + 1);
  }, []);

  return (
    <section className="s-sec s-svc" id="s-servicios" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-rv" ref={cabeza}>
          <div>
            <p className="s-eyebrow">Nuestros servicios</p>
            <h2 className="s-display s-h2">Tratamientos <em>especializados</em> para ti</h2>
          </div>
          <p className="s-lead">Facial, corporal, cejas y pestañas y medicina estética: todo en un mismo lugar y con el mismo cuidado en cada detalle.</p>
        </div>

        <div className="s-cards s-rv" ref={tarjetas}>
          {DESTACADOS.map((d, i) => {
            const c = catalogo.find((x) => x.id === d.id);
            return (
              <a key={d.id} className="s-card" href="#s-catalogo"
                onClick={(e) => { if (clicEspecial(e)) return; e.preventDefault(); abrirEn(d.id); }}>
                <div className="s-card-img">
                  <img src={c?.imagen} alt="" loading="lazy" style={{ objectPosition: c?.posicion ?? '50% 50%' }} />
                </div>
                <div className="s-card-bd">
                  <span className="s-card-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="s-display s-h3">{d.titulo}</h3>
                  <p>{d.texto}</p>
                  <span className="s-card-link">Ver servicios <span className="s-ar" aria-hidden="true">→</span></span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="s-cat-toggle s-rv" ref={boton}>
          <button type="button" className={`s-btn s-btn-line s-cat-open ${abierto ? 'is-abierto' : ''}`}
            aria-expanded={abierto} aria-controls="s-cat-despl" onClick={() => setAbierto((a) => !a)}>
            <span className="s-co-l">
              <span className="s-co-roll">
                <b className="s-co-a" aria-hidden={abierto}>Ver todos los servicios</b>
                <b className="s-co-b" aria-hidden={!abierto}>Ocultar servicios</b>
              </span>
              <small>{catalogo.length} especialidades · precios y duración</small>
            </span>
            <i className="s-co-chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </i>
          </button>
        </div>

        <Desplegable id="s-cat-despl" className="s-cat-despl" abierto={abierto}>
          <Catalog catalogo={catalogo} elegida={elegida} onElegir={setElegida} pedido={pedido} />
        </Desplegable>
      </div>
    </section>
  );
}
