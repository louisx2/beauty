import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BankAccount } from '../../store/settingsStore';
import { formatoRD } from '../landing/catalogo';
import { numeroWhatsApp } from './datos';
import { fechaTitulo, lineasResumen, rangoHoras } from './resumen';
import { nombreVisible } from './servicios';
import type { Confirmada } from './useBooking';
import './Confirmacion.css';

export interface ConfirmacionProps {
  cita: Confirmada;
  deposito: number;
  cuentas: BankAccount[];
  /** número de WhatsApp del salón (settings) */
  whatsapp: string;
  mensaje: string;
  onOtra: () => void;
}

/** ¡Tu cita está pre-reservada! Boleta, depósito con "Copiar" y los tres pasos que siguen (spec §6.2). */
export default function Confirmacion({ cita, deposito, cuentas, whatsapp, mensaje, onOtra }: ConfirmacionProps) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [copia, setCopia] = useState<{ i: number; ok: boolean } | null>(null);
  const reloj = useRef<number | undefined>(undefined);
  const lineas = lineasResumen([], [], cita.hora, cita.plan);

  // quien usa lector de pantalla llega directo a la noticia
  useEffect(() => { titulo.current?.focus(); }, []);
  useEffect(() => () => window.clearTimeout(reloj.current), []);

  const copiar = async (texto: string, i: number) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch {
      ok = false; // sin permiso o sin portapapeles (algunos navegadores dentro de Instagram): que lo copie a mano
    }
    setCopia({ i, ok });
    window.clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => setCopia(null), 2500);
  };

  return (
    <div className="s-wrap s-conf">
      <div className="s-okmark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <p className="s-eyebrow">Solicitud recibida</p>
      <h1 className="s-display s-conf-t" tabIndex={-1} ref={titulo}>¡Tu cita está <em>pre-reservada</em>!</h1>
      <p className="s-conf-p">Guardamos tu espacio. Para confirmarlo, haz el depósito y envíanos el comprobante.</p>

      <section className="s-ticket" aria-label="Tu cita">
        <div className="s-tk-h">
          <b>{fechaTitulo(cita.fecha)}</b>
          <span className="s-estado"><i aria-hidden="true" />Pendiente de depósito</span>
        </div>
        <dl className="s-tk-b">
          <div><dt>Hora</dt><dd>{rangoHoras(cita.hora, cita.duracionTotal)}</dd></div>
          <div><dt>A nombre de</dt><dd>{cita.nombre}</dd></div>
          <div className="is-full">
            <dt>{lineas.length > 1 ? 'Servicios' : 'Servicio'}</dt>
            <dd>{lineas.map((l, i) => <span key={i}>{l.hora} · {nombreVisible(l.nombre)} · {l.quien}</span>)}</dd>
          </div>
        </dl>
      </section>

      <section className="s-banco" aria-labelledby="s-banco-t">
        <div className="s-banco-h">
          <h2 id="s-banco-t" className="s-eyebrow">Deposita para confirmar</h2>
          <b>{formatoRD(deposito)}</b>
        </div>
        {cuentas.map((c, i) => (
          <div key={`${c.account_number}-${i}`} className="s-cuenta">
            <div><span>Banco</span>{c.bank_name}</div>
            <div>
              <span>Cuenta</span>
              <span className="s-copiar">
                {c.account_number}
                <button type="button" onClick={() => copiar(c.account_number, i)}
                  aria-label={`Copiar el número de cuenta ${c.account_number}`}>
                  {copia?.i === i ? (copia.ok ? 'Copiado' : 'Cópialo a mano') : 'Copiar'}
                </button>
              </span>
            </div>
            <div><span>A nombre de</span>{c.account_name}</div>
          </div>
        ))}
        <p className="s-sr" aria-live="polite">{copia ? (copia.ok ? `Número de cuenta ${cuentas[copia.i]?.account_number ?? ''} copiado` : 'No se pudo copiar; cópialo a mano') : ''}</p>
      </section>

      <ol className="s-next3">
        <li><b>1</b>Haz el depósito o transferencia por {formatoRD(deposito)}.</li>
        <li><b>2</b>Envía el comprobante por WhatsApp.</li>
        <li><b>3</b>Recepción confirma y te llega el aviso.</li>
      </ol>

      <div className="s-conf-btns">
        <a className="s-btn s-btn-solid" href={`https://wa.me/${numeroWhatsApp(whatsapp)}?text=${encodeURIComponent(mensaje)}`}
          target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
        <Link className="s-btn s-btn-line" to="/mis-citas">Ver mis citas</Link>
      </div>
      <button type="button" className="s-conf-otra" onClick={onOtra}>Hacer otra reserva</button>
    </div>
  );
}
