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
  hours: 'Lun - Sáb: 9:00 AM - 7:00 PM',
};

const q = encodeURIComponent(`${site.address} ${site.name}`);

// Enlaces de navegación (no requieren API key)
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`;
export const wazeUrl = `https://waze.com/ul?ll=${site.lat},${site.lng}&navigate=yes`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${site.lat},${site.lng}(${q})&z=16&output=embed`;

export default site;
