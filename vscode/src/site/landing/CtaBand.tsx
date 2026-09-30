import { Link } from 'react-router-dom';
import { MONOGRAMA } from '../brand';
import { site } from '../../config/site';
import { useRevela } from '../ui/useRevela';
import './CtaBand.css';

/** Llamada final: siempre marrón (también en el tema beige), con la N gigante de fondo (spec §5.9). */
export default function CtaBand() {
  const bloque = useRevela<HTMLDivElement>();
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, quiero agendar una cita')}`;
  return (
    <section className="s-cta" aria-labelledby="s-cta-tit">
      <img className="s-cta-mono" src={MONOGRAMA} alt="" aria-hidden="true" width={497} height={839} loading="lazy" />
      <div className="s-wrap s-cta-in s-rv" ref={bloque}>
        <p className="s-eyebrow">Reserva en línea</p>
        <h2 id="s-cta-tit" className="s-display s-h2">¿Lista para tu <em>mejor versión</em>?</h2>
        <p className="s-lead">Elige tu servicio, tu especialista y tu hora, o escríbenos por WhatsApp si prefieres que te orientemos.</p>
        <div className="s-cta-btns">
          <Link className="s-btn s-btn-solid" to="/reservar">Agendar cita <span className="s-ar" aria-hidden="true">→</span></Link>
          <a className="s-btn s-btn-line" href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
