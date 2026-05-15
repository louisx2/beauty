import { Check, Star, ArrowRight } from 'lucide-react';
import './Packages.css';

const packages = [
  {
    name: 'Láser Básico',
    sessions: 3,
    price: 'RD$ 4,500',
    perSession: 'RD$ 1,500/sesión',
    features: ['Zona pequeña (axilas, bikini)', 'Consulta de evaluación', 'Seguimiento post-sesión'],
    popular: false,
  },
  {
    name: 'Láser Premium',
    sessions: 5,
    price: 'RD$ 12,000',
    perSession: 'RD$ 2,400/sesión',
    features: ['Zona amplia (piernas, espalda)', 'Consulta de evaluación', 'Crema regeneradora incluida', 'Seguimiento personalizado', 'Resultado garantizado'],
    popular: true,
  },
  {
    name: 'Cuidado Facial',
    sessions: 4,
    price: 'RD$ 6,800',
    perSession: 'RD$ 1,700/sesión',
    features: ['Limpieza profunda', 'Tratamiento anti-edad', 'Mascarilla premium', 'Masaje facial relajante'],
    popular: false,
  },
];

export default function Packages() {
  return (
    <section className="packages" id="paquetes">
      {/* Background decoration */}
      <div className="packages__bg" />

      <div className="packages__inner">
        <div className="packages__header">
          <span className="section-tag">Paquetes con Sesiones</span>
          <h2 className="packages__title">
            Ahorra con nuestros <span className="gradient-text">paquetes</span>
          </h2>
          <p className="packages__subtitle">
            Compra tu paquete de sesiones y obtén resultados duraderos a un precio especial.
            Cada sesión se descuenta automáticamente de tu saldo.
          </p>
        </div>

        <div className="packages__grid">
          {packages.map((pkg, i) => (
            <div className={`package-card ${pkg.popular ? 'package-card--popular' : ''}`} key={i}>
              {pkg.popular && (
                <div className="package-card__badge">
                  <Star size={12} /> Más Popular
                </div>
              )}

              <h3 className="package-card__name">{pkg.name}</h3>

              <div className="package-card__sessions">
                <span className="package-card__sessions-num">{pkg.sessions}</span>
                <span className="package-card__sessions-label">sesiones</span>
              </div>

              <div className="package-card__price">{pkg.price}</div>
              <div className="package-card__per-session">{pkg.perSession}</div>

              <ul className="package-card__features">
                {pkg.features.map((f, j) => (
                  <li key={j}><Check size={16} /> {f}</li>
                ))}
              </ul>

              <a
                href="https://wa.me/18293224014?text=Hola%20quiero%20el%20paquete%20de%20" 
                target="_blank"
                rel="noopener noreferrer"
                className={pkg.popular ? 'btn-primary' : 'btn-secondary'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Reservar Paquete
                <ArrowRight size={16} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
