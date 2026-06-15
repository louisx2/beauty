import { Star } from 'lucide-react';
import './Testimonials.css';

const testimonials = [
  {
    name: 'María García',
    service: 'Depilación Láser',
    text: 'Increíble el resultado después de solo 3 sesiones. El equipo es súper profesional y el ambiente te hace sentir en confianza.',
    rating: 5,
  },
  {
    name: 'Laura Sánchez',
    service: 'Limpieza Facial',
    text: 'Mi piel nunca había lucido tan bien. La limpieza profunda me cambió la vida. 100% recomendado.',
    rating: 5,
  },
  {
    name: 'Carolina Pérez',
    service: 'Blanqueamiento Corporal',
    text: 'Los tratamientos realmente funcionan. Noté diferencia desde la segunda sesión. ¡Estoy encantada!',
    rating: 5,
  },
];

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export default function Testimonials() {
  return (
    <section className="testimonials" id="testimonios">
      <div className="testimonials__bg" />
      <div className="testimonials__inner">
        <div className="testimonials__header">
          <span className="section-tag">Testimonios</span>
          <h2 className="testimonials__title">
            Lo que dicen nuestras <span className="gradient-text">clientas</span>
          </h2>
        </div>

        <div className="testimonials__grid">
          {testimonials.map((t, i) => (
            <div className="testimonial-card" key={i}>
              <div className="testimonial-card__stars">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={16} fill="var(--gold)" color="var(--gold)" />
                ))}
              </div>
              <p className="testimonial-card__text">"{t.text}"</p>
              <div className="testimonial-card__author">
                <div className="testimonial-card__avatar" aria-hidden="true">{initials(t.name)}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.service}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
