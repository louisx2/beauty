import { Shield, Award, Clock, Heart } from 'lucide-react';
import './About.css';

const values = [
  { icon: <Shield size={24} />, title: 'Confianza', desc: 'Ambiente seguro y profesional en cada visita' },
  { icon: <Award size={24} />, title: 'Calidad', desc: 'Equipos certificados y productos premium' },
  { icon: <Clock size={24} />, title: 'Responsabilidad', desc: 'Belleza y bienestar con responsabilidad' },
  { icon: <Heart size={24} />, title: 'Transformación', desc: 'Tu bienestar es nuestra mayor satisfacción' },
];

export default function About() {
  return (
    <section className="about" id="nosotros">
      <div className="about__inner">
        <div className="about__image-side">
          <div className="about__image-main">
            <img
              src="/equipo/as-07236.jpg"
              alt="Anabel De los Santos Lluberes"
              loading="lazy"
            />
          </div>
          <div className="about__image-accent">
            <img
              src="/brand/logo-sobre-nosotros.png"
              alt="Logo Anadsll Beauty Esthetic"
              className="about__logo"
              loading="lazy"
            />
          </div>
          {/* Experience badge */}
          <div className="about__exp-badge glass">
            <span className="about__exp-num">10</span>
            <span className="about__exp-label">Años de<br/>Experiencia</span>
          </div>
        </div>

        <div className="about__content">
          <span className="section-tag">Nuestra Historia</span>
          <h2 className="about__title">
            La historia detrás de <span className="gradient-text">Anadsll</span> Beauty Esthetic
          </h2>
          
          <div className="about__text-wrapper">
            <p className="about__text">
              <strong>Anadsll</strong> nace de las iniciales de su fundadora: <strong>Anabel De los Santos Lluberes</strong>.
            </p>
            <p className="about__text">
              Todo comenzó en 2016, cuando di mis primeros pasos como consultora de belleza en Mary Kay. Ahí descubrí mi pasión: ayudar a las mujeres a sentirse seguras en su propia piel.
            </p>
            <p className="about__text">
              Con el tiempo, esa pasión me llevó a formarme más. Me certifiqué como maquilladora, lashista, especialista en cejas, cosmetóloga y masajista. Cada formación era un paso para ofrecerte algo mejor.
            </p>
            <p className="about__text">
              Hoy, <strong>Anadsll Beauty Esthetic</strong> es el resultado de esa evolución. Un lugar donde combinamos técnica, cosmetología avanzada y calidez humana. Porque creemos que tu piel merece lo mejor, trabajamos con equipos de alta tecnología que nos ayudan a lograr los resultados que esperas.
            </p>
            <p className="about__text italic-quote">
              "Nos mueve una sola frase: Belleza y bienestar con responsabilidad."
            </p>
            <p className="about__text">
              Mi deseo es simple: Que cuando visites Anadsll te sientas en un espacio acogedor, en confianza. Y que al irte, veas en el espejo exactamente los resultados que esperabas. Porque tu transformación es nuestra mayor satisfacción.
            </p>
            <p className="about__welcome-text">
              <strong>¡Bienvenida a Anadsll! Bienvenida a tu mejor versión.</strong>
            </p>
          </div>

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

