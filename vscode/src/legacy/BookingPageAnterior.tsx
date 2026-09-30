import { useEffect } from 'react';
import Navbar from './Navbar';
import Booking from './Booking';
import Footer from './Footer';

/** El diseño anterior de /reservar, guardado para consulta (spec §8). Google no la indexa. */
export default function BookingPageAnterior() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', paddingTop: '60px' }}>
        <Booking />
      </div>
      <Footer />
    </>
  );
}
