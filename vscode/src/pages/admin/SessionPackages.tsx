import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarClock, CalendarPlus, CheckCircle2, MinusCircle, Package, Pencil, Plus, Power, Search, ShoppingBag, Trash2, User,
  Wallet, X,
} from 'lucide-react';
import { useServiceStore, type ClientPackage, type SessionPackage } from '../../store/serviceStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import { useClientStore } from '../../store/clientStore';
import { useAgendarStore } from '../../store/agendarStore';
import { useAhora } from '../../lib/useAhora';
import { format12h } from '../../lib/timeFormat';
import MenuAcciones, { type ItemMenu } from '../../components/MenuAcciones';
import Confirmar from '../../components/Confirmar';
import { sumarDias } from '../../site/reservar/calendario';
import { fechaCorta } from './agenda/reglas';
import { iniciales } from './clientes/ficha';
import {
  ETIQUETA_PAQUETE, catalogoDePaquetes, filtrarPaquetes, paquetesVendidos, resumenPaquetes, sigueActivo,
  type FiltroPaquetes, type PaqueteVendido,
} from './negocio/paquetes';
import VenderPaquete from './negocio/VenderPaquete';
import AbonosPaquete from './negocio/AbonosPaquete';
import EditarVendido from './negocio/EditarVendido';
import EditarTipoPaquete from './negocio/EditarTipoPaquete';
import './negocio/Negocio.css';
import './SessionPackages.css';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

const FILTROS: [FiltroPaquetes, string][] = [
  ['activos', 'Activos'], ['sinAgendar', 'Sin agendar'], ['conSaldo', 'Con saldo'], ['completados', 'Completados'], ['todos', 'Todos'],
];

type Pregunta =
  | { que: 'descontar'; v: PaqueteVendido }
  | { que: 'borrarVendido'; v: PaqueteVendido }
  | { que: 'borrarTipo'; tipo: SessionPackage };

/**
 * Paquetes: los que tiene cada clienta (cuántas sesiones le quedan, cuándo es la próxima, cuánto debe) y los tipos
 * que se venden. Lo primero que se ve son los activos, empezando por los que no tienen la próxima sesión agendada:
 * a esas clientas hay que llamarlas.
 */
export default function SessionPackages() {
  const {
    packages, clientPackages, services, fetchAll, updatePackage, deletePackage, useSession: descontarSesion, deleteClientPackage,
  } = useServiceStore();
  const appointments = useAppointmentStore((s) => s.appointments);
  const fetchClients = useClientStore((s) => s.fetchClients);
  const esAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const navigate = useNavigate();
  const { hoy } = useAhora();
  // desde la ficha de la clienta: "Vender paquete" (vender) o "Registrar abono" (pagos)
  const pedido = useLocation().state as { vender?: string; pagos?: string } | null;

  useEffect(() => { fetchAll(); fetchClients(); }, [fetchAll, fetchClients]);

  const [vista, setVista] = useState<'clientas' | 'tipos'>('clientas');
  const [filtro, setFiltro] = useState<FiltroPaquetes>('activos');
  const [texto, setTexto] = useState('');
  const [vendiendo, setVendiendo] = useState<{ clienta?: string; tipo?: string } | null>(() => (pedido?.vender ? { clienta: pedido.vender } : null));
  const [abonando, setAbonando] = useState<string | null>(() => pedido?.pagos ?? null);
  const [editando, setEditando] = useState<ClientPackage | null>(null);
  const [tipo, setTipo] = useState<SessionPackage | 'nuevo' | null>(null);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const vendidos = useMemo(() => paquetesVendidos(clientPackages, appointments, hoy), [clientPackages, appointments, hoy]);
  const resumen = useMemo(() => resumenPaquetes(vendidos), [vendidos]);
  const lista = useMemo(() => filtrarPaquetes(vendidos, filtro, texto), [vendidos, filtro, texto]);
  const tipos = useMemo(() => catalogoDePaquetes(packages, services, clientPackages), [packages, services, clientPackages]);
  const cuantos = (f: FiltroPaquetes) => filtrarPaquetes(vendidos, f, '').length;
  const cuando = (fecha: string) => (fecha === hoy ? 'hoy' : fecha === sumarDias(hoy, 1) ? 'mañana' : fechaCorta(fecha).toLowerCase());

  const responder = async () => {
    if (!pregunta) return;
    setOcupado(true);
    let ok = false;
    if (pregunta.que === 'descontar') {
      ok = await descontarSesion(pregunta.v.paquete.id);
      if (ok) toast.success(`Sesión descontada: le quedan ${pregunta.v.quedan - 1}`);
    } else if (pregunta.que === 'borrarVendido') {
      ok = await deleteClientPackage(pregunta.v.paquete.id);
      if (ok) toast.success('Paquete eliminado');
    } else {
      ok = await deletePackage(pregunta.tipo.id);
      if (ok) toast.success(`${pregunta.tipo.name} eliminado`);
    }
    setOcupado(false);
    if (ok) setPregunta(null);
  };

  const activarTipo = async (t: SessionPackage) => {
    if (await updatePackage(t.id, { active: !t.active })) toast.success(t.active ? `${t.name}: ya no se vende` : `${t.name}: se vende otra vez`);
  };

  const accionesDe = (v: PaqueteVendido): ItemMenu[] => {
    const p = v.paquete;
    const items: ItemMenu[] = [
      { id: 'abonos', etiqueta: 'Pagos y abonos', icono: <Wallet size={16} />, onSelect: () => setAbonando(p.id) },
      { id: 'ficha', etiqueta: 'Ver su ficha', icono: <User size={16} />, onSelect: () => navigate(`/admin/clientes/${p.clientId}`) },
      { id: 'editar', etiqueta: 'Corregir sesiones o notas', icono: <Pencil size={16} />, onSelect: () => setEditando(p) },
    ];
    if (sigueActivo(v)) items.push({ id: 'descontar', etiqueta: 'Descontar una sesión a mano', icono: <MinusCircle size={16} />, onSelect: () => setPregunta({ que: 'descontar', v }) });
    if (esAdmin) items.push({ id: 'borrar', etiqueta: 'Eliminar', icono: <Trash2 size={16} />, peligro: true, onSelect: () => setPregunta({ que: 'borrarVendido', v }) });
    return items;
  };

  return (
    <div className="neg paqs">
      <header className="neg__cabeza">
        <div>
          <h1 className="neg__titulo">Paquetes</h1>
          <p className="neg__sub">
            {resumen.activos === 1 ? '1 activo' : `${resumen.activos} activos`}
            {resumen.porCobrar > 0 && ` · ${rd(resumen.porCobrar)} por cobrar`}
          </p>
        </div>
        <div className="neg__botones">
          {esAdmin && vista === 'tipos' && (
            <button type="button" className="neg__btn" onClick={() => setTipo('nuevo')}>
              <Plus size={18} aria-hidden="true" /> Nuevo tipo
            </button>
          )}
          <button type="button" className="neg__btn neg__btn--principal" onClick={() => setVendiendo({})}>
            <ShoppingBag size={18} aria-hidden="true" /> Vender paquete
          </button>
        </div>
      </header>

      <div className="paqs__vistas" role="tablist" aria-label="Qué ver">
        <button type="button" role="tab" aria-selected={vista === 'clientas'} className={vista === 'clientas' ? 'is-on' : ''} onClick={() => setVista('clientas')}>
          De las clientas
        </button>
        <button type="button" role="tab" aria-selected={vista === 'tipos'} className={vista === 'tipos' ? 'is-on' : ''} onClick={() => setVista('tipos')}>
          Tipos de paquete <b>{packages.filter((p) => p.active).length}</b>
        </button>
      </div>

      {vista === 'clientas' ? (
        <>
          <div className="neg__resumen">
            <button type="button" className={`neg__dato ${filtro === 'activos' ? 'is-on' : ''}`} onClick={() => setFiltro('activos')} aria-pressed={filtro === 'activos'}>
              <b>{resumen.activos}</b><span>Activos</span>
            </button>
            <button type="button" className={`neg__dato ${resumen.sinAgendar ? 'neg__dato--alerta' : ''} ${filtro === 'sinAgendar' ? 'is-on' : ''}`}
              onClick={() => setFiltro('sinAgendar')} aria-pressed={filtro === 'sinAgendar'}>
              <b>{resumen.sinAgendar}</b><span>Sin la próxima agendada</span>
            </button>
            <button type="button" className={`neg__dato ${resumen.conSaldo ? 'neg__dato--alerta' : ''} ${filtro === 'conSaldo' ? 'is-on' : ''}`}
              onClick={() => setFiltro('conSaldo')} aria-pressed={filtro === 'conSaldo'}>
              <b>{rd(resumen.porCobrar)}</b><span>Por cobrar ({resumen.conSaldo})</span>
            </button>
            <button type="button" className={`neg__dato ${filtro === 'completados' ? 'is-on' : ''}`} onClick={() => setFiltro('completados')} aria-pressed={filtro === 'completados'}>
              <b>{resumen.completados}</b><span>Completados</span>
            </button>
          </div>

          <div className="neg__barra">
            <label className="neg__buscar">
              <Search size={18} aria-hidden="true" />
              <span className="neg__oculto">Buscar paquete</span>
              <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar clienta, paquete o servicio" />
              {texto && <button type="button" className="neg__borrar" onClick={() => setTexto('')} aria-label="Borrar la búsqueda"><X size={18} /></button>}
            </label>
            <div className="neg__chips" role="group" aria-label="Mostrar">
              {FILTROS.map(([f, nombre]) => (
                <button key={f} type="button" className={`neg__chip ${filtro === f ? 'is-on' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                  {nombre} <b>{cuantos(f)}</b>
                </button>
              ))}
            </div>
          </div>

          {lista.length === 0 ? (
            <div className="neg__vacio">
              <Package size={32} aria-hidden="true" />
              <p>{texto ? `Nada con «${texto}».` : filtro === 'sinAgendar' ? 'Todas tienen su próxima sesión agendada.' : filtro === 'conSaldo' ? 'Nadie debe nada.' : 'No hay paquetes aquí.'}</p>
            </div>
          ) : (
            <ul className="neg__grilla paqs__lista">
              {lista.map((v) => {
                const p = v.paquete;
                const activo = sigueActivo(v);
                return (
                  <li key={p.id} className={`neg__tarjeta paq ${activo ? '' : 'is-apagada'}`}>
                    <div className="paq__cabeza">
                      <span className="paq__ini" aria-hidden="true">{iniciales(p.clientName)}</span>
                      <div className="paq__quien">
                        <button type="button" className="paq__nombre" onClick={() => navigate(`/admin/clientes/${p.clientId}`)}>{p.clientName}</button>
                        <span>{p.packageName}{p.serviceName && p.serviceName !== p.packageName && ` · ${p.serviceName}`}</span>
                      </div>
                      <MenuAcciones etiqueta={`Más acciones para el paquete de ${p.clientName}`} items={accionesDe(v)} />
                    </div>

                    <div className="paq__sesiones">
                      <div className="paq__puntos" aria-hidden="true">
                        {Array.from({ length: Math.min(p.totalSessions, 50) }, (_, i) => (
                          <i key={i} className={i < p.usedSessions ? 'is-hecha' : i < p.usedSessions + v.agendadas ? 'is-agendada' : ''} />
                        ))}
                      </div>
                      <p>
                        <b>{p.usedSessions} de {p.totalSessions}</b> sesiones hechas
                        {activo && <> · le {v.quedan === 1 ? 'queda 1' : `quedan ${v.quedan}`}</>}
                      </p>
                    </div>

                    <div className="paq__etiquetas">
                      {v.estado !== 'activo' && (
                        <span className={`neg__etiqueta ${v.estado === 'ultima' ? 'neg__etiqueta--alerta' : v.estado === 'completado' ? 'neg__etiqueta--bien' : ''}`}>
                          {v.estado === 'completado' && <CheckCircle2 size={12} aria-hidden="true" />} {ETIQUETA_PAQUETE[v.estado]}
                        </span>
                      )}
                      {p.totalPrice > 0 && (v.saldo > 0
                        ? <span className="neg__etiqueta neg__etiqueta--alerta">Debe {rd(v.saldo)}</span>
                        : <span className="neg__etiqueta neg__etiqueta--bien">Pagado</span>)}
                    </div>

                    {activo && (
                      <p className={`paq__proxima ${v.proxima ? '' : 'is-falta'}`}>
                        <CalendarClock size={16} aria-hidden="true" />
                        {v.proxima
                          ? <>Próxima: <b>{cuando(v.proxima.date)}, {format12h(v.proxima.time)}</b>{v.agendadas > 1 && ` (+${v.agendadas - 1})`}</>
                          : 'Sin la próxima sesión agendada'}
                      </p>
                    )}
                    {p.notes && <p className="paq__notas">{p.notes}</p>}

                    <div className="neg__acciones">
                      {activo && v.agendadas < v.quedan && (
                        <button type="button" className={`neg__btn neg__btn--chico ${v.proxima ? '' : 'neg__btn--principal'}`}
                          onClick={() => abrirAgendar({ modo: 'paquete', paquete: p })}>
                          <CalendarPlus size={16} aria-hidden="true" /> Agendar sesión
                        </button>
                      )}
                      {v.saldo > 0 && (
                        <button type="button" className="neg__btn neg__btn--chico" onClick={() => setAbonando(p.id)}>
                          <Wallet size={16} aria-hidden="true" /> Abonar
                        </button>
                      )}
                      <span className="neg__espacio" />
                      {p.purchasedAt && <small className="paq__fecha">Desde el {fechaCorta(p.purchasedAt).toLowerCase()}</small>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : tipos.length === 0 ? (
        <div className="neg__vacio">
          <Package size={32} aria-hidden="true" />
          <p>Todavía no hay tipos de paquete.</p>
          {esAdmin && <button type="button" className="neg__btn neg__btn--principal" onClick={() => setTipo('nuevo')}><Plus size={18} aria-hidden="true" /> Nuevo tipo</button>}
        </div>
      ) : (
        <ul className="neg__grilla paqs__lista">
          {tipos.map((t) => (
            <li key={t.tipo.id} className={`neg__tarjeta ptipo ${t.tipo.active ? '' : 'is-apagada'}`}>
              <div className="paq__cabeza">
                <span className="ptipo__n" aria-hidden="true">{t.tipo.sessions}</span>
                <div className="paq__quien">
                  <h3 className="ptipo__nombre">{t.tipo.name}</h3>
                  <span>{t.tipo.serviceName} · {t.tipo.sessions} sesiones</span>
                </div>
                {esAdmin && (
                  <MenuAcciones etiqueta={`Más acciones para ${t.tipo.name}`} items={[
                    { id: 'editar', etiqueta: 'Editar', icono: <Pencil size={16} />, onSelect: () => setTipo(t.tipo) },
                    { id: 'activar', etiqueta: t.tipo.active ? 'Dejar de venderlo' : 'Venderlo otra vez', icono: <Power size={16} />, onSelect: () => activarTipo(t.tipo) },
                    { id: 'borrar', etiqueta: 'Eliminar', icono: <Trash2 size={16} />, peligro: true, onSelect: () => setPregunta({ que: 'borrarTipo', tipo: t.tipo }) },
                  ]} />
                )}
              </div>
              <div className="ptipo__precio">
                <b>{rd(t.tipo.price)}</b>
                <span>{rd(t.porSesion)} por sesión</span>
                {t.ahorro && <span className="neg__etiqueta neg__etiqueta--bien">Ahorra {t.ahorro} %</span>}
              </div>
              <p className="ptipo__vendidos">
                {!t.tipo.active && <span className="neg__etiqueta">No se vende</span>}{' '}
                {t.vendidos === 0 ? 'Todavía no se ha vendido' : `Vendido ${t.vendidos === 1 ? '1 vez' : `${t.vendidos} veces`} · ${t.activos} activo${t.activos === 1 ? '' : 's'}`}
              </p>
              {t.tipo.active && (
                <div className="neg__acciones">
                  <button type="button" className="neg__btn neg__btn--chico neg__btn--principal" onClick={() => setVendiendo({ tipo: t.tipo.id })}>
                    <ShoppingBag size={16} aria-hidden="true" /> Vender
                  </button>
                  {esAdmin && (
                    <button type="button" className="neg__btn neg__btn--chico" onClick={() => setTipo(t.tipo)}>
                      <Pencil size={16} aria-hidden="true" /> Editar
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {vendiendo && <VenderPaquete clienta={vendiendo.clienta} tipo={vendiendo.tipo} onCerrar={() => setVendiendo(null)} />}
      {abonando && <AbonosPaquete id={abonando} onCerrar={() => setAbonando(null)} />}
      {editando && <EditarVendido paquete={editando} onCerrar={() => setEditando(null)} />}
      {tipo && <EditarTipoPaquete tipo={tipo === 'nuevo' ? null : tipo} onCerrar={() => setTipo(null)} />}

      {pregunta?.que === 'descontar' && (
        <Confirmar titulo="¿Descontar una sesión a mano?" boton="Descontar 1 sesión" ocupado={ocupado} onSi={responder} onNo={() => setPregunta(null)}>
          <p>Las sesiones se descuentan solas al completar la cita. Descuenta a mano solo una sesión de {pregunta.v.paquete.clientName} que
            no quedó como cita en el panel.</p>
          <p>Le quedarían {pregunta.v.quedan - 1} de {pregunta.v.paquete.totalSessions}.</p>
        </Confirmar>
      )}
      {pregunta?.que === 'borrarVendido' && (
        <Confirmar titulo="¿Eliminar este paquete?" boton="Eliminar paquete" peligro ocupado={ocupado} onSi={responder} onNo={() => setPregunta(null)}>
          <p>Se borra el {pregunta.v.paquete.packageName} de {pregunta.v.paquete.clientName}, con sus sesiones. No se puede deshacer.</p>
        </Confirmar>
      )}
      {pregunta?.que === 'borrarTipo' && (
        <Confirmar titulo={`¿Eliminar ${pregunta.tipo.name}?`} boton="Eliminar tipo" peligro ocupado={ocupado} onSi={responder} onNo={() => setPregunta(null)}>
          <p>Si ya se vendió a alguna clienta no se puede borrar: déjalo de vender y sus paquetes siguen igual.</p>
        </Confirmar>
      )}
    </div>
  );
}
