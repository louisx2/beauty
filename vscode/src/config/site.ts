// Configuración del negocio. Edita aquí la ubicación, contacto y horario.
// El mapa y los botones de "Cómo llegar" (Waze / Google Maps) se generan
// automáticamente a partir de las coordenadas (lat, lng).

export const site = {
  name: 'Anadsll Beauty Esthetic',
  address: 'C/Altagracia, #65, Pueblo Abajo',
  // Coordenadas del local — cámbialas para mover el mapa y los botones.
  // Tip: en Google Maps, clic derecho sobre el punto exacto > copia los números.
  lat: 18.544172,
  lng: -70.5060794,
  phone: '829-322-4014',
  whatsapp: '18293224014',
  instagram: 'anadsllbeautyesthetic.rd',
  // un renglón por grupo de días, para que en el teléfono no se corte a la mitad de una hora
  hours: ['Lun - Vie: 8:00 AM - 6:00 PM', 'Sáb: 8:00 AM - 2:00 PM'],
};

// Horario del salón por día (0 = domingo … 6 = sábado); null = cerrado. La reserva en línea y el panel
// solo ofrecen horas dentro de él. Si cambia, cambia también `hours`, que es lo que se lee en la página.
export const horarioSalon: readonly ({ abre: string; cierra: string } | null)[] = [
  null, // domingo
  { abre: '08:00', cierra: '18:00' }, // lunes
  { abre: '08:00', cierra: '18:00' }, // martes
  { abre: '08:00', cierra: '18:00' }, // miércoles
  { abre: '08:00', cierra: '18:00' }, // jueves
  { abre: '08:00', cierra: '18:00' }, // viernes
  { abre: '08:00', cierra: '14:00' }, // sábado
];

const q = encodeURIComponent(`${site.address} ${site.name}`);

// Enlaces de navegación (no requieren API key)
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`;
export const wazeUrl = `https://waze.com/ul?ll=${site.lat},${site.lng}&navigate=yes`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${site.lat},${site.lng}(${q})&z=16&output=embed`;

export default site;
