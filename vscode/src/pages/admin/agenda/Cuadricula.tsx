import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import type { Appointment } from '../../../store/appointmentStore';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import { primerNombre } from '../citas/proximaCita';
import { aHora, horasTexto, type Tramo } from '../hoy/dia';
import type { Ahora, BloqueAgenda, ColumnaAgenda, Cuadricula as Datos } from './agenda';

/** Alto de una hora: media hora mide 32 px, cómoda con el dedo. */
const HORA = 64;
const hora12 = (min: number) => format12h(aHora(min));

export interface Titulo { titulo: string; esHoy: boolean; onTocar?: () => void }

interface Props {
  datos: Datos;
  /** la cabeza de cada columna, en el mismo orden */
  titulos: Titulo[];
  ahora: Ahora;
  /** en "todo el salón" cada cita dice con quién es */
  conEmpleada: boolean;
  onCita: (c: Appointment) => void;
  onLibre: (col: ColumnaAgenda, t: Tramo) => void;
  /** un toque en un espacio de una columna sin huecos marcados (todo el salón): agendar a esa hora */
  onVacio: (col: ColumnaAgenda, minutos: number) => void;
}

/**
 * La agenda en columnas (especialistas de un día, o días de una semana) con las horas a la izquierda: las citas en
 * su lugar (las encimadas, lado a lado), los bloqueos, lo que está fuera de su horario y los huecos libres, que se
 * tocan para agendar ahí.
 */
export default function Cuadricula({ datos, titulos, ahora, conEmpleada, onCita, onLibre, onVacio }: Props) {
  const { inicio, fin, columnas } = datos;
  const y = (min: number) => ((min - inicio) / 60) * HORA;
  const alto = (t: Tramo) => ((t.fin - t.inicio) / 60) * HORA;
  const horas = Array.from({ length: (fin - inicio) / 60 + 1 }, (_, i) => inicio + i * 60);
  const estilo = { '--cols': columnas.length, '--alto': `${y(fin)}px` } as CSSProperties;

  const bloque = (b: BloqueAgenda) => {
    const h = Math.max(alto(b), 26);
    const ancho = 100 / b.carriles;
    return (
      <button key={`${b.cita.id}-${b.inicio}-${b.empleada}`} type="button"
        className={`ag-cu__cita ag-cu__cita--${b.cita.status} ${h < 44 ? 'is-corta' : ''} ${b.carriles > 1 ? 'is-angosta' : ''}`}
        style={{ top: y(b.inicio), height: h, left: `calc(${b.carril * ancho}% + 2px)`, width: `calc(${ancho}% - 4px)` }}
        onClick={() => onCita(b.cita)}
        aria-label={`${hora12(b.inicio)}, ${b.cita.clientName}, ${b.servicio}, con ${b.empleada}, ${ETIQUETA_ESTADO[b.cita.status]}`}>
        <b>{b.cita.clientName}</b>
        <span>{hora12(b.inicio)} · {b.servicio}{conEmpleada && ` · ${primerNombre(b.empleada)}`}</span>
      </button>
    );
  };

  return (
    <div className="ag-cu" style={estilo}>
      <div className="ag-cu__cabeza">
        <span />
        {columnas.map((col, i) => {
          const t = titulos[i];
          const sub = !col.trabaja ? (col.citas ? `${col.citas} ${col.citas === 1 ? 'cita' : 'citas'}` : 'No trabaja')
            // lo libre es de una persona: en "todo el salón" (sin empleada) se cuentan solo las citas
            : `${col.citas === 1 ? '1 cita' : `${col.citas} citas`}${col.empleada && col.minutosLibres ? ` · ${horasTexto(col.minutosLibres)} libres` : ''}`;
          const contenido = <><b>{t.titulo}</b><span>{sub}</span></>;
          return t.onTocar ? (
            <button key={col.clave} type="button" className={`ag-cu__titulo ${t.esHoy ? 'is-hoy' : ''}`} onClick={t.onTocar}>{contenido}</button>
          ) : (
            <div key={col.clave} className={`ag-cu__titulo ${t.esHoy ? 'is-hoy' : ''}`}>{contenido}</div>
          );
        })}
      </div>
      <div className="ag-cu__cuerpo">
        <div className="ag-cu__horas" aria-hidden="true">
          {horas.map((m) => <span key={m} style={{ top: y(m) }}>{hora12(m).replace(':00', '')}</span>)}
        </div>
        {columnas.map((col) => {
          // en "todo el salón" no hay huecos marcados: se toca donde sea (de hoy en adelante) para agendar a esa hora
          const tocable = col.empleada === null && col.trabaja && col.fecha >= ahora.hoy;
          const esHoy = col.fecha === ahora.hoy;
          return (
            <div key={col.clave} className={`ag-cu__col ${tocable ? 'is-tocable' : ''} ${esHoy ? 'is-hoy' : ''}`}
              onClick={tocable ? (e) => {
                if (e.target !== e.currentTarget) return;
                const r = e.currentTarget.getBoundingClientRect();
                const min = inicio + ((e.clientY - r.top) / HORA) * 60;
                if (esHoy && min < ahora.minutos) return;
                onVacio(col, min);
              } : undefined}>
              {col.trabaja && col.desde > inicio && <div className="ag-cu__fuera" style={{ top: 0, height: y(col.desde) }} />}
              {col.trabaja && col.hasta < fin && <div className="ag-cu__fuera" style={{ top: y(col.hasta), height: y(fin) - y(col.hasta) }} />}
              {!col.trabaja && <div className="ag-cu__fuera" style={{ top: 0, height: y(fin) }} />}
              {col.bloqueos.map((b, i) => (
                <div key={`bq-${i}`} className="ag-cu__bloqueo" style={{ top: y(b.inicio), height: Math.max(alto(b), 24) }}>
                  {b.motivo || 'Bloqueado'}
                </div>
              ))}
              {col.libres.map((t) => (
                <button key={`l-${t.inicio}`} type="button" className={`ag-cu__libre ${alto(t) < 44 ? 'is-corto' : ''}`}
                  style={{ top: y(t.inicio) + 2, height: Math.max(alto(t) - 4, 24) }}
                  onClick={() => onLibre(col, t)}
                  aria-label={`Agendar${col.empleada ? ` con ${col.empleada}` : ''} el ${col.fecha} desde las ${hora12(t.inicio)}; libre hasta las ${hora12(t.fin)}`}>
                  <Plus size={15} aria-hidden="true" />
                  <span>{alto(t) >= 44 ? <>Libre<small>{hora12(t.inicio)} – {hora12(t.fin)}</small></> : hora12(t.inicio)}</span>
                </button>
              ))}
              {col.bloques.map(bloque)}
              {esHoy && ahora.minutos >= inicio && ahora.minutos <= fin && (
                <div className="ag-cu__ahora" style={{ top: y(ahora.minutos) }} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
