import { useEffect } from 'react';
import Navbar from '../legacy/Navbar';
import Booking from '../components/Booking';
import Footer from '../legacy/Footer';

export default function BookingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
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
