import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, FileText, Printer } from 'lucide-react';
import { useBillingStore } from '../../store/billingStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { useStaffStore } from '../../store/staffStore';
import { useClientStore } from '../../store/clientStore';
import { useAuthStore } from '../../store/authStore';
import { useAhora } from '../../lib/useAhora';
import { FACTURACION_NCF } from '../../lib/modulos';
import { atiendeClientas } from '../../lib/quienAtiende';
import { primerNombre } from './citas/proximaCita';
import {
  mejoresClientas, moverPeriodo, origenDeCitas, porCategoria, porEspecialista, porHora, rangoDe, resumenDelPeriodo,
  serviciosMasHechos, tituloPeriodo, variacion, type Periodo, type Resumen,
} from './negocio/reportes';
import { paquetesVendidos, resumenPaquetes } from './negocio/paquetes';
import { datosQueFaltan, type Filtro } from './clientes/ficha';
import './negocio/Negocio.css';
import './Reports.css';

const rd = (n: number) => `RD$ ${Math.round(n).toLocaleString('es-DO')}`;
const PERIODOS: [Periodo, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']];
const ESTE: Record<Periodo, string> = { dia: 'Hoy', semana: 'Esta semana', mes: 'Este mes', anio: 'Este año' };
const FRENTE: Record<Periodo, string> = { dia: 'frente al día anterior', semana: 'frente a la semana anterior', mes: 'frente al mes anterior', anio: 'frente al año anterior' };
const hora12 = (h: number) => `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));

/** "↑ 12 %" frente al periodo anterior (o nada si antes no hubo con qué comparar). */
function Cambio({ actual, antes, periodo }: { actual: number; antes: number; periodo: Periodo }) {
  const v = variacion(actual, antes);
  if (v === null) return null;
  const Icono = v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : ArrowRight;
  return (
    <small className={v > 0 ? 'neg__sube' : v < 0 ? 'neg__baja' : 'neg__igual'} title={FRENTE[periodo]}>
      <Icono size={14} aria-hidden="true" /> {v > 0 ? '+' : ''}{v} %<span className="neg__oculto"> {FRENTE[periodo]}</span>
    </small>
  );
}

function Barras({ filas, vacio }: { filas: { clave: string; nombre: React.ReactNode; valor: number; texto: string }[]; vacio: string }) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  if (filas.length === 0) return <p className="reps__vacio">{vacio}</p>;
  return (
    <ul className="neg__barras">
      {filas.map((f) => (
        <li key={f.clave}>
          <div className="neg__barras-txt"><span>{f.nombre}</span><b>{f.texto}</b></div>
          <div className="neg__barra-pista"><i style={{ width: `${Math.max(2, Math.round((f.valor / max) * 100))}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Reportes: cómo le fue al salón en un día, una semana, un mes o un año, comparado con el periodo anterior; de todo el
 * salón o de una especialista. Lo cobrado sale de las citas completadas (cada servicio para quien lo hizo). La
 * especialista ve solo lo suyo. Se descarga en Excel o se imprime. Arriba, si hay fichas a las que les falta el teléfono,
 * el cumpleaños o la dirección, cuántas son (y cada número lleva a esas clientas).
 */
export default function Reports() {
  const user = useAuthStore((s) => s.user);
  const { invoices, fetchAll: fetchBilling } = useBillingStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { services, clientPackages, fetchAll: fetchServices } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const { clients, fetchClients } = useClientStore();
  const navigate = useNavigate();
  const { hoy } = useAhora();
  const esEspecialista = user?.role === 'specialist';
  const esAdmin = user?.role === 'admin';

  useEffect(() => {
    if (FACTURACION_NCF) fetchBilling(); // las facturas solo alimentan formas de pago y DGII
    fetchAppointments();
    fetchServices();
    fetchStaff().catch(() => { /* el equipo ya lo cargó el panel */ });
    if (!esEspecialista) fetchClients();
  }, [fetchBilling, fetchAppointments, fetchServices, fetchStaff, fetchClients, esEspecialista]);

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [fecha, setFecha] = useState(hoy);
  const [elegida, setElegida] = useState<string | null>(null);
  // la especialista, solo lo suyo
  const quien = esEspecialista ? user?.name ?? '' : elegida;

  const rango = rangoDe(periodo, fecha);
  const rangoAntes = rangoDe(periodo, moverPeriodo(periodo, fecha, -1));
  const esteEs = rango.desde <= hoy && hoy <= rango.hasta;
  const enElFuturo = rango.desde > hoy;

  const equipo = useMemo(() => staff.filter((m) => m.active && atiendeClientas(m)).sort((a, b) => a.name.localeCompare(b.name, 'es')), [staff]);
  const r = resumenDelPeriodo(appointments, services, rango, quien);
  const antes = resumenDelPeriodo(appointments, services, rangoAntes, quien);
  const especialistas = porEspecialista(appointments, services, quien ? staff.filter((m) => m.name.trim().toLowerCase() === quien.trim().toLowerCase()) : staff, rango);
  const categorias = porCategoria(appointments, services, rango, quien);
  const masHechos = serviciosMasHechos(appointments, services, rango, quien);
  const clientas = mejoresClientas(appointments, services, rango);
  const horas = porHora(appointments, services, rango, quien);
  const origen = origenDeCitas(appointments, rango, quien);
  const paquetes = resumenPaquetes(paquetesVendidos(clientPackages, appointments, hoy));
  const titulo = tituloPeriodo(periodo, fecha);
  const comisionMia = esEspecialista ? especialistas[0]?.comision ?? 0 : 0;
  const faltan = datosQueFaltan(clients);
  const fichasIncompletas = ([
    ['sin-telefono', faltan.telefono, 'sin teléfono'], ['sin-cumple', faltan.cumple, 'sin cumpleaños'], ['sin-direccion', faltan.direccion, 'sin dirección'],
  ] as [Filtro, number, string][]).filter(([, n]) => n > 0);
  const pagadas = FACTURACION_NCF ? invoices.filter((i) => i.status === 'paid' && i.createdAt.slice(0, 10) >= rango.desde && i.createdAt.slice(0, 10) <= rango.hasta) : [];

  const cambiarPeriodo = (p: Periodo) => { setPeriodo(p); setFecha(esteEs ? hoy : rango.desde); };

  const filasResumen = (x: Resumen): [string, string][] => [
    ['Citas completadas', String(x.completadas)],
    ...(esEspecialista ? [] : [['Cobrado (citas completadas)', rd(x.ingresos)] as [string, string]]),
    ['Promedio por cita', rd(x.ticket)],
    ['Clientas atendidas', String(x.atendidas)],
    ['Por primera vez', String(x.primeraVez)],
    ['Volvieron', String(x.volvieron)],
    ['No vinieron', String(x.noVino)],
    ['Canceladas', String(x.canceladas)],
  ];

  const descargarExcel = () => {
    const celda = (t: string | number) => `"${String(t).replace(/"/g, '""')}"`;
    const filas: (string | number)[][] = [
      [`Reporte · Anadsll Beauty Esthetic${quien ? ` · ${quien}` : ''}`], ['Periodo', titulo], ['Generado', new Date().toLocaleString('es-DO')], [],
      ['RESUMEN', 'Este periodo', FRENTE[periodo].replace('frente', 'Frente')],
      ...filasResumen(r).map(([k, v], i) => [k, v, filasResumen(antes)[i][1]]),
      [], ['POR ESPECIALISTA', 'Citas', ...(esEspecialista ? [] : ['Cobrado']), '% comisión', 'Comisión'],
      ...especialistas.map((e) => [e.miembro.name, e.citas, ...(esEspecialista ? [] : [e.ingresos]), e.miembro.commissionPct, e.comision]),
      [], ['POR CATEGORÍA', 'Servicios', 'Cobrado'], ...categorias.map((c) => [c.nombre, c.cantidad, c.monto]),
      [], ['LO MÁS HECHO', 'Veces', 'Cobrado'], ...masHechos.map((c) => [c.nombre, c.cantidad, c.monto]),
      ...(esEspecialista ? [] : [[], ['MEJORES CLIENTAS', 'Citas', 'Dejó'], ...clientas.map((c) => [c.nombre, c.cantidad, c.monto])]),
    ];
    const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${periodo}_${rango.desde}${quien ? `_${quien.replace(/\s+/g, '-')}` : ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte descargado');
  };

  const imprimir = () => {
    const v = window.open('', '_blank');
    if (!v) {
      toast.error('Permite las ventanas emergentes para imprimir el reporte');
      return;
    }
    const tabla = (cab: string[], filas: (string | number)[][]) =>
      `<table><thead><tr>${cab.map((c) => `<th>${escapar(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${escapar(String(x))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    v.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte · ${escapar(titulo)}</title><style>
      body{font-family:Outfit,Arial,sans-serif;padding:32px;color:#2b2b2b}
      h1{font-family:'Playfair Display',Georgia,serif;font-weight:500;color:#4a342a;margin:0 0 4px}
      .meta{color:#6b7280;margin-bottom:24px}
      h2{font-size:1.05rem;color:#4a342a;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-top:26px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{text-align:left;font-size:.78rem;text-transform:uppercase;color:#6b7280;padding:8px;border-bottom:2px solid #e5e7eb}
      td{padding:8px;border-bottom:1px solid #f0ebe4;font-size:.9rem}
      @media print{table{page-break-inside:avoid}}
    </style></head><body>
      <h1>Reporte${quien ? ` de ${escapar(quien)}` : ''}</h1>
      <div class="meta">Anadsll Beauty Esthetic · ${escapar(titulo)} · generado el ${escapar(new Date().toLocaleString('es-DO'))}</div>
      <h2>Resumen</h2>${tabla(['', 'Este periodo', FRENTE[periodo].replace('frente', 'Frente')], filasResumen(r).map(([k, x], i) => [k, x, filasResumen(antes)[i][1]]))}
      <h2>Por especialista</h2>${tabla(['Especialista', 'Citas', ...(esEspecialista ? [] : ['Cobrado']), '% comisión', 'Comisión'],
        especialistas.map((e) => [e.miembro.name, e.citas, ...(esEspecialista ? [] : [rd(e.ingresos)]), `${e.miembro.commissionPct} %`, rd(e.comision)]))}
      <h2>Por categoría</h2>${tabla(['Categoría', 'Servicios', 'Cobrado'], categorias.map((c) => [c.nombre, c.cantidad, rd(c.monto)]))}
      <h2>Lo más hecho</h2>${tabla(['Servicio', 'Veces', 'Cobrado'], masHechos.map((c) => [c.nombre, c.cantidad, rd(c.monto)]))}
      ${esEspecialista ? '' : `<h2>Mejores clientas</h2>${tabla(['Clienta', 'Citas', 'Dejó'], clientas.map((c) => [c.nombre, c.cantidad, rd(c.monto)]))}`}
      <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
    </body></html>`);
    v.document.close();
  };

  const generar607 = () => {
    const mes = rango.desde.slice(0, 7);
    const filas = ['RNC/Cédula|Tipo ID|NCF|NCF Modificado|Tipo Ingreso|Fecha Comprobante|Fecha Retención|Monto Facturado|ITBIS Facturado'];
    invoices.filter((i) => i.createdAt.startsWith(mes) && i.status === 'paid').forEach((i) => {
      filas.push(`${i.clientCedula}|1|${i.ncf}||01|${i.createdAt.slice(0, 10).replace(/-/g, '')}||${i.subtotal}|${i.totalItbis}`);
    });
    const url = URL.createObjectURL(new Blob([filas.join('\n')], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `607_${mes}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Formato DGII 607 generado');
  };

  const maxHora = Math.max(1, ...horas.map((h) => h.cantidad));
  const totalOrigen = origen.enLinea + origen.enSalon;

  return (
    <div className="neg reps">
      <header className="neg__cabeza">
        <div>
          <h1 className="neg__titulo">{esEspecialista ? 'Mis reportes' : 'Reportes'}</h1>
          <p className="neg__sub">{esEspecialista ? 'Lo que has hecho y tu comisión' : 'Cómo le va al salón, comparado con el periodo anterior'}</p>
        </div>
        <div className="neg__botones">
          <button type="button" className="neg__btn" onClick={descargarExcel}><Download size={18} aria-hidden="true" /> Excel</button>
          <button type="button" className="neg__btn" onClick={imprimir}><Printer size={18} aria-hidden="true" /> Imprimir</button>
        </div>
      </header>

      {!esEspecialista && fichasIncompletas.length > 0 && (
        <div className="neg__aviso reps__fichas">
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <p className="reps__fichas-tit">Fichas incompletas de {clients.length === 1 ? '1 clienta' : `${clients.length} clientas`}</p>
            <ul className="reps__fichas-lista">
              {fichasIncompletas.map(([f, n, texto]) => (
                <li key={f}>
                  <button type="button" className="reps__fichas-btn" onClick={() => navigate('/admin/clientes', { state: { filtro: f } })}>
                    <b>{n}</b> {texto}
                  </button>
                </li>
              ))}
            </ul>
            {faltan.telefono > 0 && <p className="reps__fichas-por">Sin teléfono no se les puede escribir ni recordar sus citas.</p>}
          </div>
        </div>
      )}

      <div className="reps__barra">
        <div className="reps__periodos" role="group" aria-label="Periodo">
          {PERIODOS.map(([p, nombre]) => (
            <button key={p} type="button" className={periodo === p ? 'is-on' : ''} aria-pressed={periodo === p} onClick={() => cambiarPeriodo(p)}>{nombre}</button>
          ))}
        </div>
        <div className="reps__nav">
          <button type="button" className="neg__icono" onClick={() => setFecha(moverPeriodo(periodo, fecha, -1))} aria-label="Periodo anterior"><ChevronLeft size={20} /></button>
          <h2 className="reps__titulo" aria-live="polite">{titulo}</h2>
          <button type="button" className="neg__icono" onClick={() => setFecha(moverPeriodo(periodo, fecha, 1))} aria-label="Periodo siguiente"><ChevronRight size={20} /></button>
          {!esteEs && <button type="button" className="neg__btn neg__btn--chico" onClick={() => setFecha(hoy)}>{ESTE[periodo]}</button>}
        </div>
      </div>

      {!esEspecialista && equipo.length > 0 && (
        <div className="neg__chips" role="group" aria-label="De quién">
          <button type="button" className={`neg__chip ${!elegida ? 'is-on' : ''}`} aria-pressed={!elegida} onClick={() => setElegida(null)}>Todo el salón</button>
          {equipo.map((m) => (
            <button key={m.id} type="button" className={`neg__chip ${elegida === m.name ? 'is-on' : ''}`} aria-pressed={elegida === m.name} onClick={() => setElegida(m.name)}>
              {primerNombre(m.name)}
            </button>
          ))}
        </div>
      )}

      {enElFuturo && <p className="neg__aviso">Este periodo todavía no llega: aquí solo cuenta lo que ya se completó.</p>}

      <div className="neg__resumen">
        {esEspecialista ? (
          <div className="neg__dato neg__dato--bien"><b>{rd(comisionMia)}</b><span>Tu comisión</span></div>
        ) : (
          <div className="neg__dato"><b>{rd(r.ingresos)}</b><span>Cobrado</span><Cambio actual={r.ingresos} antes={antes.ingresos} periodo={periodo} /></div>
        )}
        <div className="neg__dato"><b>{r.completadas}</b><span>Citas completadas</span><Cambio actual={r.completadas} antes={antes.completadas} periodo={periodo} /></div>
        <div className="neg__dato"><b>{rd(r.ticket)}</b><span>Promedio por cita</span><Cambio actual={r.ticket} antes={antes.ticket} periodo={periodo} /></div>
        <div className="neg__dato">
          <b>{r.atendidas}</b><span>Clientas atendidas</span>
          {r.atendidas > 0 && <small className="neg__igual">{r.primeraVez} por primera vez · {r.volvieron} volvieron</small>}
        </div>
        <div className={`neg__dato ${r.noVino > 0 ? 'neg__dato--alerta' : ''}`}>
          <b>{r.noVino}</b><span>No vinieron</span>
          {r.noVino > 0 && <small className="neg__igual">{Math.round((r.noVino / (r.noVino + r.completadas)) * 100)} % de las citas</small>}
        </div>
        <div className="neg__dato"><b>{r.canceladas}</b><span>Canceladas</span></div>
      </div>

      <div className="reps__grilla">
        {!quien && (
          <section className="neg__tarjeta reps__ancha" aria-labelledby="rep-esp">
            <h2 id="rep-esp" className="neg__seccion-tit">Por especialista</h2>
            {especialistas.length === 0 ? <p className="reps__vacio">No hay servicios completados en este periodo.</p> : (
              <ul className="reps__equipo">
                {especialistas.map((e) => (
                  <li key={e.miembro.id}>
                    <button type="button" className="reps__persona" onClick={() => setElegida(e.miembro.name)} aria-label={`Ver solo lo de ${e.miembro.name}`}>
                      {e.miembro.name}
                    </button>
                    <span><b>{e.citas}</b> citas</span>
                    <span><b>{rd(e.ingresos)}</b> cobrado</span>
                    <span><b>{e.miembro.commissionPct > 0 ? rd(e.comision) : '—'}</b> comisión{e.miembro.commissionPct > 0 && ` (${e.miembro.commissionPct} %)`}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="neg__tarjeta" aria-labelledby="rep-cat">
          <h2 id="rep-cat" className="neg__seccion-tit">Por categoría</h2>
          <Barras vacio="Sin servicios completados." filas={categorias.map((c) => ({ clave: c.clave, nombre: c.nombre, valor: c.monto, texto: `${rd(c.monto)} · ${c.cantidad === 1 ? '1 servicio' : `${c.cantidad} servicios`}` }))} />
        </section>

        <section className="neg__tarjeta" aria-labelledby="rep-mas">
          <h2 id="rep-mas" className="neg__seccion-tit">Lo más hecho</h2>
          <Barras vacio="Sin servicios completados." filas={masHechos.map((c) => ({ clave: c.clave, nombre: c.nombre, valor: c.cantidad, texto: c.cantidad === 1 ? '1 vez' : `${c.cantidad} veces` }))} />
        </section>

        {!esEspecialista && !quien && (
          <section className="neg__tarjeta" aria-labelledby="rep-cli">
            <h2 id="rep-cli" className="neg__seccion-tit">Las clientas que más dejaron</h2>
            <Barras vacio="Sin citas completadas." filas={clientas.map((c) => ({
              clave: c.clave,
              nombre: c.clientId ? <button type="button" className="reps__enlace" onClick={() => navigate(`/admin/clientes/${c.clientId}`)}>{c.nombre}</button> : c.nombre,
              valor: c.monto,
              texto: `${rd(c.monto)} · ${c.cantidad === 1 ? '1 cita' : `${c.cantidad} citas`}`,
            }))} />
          </section>
        )}

        <section className="neg__tarjeta" aria-labelledby="rep-horas">
          <h2 id="rep-horas" className="neg__seccion-tit">A qué hora se trabaja más</h2>
          <div className="reps__horas" role="img" aria-label={horas.filter((h) => h.cantidad > 0).map((h) => `${hora12(h.hora)}: ${h.cantidad}`).join(', ') || 'Sin servicios'}>
            {horas.map((h) => (
              <div key={h.hora} className="reps__hora">
                <span className="reps__hora-n">{h.cantidad || ''}</span>
                <div className="reps__hora-pista"><i style={{ height: `${Math.round((h.cantidad / maxHora) * 100)}%` }} /></div>
                <span className="reps__hora-h">{hora12(h.hora)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="neg__tarjeta" aria-labelledby="rep-origen">
          <h2 id="rep-origen" className="neg__seccion-tit">De dónde vinieron las citas</h2>
          {totalOrigen === 0 ? <p className="reps__vacio">Sin citas completadas.</p> : (
            <>
              <div className="reps__origen" aria-hidden="true">
                <i style={{ width: `${Math.round((origen.enLinea / totalOrigen) * 100)}%` }} />
              </div>
              <ul className="reps__leyenda">
                <li><i className="is-linea" aria-hidden="true" /> Reservaron en la web: <b>{origen.enLinea}</b> ({Math.round((origen.enLinea / totalOrigen) * 100)} %)</li>
                <li><i aria-hidden="true" /> En el salón o por teléfono: <b>{origen.enSalon}</b></li>
              </ul>
            </>
          )}
        </section>

        {!esEspecialista && (
          <section className="neg__tarjeta" aria-labelledby="rep-paq">
            <h2 id="rep-paq" className="neg__seccion-tit">Paquetes (hoy)</h2>
            <dl className="reps__paquetes">
              <div><dt>Activos</dt><dd>{paquetes.activos}</dd></div>
              <div><dt>Sin la próxima agendada</dt><dd>{paquetes.sinAgendar}</dd></div>
              <div><dt>Por cobrar</dt><dd>{rd(paquetes.porCobrar)}</dd></div>
            </dl>
            <div className="neg__acciones">
              <button type="button" className="neg__btn neg__btn--chico" onClick={() => navigate('/admin/paquetes')}>Ver paquetes</button>
            </div>
          </section>
        )}

        {FACTURACION_NCF && esAdmin && (
          <section className="neg__tarjeta" aria-labelledby="rep-fact">
            <h2 id="rep-fact" className="neg__seccion-tit">Facturación</h2>
            <p className="reps__vacio">{pagadas.length} facturas pagadas · {rd(pagadas.reduce((t, i) => t + i.total, 0))}</p>
            <div className="neg__acciones">
              <button type="button" className="neg__btn neg__btn--chico" onClick={generar607}><FileText size={16} aria-hidden="true" /> Formato 607 ({rango.desde.slice(0, 7)})</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
