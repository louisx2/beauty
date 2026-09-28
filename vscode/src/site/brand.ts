// Rutas públicas de la marca y las fotos de la web de la clienta (spec §3.5 y §3.6).
export const LOGO = '/brand/logo-sin-icono.png';
export const LOGO_CLARO = '/brand/logo-sin-icono-claro.png';
export const MONOGRAMA = '/brand/icono.png';
export const FOTO_MENU = '/fotos/lobby-monograma.jpg';

export const FOTOS = {
  portada: '/fotos/portada.jpg',
  anabelLobby: '/fotos/anabel-lobby.jpg',
  equipoAnabel: '/fotos/equipo-anabel.jpg',
  anabelGuantes: '/fotos/anabel-guantes.jpg',
  servicio: {
    limpieza: '/fotos/servicio-limpieza.jpg',
    aparatologia: '/fotos/servicio-aparatologia.jpg',
    laser: '/fotos/servicio-laser.jpg',
    lips: '/fotos/servicio-lips.jpg',
    pestanas: '/fotos/servicio-pest.jpg',
    cejas: '/fotos/servicio-cejas.jpg',
    cera: '/fotos/servicio-cera.jpg',
    blanqueamiento: '/fotos/servicio-blanq.jpg',
    tatuaje: '/fotos/servicio-tatu.jpg',
    maquillaje: '/fotos/servicio-maq.jpg',
  },
} as const;
