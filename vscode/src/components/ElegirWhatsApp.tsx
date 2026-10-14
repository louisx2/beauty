import { MonitorSmartphone } from 'lucide-react';
import { guardarModoWhatsApp, type ModoWhatsApp } from '../lib/enlaces';
import './ElegirWhatsApp.css';

interface Props {
  modo: ModoWhatsApp;
  onCambio: (modo: ModoWhatsApp) => void;
}

/** Cómo se abre WhatsApp en este equipo: la app instalada (sin pestañas nuevas) o WhatsApp Web. Se guarda en el
 *  equipo, así cada computadora o tableta elige lo suyo. */
export default function ElegirWhatsApp({ modo, onCambio }: Props) {
  const elegir = (m: ModoWhatsApp) => { guardarModoWhatsApp(m); onCambio(m); };
  return (
    <div className="ewa">
      <span className="ewa__tit"><MonitorSmartphone size={16} aria-hidden="true" /> WhatsApp en este equipo</span>
      <div className="ewa__opciones" role="radiogroup" aria-label="Cómo se abre WhatsApp en este equipo">
        <button type="button" role="radio" aria-checked={modo === 'app'} className={modo === 'app' ? 'is-on' : ''} onClick={() => elegir('app')}>
          La app instalada
        </button>
        <button type="button" role="radio" aria-checked={modo === 'web'} className={modo === 'web' ? 'is-on' : ''} onClick={() => elegir('web')}>
          WhatsApp Web
        </button>
      </div>
      <small className="ewa__nota">
        {modo === 'app'
          ? 'Abre la app de WhatsApp de este equipo con el mensaje escrito, sin pestañas nuevas. La primera vez el navegador pregunta si abrirla: marca «Permitir siempre». Si la app no está instalada, no se abrirá nada.'
          : 'Abre una pestaña nueva con WhatsApp. En el teléfono y la tableta abre la app.'}
      </small>
    </div>
  );
}
