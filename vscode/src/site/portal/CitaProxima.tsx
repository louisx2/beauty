import { useEffect, useRef, useState } from 'react';
import { mapsUrl, site } from '../../config/site';
import { DIAS_LARGOS, deIso } from '../reservar/calendario';
import type { CitaVista } from './portal';
import type { ResultadoCancelar } from './usePortal';
import './CitaProxima.css';

interface Props {
  cita: CitaVista;
  onCancelar: (id: string) => Promise<ResultadoCancelar>;
}

const MENSAJE: Record<Exclude<ResultadoCancelar, 'ok'>, string> = {
  tarde: 'Esta cita ya no se puede cancelar en línea.',
  error: 'No se pudo cancelar la cita.',
};

/** Una próxima cita (spec §6.3): fecha en óvalo, cada servicio con su hora y su especialista, el estado,
 *  "Cómo llegar" y "Cancelar" (12 h). Con menos de 12 h, el aviso para escribir por WhatsApp. */
export default function CitaProxima({ cita, onCancelar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [bloqueada, setBloqueada] = useState(false); // la base dijo que ya no se cancela en línea
  const botonCancelar = useRef<HTMLButtonElement>(null);
  const botonConservar = useRef<HTMLButtonElement>(null);
  const avisoRef = useRef<HTMLParagraphElement>(null);
  const volverACancelar = useRef(false);
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero cambiar mi cita del ${cita.fechaCorta} a las ${cita.lineas[0]?.hora ?? ''}`,
  )}`;

  // al abrir la confirmación el foco va a "No, conservar"; solo si se cierra con ese botón vuelve a "Cancelar"
  useEffect(() => {
    if (confirmando) botonConservar.current?.focus();
    else if (volverACancelar.current) {
      volverACancelar.current = false;
      botonCancelar.current?.focus();
    }
  }, [confirmando]);

  // si la cancelación falla, el foco va al aviso para que se lea completo
  useEffect(() => {
    if (aviso) avisoRef.current?.focus();
  }, [aviso]);

  const cancelar = async () => {
    setCancelando(true);
    let r: ResultadoCancelar;
    try {
      r = await onCancelar(cita.id);
    } catch {
      r = 'error';
    } finally {
      setCancelando(false);
    }
    if (r === 'ok') return; // la cita pasa al historial y esta tarjeta desaparece
    setBloqueada(r === 'tarde'); // con 'error' se puede volver a intentar
    setAviso(MENSAJE[r]);
    setConfirmando(false);
  };

  const puedeCancelar = cita.cancelable && !bloqueada;

  return (
    <article className="s-ap" aria-labelledby={`cita-${cita.id}`}>
      <div className="s-ap-fecha" aria-hidden="true">
        <small>{cita.ovalo.dia}</small>
        <b>{cita.ovalo.numero}</b>
        <small>{cita.ovalo.mes}</small>
      </div>
      <div className="s-ap-cuerpo">
        <div className="s-ap-top">
          <h3 id={`cita-${cita.id}`}>
            <span className="s-sr">{DIAS_LARGOS[deIso(cita.fecha).getDay()]} {cita.fechaCorta}: </span>{cita.titulo}
          </h3>
          <span className={`s-estado is-${cita.tono}`}><i aria-hidden="true" />{cita.estado}</span>
        </div>
        <ul className="s-ap-lineas">
          {cita.lineas.map((l, i) => (
            <li key={i}><b>{l.hora}</b> · {l.nombre} · {l.quien}</li>
          ))}
        </ul>
        {aviso && (
          <>
            <p ref={avisoRef} tabIndex={-1} className="s-ap-aviso" role="alert">
              {aviso} Escríbenos por WhatsApp y te ayudamos.
            </p>
            <a className="s-btn s-btn-line s-btn-sm s-ap-aviso-wa" href={whatsapp} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </>
        )}
        {confirmando ? (
          <div className="s-ap-confirma" role="group" aria-label="Confirmar la cancelación">
            <p>¿Cancelar esta cita? No se puede deshacer.</p>
            <button type="button" className="s-btn s-btn-solid s-btn-sm" onClick={cancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
            <button type="button" ref={botonConservar} className="s-btn s-btn-line s-btn-sm"
              onClick={() => { volverACancelar.current = true; setConfirmando(false); }} disabled={cancelando}>
              No, conservar
            </button>
          </div>
        ) : (
          <div className="s-ap-acciones">
            <a className="s-btn s-btn-line s-btn-sm" href={mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            {puedeCancelar && (
              <button type="button" ref={botonCancelar} className="s-btn s-btn-line s-btn-sm"
                onClick={() => { setAviso(''); setConfirmando(true); }}>
                Cancelar
              </button>
            )}
            {puedeCancelar && <small>Puedes cancelar hasta 12 h antes.</small>}
            {cita.menosDe12h && (
              <>
                <a className="s-btn s-btn-line s-btn-sm" href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
                <small>Faltan menos de 12 h: para cambiarla escríbenos por WhatsApp.</small>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
