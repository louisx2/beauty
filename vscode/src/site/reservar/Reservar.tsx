import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { site } from '../../config/site';
import { servicesMenu } from '../../data/servicesMenu';
import { useHoy } from './useHoy';
import { validarDatos, type ErroresDatos } from './datos';
import { lineasResumen, textoBarra } from './resumen';
import { nombreVisible, serviciosParaReservar } from './servicios';
import { useBooking } from './useBooking';
import PasoServicios from './PasoServicios';
import PasoCuando from './PasoCuando';
import PasoDatos from './PasoDatos';
import { BarraReserva, ResumenVisita } from './ResumenVisita';
import Confirmacion from './Confirmacion';
import './Reservar.css';

const PASOS = ['Servicios', 'Día y hora', 'Tus datos'];

const suave = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
/** Lleva a un paso; las secciones ya dejan su margen bajo la barra (scroll-margin-top de .s-main section). */
const irA = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: suave(), block: 'start' });

/** /reservar en tres pasos en una sola página (spec §6.1), y la confirmación (spec §6.2). */
export default function Reservar() {
  const b = useBooking();
  const [params] = useSearchParams();
  const hoy = useHoy();
  const servicios = useMemo(() => serviciosParaReservar(servicesMenu, b.services), [b.services]);
  // ?categoria= que no existe se ignora
  const categoriaInicial = useMemo(() => {
    const c = params.get('categoria');
    return c && servicesMenu.some((x) => x.id === c) ? c : null;
  }, [params]);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [errorEn, setErrorEn] = useState<'paso2' | 'paso3' | null>(null);
  // campo que debe recibir el foco después de pintar su error (así ya tiene aria-invalid y aria-describedby)
  const [enfocar, setEnfocar] = useState<'r-nombre' | 'r-telefono' | null>(null);
  const paqueteAplicado = useRef(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const veniaDeConfirmar = useRef(false);
  const { cargando, packages, cambiarTipo, elegirPaquete, confirmada } = b;

  // ?paquete=<id>: "Tengo un paquete" con ese paquete ya elegido, cuando llegan los paquetes. Uno que no existe se ignora.
  useEffect(() => {
    if (cargando || paqueteAplicado.current) return;
    paqueteAplicado.current = true;
    const id = params.get('paquete');
    if (id && packages.some((p) => p.id === id)) {
      cambiarTipo('package');
      elegirPaquete(id);
    }
  }, [cargando, packages, params, cambiarTipo, elegirPaquete]);

  // al pre-reservar se sube arriba; la confirmación lleva el foco a su título
  useEffect(() => {
    if (confirmada) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [confirmada]);

  // al volver de la confirmación ("Hacer otra reserva") el foco pasa al título de la página, no se queda en el <body>
  useEffect(() => {
    if (confirmada) {
      veniaDeConfirmar.current = true;
    } else if (veniaDeConfirmar.current) {
      veniaDeConfirmar.current = false;
      tituloRef.current?.focus({ preventScroll: true });
    }
  }, [confirmada]);

  useEffect(() => {
    if (!enfocar) return;
    document.getElementById(enfocar)?.focus({ preventScroll: true });
    setEnfocar(null);
  }, [enfocar]);

  const paso1 = b.elegidos.length > 0;
  const paso2 = paso1 && b.planElegido !== null;
  const lineas = lineasResumen(b.elegidos, b.staffList, paso2 ? b.form.time : null, b.planElegido)
    .map((l) => ({ ...l, nombre: nombreVisible(l.nombre) }));
  const barra = textoBarra(b.elegidos.length, b.form.date || null, paso2 ? b.form.time : null);
  const deposito = b.settings.deposit_amount ?? 500;

  /** Un aviso de un intento anterior ya no vale cuando la clienta cambia algo. */
  const limpiarAviso = () => {
    if (errorEn || b.bookingError) {
      setErrorEn(null);
      b.setBookingError('');
    }
  };

  const cambiarDato = (campo: 'name' | 'phone' | 'notes', valor: string) => {
    b.setForm((f) => ({ ...f, [campo]: valor }));
    if (errorEn === 'paso3') limpiarAviso();
    if (campo === 'name' && errores.nombre) setErrores((e) => ({ ...e, nombre: undefined }));
    if (campo === 'phone' && errores.telefono) setErrores((e) => ({ ...e, telefono: undefined }));
  };

  const elegirHora = (hora: string) => {
    limpiarAviso();
    b.elegirHora(hora);
  };

  const solicitar = async () => {
    if (!paso1) { irA('r-paso-1'); return; }
    if (!paso2) { irA('r-paso-2'); return; }
    const e = validarDatos(b.form.name, b.form.phone);
    setErrores(e);
    if (e.nombre || e.telefono) {
      irA('r-paso-3');
      setEnfocar(e.nombre ? 'r-nombre' : 'r-telefono');
      return;
    }
    const r = await b.submit();
    if (r === 'ocupado') {
      setErrorEn('paso2');
      irA('r-paso-2');
    } else if (r === 'pasada') {
      setErrorEn('paso2');
      irA('r-paso-2');
    } else if (r === 'error') {
      setErrorEn('paso3');
      irA('r-paso-3');
    }
  };

  // sin la configuración real no se muestra la cuenta de ejemplo (123456789)
  if (confirmada) {
    return (
      <Confirmacion
        cita={confirmada}
        deposito={deposito}
        cuentas={b.settingsCargados ? b.settings.bank_accounts : []}
        whatsapp={b.settings.whatsapp_number || site.whatsapp}
        mensaje={b.whatsappMsg}
        onOtra={() => {
          b.reset();
          setErrores({});
          setErrorEn(null);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />
    );
  }

  const ahora = paso2 ? 2 : paso1 ? 1 : 0;
  const hechos = [paso1, paso2, false];

  return (
    <div className="s-r">
      <header className="s-r-head">
        <div className="s-wrap">
          <p className="s-eyebrow">Reserva en línea</p>
          <h1 ref={tituloRef} tabIndex={-1} className="s-display s-r-titulo">Agenda tu <em>cita</em></h1>
          <p className="s-r-intro">Elige tus servicios, con quién y la hora que te quede mejor. Los horarios salen de la agenda real de cada especialista.</p>
          <ol className="s-pasos" aria-label="Pasos de la reserva">
            {PASOS.map((t, i) => (
              <li key={t} className={`s-pasos-i ${hechos[i] ? 'is-hecho' : ''} ${ahora === i ? 'is-ahora' : ''}`}
                aria-current={ahora === i ? 'step' : undefined}>
                <b aria-hidden="true">{hechos[i] ? '✓' : i + 1}</b>{t}
                {hechos[i] && <span className="s-sr"> (listo)</span>}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="s-wrap s-r-grid">
        <div>
          <section id="r-paso-1" className="s-r-paso" aria-labelledby="r-paso-1-t">
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">01</span>
              <h2 id="r-paso-1-t" className="s-display">¿Qué te vas a hacer?</h2>
              <small>Puedes elegir varios</small>
            </div>
            <PasoServicios
              tipo={b.bookingType}
              onTipo={(tipo) => { limpiarAviso(); b.cambiarTipo(tipo); }}
              servicios={servicios}
              staff={b.staffList}
              picks={b.picks.filter((x) => x.serviceId)}
              onAlternar={(id) => { limpiarAviso(); b.alternarServicio(id); }}
              onEspecialista={(id, staffId) => { limpiarAviso(); b.elegirEspecialista(id, staffId); }}
              paquetes={b.packages}
              paqueteId={b.form.packageId}
              onPaquete={(id) => { limpiarAviso(); b.elegirPaquete(id); }}
              especialistaPaquete={b.picks[0]?.staffId ?? ''}
              onEspecialistaPaquete={(staffId) => { limpiarAviso(); b.elegirEspecialistaPaquete(staffId); }}
              categoriaInicial={categoriaInicial}
              cargando={b.cargando}
            />
          </section>

          <section id="r-paso-2" className={`s-r-paso ${paso1 ? '' : 'is-bloqueado'}`} aria-labelledby="r-paso-2-t" inert={!paso1}>
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">02</span>
              <h2 id="r-paso-2-t" className="s-display">¿Cuándo?</h2>
              <small>{site.hours}</small>
            </div>
            {errorEn === 'paso2' && b.bookingError && <p className="s-r-alerta" role="alert">{b.bookingError}</p>}
            <PasoCuando
              hoy={hoy}
              fecha={b.form.date}
              onFecha={(iso) => { limpiarAviso(); b.elegirFecha(iso); }}
              horarios={b.horarios}
              hora={b.form.time}
              onHora={elegirHora}
              cargando={b.loadingSlots}
              sinHuecos={b.isDayOff}
              variosServicios={b.elegidos.length > 1}
            />
          </section>

          <section id="r-paso-3" className={`s-r-paso ${paso2 ? '' : 'is-bloqueado'}`} aria-labelledby="r-paso-3-t" inert={!paso2}>
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">03</span>
              <h2 id="r-paso-3-t" className="s-display">Tus datos</h2>
            </div>
            {errorEn === 'paso3' && b.bookingError && <p className="s-r-alerta" role="alert">{b.bookingError}</p>}
            <PasoDatos nombre={b.form.name} telefono={b.form.phone} notas={b.form.notes} errores={errores} onCambio={cambiarDato} />
          </section>
        </div>

        <ResumenVisita
          lineas={lineas}
          fecha={b.form.date}
          duracionTotal={b.duracionTotal}
          deposito={deposito}
          listo={paso2}
          enviando={b.sending}
          onSolicitar={solicitar}
        />
      </div>

      <BarraReserva
        titulo={barra.titulo}
        detalle={barra.detalle}
        accion={b.sending ? 'Enviando…' : paso2 ? 'Solicitar cita' : 'Continuar'}
        deshabilitada={b.sending}
        onAccion={solicitar}
      />
    </div>
  );
}
