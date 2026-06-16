import { PrismaClient, Condition } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electrónica',    slug: 'electronica',    icon: '📱' },
  { name: 'Ropa y Moda',    slug: 'ropa-moda',      icon: '👕' },
  { name: 'Hogar y Jardín', slug: 'hogar-jardin',   icon: '🏠' },
  { name: 'Vehículos',      slug: 'vehiculos',       icon: '🚗' },
  { name: 'Deportes',       slug: 'deportes',        icon: '⚽' },
  { name: 'Juguetes',       slug: 'juguetes',        icon: '🧸' },
  { name: 'Libros y Arte',  slug: 'libros-arte',     icon: '📚' },
  { name: 'Mascotas',       slug: 'mascotas',        icon: '🐾' },
  { name: 'Herramientas',   slug: 'herramientas',    icon: '🔧' },
  { name: 'Inmuebles',      slug: 'inmuebles',       icon: '🏡' },
  { name: 'Servicios',      slug: 'servicios',       icon: '💼' },
  { name: 'Otros',          slug: 'otros',           icon: '📦' },
];

// ─── USUARIOS ─────────────────────────────────────────────────────────────────

const USERS = [
  {
    name: 'Valentina Romero',
    email: 'valentina.romero@demo.com',
    phone: '+54 11 4521-8834',
    bio: 'Diseñadora gráfica porteña. Vendo artículos de tecnología y moda que ya no uso. Envío a todo el país.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.8,
    ratingCount: 23,
    city: 'Buenos Aires',
    province: 'CABA',
    listing: {
      title: 'iPhone 14 Pro 256GB - Color Negro Espacial',
      description: 'iPhone 14 Pro en excelente estado. Tiene 8 meses de uso, siempre con funda y vidrio templado. Sin rayones. Incluye cargador original, auriculares y caja. Batería al 97%. Libre de fábrica para cualquier compañía.\n\nEspecificaciones:\n• Pantalla Super Retina XDR 6.1" ProMotion 120Hz\n• Chip A16 Bionic\n• Cámara 48 MP con modo Acción\n• 5G\n\nPosibilidad de encuentro en Palermo o Belgrano.',
      price: 850000,
      currency: 'ARS',
      condition: 'LIKE_NEW' as Condition,
      category: 'electronica',
      city: 'Buenos Aires',
      province: 'CABA',
      latitude: -34.5889,
      longitude: -58.4176,
      views: 342,
      saves: 28,
      promoted: true,
      images: [
        'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Matías Fernández',
    email: 'matias.fernandez@demo.com',
    phone: '+54 351 432-7721',
    bio: 'Mecánico y aficionado a los autos clásicos. Vendo repuestos y accesorios de calidad. Zona Córdoba capital.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.6,
    ratingCount: 41,
    city: 'Córdoba',
    province: 'Córdoba',
    listing: {
      title: 'Bicicleta de Montaña Trek Marlin 7 - Talle L',
      description: 'Trek Marlin 7 2022 en perfecto estado. Solo 6 meses de uso con mantenimiento completo recién hecho (cadena nueva, cables y fundas nuevas, pastillas de freno nuevas).\n\nEspecificaciones:\n• Cuadro: Aluminio Alpha Silver 6000 series\n• Horquilla: SR Suntour XCT 100mm viaje\n• Cambios: Shimano Altus 2x8 velocidades\n• Frenos: Tektro hidráulicos\n• Ruedas: 29"\n• Talle: L (recomendado para 178-190cm)\n\nIdeal para trail y uso urbano. Precio conversable para serios.',
      price: 320000,
      currency: 'ARS',
      condition: 'LIKE_NEW' as Condition,
      category: 'deportes',
      city: 'Córdoba',
      province: 'Córdoba',
      latitude: -31.4201,
      longitude: -64.1888,
      views: 187,
      saves: 15,
      promoted: false,
      images: [
        'https://images.unsplash.com/photo-1576435728678-68d0fbf94946?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Lucía Martínez',
    email: 'lucia.martinez@demo.com',
    phone: '+54 341 567-4490',
    bio: 'Mamá de dos niños. Vendo ropa y juguetes en buen estado. Siempre con descripción honesta. Rosario centro.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
    isVerified: false,
    rating: 4.9,
    ratingCount: 67,
    city: 'Rosario',
    province: 'Santa Fe',
    listing: {
      title: 'Smart TV Samsung 55" QLED 4K - UHD 2023',
      description: 'Smart TV Samsung QLED 55 pulgadas, modelo QN55Q60C 2023. 8 meses de uso, funcionando perfectamente. Lo vendo porque mudé a un departamento más chico.\n\nCaracterísticas:\n• Pantalla QLED 4K UHD 55"\n• 120Hz con Motion Xcelerator\n• Procesador Quantum Lite 4K\n• Smart TV con sistema Tizen\n• 4 puertos HDMI, 2 USB\n• Bluetooth 5.2 y Wi-Fi\n• Control remoto solar incluido\n• Soporte de pared incluido\n\nTiene base original y todo el packaging. Factura de compra disponible.',
      price: 520000,
      currency: 'ARS',
      condition: 'LIKE_NEW' as Condition,
      category: 'electronica',
      city: 'Rosario',
      province: 'Santa Fe',
      latitude: -32.9442,
      longitude: -60.6505,
      views: 521,
      saves: 44,
      promoted: true,
      images: [
        'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1571415060716-baff5f717064?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Diego Sánchez',
    email: 'diego.sanchez@demo.com',
    phone: '+54 261 789-3312',
    bio: 'Fotógrafo freelance. Renuevo equipo frecuentemente. Todo lo que vendo está probado y funciona al 100%.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.7,
    ratingCount: 19,
    city: 'Mendoza',
    province: 'Mendoza',
    listing: {
      title: 'Cámara Sony Alpha A7 III + Lente 28-70mm',
      description: 'Sony Alpha A7 III full-frame mirrorless en excelente estado. Aproximadamente 18.000 disparos (vida útil estimada 200.000+). Siempre guardada con tapas y en bolso acolchado.\n\nIncluye:\n• Cámara Sony A7 III cuerpo\n• Lente kit 28-70mm f/3.5-5.6\n• 2 baterías originales NP-FZ100\n• Cargador doble BC-QZ1\n• Correa original\n• Caja y manuales\n\nEspecificaciones:\n• Sensor CMOS BSI 35mm full-frame 24.2MP\n• ISO 100-51200 (expandible a 204800)\n• Estabilización de 5 ejes en sensor\n• Video 4K 30fps\n• Eye AF en tiempo real\n\nNo incluye tarjeta de memoria. Precio fijo.',
      price: 1450000,
      currency: 'ARS',
      condition: 'GOOD' as Condition,
      category: 'electronica',
      city: 'Mendoza',
      province: 'Mendoza',
      latitude: -32.8908,
      longitude: -68.8272,
      views: 289,
      saves: 31,
      promoted: false,
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Camila López',
    email: 'camila.lopez@demo.com',
    phone: '+54 11 3344-9921',
    bio: 'Amante de la moda y el vintage. Vendo prendas de diseñador y ropa importada. Envío por correo a todo el país.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.5,
    ratingCount: 88,
    city: 'Buenos Aires',
    province: 'CABA',
    listing: {
      title: 'Zapatillas Nike Air Jordan 1 Retro High OG - Talle 42',
      description: 'Air Jordan 1 Retro High OG "Chicago" 2022. Talle US9 / EU42. Usadas 3 veces, en estado prácticamente nuevo. Con caja original y bolsas de tela.\n\nDetalles:\n• Colorway: University Red/Black/White (Chicago)\n• Material: piel de alta calidad\n• Suela original sin desgaste\n• Sin manchas ni roturas\n• 100% originales - con etiquetas y código de verificación Nike\n\nPago con transferencia o efectivo. Encuentro en Palermo o Recoleta.',
      price: 185000,
      currency: 'ARS',
      condition: 'LIKE_NEW' as Condition,
      category: 'ropa-moda',
      city: 'Buenos Aires',
      province: 'CABA',
      latitude: -34.5831,
      longitude: -58.4225,
      views: 734,
      saves: 92,
      promoted: true,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Gonzalo Pérez',
    email: 'gonzalo.perez@demo.com',
    phone: '+54 223 456-7788',
    bio: 'Carpintero y amante del bricolaje. Vendo herramientas profesionales y muebles artesanales. Mar del Plata.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
    isVerified: false,
    rating: 4.4,
    ratingCount: 12,
    city: 'Mar del Plata',
    province: 'Buenos Aires',
    listing: {
      title: 'Taladro Percutor Inalámbrico Makita 18V + 2 Baterías',
      description: 'Taladro percutor Makita DHP484 18V LXT con 2 baterías BL1830 3Ah y cargador DC18RC. Comprado hace 1 año, poco uso (trabajo particular). En perfecto estado con todos sus accesorios.\n\nIncluye:\n• Taladro Makita DHP484Z\n• 2 baterías Li-Ion 18V 3Ah\n• Cargador rápido DC18RC\n• Bolso transportador original\n• Mandril 13mm con llave\n• Set de 20 brocas HSS\n\nCaracterísticas:\n• 2 velocidades: 0-550 / 0-2100 rpm\n• Par máximo 50Nm\n• Percusión: hasta 31.500 golpes/min\n• Pesa solo 1.8kg con batería\n\nFactura de compra disponible.',
      price: 145000,
      currency: 'ARS',
      condition: 'GOOD' as Condition,
      category: 'herramientas',
      city: 'Mar del Plata',
      province: 'Buenos Aires',
      latitude: -37.9965,
      longitude: -57.5484,
      views: 98,
      saves: 7,
      promoted: false,
      images: [
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1581147036324-c71f53b6c01b?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Sofía Torres',
    email: 'sofia.torres@demo.com',
    phone: '+54 387 234-5567',
    bio: 'Veterinaria de profesión. Vendo artículos para mascotas y equipamiento médico veterinario. Salta capital.',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 5.0,
    ratingCount: 34,
    city: 'Salta',
    province: 'Salta',
    listing: {
      title: 'PlayStation 5 Digital Edition + 2 Controles DualSense',
      description: 'PS5 Digital Edition en perfecto estado. Comprada en diciembre 2022, con factura. Siempre en ambientes frescos y bien ventilados. Nunca abierta para reparaciones.\n\nIncluye:\n• Consola PS5 Digital Edition\n• 2 controles DualSense (blanco y negro)\n• Cable HDMI 2.1 original\n• Cable USB-C\n• Cargador de controles\n• Auricular pulpo original\n\nJuegos incluidos (en formato digital en la cuenta que queda para el comprador):\n• Gran Turismo 7\n• Demon\'s Souls\n• Returnal\n\nLa vendo por cambio a PS5 con disco.',
      price: 620000,
      currency: 'ARS',
      condition: 'GOOD' as Condition,
      category: 'electronica',
      city: 'Salta',
      province: 'Salta',
      latitude: -24.7829,
      longitude: -65.4232,
      views: 445,
      saves: 61,
      promoted: true,
      images: [
        'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Tomás Gutiérrez',
    email: 'tomas.gutierrez@demo.com',
    phone: '+54 11 5678-2234',
    bio: 'DJ y productor musical. Vendo equipo de audio profesional. Todo testeado y en perfecto funcionamiento.',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.3,
    ratingCount: 28,
    city: 'Buenos Aires',
    province: 'CABA',
    listing: {
      title: 'Sillón Seccional L Cuero Genuino Gris Antracita 3+2',
      description: 'Sillón seccional en L, tapizado en cuero genuino importado color gris antracita. Medidas: 320cm x 180cm. 2 años de uso en ambiente de no fumadores, sin mascotas.\n\nCaracterísticas:\n• Cuero legítimo italiano curtido\n• Estructura de madera maciza de eucalipto\n• Espuma HR 45kg/m³ alta resiliencia\n• Patas de acero inoxidable\n• Sistema de reclinación manual en 2 posiciones\n• Cojines incluidos con relleno de pluma\n\nMotivo de venta: mudanza a casa amoblada. El mueble está en perfecto estado, sin desgaste notorio en el cuero. Precio conversable para trato rápido. Requiere flete a cargo del comprador.',
      price: 890000,
      currency: 'ARS',
      condition: 'GOOD' as Condition,
      category: 'hogar-jardin',
      city: 'Buenos Aires',
      province: 'CABA',
      latitude: -34.6037,
      longitude: -58.3816,
      views: 203,
      saves: 19,
      promoted: false,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Ana Ramírez',
    email: 'ana.ramirez@demo.com',
    phone: '+54 381 890-1122',
    bio: 'Profesora de yoga y vida saludable. Vendo equipamiento deportivo y libros. Tucumán.',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
    isVerified: false,
    rating: 4.6,
    ratingCount: 15,
    city: 'San Miguel de Tucumán',
    province: 'Tucumán',
    listing: {
      title: 'Bicicleta Eléctrica Xiaomi Mi Electric Bike - 25km/h',
      description: 'Bicicleta eléctrica Xiaomi Mi Electric Bike (modelo original chino importada), 1 año de uso. Autonomía real de 45km en modo normal. Perfecta para ir al trabajo o la facultad.\n\nEspecificaciones:\n• Motor: 250W brushless\n• Velocidad máxima: 25 km/h\n• Autonomía: hasta 45km\n• Batería: Li-Ion 36V 7.8Ah removible\n• Carga completa: 5.5 horas\n• Peso: 14.5kg\n• Peso máximo soportado: 100kg\n• Frenos: disco hidráulico delantero y trasero\n• Pantalla LCD integrada\n\nIncluye cargador original, candado antirrobo y casco talle M. El motor fue revisado recientemente.',
      price: 480000,
      currency: 'ARS',
      condition: 'GOOD' as Condition,
      category: 'vehiculos',
      city: 'San Miguel de Tucumán',
      province: 'Tucumán',
      latitude: -26.8241,
      longitude: -65.2226,
      views: 156,
      saves: 22,
      promoted: false,
      images: [
        'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1593764592116-bfb2a97c642a?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&h=800&fit=crop',
      ],
    },
  },
  {
    name: 'Facundo Herrera',
    email: 'facundo.herrera@demo.com',
    phone: '+54 11 4890-6634',
    bio: 'Coleccionista de libros y viniles. Librería virtual y venta de discos originales. Zona norte GBA.',
    image: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face',
    isVerified: true,
    rating: 4.9,
    ratingCount: 102,
    city: 'Vicente López',
    province: 'Buenos Aires',
    listing: {
      title: 'MacBook Pro M2 14" 16GB/512GB - Space Gray 2023',
      description: 'MacBook Pro 14" con chip Apple M2 Pro. 10 meses de uso, siempre con funda. Batería al 94% (96 ciclos). Sin rayones ni golpes. Comprada en Apple Store con garantía hasta febrero 2025.\n\nEspecificaciones:\n• Chip: Apple M2 Pro (12 núcleos CPU, 19 núcleos GPU)\n• Memoria: 16GB unificada\n• SSD: 512GB\n• Pantalla: Liquid Retina XDR 14.2" 120Hz\n• Batería: hasta 18 horas de duración\n• Puertos: 3x Thunderbolt 4, HDMI, SD, MagSafe 3\n\nIncluye:\n• Adaptador 96W MagSafe 3\n• Cable USB-C\n• Caja original\n• Garantía Apple transferible\n\nFactura de compra en Apple disponible. No tiene iCloud vinculado. Lista para usar.',
      price: 2100000,
      currency: 'ARS',
      condition: 'LIKE_NEW' as Condition,
      category: 'electronica',
      city: 'Vicente López',
      province: 'Buenos Aires',
      latitude: -34.5256,
      longitude: -58.4766,
      views: 891,
      saves: 134,
      promoted: true,
      images: [
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&h=800&fit=crop',
        'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=800&fit=crop',
      ],
    },
  },
];

// ─── RESEÑAS CRUZADAS ─────────────────────────────────────────────────────────

const REVIEWS = [
  { reviewerIdx: 0, reviewedIdx: 1, rating: 5, comment: 'Excelente vendedor, bici en perfecto estado como la descripción. Recomendado!' },
  { reviewerIdx: 1, reviewedIdx: 0, rating: 5, comment: 'Valentina muy amable y el iPhone justo como lo describe. Transacción impecable.' },
  { reviewerIdx: 2, reviewedIdx: 3, rating: 4, comment: 'Buena atención, la cámara funcionando perfecto. Un poco difícil coordinar el encuentro.' },
  { reviewerIdx: 3, reviewedIdx: 2, rating: 5, comment: 'El Smart TV exactamente como en las fotos. Lucía muy honesta y puntual. 10/10' },
  { reviewerIdx: 4, reviewedIdx: 5, rating: 5, comment: 'El taladro anda genial, Gonzalo muy buena onda. Entrega rápida y todo en orden.' },
  { reviewerIdx: 5, reviewedIdx: 4, rating: 4, comment: 'Las Jordan originales y en el estado descrito. Solo tardó un poco en responder.' },
  { reviewerIdx: 6, reviewedIdx: 7, rating: 5, comment: 'Tomás muy amable, el sillón divino. Coordinó el flete sin problemas. Gracias!' },
  { reviewerIdx: 7, reviewedIdx: 6, rating: 5, comment: 'La PS5 funcionando perfectamente. Sofía super honesta con todo. Muy recomendable.' },
  { reviewerIdx: 8, reviewedIdx: 9, rating: 5, comment: 'La Mac llegó en perfectas condiciones, Facundo brindó toda la documentación. Excelente.' },
  { reviewerIdx: 9, reviewedIdx: 8, rating: 4, comment: 'La bici eléctrica tal cual la descripción. Ana muy responsable. Llegó el mismo día.' },
  { reviewerIdx: 0, reviewedIdx: 9, rating: 5, comment: 'Facundo responde rápido y todo el proceso fue transparente. Recomendado 100%.' },
  { reviewerIdx: 3, reviewedIdx: 6, rating: 5, comment: 'Tomo muy profesional. El sillón hermoso y mejor de lo que esperaba. Gracias!' },
];

// ─── SEGUIMIENTOS ─────────────────────────────────────────────────────────────

const FOLLOWS = [
  [0, 1], [0, 9], [1, 0], [1, 4],
  [2, 0], [2, 3], [3, 2], [3, 9],
  [4, 5], [4, 0], [5, 4], [5, 6],
  [6, 7], [7, 6], [8, 9], [9, 8],
  [0, 7], [2, 8],
];

// ─── SEED PRINCIPAL ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de Conect App...\n');

  // Categorías
  console.log('📦 Creando categorías...');
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = created.id;
  }
  console.log(`   ✅ ${CATEGORIES.length} categorías\n`);

  // Usuarios + publicaciones
  console.log('👥 Creando usuarios y publicaciones...');
  const hashedPassword = await bcrypt.hash('Demo1234!', 10);
  const userIds: string[] = [];

  for (const userData of USERS) {
    const { listing, city: _city, province: _province, ...userInfo } = userData;

    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {},
      create: {
        ...userInfo,
        password: hashedPassword,
      },
    });
    userIds.push(user.id);

    // Publicación
    const categoryId = categoryMap[listing.category];
    const createdListing = await prisma.listing.create({
      data: {
        title:       listing.title,
        description: listing.description,
        price:       listing.price,
        currency:    listing.currency,
        condition:   listing.condition,
        city:        listing.city,
        province:    listing.province,
        latitude:    listing.latitude,
        longitude:   listing.longitude,
        views:       listing.views,
        saves:       listing.saves,
        promoted:    listing.promoted,
        userId:      user.id,
        categoryId,
      },
    });

    // Imágenes
    for (let i = 0; i < listing.images.length; i++) {
      await prisma.listingImage.create({
        data: {
          url:       listing.images[i],
          publicId:  `demo_${user.id}_${i}`,
          order:     i,
          listingId: createdListing.id,
        },
      });
    }

    // Promoción si corresponde
    if (listing.promoted) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      await prisma.promotion.upsert({
        where: { listingId: createdListing.id },
        update: {},
        create: { listingId: createdListing.id, expiresAt },
      });
    }

    console.log(`   ✅ ${userInfo.name} → "${listing.title.substring(0, 40)}..."`);
  }

  // Reseñas
  console.log('\n⭐ Creando reseñas...');
  for (const r of REVIEWS) {
    try {
      await prisma.review.create({
        data: {
          rating:     r.rating,
          comment:    r.comment,
          reviewerId: userIds[r.reviewerIdx],
          reviewedId: userIds[r.reviewedIdx],
        },
      });
    } catch { /* skip duplicates */ }
  }

  // Actualizar ratings calculados
  for (const userId of userIds) {
    const reviews = await prisma.review.findMany({ where: { reviewedId: userId } });
    if (reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await prisma.user.update({
        where: { id: userId },
        data: { rating: Math.round(avg * 10) / 10, ratingCount: reviews.length },
      });
    }
  }
  console.log(`   ✅ ${REVIEWS.length} reseñas\n`);

  // Seguimientos
  console.log('👣 Creando seguimientos...');
  for (const [fIdx, gIdx] of FOLLOWS) {
    try {
      await prisma.follow.create({
        data: { followerId: userIds[fIdx], followingId: userIds[gIdx] },
      });
    } catch { /* skip duplicates */ }
  }
  console.log(`   ✅ ${FOLLOWS.length} seguimientos\n`);

  // Favoritos cruzados
  console.log('❤️  Creando favoritos...');
  const listings = await prisma.listing.findMany();
  const favPairs = [
    [1, 0], [2, 0], [3, 1], [4, 2], [5, 3],
    [6, 4], [7, 5], [8, 6], [9, 7], [0, 8],
    [0, 9], [1, 9], [3, 4], [5, 9], [7, 2],
  ];
  for (const [uIdx, lIdx] of favPairs) {
    if (uIdx < userIds.length && lIdx < listings.length) {
      try {
        await prisma.favorite.create({
          data: { userId: userIds[uIdx], listingId: listings[lIdx].id },
        });
      } catch { /* skip duplicates */ }
    }
  }
  console.log(`   ✅ ${favPairs.length} favoritos\n`);

  // Ofertas de ejemplo
  console.log('💸 Creando ofertas...');
  const offerData = [
    { buyerIdx: 1, sellerIdx: 0, listingIdx: 0, amount: 780000, message: 'Hola! Te ofrezco $780.000. Paso a buscarlo hoy mismo.' },
    { buyerIdx: 2, sellerIdx: 1, listingIdx: 1, amount: 290000, message: 'Me interesa la bici, ¿aceptas $290.000?' },
    { buyerIdx: 3, sellerIdx: 2, listingIdx: 2, amount: 480000, message: 'Muy buen precio el TV. Ofrezco $480k y pago hoy.' },
    { buyerIdx: 0, sellerIdx: 9, listingIdx: 9, amount: 1950000, message: 'Mac de alta! Podemos hacer $1.950.000 al contado?' },
  ];
  for (const o of offerData) {
    try {
      await prisma.offer.create({
        data: {
          amount:    o.amount,
          message:   o.message,
          buyerId:   userIds[o.buyerIdx],
          sellerId:  userIds[o.sellerIdx],
          listingId: listings[o.listingIdx].id,
        },
      });
    } catch { /* skip duplicates */ }
  }
  console.log(`   ✅ ${offerData.length} ofertas\n`);

  // Resumen
  console.log('═══════════════════════════════════════════════');
  console.log('✨ Seed completado!');
  console.log(`   👥 ${USERS.length} usuarios creados`);
  console.log(`   🏷️  10 publicaciones con fotos reales`);
  console.log(`   ⭐ ${REVIEWS.length} reseñas cruzadas`);
  console.log(`   👣 ${FOLLOWS.length} seguimientos`);
  console.log(`   💸 ${offerData.length} ofertas activas`);
  console.log('═══════════════════════════════════════════════');
  console.log('\n🔑 Credenciales de acceso (todos):');
  console.log('   Contraseña: Demo1234!');
  USERS.forEach(u => console.log(`   ${u.email}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
