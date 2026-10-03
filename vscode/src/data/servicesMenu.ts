// Menú de servicios de Anadsll Beauty Esthetic
// Extraído de las gráficas oficiales (carpeta ANABEL/servicios) con las erratas corregidas.
// Editable en un solo lugar para alimentar el landing y/o la reserva.

export interface Specialist {
  name: string;
  role: string;
  image: string;
  bio?: string;
  /** Foto chica (160 px) para "Realizado por"; sin ella se muestran las iniciales */
  miniatura?: string;
}

// Las tres que atienden. La recepción y las cuentas de soporte no van aquí: no hacen servicios.
const specialists = {
  anabel: {
    name: 'Anabel De los Santos',
    role: 'Fundadora y cosmetóloga',
    image: '/equipo/anabel-retrato.jpg',
    bio: 'Fundadora de Anadsll Beauty Esthetic. Cosmetóloga: limpiezas faciales, láser, cejas, aparatología y tratamientos corporales.',
    miniatura: '/fotos/esp-anabel.jpg',
  },
  melissa: {
    name: 'Dra. Melissa Lara',
    role: 'Médico estético',
    image: '/equipo/equipo-melissa.jpg',
    bio: 'Médico general y estético: toxina botulínica, rellenos de ácido hialurónico, bioestimuladores de colágeno, mesoterapias y PRP.',
    miniatura: '/fotos/esp-melissa.jpg',
  },
  anaHerrera: {
    name: 'Ana Herrera',
    role: 'Maquilladora y lashista',
    image: '/equipo/equipo-ana-herrera.jpg',
    bio: 'Maquilladora y lashista: maquillaje social, de novia y de quinceañera, y extensiones de pestañas.',
    miniatura: '/fotos/esp-ana-herrera.jpg',
  },
};

export interface ServiceItem {
  name: string;
  /** Subopciones / áreas / variantes del servicio */
  options?: string[];
  /** Grupos de subopciones cuando aplican (ej. áreas cortas / largas) */
  groups?: { label: string; items: string[] }[];
  /** Descripción breve para tarjetas del landing */
  description?: string;
}

/** Familia de la página principal (spec §5.3) */
export type FamiliaId = 'facial' | 'corporal' | 'cejas-maquillaje' | 'medicina';

export interface ServiceCategory {
  id: string;
  title: string;
  items: ServiceItem[];
  specialist: Specialist;
  familia: FamiliaId;
  /** Foto del servicio en `public/fotos`; sin foto se muestra la N (medicina estética) */
  imagen?: string;
  /** Encuadre de la foto (object-position) */
  posicion?: string;
  /** Texto corto de la especialidad en el catálogo */
  descripcion?: string;
}

export const servicesMenu: ServiceCategory[] = [
  {
    id: 'limpieza-facial',
    title: 'Limpieza Facial',
    specialist: specialists.anabel,
    familia: 'facial',
    imagen: '/fotos/servicio-limpieza.jpg',
    descripcion: 'Protocolos de limpieza y renovación según tu tipo de piel.',
    items: [
      { name: 'Limpieza facial express / hidratación' },
      { name: 'Limpieza facial profunda' },
      { name: 'Limpieza facial acné / rosácea / envejecimiento' },
      { name: 'Limpieza facial personalizada / Casmara' },
      { name: 'Limpieza + electroporación' },
      { name: 'Limpieza + radiofrecuencia' },
      { name: 'Limpieza + Hollywood Peel' },
      { name: 'Peeling' },
      { name: 'Exosomas' },
      { name: 'Hidrafacial' },
      { name: 'Dermaplaning' },
      { name: 'Microneedling' },
      { name: 'Microdermabrasión / Fototerapia' },
    ],
  },
  {
    id: 'depilacion-laser',
    title: 'Depilación Láser',
    specialist: specialists.anabel,
    familia: 'corporal',
    imagen: '/fotos/servicio-laser.jpg',
    descripcion: 'Láser de diodo para resultados progresivos y seguros.',
    items: [
      {
        name: 'Depilación láser',
        groups: [
          {
            label: 'Áreas cortas',
            items: ['Bozo', 'Mentón', 'Axilas', 'Línea alba'],
          },
          {
            label: 'Áreas largas',
            items: [
              'Rostro',
              'Barba',
              'Pecho',
              'Espalda',
              'Abdomen',
              'Brazos',
              'Antebrazos',
              'Bikini',
              'Brasileño',
              'Perianal',
              'Glúteos',
              'Muslos',
              'Piernas',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'depilacion-cera',
    title: 'Depilación con Cera',
    specialist: specialists.anabel,
    familia: 'corporal',
    imagen: '/fotos/servicio-cera.jpg',
    items: [
      {
        name: 'Depilación con cera',
        options: ['Bozo', 'Axilas', 'Área íntima', 'Glúteos', 'Piernas'],
      },
    ],
  },
  {
    id: 'cejas',
    title: 'Cejas',
    specialist: specialists.anabel,
    familia: 'cejas-maquillaje',
    imagen: '/fotos/servicio-cejas.jpg',
    descripcion: 'Diseño, laminado, depilación con hilo y tintado de cejas.',
    items: [
      { name: 'Diseño de cejas' },
      { name: 'Laminado de cejas' },
      { name: 'Depilación con hilo' },
      { name: 'Tintado de cejas' },
    ],
  },
  {
    id: 'pestanas',
    title: 'Pestañas',
    specialist: specialists.anaHerrera,
    familia: 'cejas-maquillaje',
    imagen: '/fotos/servicio-pest.jpg',
    descripcion: 'Lifting y extensiones de pestañas: clásicas, de volumen, wispy y más.',
    items: [
      { name: 'Lifting de pestañas' },
      {
        name: 'Extensiones de pestañas',
        options: [
          'Clásica',
          'Volumen 2D, 3D, 4D, 5D',
          'Volumen ruso',
          'Mega volumen',
          'Tecnológicas / Hawaiana / Egipcio',
          'Wispy',
          'Retiro de pestañas',
        ],
      },
    ],
  },
  {
    id: 'hidra-lips',
    title: 'Hidra Lips',
    specialist: specialists.anabel,
    familia: 'facial',
    imagen: '/fotos/servicio-lips.jpg',
    descripcion: 'Exfolia, hidrata en profundidad y da volumen temporal a los labios con ácido hialurónico y succión suave. Sin agujas.',
    items: [
      {
        name: 'Hidra Lips',
        description:
          'Exfolia, hidrata en profundidad y da volumen temporal a los labios con ácido hialurónico + succión suave. Sin agujas. Efecto plump natural por 7-15 días. Duración: 20 min.',
      },
    ],
  },
  {
    id: 'blanqueamiento-corporal',
    title: 'Blanqueamiento Corporal',
    specialist: specialists.anabel,
    familia: 'corporal',
    imagen: '/fotos/servicio-blanq.jpg',
    items: [
      {
        name: 'Blanqueamiento corporal',
        options: ['Axilas', 'Codos', 'Área íntima', 'Rodillas', 'Piernas', 'Glúteos'],
      },
    ],
  },
  {
    id: 'remocion-tatuaje',
    title: 'Remoción de Tatuaje',
    specialist: specialists.anabel,
    familia: 'corporal',
    imagen: '/fotos/servicio-tatu.jpg',
    descripcion: 'Eliminación de tatuajes con láser.',
    items: [
      {
        name: 'Remoción de tatuaje',
        description: 'Eliminación de tatuajes con láser.',
      },
    ],
  },
  {
    id: 'maquillaje',
    title: 'Maquillaje',
    specialist: specialists.anaHerrera,
    familia: 'cejas-maquillaje',
    imagen: '/fotos/servicio-maq.jpg',
    items: [
      {
        name: 'Maquillaje',
        options: ['Express', 'Social', 'Quinceañera', 'Novia', 'Glam'],
      },
    ],
  },
  {
    id: 'toxina-botulinica',
    title: 'Toxina Botulínica',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-toxina.jpg',
    items: [
      {
        name: 'Toxina botulínica',
        options: [
          'Líneas de expresión — RD$12,000 a 18,000',
          'Hiperhidrosis axilar — RD$15,000',
          'Bruxismo — RD$12,000',
          'Cuello — RD$15,000',
        ],
      },
    ],
  },
  {
    id: 'rellenos',
    title: 'Rellenos con Ácido Hialurónico',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-rellenos.jpg',
    items: [
      {
        name: 'Rellenos',
        options: [
          'Labios — RD$15,000',
          'Nariz — RD$15,000',
          'Mentón — RD$10,000',
          'Marcación mandibular — RD$15,000 a 18,000',
          'Pómulos y surcos — RD$15,000',
          'Ojeras — RD$10,000',
        ],
      },
    ],
  },
  {
    id: 'bioestimuladores',
    title: 'Bioestimuladores de Colágeno',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-bioestim.jpg',
    items: [
      {
        name: 'Bioestimuladores',
        options: [
          'Sculptra — RD$25,000',
          'Radiesse — RD$28,000',
          'Profhilo — RD$20,000',
          'Hilos PDO — RD$12,000 (x10 hilos)',
          'Hilos tensores — desde RD$20,000 (4 hilos en adelante)',
        ],
      },
    ],
  },
  {
    id: 'mesoterapia',
    title: 'Mesoterapias',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-meso.jpg',
    items: [
      {
        name: 'Mesoterapias',
        options: [
          'NCTF para ojeras — RD$5,000 / sesión',
          'PDRN de salmón para ojeras — RD$8,000',
        ],
      },
    ],
  },
  {
    id: 'plasma-rico-plaquetas',
    title: 'Plasma Rico en Plaquetas',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-prp.jpg',
    descripcion: 'PRP: tu propio plasma, rico en factores de crecimiento, para regenerar la piel y fortalecer el cabello.',
    items: [
      {
        name: 'Plasma rico en plaquetas (PRP)',
        options: [
          'Rostro — RD$5,000',
          'Cuero cabelludo — RD$4,500',
          'Cuello — RD$3,500',
          'Ojeras — RD$2,500',
        ],
      },
    ],
  },
  {
    id: 'escleroterapia',
    title: 'Escleroterapia',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-esclero.jpg',
    descripcion: 'Tratamiento para várices.',
    items: [
      {
        name: 'Escleroterapia',
        description:
          'Tratamiento para várices. RD$3,500 la ampolla de 2 ml.',
        options: ['Ampolla 2 ml — RD$3,500'],
      },
    ],
  },
  {
    id: 'verrugas',
    title: 'Eliminación de Verrugas',
    specialist: specialists.melissa,
    familia: 'medicina',
    imagen: '/fotos/servicio-verrugas.jpg',
    descripcion: 'El precio varía según la cantidad y el tamaño.',
    items: [
      {
        name: 'Eliminación de verrugas',
        description:
          'El precio varía según la cantidad y el tamaño de las verrugas, desde RD$1,000 en adelante.',
        options: ['Eliminación de verrugas — desde RD$1,000'],
      },
    ],
  },
  {
    id: 'aparatologia',
    title: 'Aparatologías',
    specialist: specialists.anabel,
    familia: 'corporal',
    imagen: '/fotos/servicio-aparatologia.jpg',
    posicion: '50% 62%',
    items: [
      {
        name: 'Aparatologías',
        options: [
          'HIFU facial',
          'HIFU corporal',
          'HIFU vaginal',
          'Radiofrecuencia',
        ],
      },
    ],
  },
];

export default servicesMenu;

