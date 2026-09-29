import { testimonios } from '../../config/testimonios';
import CarruselCentrado from '../ui/CarruselCentrado';
import { useRevela } from '../ui/useRevela';
import './Testimonials.css';

/** Opiniones: en computadora 3 en fila; en tableta y celular una a la vez con puntitos (spec §5.8). */
export default function Testimonials() {
  const cabeza = useRevela<HTMLDivElement>();
  if (!testimonios.length) return null;
  return (
    <section className="s-sec s-testi" id="s-opiniones" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Opiniones</p>
          <h2 className="s-display s-h2">Lo que dicen nuestras <em>clientas</em></h2>
        </div>
        <CarruselCentrado etiqueta="Opiniones de clientas" className="s-carr--opiniones">
          {testimonios.map((t) => (
            <figure key={t.nombre} className="s-tq">
              <span className="s-tq-q" aria-hidden="true">“</span>
              <blockquote>{t.texto}</blockquote>
              <figcaption>
                <span><b>{t.nombre}</b>{t.servicio}</span>
                <span className="s-tq-est" role="img" aria-label={`${t.estrellas} de 5 estrellas`}>{'★'.repeat(t.estrellas)}</span>
              </figcaption>
            </figure>
          ))}
        </CarruselCentrado>
      </div>
    </section>
  );
}
