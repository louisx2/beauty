import { formatoRD } from '../landing/catalogo';
import { duracionTexto, fechaLarga, type LineaResumen } from './resumen';
import './ResumenVisita.css';

export interface ResumenProps {
  lineas: LineaResumen[];
  fecha: string;
  duracionTotal: number;
  deposito: number;
  /** hay día, hora y reparto: se puede solicitar */
  listo: boolean;
  enviando: boolean;
  onSolicitar: () => void;
}

/** "Tu visita", fija a la derecha en computadora. Nunca pasa del alto de la ventana: el contenido baja por
 *  dentro y el botón queda siempre a la vista (spec §6.1). */
export function ResumenVisita(p: ResumenProps) {
  return (
    <aside className="s-sum" aria-label="Resumen de tu visita">
      <div className="s-sum-h">
        <p className="s-eyebrow">Resumen</p>
        <h2 className="s-display">Tu visita</h2>
      </div>
      <div className="s-sum-b">
        {p.lineas.length === 0 ? (
          <p className="s-sum-vacio">Todavía no has elegido servicios. Aquí verás tu visita armada, con la hora de cada servicio y con quién.</p>
        ) : (
          <>
            <ol className="s-tl">
              {p.lineas.map((l, i) => (
                <li key={`${l.nombre}-${i}`}>
                  <time>{l.hora ?? '—'}</time>
                  <div><b>{l.nombre}</b><span>{l.duracion} min · {l.quien}</span></div>
                </li>
              ))}
            </ol>
            <dl className="s-sum-filas">
              <div><dt>Día</dt><dd>{p.fecha ? fechaLarga(p.fecha) : 'Por elegir'}</dd></div>
              <div><dt>Duración total</dt><dd>{duracionTexto(p.duracionTotal)}</dd></div>
            </dl>
          </>
        )}
      </div>
      <div className="s-sum-pie">
        <p className="s-dep">Para confirmar se pide un <b>depósito de {formatoRD(p.deposito)}</b>. El resto lo pagas en el salón.</p>
        <button type="button" className="s-btn s-btn-solid" disabled={!p.listo || p.enviando} onClick={p.onSolicitar}>
          {p.enviando ? 'Enviando…' : <>Solicitar cita <span className="s-ar" aria-hidden="true">→</span></>}
        </button>
      </div>
    </aside>
  );
}

export interface BarraProps {
  titulo: string;
  detalle: string;
  accion: string;
  deshabilitada: boolean;
  onAccion: () => void;
}

/** Tableta y celular: barra fija abajo con el resumen corto y el botón (spec §6.1). */
export function BarraReserva(p: BarraProps) {
  return (
    <div className="s-rbar" role="region" aria-label="Tu visita">
      <p><b>{p.titulo}</b><span>{p.detalle}</span></p>
      <button type="button" className="s-btn" disabled={p.deshabilitada} onClick={p.onAccion}>{p.accion}</button>
    </div>
  );
}
