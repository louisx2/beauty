import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { FamiliaId } from '../../data/servicesMenu';
import { FAMILIAS, type EspecialidadVista, type EspecialistaVista, type GrupoVista } from './catalogo';
import Desplegable from '../ui/Desplegable';
import { MONOGRAMA } from '../brand';
import './Catalog.css';

interface Props {
  catalogo: EspecialidadVista[];
  elegida: string;
  onElegir: (id: string) => void;
  /** cambia cada vez que un servicio destacado pide abrir su especialidad */
  pedido: number;
}

const plural = (n: number) => `${n} ${n === 1 ? 'servicio' : 'servicios'}`;
const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** alto real de la barra, con las pestañas si están a la vista */
const altoBarra = () => document.querySelector('.s-nav')?.getBoundingClientRect().height ?? 64;

function Foto({ c, clase }: { c: EspecialidadVista; clase: string }) {
  if (!c.imagen) return <div className={`s-arco is-ph ${clase}`} aria-hidden="true"><img src={MONOGRAMA} alt="" width={497} height={839} loading="lazy" /></div>;
  return (
    <div className={`s-arco ${clase}`}>
      <img src={c.imagen} alt="" loading="lazy" style={{ objectPosition: c.posicion ?? '50% 50%' }} />
    </div>
  );
}

function Especialista({ e }: { e: EspecialistaVista }) {
  return (
    <div className="s-cp-esp">
      {e.miniatura
        ? <img src={e.miniatura} alt="" width={38} height={38} loading="lazy" />
        : <span className="s-cp-ini" aria-hidden="true">{e.iniciales}</span>}
      <span>Realizado por<b>{e.nombre}</b></span>
    </div>
  );
}

function Lista({ grupos }: { grupos: GrupoVista[] }) {
  let r = 0; // número de fila para la cascada
  return (
    <>
      {grupos.map((g, gi) => (
        <div key={gi} className="s-cp-grupo">
          {g.etiqueta && <p className="s-cp-etq">{g.etiqueta}</p>}
          <ul>
            {g.servicios.map((s) => (
              <li key={s.nombre} className="s-fila" style={{ '--r': r++ } as CSSProperties}>
                <span className="s-fila-nm">{s.nombre}</span>
                <span className="s-fila-pts" aria-hidden="true" />
                {s.minutos !== null && <span className="s-fila-du">{s.minutos} min</span>}
                <span className={`s-fila-pr ${s.conPrecio ? '' : 'is-na'}`}>{s.precio}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * Catálogo completo (spec §5.3). En tableta y computadora: especialidades a la izquierda y detalle a
 * la derecha. En celular: familias con una píldora que se desliza y un acordeón de especialidades.
 */
export default function Catalog({ catalogo, elegida, onElegir, pedido }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const actual = catalogo.find((c) => c.id === elegida) ?? catalogo[0];
  const [familia, setFamilia] = useState<FamiliaId>(actual.familia);
  const [abiertaMovil, setAbiertaMovil] = useState<string | null>(null);
  const [entrada, setEntrada] = useState(0); // al cambiar de familia, las especialidades entran en cascada
  const [pildora, setPildora] = useState<CSSProperties>({ width: 0 });
  const [anuncio, setAnuncio] = useState('');
  const tituloPanel = useRef<HTMLHeadingElement>(null);

  // un destacado pidió esta especialidad: se elige su familia, se abre y la pantalla baja hasta ella
  useEffect(() => {
    if (!pedido) return;
    setAnuncio(''); // así el próximo clic en una especialidad siempre se anuncia, aunque repita el texto de antes
    const fam = catalogo.find((c) => c.id === elegida)?.familia;
    if (fam) setFamilia(fam);
    setAbiertaMovil(elegida);
    // el catálogo sigue creciendo por debajo de la especialidad mientras se abre: sin anclaje de
    // desplazamiento, el navegador no "sigue" a la sección de abajo y la especialidad no se va de la pantalla
    const html = document.documentElement;
    html.style.overflowAnchor = 'none';
    const t2 = window.setTimeout(() => { html.style.overflowAnchor = ''; }, 1400);
    const t = window.setTimeout(() => {
      const movil = window.matchMedia('(max-width: 760px)').matches;
      const destino = movil ? document.getElementById(`s-acc-${elegida}`) : raiz.current;
      if (!destino) return;
      // se baja la ventana a mano con el margen de ancla (que ya cuenta la barra con pestañas):
      // scrollIntoView también correría el recorte interno del despliegue mientras se abre y
      // el catálogo quedaría cortado arriba
      const margen = parseFloat(getComputedStyle(destino).scrollMarginTop) || 0;
      const top = destino.getBoundingClientRect().top + window.scrollY - margen;
      window.scrollTo({ top, behavior: reducir() ? 'instant' : 'smooth' });
      // el foco va a la especialidad que se abrió: en celular, su botón; en tableta y computadora, el título del panel
      const foco = movil ? destino.querySelector<HTMLElement>('.s-acc-btn') : tituloPanel.current;
      foco?.focus({ preventScroll: true });
    }, reducir() ? 0 : 380);
    return () => { window.clearTimeout(t); window.clearTimeout(t2); html.style.overflowAnchor = ''; };
    // solo cuando llega un pedido nuevo (el catálogo cambia al cargar precios y no debe volver a bajar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  // la píldora se desliza hasta la familia elegida, y esa pestaña se centra
  useLayoutEffect(() => {
    const cont = chips.current;
    if (!cont) return;
    const medir = () => {
      const on = cont.querySelector<HTMLElement>('.is-on');
      if (!on) return;
      setPildora({ width: on.offsetWidth, height: on.offsetHeight, transform: `translate(${on.offsetLeft}px, ${on.offsetTop}px)` });
    };
    medir();
    const on = cont.querySelector<HTMLElement>('.is-on');
    if (on) cont.scrollTo({ left: on.offsetLeft - cont.clientWidth / 2 + on.offsetWidth / 2, behavior: reducir() ? 'instant' : 'smooth' });
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [familia]);

  // en tableta y computadora el panel cambia sin mover el foco: se anuncia qué especialidad quedó a la vista
  const elegirEspecialidad = (id: string) => {
    onElegir(id);
    const c = catalogo.find((x) => x.id === id);
    if (c) setAnuncio(`${c.titulo}: ${plural(c.total)}`);
  };

  const elegirFamilia = (f: FamiliaId) => {
    if (f === familia) return;
    setFamilia(f);
    setAbiertaMovil(null);
    setEntrada((n) => n + 1);
  };

  // si la especialidad abierta quedó bajo la barra o muy abajo, la pantalla se acomoda sola
  const alternar = (id: string) => {
    const abrir = abiertaMovil !== id;
    setAbiertaMovil(abrir ? id : null);
    if (!abrir) return;
    window.setTimeout(() => {
      const el = document.getElementById(`s-acc-${id}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const h = altoBarra();
      if (top < h + 6 || top > window.innerHeight * 0.55) {
        window.scrollTo({ top: window.scrollY + top - h - 10, behavior: reducir() ? 'instant' : 'smooth' });
      }
    }, reducir() ? 0 : 340);
  };

  const nombreFamilia = (f: FamiliaId) => FAMILIAS.find((x) => x.id === f)?.nombre ?? '';

  return (
    <div className="s-cat" id="s-catalogo" ref={raiz}>
      <div className="s-cat-head">
        <div>
          <p className="s-eyebrow">Catálogo completo</p>
          <h3 className="s-display s-cat-tit">Todos nuestros tratamientos</h3>
        </div>
        <p>Elige un tipo de tratamiento y luego la especialidad para ver cada servicio, su duración y su precio.</p>
      </div>

      {/* tableta y computadora */}
      <div className="s-cat-grid">
        <div className="s-cat-nav" role="group" aria-label="Especialidades">
          {FAMILIAS.map((f) => (
            <div key={f.id}>
              <p className="s-cat-fam">{f.nombre}</p>
              {catalogo.filter((c) => c.familia === f.id).map((c) => (
                <button key={c.id} type="button" className={`s-cat-btn ${c.id === actual.id ? 'is-on' : ''}`}
                  aria-pressed={c.id === actual.id} onClick={() => elegirEspecialidad(c.id)}>
                  {c.titulo}<small>{c.total}</small>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="s-cat-panel">
          <div className="s-cp-anim" key={actual.id}>
            <div className="s-cp-top">
              <div>
                <span className="s-cp-fam">{nombreFamilia(actual.familia)}</span>
                <h4 className="s-display s-cp-tit" tabIndex={-1} ref={tituloPanel}>{actual.titulo}</h4>
                {actual.descripcion && <p className="s-cp-desc">{actual.descripcion}</p>}
                <Especialista e={actual.especialista} />
              </div>
              <Foto c={actual} clase="s-cp-img" />
            </div>
            <Lista grupos={actual.grupos} />
            <div className="s-cp-foot">
              <span>{plural(actual.total)} · puedes combinar varios en una misma cita</span>
              <Link className="s-btn s-btn-solid" to={`/reservar?categoria=${actual.id}`}>Reservar <span className="s-ar" aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </div>
      <p className="s-sr" aria-live="polite">{anuncio}</p>

      {/* celular */}
      <div className="s-famchips" ref={chips} role="group" aria-label="Tipo de tratamiento">
        <i className="s-fam-ind" style={pildora} aria-hidden="true" />
        {FAMILIAS.map((f) => (
          <button key={f.id} type="button" className={`s-famchip ${f.id === familia ? 'is-on' : ''}`}
            aria-pressed={f.id === familia} onClick={() => elegirFamilia(f.id)}>
            {f.corto}
          </button>
        ))}
      </div>
      <div className="s-cat-acc">
        {catalogo.filter((c) => c.familia === familia).map((c, i) => {
          const abierta = abiertaMovil === c.id;
          return (
            <div key={`${c.id}-${entrada}`} id={`s-acc-${c.id}`}
              className={`s-acc ${abierta ? 'is-abierta' : ''} ${entrada ? 'is-entra' : ''}`} style={{ '--i': i } as CSSProperties}>
              <button type="button" className="s-acc-btn" aria-expanded={abierta} aria-controls={`s-acc-cuerpo-${c.id}`} onClick={() => alternar(c.id)}>
                <Foto c={c} clase="s-acc-mini" />
                <span className="s-acc-t">{c.titulo}<small>{plural(c.total)}</small></span>
                <span className="s-acc-mas" aria-hidden="true" />
              </button>
              <Desplegable id={`s-acc-cuerpo-${c.id}`} abierto={abierta}>
                <div className="s-acc-in">
                  {c.descripcion && <p className="s-cp-desc">{c.descripcion}</p>}
                  <Especialista e={c.especialista} />
                  <Lista grupos={c.grupos} />
                  <div className="s-cp-foot">
                    <Link className="s-btn s-btn-solid" to={`/reservar?categoria=${c.id}`}>Reservar <span className="s-ar" aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </Desplegable>
            </div>
          );
        })}
      </div>
    </div>
  );
}
