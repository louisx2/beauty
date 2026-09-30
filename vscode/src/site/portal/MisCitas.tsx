import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
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
  // lo primero del resultado (el saludo, el "no encontramos" o el error) y si la búsqueda la pidió la clienta con el botón
  const resultado = useRef<HTMLElement | null>(null);
  const ponerResultado = useCallback((el: HTMLElement | null) => { resultado.current = el; }, []);
  const busquedaPedida = useRef(false);
  const idRecordar = useId();

  const vistas = p.datos ? vistaCitas(p.datos.citas, p.datos.servicios, new Date()) : null;
  const paquetes = p.datos ? vistaPaquetes(p.datos.paquetes) : [];
  const nombre = p.datos ? primerNombre(p.datos.citas[0]?.client_name ?? p.datos.paquetes[0]?.cliente ?? '') : '';
  const hayAlgo = !!p.datos && (p.datos.citas.length > 0 || p.datos.paquetes.length > 0);

  // al terminar una búsqueda pedida por la clienta, el foco pasa a lo primero del resultado (no en la búsqueda automática al abrir)
  useEffect(() => {
    if (p.buscando || !busquedaPedida.current) return;
    busquedaPedida.current = false;
    resultado.current?.focus();
  }, [p.buscando]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (p.buscando) return; // el botón sigue enfocable mientras busca, así que aquí se ignora el segundo envío
    if (!telefonoCompleto(p.telefono)) {
      setErrorTel('Escribe los 10 dígitos de tu teléfono.');
      document.getElementById('mc-tel')?.focus();
      return;
    }
    setErrorTel('');
    setAnuncio('');
    busquedaPedida.current = true;
    void p.buscar(p.telefono, p.recordar);
  };

  const cancelar = async (id: string) => {
    const cita = vistas?.proximas.find((c) => c.id === id);
    const r = await p.cancelar(id);
    if (r === 'ok') {
      // la tarjeta desaparece: se anuncia y el foco va al título de la sección
      setAnuncio(`Cancelamos tu cita del ${cita?.fechaCorta ?? ''} a las ${cita?.lineas[0]?.hora ?? ''}.`);
      tituloProximas.current?.focus();
    }
    return r;
  };

  return (
    <div className="s-citas">
      <header className="s-citas-head">
        <div className="s-wrap">
          <p className="s-eyebrow">Mis citas</p>
          <h1 className="s-display s-citas-titulo">Tus citas y <em>paquetes</em></h1>
          <p className="s-citas-intro">Escribe tu número de teléfono para ver tus próximas citas, tu historial y las sesiones que te quedan.</p>
          <form className="s-lookup" onSubmit={enviar} noValidate>
            <label className="s-lookup-inp" htmlFor="mc-tel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
              <span className="s-sr">Tu número de teléfono</span>
              <input id="mc-tel" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="829-000-0000"
                value={p.telefono} onChange={(e) => { setErrorTel(''); p.setTelefono(formatoTelefono(e.target.value)); }}
                aria-invalid={errorTel ? true : undefined} aria-describedby={errorTel ? 'mc-tel-error' : undefined} />
            </label>
            <button type="submit" className="s-btn s-btn-solid" aria-disabled={p.buscando || undefined}>
              {p.buscando ? 'Buscando…' : 'Ver mis citas'}
            </button>
          </form>
          {errorTel && <p id="mc-tel-error" className="s-citas-error" role="alert">{errorTel}</p>}
          <label className="s-recordar" htmlFor={idRecordar}>
            <input id={idRecordar} type="checkbox" checked={p.recordar} onChange={(e) => p.setRecordar(e.target.checked)} />
            <i aria-hidden="true">✓</i>Recordar mi número en este teléfono
          </label>
        </div>
      </header>

      <p className="s-sr" aria-live="polite">{anuncio}</p>

      <div className="s-wrap s-citas-cuerpo">
        {p.buscando ? (
          <p className="s-citas-estado">Buscando tus citas…</p>
        ) : p.error ? (
          <p className="s-citas-estado s-citas-foco" role="alert" tabIndex={-1} ref={ponerResultado}>{p.error}</p>
        ) : !p.datos ? (
          <p className="s-citas-estado">Escribe tu número y toca “Ver mis citas”.</p>
        ) : !hayAlgo ? (
          <div className="s-citas-vacio">
            <p className="s-citas-foco" tabIndex={-1} ref={ponerResultado}>No encontramos citas con el número <b>{p.buscado}</b>.</p>
            <div className="s-citas-vacio-btns">
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
                <h2 className="s-display s-citas-foco" tabIndex={-1} ref={ponerResultado}>Hola{nombre ? <>, <em>{nombre}</em></> : ''}</h2>
                <p>{textoResumen(vistas!.proximas.length, paquetes.filter((x) => !x.terminado).length, vistas!.historial.length)}</p>
              </div>
              <Link className="s-btn s-btn-line s-btn-sm" to="/reservar">Reservar otra cita</Link>
            </div>
            <div className="s-citas-grid">
              <div>
                <h2 className="s-blk-t" ref={tituloProximas} tabIndex={-1}>Próximas citas</h2>
                {vistas!.proximas.length ? (
                  vistas!.proximas.map((c) => <CitaProxima key={c.id} cita={c} onCancelar={cancelar} />)
                ) : (
                  <p className="s-citas-nada">No tienes citas próximas. <Link to="/reservar">Agenda una</Link>.</p>
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
