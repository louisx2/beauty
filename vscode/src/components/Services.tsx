import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles, Zap, Flame, Eye, Smile, Sun, Eraser, Brush, ArrowRight,
  Syringe, Droplet, Dna, Pipette, HeartPulse, Bandage, Waves, X,
} from 'lucide-react';
import { servicesMenu } from '../data/servicesMenu';
import type { ServiceCategory } from '../data/servicesMenu';
import { useServiceStore } from '../store/serviceStore';
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
  const [selectedSpecialist, setSelectedSpecialist] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedSpecialist(null);
      setIsClosing(false);
    }, 300);
  };

  const cat = servicesMenu[active];
  const { description, blocks } = buildBlocks(cat);
  const n = countServices(cat);

  const { services, fetchAll } = useServiceStore();

  useEffect(() => {
    fetchAll().catch((err) => console.warn('Failed to fetch services for landing page:', err));
  }, [fetchAll]);

  useEffect(() => {
    if (selectedSpecialist) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedSpecialist]);

  const findPrice = (catId: string, blockLabel: string, itName: string) => {
    let searchName = '';
    const cleanIt = itName.split(' — ')[0].trim();

    if (catId === 'depilacion-laser') {
      searchName = `Depilación Láser - ${cleanIt}`;
    } else if (catId === 'depilacion-cera') {
      searchName = `Depilación Cera - ${cleanIt}`;
    } else if (catId === 'blanqueamiento-corporal') {
      searchName = `Blanqueamiento - ${cleanIt}`;
    } else if (catId === 'cejas-pestanas') {
      if (blockLabel === 'Extensiones de pestañas') {
        if (cleanIt.startsWith('Volumen 2D')) {
          searchName = 'Extensiones de Pestañas - Volumen 2D-5D';
        } else {
          searchName = `Extensiones de Pestañas - ${cleanIt}`;
        }
      } else {
        searchName = cleanIt;
      }
    } else if (catId === 'maquillaje') {
      searchName = `Maquillaje - ${cleanIt}`;
    } else if (catId === 'toxina-botulinica') {
      searchName = `Toxina Botulínica - ${cleanIt}`;
    } else if (catId === 'rellenos') {
      searchName = `Relleno Ácido Hialurónico - ${cleanIt}`;
    } else if (catId === 'bioestimuladores') {
      let subPart = cleanIt;
      if (subPart.startsWith('Hilos PDO')) subPart = 'Hilos PDO (x10)';
      if (subPart.startsWith('Hilos tensores')) subPart = 'Hilos tensores (desde)';
      searchName = `Bioestimulador - ${subPart}`;
    } else if (catId === 'mesoterapia') {
      let subPart = cleanIt;
      if (subPart.startsWith('NCTF')) subPart = 'NCTF - Ojeras';
      if (subPart.startsWith('PDRN')) subPart = 'PDRN de Salmón - Ojeras';
      searchName = `Mesoterapia ${subPart}`;
    } else if (catId === 'escleroterapia') {
      searchName = 'Escleroterapia - Ampolla 2ml';
    } else if (catId === 'verrugas') {
      searchName = 'Eliminación de Verrugas (desde)';
    } else {
      searchName = cleanIt;
    }

    const match = services.find(
      (s) => s.name.toLowerCase().trim() === searchName.toLowerCase().trim()
    );
    return match && match.active ? match.price : null;
  };

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

            {/* Specialist Info */}
            <div
              className="svc-panel__specialist svc-panel__specialist--clickable"
              onClick={() => setSelectedSpecialist(cat.specialist)}
            >
              <img
                src={cat.specialist.image}
                alt={cat.specialist.name}
                className="svc-panel__specialist-img"
                loading="lazy"
              />
              <div className="svc-panel__specialist-info">
                <span className="svc-panel__specialist-label">Realizado por</span>
                <strong className="svc-panel__specialist-name">{cat.specialist.name}</strong>
                <span className="svc-panel__specialist-role">{cat.specialist.role}</span>
              </div>
            </div>

            <a href="/reservar" className="btn-primary svc-panel__cta">
              Reservar <ArrowRight size={16} />
            </a>
          </aside>

          <div className="svc-panel__main">
            {blocks.map((b, bi) => (
              <div className="svc-block" key={bi}>
                {b.label && <span className="svc-block__label">{b.label}</span>}
                <div className="svc-chips">
                  {b.items.map((it, ci) => {
                    const price = findPrice(cat.id, b.label || '', it);
                    return (
                      <span
                        className="svc-chip"
                        key={it}
                        style={{ animationDelay: `${ci * 0.03}s` }}
                      >
                        <span className="svc-chip__name">{it.split(' — ')[0]}</span>
                        {price !== null && (
                          <span className="svc-chip__price">
                            RD$ {price.toLocaleString('es-DO')}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specialist Detail Modal */}
      {selectedSpecialist && (
        <div className={`modal-overlay ${isClosing ? 'modal-overlay--closing' : ''}`} onClick={handleCloseModal}>
          <div className={`modal specialist-modal ${isClosing ? 'specialist-modal--closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Perfil de Especialista</h2>
              <button className="modal__close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <div className="specialist-modal__content">
              <div className="specialist-modal__image-container">
                <img
                  src={selectedSpecialist.image}
                  alt={selectedSpecialist.name}
                  className="specialist-modal__image"
                />
              </div>
              <div className="specialist-modal__details">
                <h3 className="specialist-modal__name">{selectedSpecialist.name}</h3>
                <span className="specialist-modal__role">{selectedSpecialist.role}</span>
                <p className="specialist-modal__bio">{selectedSpecialist.bio}</p>
                
                <div className="specialist-modal__services">
                  <h4>Áreas de Especialidad</h4>
                  <div className="specialist-modal__tags">
                    {servicesMenu
                      .filter((c) => c.specialist.name === selectedSpecialist.name)
                      .map((c) => (
                        <span key={c.id} className="specialist-modal__tag">
                          {c.title}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

