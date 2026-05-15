import { Zap, Droplets, Sparkles, Scissors, Heart, Sun } from 'lucide-react';
import './Services.css';

const services = [
  {
    icon: <Zap size={28} />,
    title: 'Láser',
    description: 'Depilación láser de última generación con resultados permanentes y sin dolor.',
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&h=300&fit=crop',
  },
  {
    icon: <Droplets size={28} />,
    title: 'Limpieza Profunda',
    description: 'Limpieza facial profesional que elimina impurezas y renueva tu piel por completo.',
    image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=300&fit=crop',
  },
  {
    icon: <Sparkles size={28} />,
    title: 'Cuidado Facial',
    description: 'Tratamientos faciales personalizados con productos de alta calidad y tecnología avanzada.',
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=300&fit=crop',
  },
  {
    icon: <Scissors size={28} />,
    title: 'Belleza Integral',
    description: 'Maquillaje profesional, cejas, pestañas y todo lo que necesitas para lucir radiante.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop',
  },
  {
    icon: <Heart size={28} />,
    title: 'Tratamientos Corporales',
    description: 'Reductivos, reafirmantes y drenajes linfáticos para moldear tu figura ideal.',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop',
  },
  {
    icon: <Sun size={28} />,
    title: 'Rejuvenecimiento',
    description: 'Radiofrecuencia, microneedling y procedimientos anti-edad para una piel joven.',
    image: 'https://images.unsplash.com/photo-1595867818082-083862f3d630?w=400&h=300&fit=crop',
  },
];

export default function Services() {
  return (
    <section className="services" id="servicios">
      <div className="services__inner">
        <div className="services__header">
          <span className="section-tag">Nuestros Servicios</span>
          <h2 className="services__title">
            Tratamientos <span className="gradient-text">especializados</span> para ti
          </h2>
          <p className="services__subtitle">
            Contamos con tecnología de punta y profesionales certificadas para ofrecerte
            los mejores resultados en cada sesión.
          </p>
        </div>

        <div className="services__grid">
          {services.map((s, i) => (
            <div className="service-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="service-card__image-wrap">
                <img src={s.image} alt={s.title} className="service-card__image" loading="lazy" />
                <div className="service-card__overlay" />
              </div>
              <div className="service-card__body">
                <div className="service-card__icon">{s.icon}</div>
                <h3 className="service-card__title">{s.title}</h3>
                <p className="service-card__desc">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
