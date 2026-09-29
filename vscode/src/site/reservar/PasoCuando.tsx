import { useState, type ReactNode } from 'react';
import { format12h } from '../../lib/timeFormat';
import {
  DIAS_MAXIMOS, deIso, etiquetaMes, flechasMes, flechasSemana, lunesDe, mesDeSemana, mesEnCuadricula, semana, sumarDias, sumarMeses,
  type Dia, type MesVisto,
} from './calendario';
import type { Horario } from './disponibilidad';
import { fechaLarga } from './resumen';
import './PasoCuando.css';

export interface PasoCuandoProps {
  hoy: string;
  /** día elegido ("" si ninguno) */
  fecha: string;
  onFecha: (iso: string) => void;
  /** todas las horas del día, con las ocupadas (plan null) */
  horarios: Horario[];
  hora: string;
  onHora: (hora: string) => void;
  cargando: boolean;
  sinHuecos: boolean;
  variosServicios: boolean;
}

const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOTIVO = { domingo: 'cerrado', pasado: 'ya pasó', lejos: 'todavía no se puede reservar' } as const;

/** Paso 2 (spec §6.1): tira de 7 días con flechas, "Ver mes" y las horas en Mañana y Tarde. */
export default function PasoCuando(p: PasoCuandoProps) {
  const [vista, setVista] = useState<'semana' | 'mes'>('semana');
  const [lunes, setLunes] = useState(() => lunesDe(p.fecha || p.hoy));
  const [mes, setMes] = useState<MesVisto>(() => mesDeSemana(lunesDe(p.fecha || p.hoy)));

  // "Ver mes" nunca abre un mes que queda entero fuera de lo reservable (el jueves de la semana puede caer en otro mes)
  const acotarMes = (m: MesVisto): MesVisto => {
    const h = deIso(p.hoy);
    const t = deIso(sumarDias(p.hoy, DIAS_MAXIMOS));
    const n = m.anio * 12 + m.mes;
    if (n < h.getFullYear() * 12 + h.getMonth()) return { anio: h.getFullYear(), mes: h.getMonth() };
    if (n > t.getFullYear() * 12 + t.getMonth()) return { anio: t.getFullYear(), mes: t.getMonth() };
    return m;
  };

  const flechas = vista === 'semana' ? flechasSemana(lunes, p.hoy) : flechasMes(mes, p.hoy);
  const unidad = vista === 'semana' ? 'Semana' : 'Mes';
  const mover = (n: -1 | 1) => (vista === 'semana' ? setLunes((l) => sumarDias(l, 7 * n)) : setMes((m) => sumarMeses(m, n)));
  const alternarVista = () => {
    if (vista === 'semana') {
      setMes(acotarMes(mesDeSemana(lunes)));
      setVista('mes');
    } else {
      setVista('semana');
    }
  };
  const elegir = (iso: string) => {
    p.onFecha(iso);
    // al elegir en el mes, se vuelve a la semana de ese día
    if (vista === 'mes') {
      setLunes(lunesDe(iso));
      setVista('semana');
    }
  };

  const boton = (d: Dia, clase: string, contenido: ReactNode) => (
    <button key={d.iso} type="button"
      className={`${clase} ${d.iso === p.fecha ? 'is-on' : ''} ${d.esHoy ? 'is-hoy' : ''}`}
      disabled={d.motivo !== null} aria-pressed={d.iso === p.fecha}
      aria-label={`${fechaLarga(d.iso)}${d.motivo ? `, ${MOTIVO[d.motivo]}` : ''}`}
      onClick={() => elegir(d.iso)}>
      {contenido}
    </button>
  );

  const manana = p.horarios.filter((h) => h.hora < '12:00');
  const tarde = p.horarios.filter((h) => h.hora >= '12:00');

  return (
    <>
      <div className="s-cal-h">
        <button type="button" className="s-cal-arr" onClick={() => mover(-1)} disabled={!flechas.anterior}
          aria-label={`${unidad} anterior`}>‹</button>
        <button type="button" className="s-cal-mes" onClick={alternarVista}>
          <b>{etiquetaMes(vista === 'semana' ? mesDeSemana(lunes) : mes)}</b>
          <span>{vista === 'semana' ? 'Ver mes' : 'Ver semana'}</span>
        </button>
        <button type="button" className="s-cal-arr" onClick={() => mover(1)} disabled={!flechas.siguiente}
          aria-label={`${unidad} siguiente`}>›</button>
      </div>

      {vista === 'semana' ? (
        <div className="s-dias" role="group" aria-label="Días de la semana">
          {semana(lunes, p.hoy).map((d) => boton(d, 's-dia', (
            <>
              <small>{d.corto}</small>
              <b>{d.numero}</b>
              <em>{d.motivo === 'domingo' ? 'Cerrado' : d.mes}</em>
            </>
          )))}
        </div>
      ) : (
        <div className="s-mescal" role="group" aria-label={etiquetaMes(mes)}>
          {INICIALES.map((x, i) => <span key={`dow-${i}`} className="s-mescal-dow" aria-hidden="true">{x}</span>)}
          {mesEnCuadricula(mes, p.hoy).map((d, i) => (d ? boton(d, 's-mdia', d.numero) : <span key={`h-${i}`} />))}
        </div>
      )}

      <div className="s-horas">
        {!p.fecha ? (
          <p className="s-hint">Elige un día para ver las horas libres. Puedes moverte por semanas con las flechas o ver el mes completo.</p>
        ) : p.cargando ? (
          <p className="s-hint" role="status">Buscando horarios disponibles…</p>
        ) : p.sinHuecos ? (
          <p className="s-aviso" role="status">
            {p.variosServicios
              ? 'Ese día no hay un hueco donde quepan todos los servicios seguidos. Prueba otra fecha o quita alguno.'
              : 'No hay horarios libres para esta fecha. Prueba otro día.'}
          </p>
        ) : (
          <>
            <Grupo titulo="Mañana" horas={manana} hora={p.hora} onHora={p.onHora} />
            <Grupo titulo="Tarde" horas={tarde} hora={p.hora} onHora={p.onHora} />
            <p className="s-hint">Si eliges “Cualquiera”, te damos la primera especialista libre.</p>
          </>
        )}
      </div>
    </>
  );
}

function Grupo({ titulo, horas, hora, onHora }: {
  titulo: string; horas: Horario[]; hora: string; onHora: (hora: string) => void;
}) {
  if (!horas.length) return null;
  return (
    <div className="s-horas-g">
      <h3>{titulo}</h3>
      <div className="s-slots">
        {horas.map((h) => (
          <button key={h.hora} type="button" className={`s-slot ${h.hora === hora ? 'is-on' : ''}`}
            disabled={!h.plan} aria-pressed={h.hora === hora} onClick={() => onHora(h.hora)}>
            {format12h(h.hora)}
            {!h.plan && <span className="s-sr"> (ocupada)</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
