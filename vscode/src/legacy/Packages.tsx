import { useEffect, useState } from 'react';
import { Check, Star, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Packages.css';

interface PackageCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  features: string[];
  popular?: boolean;
}

function formatRD(n: number): string {
  return `RD$ ${Number(n || 0).toLocaleString('es-DO')}`;
}

// Paquetes de ejemplo (se muestran si aún no has creado paquetes en el panel).
const fallback: PackageCard[] = [
  {
    id: 'fb-1', name: 'Láser Básico', sessions: 3, price: 4500,
    features: ['Zona pequeña (axilas, bikini)', 'Consulta de evaluación', 'Seguimiento post-sesión'],
  },
  {
    id: 'fb-2', name: 'Láser Premium', sessions: 5, price: 12000, popular: true,
    features: ['Zona amplia (piernas, espalda)', 'Consulta de evaluación', 'Crema regeneradora incluida', 'Seguimiento personalizado'],
  },
  {
    id: 'fb-3', name: 'Cuidado Facial', sessions: 4, price: 6800,
    features: ['Limpieza profunda', 'Tratamiento anti-edad', 'Mascarilla premium', 'Masaje facial relajante'],
  },
];

export default function Packages() {
  const [packages, setPackages] = useState<PackageCard[]>(fallback);

  useEffect(() => {
    supabase
      .from('session_packages')
      .select('id, name, sessions, price, description, services(name)')
      .eq('active', true)
      .order('price')
      .then(({ data }) => {
        if (data && data.length) {
          const mid = data.length >= 3 ? Math.floor(data.length / 2) : -1;
          setPackages(
            data.map((p: any, i: number) => ({
              id: p.id,
              name: p.name,
              sessions: p.sessions,
              price: Number(p.price),
              popular: i === mid,
              features: [
                p.services?.name,
                ...String(p.description || '').split('\n').map((d) => d.trim()),
              ].filter(Boolean),
            }))
          );
        }
      });
  }, []);

  return (
    <section className="packages" id="paquetes">
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
          {packages.map((pkg) => {
            const perSession = pkg.sessions > 0 ? Math.round(pkg.price / pkg.sessions) : 0;
            return (
              <div className={`package-card ${pkg.popular ? 'package-card--popular' : ''}`} key={pkg.id}>
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

                <div className="package-card__price">{formatRD(pkg.price)}</div>
                {pkg.sessions > 0 && (
                  <div className="package-card__per-session">{formatRD(perSession)}/sesión</div>
                )}

                <ul className="package-card__features">
                  {pkg.features.map((f, j) => (
                    <li key={j}><Check size={16} /> {f}</li>
                  ))}
                </ul>

                <a
                  href="/reservar"
                  className={pkg.popular ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Reservar Paquete
                  <ArrowRight size={16} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
