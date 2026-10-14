import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, Package, Pencil, Plus, Power, Search, Trash2, Users, X } from 'lucide-react';
import { useServiceStore, type Service, type ServiceCategory } from '../../store/serviceStore';
import { useStaffStore } from '../../store/staffStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import { useAhora } from '../../lib/useAhora';
import { duracionTexto } from '../../site/reservar/resumen';
import MenuAcciones from '../../components/MenuAcciones';
import Confirmar from '../../components/Confirmar';
import { CATEGORIAS } from './agendar/reglas';
import { primerNombre } from './citas/proximaCita';
import { ORDEN_CATEGORIAS, catalogoAgrupado, conItbis, quienLoHace, usoDeServicios } from './negocio/catalogo';
import EditarServicio from './negocio/EditarServicio';
import './negocio/Negocio.css';
import './Services.css';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

/**
 * Servicios: el catálogo del salón por categoría. De cada uno, cuánto dura y cuesta, quién lo hace (un servicio que
 * nadie hace no se puede agendar), cuánto se usa y en qué paquetes está. Se busca escribiendo, sin tildes.
 */
export default function Services() {
  const { services, packages, clientPackages, fetchAll, updateService, deleteService } = useServiceStore();
  const staff = useStaffStore((s) => s.staff);
  const appointments = useAppointmentStore((s) => s.appointments);
  const esAdmin = useAuthStore((s) => s.user?.role) === 'admin';
  const { hoy } = useAhora();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const [categoria, setCategoria] = useState<ServiceCategory | 'todas'>('todas');
  const [texto, setTexto] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  // null: cerrado; 'nuevo' o el servicio que se edita
  const [editando, setEditando] = useState<Service | 'nuevo' | null>(null);
  const [borrando, setBorrando] = useState<Service | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const grupos = useMemo(() => catalogoAgrupado(services, texto, categoria, verInactivos), [services, texto, categoria, verInactivos]);
  const uso = useMemo(() => usoDeServicios(appointments, services, hoy), [appointments, services, hoy]);
  const activos = services.filter((s) => s.active);
  const inactivos = services.length - activos.length;
  const cuantos = (c: ServiceCategory | 'todas') =>
    services.filter((s) => (verInactivos || s.active) && (c === 'todas' || s.category === c)).length;
  const sinNadie = activos.filter((s) => quienLoHace(s.id, staff).length === 0).length;

  const activar = async (s: Service) => {
    if (await updateService(s.id, { active: !s.active })) {
      toast.success(s.active ? `${s.name}: desactivado, ya no sale para agendar` : `${s.name}: activo otra vez`);
    }
  };

  const eliminar = async () => {
    if (!borrando) return;
    setOcupado(true);
    const ok = await deleteService(borrando.id);
    setOcupado(false);
    if (ok) {
      toast.success(`${borrando.name} eliminado`);
      setBorrando(null);
    }
  };

  const usoDe = (s: Service) => uso.get(s.id) ?? { hechos: 0, agendados: 0 };

  return (
    <div className="neg servs">
      <header className="neg__cabeza">
        <div>
          <h1 className="neg__titulo">Servicios</h1>
          <p className="neg__sub">
            {activos.length === 1 ? '1 servicio activo' : `${activos.length} servicios activos`}
            {inactivos > 0 && ` · ${inactivos} inactivo${inactivos === 1 ? '' : 's'}`}
          </p>
        </div>
        {esAdmin && (
          <div className="neg__botones">
            <button type="button" className="neg__btn neg__btn--principal" onClick={() => setEditando('nuevo')}>
              <Plus size={18} aria-hidden="true" /> Nuevo servicio
            </button>
          </div>
        )}
      </header>

      {sinNadie > 0 && (
        <p className="neg__aviso" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          {sinNadie === 1 ? 'Hay 1 servicio activo que nadie del equipo hace' : `Hay ${sinNadie} servicios activos que nadie del equipo hace`}: no se
          pueden agendar hasta que alguien lo haga. Búscalos con la etiqueta «Nadie lo hace».
        </p>
      )}

      <div className="neg__barra">
        <label className="neg__buscar">
          <Search size={18} aria-hidden="true" />
          <span className="neg__oculto">Buscar servicio</span>
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar servicio (cejas, láser…)" />
          {texto && (
            <button type="button" className="neg__borrar" onClick={() => setTexto('')} aria-label="Borrar la búsqueda"><X size={18} /></button>
          )}
        </label>
        {inactivos > 0 && (
          <label className="neg__ver">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
            Ver también los inactivos
          </label>
        )}
      </div>

      <div className="neg__chips" role="group" aria-label="Categoría">
        {(['todas', ...ORDEN_CATEGORIAS] as const).map((c) => (
          <button key={c} type="button" className={`neg__chip ${categoria === c ? 'is-on' : ''}`} aria-pressed={categoria === c}
            onClick={() => setCategoria(c)}>
            {c === 'todas' ? 'Todas' : CATEGORIAS[c]} <b>{cuantos(c)}</b>
          </button>
        ))}
      </div>

      {grupos.length === 0 ? (
        <div className="neg__vacio">
          <Search size={32} aria-hidden="true" />
          <p>{texto ? `No hay servicios con «${texto}».` : 'No hay servicios en esta categoría.'}</p>
          {esAdmin && !texto && (
            <button type="button" className="neg__btn neg__btn--principal" onClick={() => setEditando('nuevo')}>
              <Plus size={18} aria-hidden="true" /> Nuevo servicio
            </button>
          )}
        </div>
      ) : grupos.map((g) => (
        <section key={g.categoria} className="servs__grupo" aria-labelledby={`cat-${g.categoria}`}>
          <h2 id={`cat-${g.categoria}`} className="neg__seccion-tit">{g.titulo} · {g.servicios.length}</h2>
          <ul className="neg__grilla servs__lista">
            {g.servicios.map((s) => {
              const quien = quienLoHace(s.id, staff);
              const u = usoDe(s);
              const paquetes = packages.filter((p) => p.serviceId === s.id);
              const paquetesActivos = clientPackages.filter((cp) =>
                paquetes.some((p) => p.id === cp.packageId) && cp.status === 'active' && cp.usedSessions < cp.totalSessions).length;
              return (
                <li key={s.id} className={`neg__tarjeta serv ${s.active ? '' : 'is-apagada'}`}>
                  <div className="serv__cabeza">
                    <h3 className="serv__nombre">{s.name}</h3>
                    {esAdmin && (
                      <MenuAcciones etiqueta={`Más acciones para ${s.name}`} items={[
                        { id: 'activar', etiqueta: s.active ? 'Desactivar (no se agenda más)' : 'Activar', icono: <Power size={16} />, onSelect: () => activar(s) },
                        { id: 'eliminar', etiqueta: 'Eliminar', icono: <Trash2 size={16} />, peligro: true, onSelect: () => setBorrando(s) },
                      ]} />
                    )}
                  </div>

                  <div className="serv__etiquetas">
                    {!s.active && <span className="neg__etiqueta">Inactivo</span>}
                    {s.active && quien.length === 0 && <span className="neg__etiqueta neg__etiqueta--alerta">Nadie lo hace</span>}
                    {s.hasSession && <span className="neg__etiqueta neg__etiqueta--suave"><Package size={12} aria-hidden="true" /> Por sesiones</span>}
                    {s.taxable && <span className="neg__etiqueta neg__etiqueta--suave">+ ITBIS</span>}
                  </div>

                  {s.description && <p className="serv__desc">{s.description}</p>}

                  <div className="serv__precio">
                    <b>{rd(s.price)}</b>
                    {s.taxable && <small>{rd(conItbis(s.price))} con ITBIS</small>}
                    <span><Clock size={14} aria-hidden="true" /> {duracionTexto(s.duration)}</span>
                  </div>

                  <dl className="serv__datos">
                    <div>
                      <dt><Users size={14} aria-hidden="true" /> Lo hacen</dt>
                      <dd>{quien.length === 0 ? 'Nadie todavía' : quien.length > 3
                        ? `${quien.slice(0, 3).map((m) => primerNombre(m.name)).join(', ')} y ${quien.length - 3} más`
                        : quien.map((m) => primerNombre(m.name)).join(', ')}</dd>
                    </div>
                    <div>
                      <dt>Últimos 30 días</dt>
                      <dd>{u.hechos === 1 ? '1 vez' : `${u.hechos} veces`}{u.agendados > 0 && ` · ${u.agendados} agendado${u.agendados === 1 ? '' : 's'}`}</dd>
                    </div>
                    {paquetes.length > 0 && (
                      <div>
                        <dt><Package size={14} aria-hidden="true" /> Paquetes</dt>
                        <dd>{paquetes.length === 1 ? '1 tipo' : `${paquetes.length} tipos`}{paquetesActivos > 0 && ` · ${paquetesActivos} activo${paquetesActivos === 1 ? '' : 's'}`}</dd>
                      </div>
                    )}
                  </dl>

                  {esAdmin && (
                    <div className="neg__acciones">
                      <button type="button" className="neg__btn neg__btn--chico" onClick={() => setEditando(s)}>
                        <Pencil size={16} aria-hidden="true" /> Editar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {editando && (
        <EditarServicio servicio={editando === 'nuevo' ? null : editando} categoria={categoria === 'todas' ? null : categoria}
          onCerrar={() => setEditando(null)} />
      )}

      {borrando && (
        <Confirmar titulo={`¿Eliminar ${borrando.name}?`} boton="Eliminar servicio" peligro ocupado={ocupado}
          onSi={eliminar} onNo={() => setBorrando(null)}>
          {usoDe(borrando).agendados > 0 && (
            <p>Tiene {usoDe(borrando).agendados === 1 ? '1 cita agendada' : `${usoDe(borrando).agendados} citas agendadas`}: esas citas
              se quedan como están.</p>
          )}
          <p>Si solo quieres dejar de ofrecerlo, mejor desactívalo: no se pierde nada y se puede volver a activar.</p>
        </Confirmar>
      )}
    </div>
  );
}
