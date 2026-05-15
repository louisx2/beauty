import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Packages from '../components/Packages';
import About from '../components/About';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Packages />
      <About />
      <Testimonials />
      
      {/* CTA Section */}
      <section className="cta-section" style={{ padding: '100px 5%', textAlign: 'center', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
        <div className="blob" style={{ width: 400, height: 400, background: 'var(--lavender-light)', top: '-20%', left: '-10%', opacity: 0.5 }} />
        <div className="blob" style={{ width: 300, height: 300, background: 'var(--rose-light)', bottom: '-20%', right: '-5%', opacity: 0.5 }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>¿Lista para tu <span className="gradient-text">transformación</span>?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Reserva tu cita hoy mismo y descubre el cuidado profesional que tu piel y cuerpo merecen.
          </p>
          <Link to="/reservar" className="btn-primary" style={{ display: 'inline-flex', padding: '16px 40px', fontSize: '1.1rem', borderRadius: '50px' }}>
            Agendar Cita Ahora <ArrowRight size={20} style={{ marginLeft: '10px' }} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
