import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles, Zap, Flame, Eye, Smile, Sun, Eraser, Brush, ArrowRight,
  Syringe, Droplet, Dna, Pipette, HeartPulse, Bandage, Waves,
} from 'lucide-react';
import { servicesMenu } from '../data/servicesMenu';
import type { ServiceCategory } from '../data/servicesMenu';
import './Services.css';

const icons: Record<string, ReactNode> = {
  'limpieza-facial': <Sparkles />,
  'depilacion-laser': <Zap />,
  'depilacion-cera': <Flame />,
  'cejas-pestanas': <Eye />,
  'hidra-lips': <Smile />,
  'blanqueamiento-corporal': <Sun />,
  'remocion-tatuaje': <Eraser />,
  maquillaje: <Brush />,
  'toxina-botulinica': <Syringe />,
  rellenos: <Droplet />,
  bioestimuladores: <Dna />,
  mesoterapia: <Pipette />,
  escleroterapia: <HeartPulse />,
  verrugas: <Bandage />,
  aparatologia: <Waves />,
};

interface Block { label?: string; items: string[]; }

function buildBlocks(cat: ServiceCategory): { description?: string; blocks: Block[] } {
  const description = cat.items.find((i) => i.description)?.description;
  const blocks: Block[] = [];
  const loose: string[] = [];

  cat.items.forEach((item) => {
    if (item.groups) {
      item.groups.forEach((g) => blocks.push({ label: g.label, items: g.items }));
    } else if (item.options) {
      blocks.push({ label: cat.items.length > 1 ? item.name : undefined, items: item.options });
    } else {
      loose.push(item.name);
    }
  });

  if (loose.length) blocks.unshift({ items: loose });
  return { description, blocks };
}

function countServices(cat: ServiceCategory): number {
  return cat.items.reduce((n, i) => {
    if (i.groups) return n + i.groups.reduce((m, g) => m + g.items.length, 0);
    if (i.options) return n + i.options.length;
    return n + 1;
  }, 0);
}

export default function Services() {
  const [active, setActive] = useState(0);
  const cat = servicesMenu[active];
  const { description, blocks } = buildBlocks(cat);
  const n = countServices(cat);

  return (
    <section className="services" id="servicios">
      <div className="services__inner">
        <div className="services__header">
          <span className="section-tag">Nuestros Servicios</span>
          <h2 className="services__title">
            Tratamientos <span className="gradient-text">especializados</span> para ti
          </h2>
          <p className="services__subtitle">
            Explora cada categoría y descubre todo lo que tenemos para realzar tu belleza.
          </p>
        </div>

        {/* Tabs */}
        <div className="svc-tabs" role="tablist">
          {servicesMenu.map((c, i) => (
            <button
              key={c.id}
              className={`svc-tab ${i === active ? 'svc-tab--active' : ''}`}
              onClick={() => setActive(i)}
              role="tab"
              aria-selected={i === active}
              type="button"
            >
              <span className="svc-tab__icon">{icons[c.id]}</span>
              {c.title}
            </button>
          ))}
        </div>

        {/* Panel (re-mounts on tab change for entrance animation) */}
        <div className="svc-panel" key={cat.id}>
          <aside className="svc-panel__aside">
            <div className="svc-panel__icon">{icons[cat.id]}</div>
            <h3 className="svc-panel__title">{cat.title}</h3>
            <span className="svc-panel__count">
              {n} {n === 1 ? 'servicio' : 'servicios'}
            </span>
            {description && <p className="svc-panel__desc">{description}</p>}
            <a href="/reservar" className="btn-primary svc-panel__cta">
              Reservar <ArrowRight size={16} />
            </a>
          </aside>

          <div className="svc-panel__main">
            {blocks.map((b, bi) => (
              <div className="svc-block" key={bi}>
                {b.label && <span className="svc-block__label">{b.label}</span>}
                <div className="svc-chips">
                  {b.items.map((it, ci) => (
                    <span
                      className="svc-chip"
                      key={it}
                      style={{ animationDelay: `${ci * 0.03}s` }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
