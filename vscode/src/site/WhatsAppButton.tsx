import { site } from '../config/site';

/** Botón flotante de WhatsApp; en /reservar sube para no tapar la barra de abajo. */
export default function WhatsAppButton({ elevado = false, inerte = false }: { elevado?: boolean; inerte?: boolean }) {
  const mensaje = encodeURIComponent('Hola, quiero información');
  return (
    <a className={`s-wa ${elevado ? 'is-elevado' : ''}`} href={`https://wa.me/${site.whatsapp}?text=${mensaje}`}
      target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" inert={inerte}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 0 1 12 4Zm-3.1 3.9c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5Z" /></svg>
    </a>
  );
}
