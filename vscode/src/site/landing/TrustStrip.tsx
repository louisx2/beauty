import './TrustStrip.css';

const PUNTOS = ['Especialistas certificadas', 'Equipos de alta tecnología', 'Atención personalizada', 'Reserva en línea 24/7'];

/** Franja de confianza bajo la portada; en celular va en 2×2 (spec §5.2). */
export default function TrustStrip() {
  return (
    <div className="s-trust">
      <ul className="s-wrap s-trust-in">
        {PUNTOS.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}
