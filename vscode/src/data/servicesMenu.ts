// Menú de servicios de Anadsll Beauty Esthetic
// Extraído de las gráficas oficiales (carpeta ANABEL/servicios) con las erratas corregidas.
// Editable en un solo lugar para alimentar el landing y/o la reserva.

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
}

export const servicesMenu: ServiceCategory[] = [
  {
    id: 'limpieza-facial',
    title: 'Limpieza Facial',
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
