import CarruselCentrado from '../ui/CarruselCentrado';
import { useRevela } from '../ui/useRevela';
import './Philosophy.css';

const VALORES = ['Atención personalizada', 'Excelencia con calidez', 'Confianza y bienestar', 'Compromiso real', 'Eficiencia', 'Seguridad'];

/** Misión, visión y valores en tres óvalos, como los letreros de su pared (spec §5.6). Cuenta como "Nosotros". */
export default function Philosophy() {
  const cabeza = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-filo" id="s-filosofia" data-spy="s-nosotros">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Nuestra filosofía</p>
          <h2 className="s-display s-h2">Lo que nos <em>mueve</em></h2>
        </div>
        <CarruselCentrado etiqueta="Misión, visión y valores">
          <article className="s-oval">
            <h3 className="s-ov-tag">Misión</h3>
            <p>Ofrecer una experiencia superior de cuidado personal y bienestar, transformando la salud de la piel de nuestros clientes a través de tratamientos estéticos avanzados y tecnología de vanguardia, con un diagnóstico profesional y honesto, en un ambiente que inspire confianza, seguridad y relajación.</p>
          </article>
          <article className="s-oval">
            <h3 className="s-ov-tag">Visión</h3>
            <p>Ser el centro estético líder en la región sur y en San José de Ocoa, reconocidos por la excelencia en servicios, la innovación en tratamientos y el compromiso con la satisfacción del cliente; el referente en belleza y bienestar que promueve la autoestima de quienes nos visitan.</p>
          </article>
          <article className="s-oval">
            <h3 className="s-ov-tag">Valores</h3>
            <ul>{VALORES.map((v) => <li key={v}>{v}</li>)}</ul>
          </article>
        </CarruselCentrado>
      </div>
    </section>
  );
}
