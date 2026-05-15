import { MapPin, Phone, Instagram, Clock, Heart } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="contacto">
      <div className="footer__top">
        <div className="footer__inner">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-icon">N</span>
              <div>
                <span className="footer__logo-name">Anadsll</span>
                <span className="footer__logo-sub">Beauty Esthetic</span>
              </div>
            </div>
            <p className="footer__tagline">
              Centro de estética premium especializado en el cuidado integral de la mujer.
              Tu belleza, nuestra pasión.
            </p>
            <div className="footer__social">
              <a href="https://www.instagram.com/anadsllbeautyesthetic.rd" target="_blank" rel="noopener noreferrer" className="footer__social-link" aria-label="Instagram" id="footer-instagram">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="footer__col">
            <h4>Servicios</h4>
            <a href="#servicios">Láser</a>
            <a href="#servicios">Limpieza Profunda</a>
            <a href="#servicios">Cuidado Facial</a>
            <a href="#servicios">Belleza Integral</a>
            <a href="#servicios">Rejuvenecimiento</a>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4>Contacto</h4>
            <a href="tel:+18293224014" className="footer__contact-item">
              <Phone size={16} /> 829-322-4014
            </a>
            <a href="https://www.instagram.com/anadsllbeautyesthetic.rd" target="_blank" rel="noopener noreferrer" className="footer__contact-item">
              <Instagram size={16} /> @anadsllbeautyesthetic.rd
            </a>
            <span className="footer__contact-item">
              <MapPin size={16} /> C/Altagracia, #65, Pueblo Abajo
            </span>
            <span className="footer__contact-item">
              <Clock size={16} /> Lun - Sáb: 9:00 AM - 7:00 PM
            </span>
          </div>

          {/* Map embed */}
          <div className="footer__col footer__map-col">
            <h4>Ubicación</h4>
            <div className="footer__map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.2!2d-69.88!3d18.47!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sAnadsll+Beauty+Esthetic!5e0!3m2!1ses!2sdo!4v1"
                width="100%"
                height="180"
                style={{ border: 0, borderRadius: '16px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de Anadsll Beauty Esthetic"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <p>
          © 2026 Anadsll Beauty Esthetic. Todos los derechos reservados. Hecho con{' '}
          <Heart size={14} fill="var(--rose)" color="var(--rose)" style={{ verticalAlign: 'middle' }} /> en RD
        </p>
      </div>

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/18293224014?text=Hola%20quiero%20información"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-fab"
        aria-label="Contactar por WhatsApp"
        id="whatsapp-fab"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </footer>
  );
}
