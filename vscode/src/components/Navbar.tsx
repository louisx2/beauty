import { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const sections = ['hero', 'servicios', 'paquetes', 'nosotros', 'mision', 'contacto'];

    const handleScroll = () => {
      // Add a threshold of 120px to make the transition feel natural
      const scrollPosition = window.scrollY + 120;
      
      // Determine scrolled header state
      setScrolled(window.scrollY > 40);

      // Find active section
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            // Map 'mision' section to highlight 'nosotros' in the navbar
            setActiveSection(section === 'mision' ? 'nosotros' : section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Set initial active section
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { label: 'Inicio', href: '/#hero' },
    { label: 'Servicios', href: '/#servicios' },
    { label: 'Paquetes', href: '/#paquetes' },
    { label: 'Nosotros', href: '/#nosotros' },
    { label: 'Contacto', href: '/#contacto' },
    { label: 'Mis Citas', href: '/mis-citas', highlight: true },
  ];

  const getHash = (href: string) => {
    if (href.startsWith('/#')) return href.substring(2);
    return '';
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <a href="/#hero" className="navbar__logo" aria-label="Anadsll Beauty Esthetic">
          <img
            src="/brand/icono.png"
            alt=""
            className="navbar__logo-icon-img"
            aria-hidden="true"
          />
          <div>
            <span className="navbar__logo-name">Anadsll</span>
            <span className="navbar__logo-sub">Beauty Esthetic</span>
          </div>
        </a>

        {/* Desktop Links */}
        <ul className="navbar__links">
          {links.map((l) => {
            const hash = getHash(l.href);
            const isActive = hash && activeSection === hash;
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={`navbar__link ${l.highlight ? 'navbar__link--highlight' : ''} ${
                    isActive ? 'navbar__link--active' : ''
                  }`}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        <div className="navbar__cta">
          <a href="/reservar" className="btn-primary" id="nav-whatsapp-btn">
            <Phone size={16} />
            Agendar Cita
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="navbar__toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          id="nav-toggle"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`navbar__mobile ${open ? 'navbar__mobile--open' : ''}`}>
        {links.map((l) => {
          const hash = getHash(l.href);
          const isActive = hash && activeSection === hash;
          return (
            <a
              key={l.href}
              href={l.href}
              className={`navbar__mobile-link ${l.highlight ? 'navbar__mobile-link--highlight' : ''} ${
                isActive ? 'navbar__mobile-link--active' : ''
              }`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          );
        })}
        <a
          href="/reservar"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
        >
          <Phone size={16} />
          Agendar Cita
        </a>
      </div>
    </nav>
  );
}

