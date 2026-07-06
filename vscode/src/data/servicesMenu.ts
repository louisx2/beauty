// Menú de servicios de Anadsll Beauty Esthetic
// Extraído de las gráficas oficiales (carpeta ANABEL/servicios) con las erratas corregidas.
// Editable en un solo lugar para alimentar el landing y/o la reserva.

export interface Specialist {
  name: string;
  role: string;
  image: string;
  bio?: string;
}

const specialists = {
  anabel: {
    name: 'Anabel De los Santos',
    role: 'Fundadora & Cosmetóloga Superior',
    image: '/equipo/anabel-retrato.jpg',
    bio: 'Fundadora de Anadsll Beauty Esthetic. Especialista certificada en cosmetología avanzada, cejas, pestañas y técnicas de maquillaje profesional. Más de 10 años de experiencia realzando la belleza natural.',
  },
  nadieska: {
    name: 'Dra. Nadieska Soto',
    role: 'Médico Estético & Cosmiatra',
    image: '/equipo/colaboradora1.png',
    bio: 'Médico Estético y Cosmiatra. Especialista en tratamientos inyectables de rejuvenecimiento, toxina botulínica, rellenos de ácido hialurónico, bioestimuladores de colágeno y terapias de renovación de la piel.',
  },
  carmen: {
    name: 'Carmen Rodríguez',
    role: 'Esp. en Aparatología & Corporal',
    image: '/equipo/colaboradora2.png',
    bio: 'Especialista en Aparatología y Tratamientos Corporales. Experta en tecnologías avanzadas de moldeamiento, tonificación corporal, depilación láser de diodo y blanqueamiento cosmético.',
  },
  paola: {
    name: 'Paola Jiménez',
    role: 'Cosmetóloga & Masajista',
    image: '/equipo/specialist2.jpeg',
    bio: 'Cosmetóloga y Masajista Terapeuta. Especialista en técnicas de depilación con cera, masajes de relajación profunda, drenaje linfático y tratamientos de bienestar integral.',
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

export interface ServiceCategory {
  id: string;
  title: string;
  items: ServiceItem[];
  specialist: Specialist;
}

export const servicesMenu: ServiceCategory[] = [
  {
    id: 'limpieza-facial',
    title: 'Limpieza Facial',
    specialist: specialists.nadieska,
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
    specialist: specialists.paola,
    items: [
      {
        name: 'Depilación con cera',
        options: ['Bozo', 'Axilas', 'Área íntima', 'Glúteos', 'Piernas'],
      },
    ],
  },
  {
    id: 'cejas-pestanas',
    title: 'Cejas y Pestañas',
    specialist: specialists.anabel,
    items: [
      { name: 'Lifting de pestañas' },
      { name: 'Laminado de cejas' },
      { name: 'Depilación con hilo' },
      { name: 'Tintado de cejas' },
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
    specialist: specialists.nadieska,
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
    specialist: specialists.carmen,
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
    specialist: specialists.anabel,
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
    specialist: specialists.nadieska,
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
    specialist: specialists.nadieska,
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
    specialist: specialists.nadieska,
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
    specialist: specialists.nadieska,
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
    id: 'escleroterapia',
    title: 'Escleroterapia',
    specialist: specialists.nadieska,
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
    specialist: specialists.nadieska,
    items: [
      {
        name: 'Eliminación de verrugas',
        description:
          'El precio varía según la cantidad y el tamaño de las verrugas, desde RD$1,000 en adelante.',
        options: ['Desde RD$1,000'],
      },
    ],
  },
  {
    id: 'aparatologia',
    title: 'Aparatologías',
    specialist: specialists.carmen,
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

