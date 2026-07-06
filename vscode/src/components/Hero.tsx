import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import './Hero.css';

export default function Hero() {
  const [currentBg, setCurrentBg] = useState(0);
  const bgImages = ['/lobby.jpg', '/lobby2.jpg'];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length);
    }, 6000); // Cambiar cada 6 segundos
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="hero" id="hero">
      {/* Background Carousel Slides */}
      <div className="hero__bg-slides">
        {bgImages.map((src, index) => (
          <div
            key={src}
            className={`hero__bg-slide ${index === currentBg ? 'hero__bg-slide--active' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="hero__gradient-overlay" />
      <div className="hero__inner">
        <div className="hero__content">
          <div className="hero__badge animate-fade-up">
            <Sparkles size={14} />
            Centro de Estética Premium
          </div>

          <h1 className="hero__title animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Recupera la <span className="gradient-text">confianza</span> en tu piel
          </h1>

          <p className="hero__subtitle animate-fade-up" style={{ animationDelay: '0.2s' }}>
            Especialistas de confianza que ofrecen tratamientos cosméticos avanzados.
            Tu belleza merece un cuidado profesional y personalizado.
          </p>

          <div className="hero__actions animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <a href="/reservar" className="btn-primary" id="hero-whatsapp-btn">
              Agendar Cita
              <ArrowRight size={16} />
            </a>
            <a href="#servicios" className="btn-secondary" id="hero-services-btn">
              Ver Servicios
            </a>
          </div>

          {/* Stats */}
          <div className="hero__stats animate-fade-up" style={{ animationDelay: '0.4s' }}>
            <div className="hero__stat">
              <span className="hero__stat-value">500+</span>
              <span className="hero__stat-label">Clientas Satisfechas</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">10+</span>
              <span className="hero__stat-label">Años de Experiencia</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">20+</span>
              <span className="hero__stat-label">Tratamientos</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
