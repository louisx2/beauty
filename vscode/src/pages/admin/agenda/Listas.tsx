import { Plus } from 'lucide-react';
import type { Appointment } from '../../../store/appointmentStore';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import { fechaTitulo } from '../../../site/reservar/resumen';
import { primerNombre } from '../citas/proximaCita';
import { aHora, type Tramo } from '../hoy/dia';
import { fechaCorta, type Ahora, type BloqueAgenda, type ColumnaAgenda } from './agenda';
import type { Titulo } from './Cuadricula';

const hora12 = (min: number) => format12h(aHora(min));

type Renglon =
  | { tipo: 'cita'; inicio: number; bloque: BloqueAgenda }
  | { tipo: 'libre'; inicio: number; tramo: Tramo; col: ColumnaAgenda };

/** Citas y huecos libres (de media hora o más) de unas columnas, en orden de hora. */
function renglones(cols: ColumnaAgenda[]): Renglon[] {
  return cols
    .flatMap((col): Renglon[] => [
      ...col.bloques.map((bloque): Renglon => ({ tipo: 'cita', inicio: bloque.inicio, bloque })),
      ...col.libres.filter((t) => t.fin - t.inicio >= 30).map((tramo): Renglon => ({ tipo: 'libre', inicio: tramo.inicio, tramo, col })),
    ])
    .sort((a, b) => a.inicio - b.inicio || (a.tipo === b.tipo ? 0 : a.tipo === 'cita' ? -1 : 1));
}

interface ListaProps {
  columnas: ColumnaAgenda[];
  titulos: Titulo[];
  /** semana: un grupo por día; día: todo junto */
  porDia: boolean;
  ahora: Ahora;
  onCita: (c: Appointment) => void;
  onLibre: (col: ColumnaAgenda, t: Tramo) => void;
  onAgendarDia: (fecha: string) => void;
}

/** La agenda en el celular: en lista, con las citas y los huecos en orden de hora (por día, en la semana). */
export function ListaAgenda({ columnas, titulos, porDia, ahora, onCita, onLibre, onAgendarDia }: ListaProps) {
  const fila = (r: Renglon) => r.tipo === 'cita' ? (
    <li key={`c-${r.bloque.cita.id}-${r.inicio}-${r.bloque.empleada}`}>
      <button type="button" className={`ag-li__cita ag-li__cita--${r.bloque.cita.status}`} onClick={() => onCita(r.bloque.cita)}>
        <span className="ag-li__hora">{hora12(r.inicio)}</span>
        <span className="ag-li__txt">
          <b>{r.bloque.cita.clientName}</b>
          <span>{r.bloque.servicio} · {primerNombre(r.bloque.empleada)} · {ETIQUETA_ESTADO[r.bloque.cita.status]}</span>
        </span>
      </button>
    </li>
  ) : (
    <li key={`l-${r.col.clave}-${r.inicio}`}>
      <button type="button" className="ag-li__libre" onClick={() => onLibre(r.col, r.tramo)}>
        <Plus size={16} aria-hidden="true" /> Libre {hora12(r.tramo.inicio)} – {hora12(r.tramo.fin)}
        {r.col.empleada && <> con {primerNombre(r.col.empleada)}</>}
      </button>
    </li>
  );

  if (!porDia) {
    const lista = renglones(columnas);
    return (
      <ol className="ag-li">
        {lista.length === 0 && <li className="ag-li__vacio">No hay citas ni horas libres este día.</li>}
        {lista.map(fila)}
      </ol>
    );
  }

  return (
    <div className="ag-li__dias">
      {columnas.map((col, i) => {
        const lista = renglones([col]);
        const t = titulos[i];
        return (
          <section key={col.clave} className={`ag-li__dia ${t.esHoy ? 'is-hoy' : ''}`} aria-label={fechaTitulo(col.fecha)}>
            <div className="ag-li__dia-cab">
              <button type="button" className="ag-li__dia-tit" onClick={t.onTocar}>
                <b>{t.titulo}</b>
                <span>{!col.trabaja && !col.citas ? 'No trabaja' : col.citas === 1 ? '1 cita' : `${col.citas} citas`}</span>
              </button>
              {col.trabaja && col.fecha >= ahora.hoy && (
                <button type="button" className="ag-li__agendar" onClick={() => onAgendarDia(col.fecha)} aria-label={`Agendar el ${fechaTitulo(col.fecha)}`}>
                  <Plus size={16} aria-hidden="true" /> Agendar
                </button>
              )}
            </div>
            {lista.length > 0 && <ol className="ag-li">{lista.map(fila)}</ol>}
          </section>
        );
      })}
    </div>
  );
}

/** Lo que se encontró al buscar: las por venir y las que ya pasaron, con su día. */
export function ResultadosBusqueda({ citas, texto, hoy, onCita }: { citas: Appointment[]; texto: string; hoy: string; onCita: (c: Appointment) => void }) {
  if (citas.length === 0) return <p className="ag-li__vacio">Ninguna cita con “{texto.trim()}”.</p>;
  const porVenir = citas.filter((c) => c.date >= hoy);
  const pasadas = citas.filter((c) => c.date < hoy);
  const grupo = (titulo: string, lista: Appointment[]) => lista.length > 0 && (
    <section className="ag-li__grupo">
      <h2 className="ag-li__grupo-tit">{titulo}</h2>
      <ol className="ag-li">
        {lista.map((c) => (
          <li key={c.id}>
            <button type="button" className={`ag-li__cita ag-li__cita--${c.status}`} onClick={() => onCita(c)}>
              <span className="ag-li__hora ag-li__hora--fecha">
                <b>{c.date === hoy ? 'Hoy' : fechaCorta(c.date)}</b>
                <span>{format12h(c.time)}</span>
              </span>
              <span className="ag-li__txt">
                <b>{c.clientName}</b>
                <span>{c.service} · {primerNombre(c.employee)} · {ETIQUETA_ESTADO[c.status]}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
  return (
    <div className="ag-li__resultados">
      {grupo('Por venir', porVenir)}
      {grupo('Ya pasaron', pasadas)}
    </div>
  );
}
