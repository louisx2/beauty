import { Shield, Award, Clock, Heart } from 'lucide-react';
import './About.css';

const values = [
  { icon: <Shield size={24} />, title: 'Confianza', desc: 'Ambiente seguro y profesional en cada visita' },
  { icon: <Award size={24} />, title: 'Calidad', desc: 'Equipos certificados y productos premium' },
  { icon: <Clock size={24} />, title: 'Puntualidad', desc: 'Respetamos tu tiempo con citas puntuales' },
  { icon: <Heart size={24} />, title: 'Pasión', desc: 'Amamos lo que hacemos y se nota en los resultados' },
];

export default function About() {
  return (
    <section className="about" id="nosotros">
      <div className="about__inner">
        <div className="about__image-side">
          <div className="about__image-main">
            <img
              src="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=500&h=600&fit=crop"
              alt="Interior de Anadsll Beauty Esthetic"
              loading="lazy"
            />
          </div>
          <div className="about__image-accent glass">
            <img
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=250&fit=crop"
              alt="Tratamiento de belleza"
              loading="lazy"
            />
          </div>
          {/* Experience badge */}
          <div className="about__exp-badge glass">
            <span className="about__exp-num">5+</span>
            <span className="about__exp-label">Años de<br/>Experiencia</span>
          </div>
        </div>

        <div className="about__content">
          <span className="section-tag">Sobre Nosotros</span>
          <h2 className="about__title">
            Somos <span className="gradient-text">Anadsll</span> Beauty Esthetic
          </h2>
          <p className="about__text">
            Somos un centro de estética premium especializado en el cuidado integral de la mujer.
            Ubicadas en C/Altagracia, #65, Pueblo Abajo, ofrecemos un espacio donde la tecnología
            de punta se combina con un trato cálido y personalizado.
          </p>
          <p className="about__text">
            Nuestro equipo de profesionales certificadas se mantiene en constante formación
            para ofrecerte los tratamientos más avanzados y seguros del mercado.
          </p>

          <div className="about__values">
            {values.map((v, i) => (
              <div className="about__value" key={i}>
                <div className="about__value-icon">{v.icon}</div>
                <div>
                  <strong>{v.title}</strong>
                  <span>{v.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
