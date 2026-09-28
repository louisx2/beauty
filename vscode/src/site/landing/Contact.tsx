import { site, mapsUrl, wazeUrl, mapEmbedUrl } from '../../config/site';
import { useRevela } from '../ui/useRevela';
import './Contact.css';

/** Contacto con dirección, horario, teléfono, Instagram, Waze/Maps y el mapa (spec §5.10). */
export default function Contact() {
  const texto = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-contact" id="s-contacto" data-spy="">
      <div className="s-wrap s-contact-in">
        <div className="s-rv" ref={texto}>
          <p className="s-eyebrow">Visítanos</p>
          <h2 className="s-display s-h2">Te esperamos en <em>San José de Ocoa</em></h2>
          <ul className="s-ct-list">
            <li><span>Dirección</span>{site.address}</li>
            <li><span>Horario</span>{site.hours}</li>
            <li><span>Teléfono</span><a href={`tel:+1${site.phone.replace(/\D/g, '')}`}>{site.phone}</a></li>
            <li>
              <span>Instagram</span>
              <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer">@{site.instagram}</a>
            </li>
          </ul>
          <div className="s-ct-btns">
            <a className="s-btn s-btn-solid" href={wazeUrl} target="_blank" rel="noopener noreferrer">Cómo llegar con Waze</a>
            <a className="s-btn s-btn-line" href={mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps</a>
          </div>
        </div>
        {/* sin aparecer al bajar: la animación peleaba con la máscara que redondea el mapa en Safari */}
        <div className="s-ct-mapa">
          <iframe src={mapEmbedUrl} loading="lazy" title="Ubicación de Anadsll Beauty Esthetic" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
}
