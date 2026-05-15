import { useState, useEffect } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Inicio', href: '/#hero' },
    { label: 'Servicios', href: '/#servicios' },
    { label: 'Paquetes', href: '/#paquetes' },
    { label: 'Nosotros', href: '/#nosotros' },
    { label: 'Mis Citas', href: '/mis-citas' },
    { label: 'Contacto', href: '/#contacto' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`} id="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <a href="/#hero" className="navbar__logo">
          <span className="navbar__logo-icon">N</span>
          <div>
            <span className="navbar__logo-name">Anadsll</span>
            <span className="navbar__logo-sub">Beauty Esthetic</span>
          </div>
        </a>

        {/* Desktop Links */}
        <ul className="navbar__links">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="navbar__link">{l.label}</a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="navbar__cta">
          <a
            href="/reservar"
            className="btn-primary"
            id="nav-whatsapp-btn"
          >
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
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="navbar__mobile-link"
            onClick={() => setOpen(false)}
          >
            {l.label}
          </a>
        ))}
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
