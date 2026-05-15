import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import MyAppointments from '../components/MyAppointments';
import Footer from '../components/Footer';

export default function ClientPortal() {
  useEffect(() => {
    // Scroll to top when loading the page
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', paddingTop: '60px' }}>
        <MyAppointments />
      </div>
      <Footer />
    </>
  );
}
