import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/settingsStore';
import { isoLocal } from './calendario';
import {
  chocaConAgenda, horariosDelDia, type Agenda, type Bloqueo, type Elegido, type Especialista, type Horario,
  type LineaPlan, type Ocupado,
} from './disponibilidad';
import { mensajeWhatsApp } from './resumen';

/** Lo que la reserva lee de `services` (anon solo ve los activos). */
export interface ServicioBase { id: string; name: string; duration: number; price: number }
/** Paquete activo con su servicio; la sesión se descuenta al completar la cita, como siempre. */
export interface PaqueteBase {
  id: string;
  name: string;
  sessions: number;
  service_id: string;
  services: { duration: number; name: string } | null;
}
export type TipoReserva = 'service' | 'package';
/** Un servicio elegido. staffId vacío = "cualquiera disponible". */
export interface Pick { serviceId: string; staffId: string }
export interface FormReserva {
  name: string; phone: string; serviceId: string; packageId: string; staffId: string; date: string; time: string; notes: string;
}
/** Lo que queda al pre-reservar, para la confirmación. */
export interface Confirmada { fecha: string; hora: string; plan: LineaPlan[]; nombre: string; duracionTotal: number }
export type ResultadoEnvio = 'ok' | 'ocupado' | 'error' | 'incompleto';

const FORM_VACIO: FormReserva = { name: '', phone: '', serviceId: '', packageId: '', staffId: '', date: '', time: '', notes: '' };
const HORA_OCUPADA = 'Ese horario se acaba de ocupar. Por favor elige otra hora.';

/** Toda la reserva de siempre sin interfaz: datos, agenda del día, horas, relectura y guardado.
 *  La usan la reserva nueva y el diseño anterior (spec §8): cambia la forma, no el cálculo. */
export function useBooking() {
  const [services, setServices] = useState<ServicioBase[]>([]);
  const [packages, setPackages] = useState<PaqueteBase[]>([]);
  const [staffList, setStaffList] = useState<Especialista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([{ serviceId: '', staffId: '' }]);
  /** Horas ya ocupadas de cada especialista ese día. */
  const [busyByStaff, setBusyByStaff] = useState<Record<string, Ocupado[]>>({});
  const [bookingType, setBookingType] = useState<TipoReserva>('service');
  const [form, setForm] = useState<FormReserva>(FORM_VACIO);
  const { settings, fetchSettings } = useSettingsStore();
  const [sending, setSending] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blocks, setBlocks] = useState<Bloqueo[]>([]);
  const [success, setSuccess] = useState(false);
  const [confirmada, setConfirmada] = useState<Confirmada | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Datos base, una vez
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('services').select('id, name, duration, price').eq('active', true).order('name'),
      supabase
        .from('staff')
        .select('id, name, working_days, working_start, working_end, service_ids, avatar_url')
        .eq('active', true)
        .in('role', ['specialist', 'admin'])
        .order('name'),
      supabase
        .from('session_packages')
        .select('id, name, sessions, service_id, services(duration, name)')
        .eq('active', true)
        .order('name'),
    ]).then(([svcRes, staffRes, pkgRes]) => {
      if (!vivo) return;
      if (svcRes.data) {
        setServices((svcRes.data as unknown as ServicioBase[]).map((s) => ({ ...s, price: Number(s.price) || 0 })));
      }
      if (staffRes.data) setStaffList(staffRes.data as unknown as Especialista[]);
      if (pkgRes.data) setPackages(pkgRes.data as unknown as PaqueteBase[]);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, []);

  // Al cambiar el día se trae la agenda ocupada de TODAS las especialistas (una cita puede repartirse entre
  // varias) y los bloqueos de horario. Llegan juntos, y si mientras tanto se eligió otro día, se descartan.
  useEffect(() => {
    if (!form.date || staffList.length === 0) return;
    let vigente = true;
    setLoadingSlots(true);
    setForm((prev) => ({ ...prev, time: '' }));
    Promise.all([
      Promise.all(
        staffList.map((m) =>
          supabase
            .rpc('get_busy_slots', { p_date: form.date, p_employee: m.name })
            .then(({ data }) => [m.id, (data as Ocupado[]) ?? []] as const),
        ),
      ),
      // vacaciones, día libre, almuerzo o cierre del salón; la vista pública solo expone los horarios
      supabase
        .from('schedule_blocks_public')
        .select('staff_id, start_date, end_date, start_time, end_time')
        .lte('start_date', form.date)
        .gte('end_date', form.date),
    ]).then(([pares, bloqueos]) => {
      if (!vigente) return;
      setBusyByStaff(Object.fromEntries(pares));
      setBlocks((bloqueos.data as unknown as Bloqueo[] | null) ?? []);
      setLoadingSlots(false);
    });
    return () => { vigente = false; };
  }, [form.date, staffList]);

  const selectedPkg = packages.find((p) => p.id === form.packageId);

  /** Servicios de esta reserva, en orden. Un paquete cuenta como uno solo. */
  const elegidos = useMemo<Elegido[]>(() => {
    if (bookingType === 'package') {
      if (!selectedPkg) return [];
      return [{
        serviceId: selectedPkg.service_id,
        staffId: picks[0]?.staffId ?? '',
        nombre: `Paquete: ${selectedPkg.name}`,
        duracion: selectedPkg.services?.duration ?? 45,
      }];
    }
    return picks
      .filter((p) => p.serviceId)
      .map((p) => {
        const sv = services.find((x) => x.id === p.serviceId);
        return { serviceId: p.serviceId, staffId: p.staffId, nombre: sv?.name ?? '', duracion: sv?.duration ?? 45 };
      });
  }, [bookingType, selectedPkg, picks, services]);

  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);

  const agenda = useMemo<Agenda>(
    () => ({ staff: staffList, ocupados: busyByStaff, bloqueos: blocks }),
    [staffList, busyByStaff, blocks],
  );

  /** Todas las horas del día: con reparto si cabe la visita completa; sin él, ocupadas. */
  const horarios = useMemo<Horario[]>(() => {
    const ahora = new Date();
    return horariosDelDia(elegidos, form.date, agenda, {
      hoy: isoLocal(ahora),
      minutos: ahora.getHours() * 60 + ahora.getMinutes(),
    });
  }, [elegidos, form.date, agenda]);

  const libres = useMemo(
    () => horarios.filter((h): h is { hora: string; plan: LineaPlan[] } => h.plan !== null),
    [horarios],
  );
  const availableSlots = useMemo(() => libres.map((h) => h.hora), [libres]);
  const planElegido = libres.find((h) => h.hora === form.time)?.plan ?? null;

  // No hay ni un hueco en todo el día: o nadie trabaja, o está todo tomado
  const isDayOff = Boolean(form.date) && elegidos.length > 0 && libres.length === 0;

  /** Cambiar entre servicios sueltos y paquete empieza de cero, como siempre. */
  const cambiarTipo = useCallback((tipo: TipoReserva) => {
    setBookingType(tipo);
    setPicks([{ serviceId: '', staffId: '' }]);
    setForm((f) => (tipo === 'service'
      ? { ...f, packageId: '', staffId: '', date: '', time: '' }
      : { ...f, serviceId: '', staffId: '', date: '', time: '' }));
  }, []);

  /** Marca o desmarca un servicio de la lista. Cualquier cambio de servicios borra la hora elegida. */
  const alternarServicio = useCallback((serviceId: string) => {
    setPicks((ps) => {
      const reales = ps.filter((p) => p.serviceId);
      return reales.some((p) => p.serviceId === serviceId)
        ? reales.filter((p) => p.serviceId !== serviceId)
        : [...reales, { serviceId, staffId: '' }];
    });
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirEspecialista = useCallback((serviceId: string, staffId: string) => {
    setPicks((ps) => ps.map((p) => (p.serviceId === serviceId ? { ...p, staffId } : p)));
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirPaquete = useCallback((packageId: string) => {
    setPicks([{ serviceId: '', staffId: '' }]);
    setForm((f) => ({ ...f, packageId, time: '' }));
  }, []);

  const elegirEspecialistaPaquete = useCallback((staffId: string) => {
    setPicks([{ serviceId: '', staffId }]);
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirFecha = useCallback((date: string) => setForm((f) => ({ ...f, date, time: '' })), []);
  const elegirHora = useCallback((time: string) => setForm((f) => ({ ...f, time })), []);

  const submit = useCallback(async (): Promise<ResultadoEnvio> => {
    if (!planElegido || !form.time) return 'incompleto';
    if (form.date < isoLocal(new Date())) {
      setBookingError('No puedes reservar una cita en una fecha pasada.');
      return 'error';
    }

    setSending(true);
    setBookingError('');
    try {
      // La lista de horarios se cargó hace rato: alguien pudo tomar la hora mientras la clienta llenaba el
      // formulario. Se relee antes de guardar.
      const frescos = await Promise.all(
        planElegido.map((linea) =>
          supabase
            .rpc('get_busy_slots', { p_date: form.date, p_employee: linea.staff.name })
            .then(({ data }) => [linea.staff.id, (data as Ocupado[]) ?? []] as const),
        ),
      );
      const agendaFresca = Object.fromEntries(frescos);
      if (chocaConAgenda(planElegido, form.time, agendaFresca)) {
        setBusyByStaff((prev) => ({ ...prev, ...agendaFresca }));
        setForm((prev) => ({ ...prev, time: '' }));
        setBookingError(HORA_OCUPADA);
        return 'ocupado';
      }

      // Cita y servicios en una sola transacción: si un servicio choca, no queda una cita a medias.
      const { error } = await supabase.rpc('save_appointment', {
        p_id: null,
        p_client_id: null,
        p_client_name: form.name.trim(),
        p_client_phone: form.phone.trim(),
        p_date: form.date,
        p_time: form.time,
        p_status: 'pending',
        p_notes: form.notes.trim() || '',
        p_source: 'web',
        p_services: planElegido.map((linea) => ({
          // En paquetes es el servicio del paquete: con eso se descuenta la sesión al completar
          service_id: linea.serviceId,
          service_name: linea.nombre,
          employee: linea.staff.name,
          duration: linea.duracion,
          price: 0,
        })),
      });

      if (error) {
        console.error('[booking] insert error:', error);
        // 23P01 = la base rechazó la cita porque otra persona tomó ese horario en el mismo instante.
        // Es el único caso que la clienta puede resolver.
        if (error.code === '23P01') {
          setForm((prev) => ({ ...prev, time: '' }));
          setBookingError(HORA_OCUPADA);
          return 'ocupado';
        }
        setBookingError('Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp.');
        return 'error';
      }

      setWhatsappMsg(mensajeWhatsApp({
        nombre: form.name, telefono: form.phone, plan: planElegido, fecha: form.date, hora: form.time, notas: form.notes,
      }));
      setConfirmada({
        fecha: form.date,
        hora: form.time,
        plan: planElegido,
        nombre: form.name.trim(),
        duracionTotal: planElegido.reduce((t, l) => t + l.duracion, 0),
      });
      setSuccess(true);
      return 'ok';
    } finally {
      setSending(false);
    }
  }, [planElegido, form]);

  const reset = useCallback(() => {
    setSuccess(false);
    setConfirmada(null);
    setBookingError('');
    setForm(FORM_VACIO);
    setPicks([{ serviceId: '', staffId: '' }]);
  }, []);

  return {
    services, packages, staffList, cargando,
    picks, setPicks, bookingType, form, setForm,
    settings, sending, loadingSlots, success, bookingError, setBookingError, whatsappMsg, confirmada,
    selectedPkg, elegidos, duracionTotal, horarios, availableSlots, planElegido, isDayOff,
    cambiarTipo, alternarServicio, elegirEspecialista, elegirPaquete, elegirEspecialistaPaquete, elegirFecha, elegirHora,
    submit, reset,
  };
}
