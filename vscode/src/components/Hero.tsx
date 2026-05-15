import { Sparkles, ArrowRight } from 'lucide-react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="hero">
      {/* Background decorations */}
      <div className="blob" style={{ width: 500, height: 500, background: 'var(--rose-light)', top: '-10%', right: '-10%' }} />
      <div className="blob" style={{ width: 400, height: 400, background: 'var(--lavender-light)', bottom: '-5%', left: '-8%' }} />

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
            <a
              href="/reservar"
              className="btn-primary"
              id="hero-whatsapp-btn"
            >
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
              <span className="hero__stat-value">5+</span>
              <span className="hero__stat-label">Años de Experiencia</span>
            </div>
            <div className="hero__stat-divider" />
            <div className="hero__stat">
              <span className="hero__stat-value">20+</span>
              <span className="hero__stat-label">Tratamientos</span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="hero__image-wrap animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <div className="hero__image-ring" />
          <div className="hero__image-container">
            <img
              src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=750&fit=crop&crop=face"
              alt="Tratamiento facial profesional"
              className="hero__image"
            />
          </div>
          {/* Floating glassy card */}
          <div className="hero__float-card glass animate-float">
            <div className="hero__float-icon">✨</div>
            <div>
              <strong>Resultado garantizado</strong>
              <span>Tecnología avanzada</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
