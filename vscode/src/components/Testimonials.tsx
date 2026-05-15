import { Star } from 'lucide-react';
import './Testimonials.css';

const testimonials = [
  {
    name: 'María García',
    service: 'Depilación Láser',
    text: 'Increíble el resultado después de solo 3 sesiones. El equipo es súper profesional y el ambiente te hace sentir en confianza.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'Laura Sánchez',
    service: 'Limpieza Facial',
    text: 'Mi piel nunca había lucido tan bien. La limpieza profunda me cambió la vida. 100% recomendado.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
  },
  {
    name: 'Carolina Pérez',
    service: 'Tratamiento Corporal',
    text: 'Los tratamientos reductivos realmente funcionan. Noté diferencia desde la segunda sesión. ¡Estoy encantada!',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face',
  },
];

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
                <img src={t.avatar} alt={t.name} className="testimonial-card__avatar" loading="lazy" />
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
