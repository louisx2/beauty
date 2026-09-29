import { Link } from 'react-router-dom';
import { FOTOS } from '../brand';
import Sello from '../ui/Sello';
import { clicEspecial, irASeccion } from '../header/navegacion';
import './Hero.css';

/** Portada: los textos suben en cascada, el óvalo se eleva, la foto se aleja y el sello gira (spec §5.1). */
export default function Hero() {
  return (
    <section className="s-hero" id="s-inicio" data-spy="">
      <div className="s-wrap s-hero-in">
        <div className="s-hero-tx">
          <p className="s-eyebrow s-hero-a1">Centro de estética · San José de Ocoa</p>
          <h1 className="s-display s-h1 s-hero-a2">Recupera la <em>confianza</em> en tu piel</h1>
          <p className="s-lead s-hero-a3">
            Tratamientos faciales, depilación láser y medicina estética con especialistas certificadas, en un
            espacio pensado para que te sientas en confianza desde que llegas.
          </p>
          <div className="s-hero-btns s-hero-a4">
            <Link className="s-btn s-btn-solid" to="/reservar">Agendar cita <span className="s-ar" aria-hidden="true">→</span></Link>
            <a className="s-btn s-btn-line" href="#s-servicios"
              onClick={(e) => { if (clicEspecial(e)) return; e.preventDefault(); irASeccion('s-servicios'); }}>
              Ver servicios
            </a>
          </div>
        </div>
        <div className="s-hero-media">
          <div className="s-arco s-hero-arco">
            <img src={FOTOS.portada} alt="Anabel De los Santos en su salón" width={934} height={1400} fetchPriority="high" />
          </div>
          <div className="s-hero-linea" aria-hidden="true" />
          <Sello className="s-hero-sello" />
          <div className="s-hero-firma"><b>Anabel De los Santos</b>Fundadora · Cosmetóloga</div>
        </div>
      </div>
    </section>
  );
}
