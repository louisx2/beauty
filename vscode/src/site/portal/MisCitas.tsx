import { useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../../config/site';
import { formatoTelefono } from '../reservar/datos';
import CitaProxima from './CitaProxima';
import MisPaquetes from './MisPaquetes';
import { primerNombre, telefonoCompleto, textoResumen, vistaCitas, vistaPaquetes } from './portal';
import { usePortal } from './usePortal';
import './MisCitas.css';

/** /mis-citas (spec §6.3): búsqueda por teléfono, saludo, próximas citas, historial y mis paquetes. */
export default function MisCitas() {
  const p = usePortal();
  const [errorTel, setErrorTel] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const tituloProximas = useRef<HTMLHeadingElement>(null);
  const idRecordar = useId();

  const vistas = p.datos ? vistaCitas(p.datos.citas, p.datos.servicios, new Date()) : null;
  const paquetes = p.datos ? vistaPaquetes(p.datos.paquetes) : [];
  const nombre = p.datos ? primerNombre(p.datos.citas[0]?.client_name ?? p.datos.paquetes[0]?.cliente ?? '') : '';
  const hayAlgo = !!p.datos && (p.datos.citas.length > 0 || p.datos.paquetes.length > 0);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!telefonoCompleto(p.telefono)) {
      setErrorTel('Escribe los 10 dígitos de tu teléfono.');
      document.getElementById('mc-tel')?.focus();
      return;
    }
    setErrorTel('');
    setAnuncio('');
    void p.buscar(p.telefono, p.recordar);
  };

  const cancelar = async (id: string) => {
    const cita = vistas?.proximas.find((c) => c.id === id);
    const r = await p.cancelar(id);
    if (r === 'ok') {
      // la tarjeta desaparece: se anuncia y el foco va al título de la sección
      setAnuncio(`Cancelamos tu cita del ${cita?.fechaCorta ?? ''}.`);
      tituloProximas.current?.focus();
    }
    return r;
  };

  return (
    <div className="s-mc">
      <header className="s-mc-head">
        <div className="s-wrap">
          <p className="s-eyebrow">Mis citas</p>
          <h1 className="s-display s-mc-titulo">Tus citas y <em>paquetes</em></h1>
          <p className="s-mc-intro">Escribe tu número de teléfono para ver tus próximas citas, tu historial y las sesiones que te quedan.</p>
          <form className="s-lookup" onSubmit={enviar} noValidate>
            <label className="s-lookup-inp" htmlFor="mc-tel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
              <span className="s-sr">Tu número de teléfono</span>
              <input id="mc-tel" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="829-000-0000"
                value={p.telefono} onChange={(e) => p.setTelefono(formatoTelefono(e.target.value))}
                aria-invalid={errorTel ? true : undefined} aria-describedby={errorTel ? 'mc-tel-error' : undefined} />
            </label>
            <button type="submit" className="s-btn s-btn-solid" disabled={p.buscando}>
              {p.buscando ? 'Buscando…' : 'Ver mis citas'}
            </button>
          </form>
          {errorTel && <p id="mc-tel-error" className="s-mc-error">{errorTel}</p>}
          <label className="s-recordar" htmlFor={idRecordar}>
            <input id={idRecordar} type="checkbox" checked={p.recordar} onChange={(e) => p.setRecordar(e.target.checked)} />
            <i aria-hidden="true">✓</i>Recordar mi número en este teléfono
          </label>
        </div>
      </header>

      <p className="s-sr" aria-live="polite">{anuncio}</p>

      <div className="s-wrap s-mc-cuerpo">
        {p.buscando ? (
          <p className="s-mc-estado">Buscando tus citas…</p>
        ) : p.error ? (
          <p className="s-mc-estado" role="alert">{p.error}</p>
        ) : !p.datos ? (
          <p className="s-mc-estado">Escribe tu número y toca “Ver mis citas”.</p>
        ) : !hayAlgo ? (
          <div className="s-mc-vacio">
            <p>No encontramos citas con el número <b>{p.buscado}</b>.</p>
            <div className="s-mc-vacio-btns">
              <Link className="s-btn s-btn-solid" to="/reservar">Agendar una cita</Link>
              <a className="s-btn s-btn-line" target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hola, no encuentro mis citas con el número ${p.buscado}`)}`}>
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="s-hello">
              <div>
                <h2 className="s-display">Hola{nombre ? <>, <em>{nombre}</em></> : ''}</h2>
                <p>{textoResumen(vistas!.proximas.length, paquetes.filter((x) => !x.terminado).length, vistas!.historial.length)}</p>
              </div>
              <Link className="s-btn s-btn-line s-btn-sm" to="/reservar">Reservar otra cita</Link>
            </div>
            <div className="s-mc-grid">
              <div>
                <h2 className="s-blk-t" ref={tituloProximas} tabIndex={-1}>Próximas citas</h2>
                {vistas!.proximas.length ? (
                  vistas!.proximas.map((c) => <CitaProxima key={c.id} cita={c} onCancelar={cancelar} />)
                ) : (
                  <p className="s-mc-nada">No tienes citas próximas. <Link to="/reservar">Agenda una</Link>.</p>
                )}
                {vistas!.historial.length > 0 && (
                  <>
                    <h2 className="s-blk-t s-blk-t--sep">Historial</h2>
                    <ul className="s-hist">
                      {vistas!.historial.map((c) => (
                        <li key={c.id}>
                          <time dateTime={c.fecha}>{c.fechaCorta}</time>
                          <span>{c.titulo}</span>
                          <span className={`s-estado is-${c.tono}`}><i aria-hidden="true" />{c.estado}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div>
                <h2 className="s-blk-t">Mis paquetes</h2>
                <MisPaquetes paquetes={paquetes} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
