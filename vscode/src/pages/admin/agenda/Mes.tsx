import { mesEnCuadricula, type MesVisto } from '../../../site/reservar/calendario';
import { fechaTitulo } from '../../../site/reservar/resumen';
import { horasTexto } from '../hoy/dia';
import type { DiaDelMes } from './reglas';

const INICIALES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface Props {
  mes: MesVisto;
  hoy: string;
  resumen: Map<string, DiaDelMes>;
  onDia: (fecha: string) => void;
}

/** El mes: cada día con cuántas citas tiene, cuántas faltan por confirmar y cuánto queda libre (la barra se llena
 *  con lo ocupado). Se toca un día para verlo. */
export default function Mes({ mes, hoy, resumen, onDia }: Props) {
  return (
    <div className="ag-mes" role="grid" aria-label="Días del mes">
      {INICIALES.map((d) => <span key={d} className="ag-mes__dow" aria-hidden="true">{d}</span>)}
      {mesEnCuadricula(mes, hoy).map((d, i) => {
        if (!d) return <span key={`h-${i}`} className="ag-mes__hueco" />;
        const r = resumen.get(d.iso);
        const cerrado = !r?.abierto && !r?.citas;
        const pasado = d.iso < hoy;
        const ocupado = r && r.minutosTrabajo > 0 ? 1 - r.minutosLibres / r.minutosTrabajo : 0;
        const etiqueta = `${fechaTitulo(d.iso)}${d.esHoy ? ', hoy' : ''}: ${cerrado ? 'cerrado' : `${r?.citas ?? 0} citas`}`
          + `${r?.porConfirmar ? `, ${r.porConfirmar} por confirmar` : ''}${!pasado && r?.minutosLibres ? `, ${horasTexto(r.minutosLibres)} libres` : ''}`;
        return (
          <button key={d.iso} type="button" role="gridcell" aria-label={etiqueta}
            className={`ag-mes__dia ${d.esHoy ? 'is-hoy' : ''} ${pasado ? 'is-pasado' : ''} ${cerrado ? 'is-cerrado' : ''}`}
            onClick={() => onDia(d.iso)}>
            <b>{d.numero}</b>
            {cerrado ? <small>Cerrado</small> : (
              <>
                <small>{r?.citas ? `${r.citas} ${r.citas === 1 ? 'cita' : 'citas'}` : 'Sin citas'}</small>
                {!!r?.porConfirmar && <em>{r.porConfirmar} por confirmar</em>}
                {!pasado && r && r.minutosTrabajo > 0 && (
                  <i className="ag-mes__barra" aria-hidden="true"><i style={{ width: `${Math.round(ocupado * 100)}%` }} /></i>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
