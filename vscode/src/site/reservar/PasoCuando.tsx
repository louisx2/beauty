import { useEffect, useState, type ReactNode } from 'react';
import { format12h } from '../../lib/timeFormat';
import {
  etiquetaMes, flechasMes, flechasSemana, lunesDe, lunesParaMes, mesAcotado, mesDeSemana, mesEnCuadricula,
  primerDiaReservable, semana, sumarDias, sumarMeses,
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
  // sin día elegido, la tira abre en el primer día reservable (un domingo, la semana que sigue no está toda apagada)
  const [lunes, setLunes] = useState(() => lunesDe(p.fecha || primerDiaReservable(p.hoy)));
  const [mes, setMes] = useState<MesVisto>(() => mesDeSemana(lunesDe(p.fecha || primerDiaReservable(p.hoy))));
  // día de la tira que debe recibir el foco después de pintarse (al elegir en el mes, el botón tocado desaparece)
  const [enfocar, setEnfocar] = useState<string | null>(null);

  useEffect(() => {
    if (!enfocar) return;
    document.querySelector<HTMLButtonElement>(`[data-iso="${enfocar}"]`)?.focus();
    setEnfocar(null);
  }, [enfocar]);

  const flechas = vista === 'semana' ? flechasSemana(lunes, p.hoy) : flechasMes(mes, p.hoy);
  const unidad = vista === 'semana' ? 'Semana' : 'Mes';
  const mover = (n: -1 | 1) => (vista === 'semana' ? setLunes((l) => sumarDias(l, 7 * n)) : setMes((m) => sumarMeses(m, n)));
  const alternarVista = () => {
    if (vista === 'semana') {
      // "Ver mes" nunca abre un mes que queda fuera de lo reservable (el jueves de la semana puede caer en otro mes)
      setMes(mesAcotado(mesDeSemana(lunes), p.hoy));
      setVista('mes');
    } else {
      // "Ver semana" sigue al mes que se estaba mirando: si la semana no es de ese mes, va a una semana de ese mes
      const deLaSemana = mesDeSemana(lunes);
      if (deLaSemana.anio !== mes.anio || deLaSemana.mes !== mes.mes) setLunes(lunesParaMes(mes, p.hoy));
      setVista('semana');
    }
  };
  const elegir = (iso: string) => {
    p.onFecha(iso);
    // al elegir en el mes, se vuelve a la semana de ese día
    if (vista === 'mes') {
      setLunes(lunesDe(iso));
      setVista('semana');
      setEnfocar(iso);
    }
  };

  // el nombre accesible empieza con el texto visible ("Jue 1 oct") y sigue con el largo, así la voz del usuario coincide
  const nombreDia = (d: Dia) =>
    `${d.corto} ${d.numero} ${d.mes}, ${fechaLarga(d.iso)}${d.esHoy ? ', hoy' : ''}${d.motivo ? `, ${MOTIVO[d.motivo]}` : ''}`;

  const boton = (d: Dia, clase: string, contenido: ReactNode) => (
    <button key={d.iso} type="button"
      className={`${clase} ${d.iso === p.fecha ? 'is-on' : ''} ${d.esHoy ? 'is-hoy' : ''}`}
      data-iso={d.iso} disabled={d.motivo !== null} aria-pressed={d.iso === p.fecha}
      aria-label={nombreDia(d)}
      onClick={() => elegir(d.iso)}>
      {contenido}
    </button>
  );

  const manana = p.horarios.filter((h) => h.hora < '12:00');
  const tarde = p.horarios.filter((h) => h.hora >= '12:00');

  const textoSinHuecos = p.variosServicios
    ? 'Ese día no hay un hueco donde quepan todos los servicios seguidos. Prueba otra fecha o quita alguno.'
    : 'No hay horarios libres para esta fecha. Prueba otro día.';
  // un solo aviso para el lector de pantalla, siempre en la página: así sí se anuncian los cambios
  const libres = p.horarios.filter((h) => h.plan).length;
  const anuncio = !p.fecha
    ? ''
    : p.cargando
      ? 'Buscando horarios disponibles'
      : p.sinHuecos
        ? textoSinHuecos
        : `${libres} ${libres === 1 ? 'hora libre' : 'horas libres'} el ${fechaLarga(p.fecha)}`;

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
          <p className="s-hint">Buscando horarios disponibles…</p>
        ) : p.sinHuecos ? (
          <p className="s-aviso">{textoSinHuecos}</p>
        ) : (
          <>
            <Grupo titulo="Mañana" horas={manana} hora={p.hora} onHora={p.onHora} />
            <Grupo titulo="Tarde" horas={tarde} hora={p.hora} onHora={p.onHora} />
            <p className="s-hint">Si eliges “Cualquiera”, te damos la primera especialista libre.</p>
          </>
        )}
      </div>
      <p className="s-sr" aria-live="polite">{anuncio}</p>
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
