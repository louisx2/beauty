import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BankAccount } from '../../store/settingsStore';
import { formatoRD } from '../landing/catalogo';
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
  const [copiada, setCopiada] = useState<number | null>(null);
  const lineas = lineasResumen([], [], cita.hora, cita.plan);

  // quien usa lector de pantalla llega directo a la noticia
  useEffect(() => { titulo.current?.focus(); }, []);

  const copiar = (texto: string, i: number) => {
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiada(i);
    window.setTimeout(() => setCopiada((c) => (c === i ? null : c)), 2000);
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
                  {copiada === i ? 'Copiado' : 'Copiar'}
                </button>
              </span>
            </div>
            <div><span>A nombre de</span>{c.account_name}</div>
          </div>
        ))}
        <p className="s-sr" aria-live="polite">{copiada !== null ? 'Número de cuenta copiado' : ''}</p>
      </section>

      <ol className="s-next3">
        <li><b>1</b>Haz el depósito o transferencia por {formatoRD(deposito)}.</li>
        <li><b>2</b>Envía el comprobante por WhatsApp.</li>
        <li><b>3</b>Recepción confirma y te llega el aviso.</li>
      </ol>

      <div className="s-conf-btns">
        <a className="s-btn s-btn-solid" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
          target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
        <Link className="s-btn s-btn-line" to="/mis-citas">Ver mis citas</Link>
      </div>
      <button type="button" className="s-conf-otra" onClick={onOtra}>Hacer otra reserva</button>
    </div>
  );
}
