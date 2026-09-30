import { useState } from 'react';
import { FOTOS, MONOGRAMA } from '../brand';
import Desplegable from '../ui/Desplegable';
import { useRevela } from '../ui/useRevela';
import './About.css';

/** Conoce a Anabel: foto en arco, dos párrafos, la cita y su historia desplegable (spec §5.5). */
export default function About() {
  const [historia, setHistoria] = useState(false);
  const media = useRevela<HTMLDivElement>();
  const texto = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-about" id="s-nosotros" data-spy="">
      <div className="s-wrap s-about-in">
        <div className="s-about-media s-rv" ref={media}>
          <div className="s-arco s-about-arco"><img src={FOTOS.anabelLobby} alt="Anabel en el lobby del salón" loading="lazy" /></div>
          <div className="s-about-sello" aria-hidden="true"><img src={MONOGRAMA} alt="" width={497} height={839} loading="lazy" /></div>
        </div>
        <div className="s-about-tx s-rv" ref={texto}>
          <p className="s-eyebrow">Conoce a Anabel</p>
          <h2 className="s-display s-h2">La historia detrás de <em>Anadsll</em></h2>
          <p className="s-about-p">
            Anadsll nace de las iniciales de su fundadora, Anabel De los Santos Lluberes. Empezó en 2016 como
            consultora de belleza y se formó como cosmetóloga, maquilladora, lashista y especialista en cejas.
          </p>
          <p className="s-about-p">
            Hoy combina técnica, equipos de alta tecnología y calidez humana, para que al irte veas en el espejo
            exactamente lo que esperabas.
          </p>
          <blockquote className="s-display s-about-cita">“Belleza y bienestar con responsabilidad.”</blockquote>
          <Desplegable id="s-historia" abierto={historia}>
            <div className="s-historia">
              <p>Todo comenzó en 2016, cuando di mis primeros pasos como consultora de belleza en Mary Kay. Ahí descubrí mi pasión: ayudar a las mujeres a sentirse seguras en su propia piel.</p>
              <p>Con el tiempo, esa pasión me llevó a formarme más. Me certifiqué como maquilladora, lashista, especialista en cejas, cosmetóloga y masajista. Cada formación era un paso para ofrecerte algo mejor.</p>
              <p>Mi deseo es simple: que cuando visites Anadsll te sientas en un espacio acogedor, en confianza. Y que al irte, veas en el espejo exactamente los resultados que esperabas. Porque tu transformación es nuestra mayor satisfacción.</p>
              <p className="s-historia-firma">¡Bienvenida a Anadsll! Bienvenida a tu mejor versión. — Anabel</p>
            </div>
          </Desplegable>
          <button type="button" className={`s-btn s-btn-line s-historia-btn ${historia ? 'is-abierto' : ''}`}
            aria-expanded={historia} aria-controls="s-historia" onClick={() => setHistoria((h) => !h)}>
            {historia ? 'Cerrar su historia' : 'Leer su historia'} <span className="s-ar" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
