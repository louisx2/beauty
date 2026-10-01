import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Hourglass, X } from 'lucide-react';
import { useSuscripcionStore } from '../store/suscripcionStore';
import { avisoDeCuota, hoySantoDomingo } from '../lib/suscripcion';
import './AvisoSuscripcion.css';

const ICONO = { rojo: AlertTriangle, ambar: CalendarClock, azul: Hourglass } as const;
const claveOculto = (clave: string) => `avisoSuscripcionOculto:${clave}`;

/** El aviso del pago del sistema arriba de cada pantalla del panel (spec §5.3). Solo lo monta AdminLayout para
 *  la administración. El rojo no se cierra; el ámbar y el azul se ocultan por hoy. Si SellAlleS no responde,
 *  no sale nada. */
export default function AvisoSuscripcion() {
  const cuenta = useSuscripcionStore((s) => s.cuenta);
  const cargarCuenta = useSuscripcionStore((s) => s.cargarCuenta);
  const { pathname } = useLocation();
  const [cerrado, setCerrado] = useState<string | null>(null);

  // al abrir el panel y al cambiar de pantalla; la caché del store evita consultar más de una vez cada 15 min
  useEffect(() => {
    void cargarCuenta();
  }, [cargarCuenta, pathname]);

  const aviso = avisoDeCuota(cuenta);
  if (!aviso || cerrado === aviso.clave) return null;

  const hoy = hoySantoDomingo(new Date());
  if (aviso.ocultable) {
    try {
      if (localStorage.getItem(claveOculto(aviso.clave)) === hoy) return null;
    } catch {
      // sin almacenamiento: se muestra, y "ocultar" solo lo cierra ahora
    }
  }

  const ocultar = () => {
    try {
      localStorage.setItem(claveOculto(aviso.clave), hoy);
    } catch {
      // sin almacenamiento
    }
    setCerrado(aviso.clave);
  };

  const Icono = ICONO[aviso.tono];
  return (
    <div className={`aviso-susc aviso-susc--${aviso.tono}`} role="status">
      <Icono className="aviso-susc__icono" size={20} aria-hidden="true" />
      <div className="aviso-susc__texto">
        <p className="aviso-susc__titulo">{aviso.titulo}</p>
        <p className="aviso-susc__detalle">{aviso.detalle}</p>
      </div>
      <div className="aviso-susc__acciones">
        <Link className="aviso-susc__btn" to="/admin/suscripcion">
          {aviso.tono === 'azul' ? 'Ver estado' : 'Pagar / subir comprobante'}
        </Link>
        {aviso.ocultable && (
          <button type="button" className="aviso-susc__cerrar" onClick={ocultar} aria-label="Ocultar por hoy" title="Ocultar por hoy">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
