/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessSettings, Product, Client, Employee, PurchaseOrder, Transaction, InventoryMovement, Supplier } from './types';

export const defaultSettings: BusinessSettings = {
  companyName: 'VentasPRO Retail S.L.',
  taxId: 'B-12345678',
  legalAddress: 'Calle Principal 123, Madrid, España',
  taxLabel: 'IVA',
  taxRate: 21,
  applicableZones: ['ESPAÑA CONTINENTAL', 'PORTUGAL', 'FRANCIA'],
  currency: 'USD',
  decimalFormat: '2',
  separator: 'coma'
};

export const defaultProducts: Product[] = [
  {
    name: 'Teclado Mecánico K3',
    sku: '0984-TK',
    category: 'Electrónica',
    price: 124.50,
    stock: 24,
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=400',
    description: 'Sleek modern mechanical keyboard, high contrast photography, soft shadows, clean edges.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Ratón Inalámbrico Pro',
    sku: '4421-MS',
    category: 'Accesorio',
    price: 89.00,
    stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=400',
    description: 'Minimalist professional wireless mouse on a felt mat.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Cuaderno Eco Premium',
    sku: '7722-NB',
    category: 'Papelería',
    price: 15.90,
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&q=80&w=400',
    description: 'High-quality sustainable notebooks stacked on a wooden desk.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Botella Térmica 750ml',
    sku: '1104-WB',
    category: 'Hogar',
    price: 34.00,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400',
    description: 'Modern matte black water bottle with minimalist branding.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Auriculares ANC Gen 2',
    sku: '2201-HP',
    category: 'Electrónica',
    price: 210.00,
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400',
    description: 'Noise-cancelling headphones on a simple stand.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Lámpara Escritorio LED',
    sku: '5566-LD',
    category: 'Hogar',
    price: 45.00,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=400',
    description: 'Minimalist desk lamp with an adjustable arm, warm light glowing.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Smartwatch Sport Lite',
    sku: '9911-SW',
    category: 'Accesorio',
    price: 159.00,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=400',
    description: 'Smart watch with a clean white band.',
    createdAt: new Date().toISOString()
  },
  {
    name: 'Funda Portátil Cuero',
    sku: '8833-LS',
    category: 'Accesorio',
    price: 65.00,
    stock: 19,
    imageUrl: 'https://images.unsplash.com/photo-1512318015841-3c7451aa0ce9?auto=format&fit=crop&q=80&w=400',
    description: 'Premium leather laptop sleeve, rich brown texture.',
    createdAt: new Date().toISOString()
  }
];

export const defaultClients: Client[] = [
  {
    name: 'Elena Casado',
    email: 'elena.casado@email.com',
    phone: '+34 612 345 678',
    dni: '12345678A',
    segment: 'VIP PRESTIGE',
    totalSpent: 4520.00,
    lastPurchaseDate: 'Hace 2 días',
    lastTicketNo: 'Ticket #9042'
  },
  {
    name: 'Javier Soler',
    email: 'j.soler@pro-services.es',
    phone: '+34 622 345 678',
    dni: '87654321B',
    segment: 'VIP',
    totalSpent: 2145.50,
    lastPurchaseDate: 'Hace 5 días',
    lastTicketNo: 'Ticket #8991'
  },
  {
    name: 'Marta Alarcón',
    email: 'marta.alarcon@gmail.com',
    phone: '+34 633 456 789',
    dni: '56781234C',
    segment: 'VIP',
    totalSpent: 1890.20,
    lastPurchaseDate: 'Hace 12 días',
    lastTicketNo: 'Ticket #8852'
  },
  {
    name: 'Ricardo Gómez',
    email: 'rgomez@techcorp.com',
    phone: '+34 644 567 890',
    dni: '43218765D',
    segment: 'VIP PRESTIGE',
    totalSpent: 6710.00,
    lastPurchaseDate: 'Ayer',
    lastTicketNo: 'Ticket #9102'
  }
];

export const defaultEmployees: Employee[] = [
  {
    name: 'Carlos Mendoza',
    role: 'Supervisor de Piso',
    email: 'carlos.mendoza@ventaspro.com',
    status: 'EN TURNO',
    shiftStart: '08:00',
    shiftEnd: '16:00',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    terminal: 'Terminal 04'
  },
  {
    name: 'Elena Rivas',
    role: 'Cajera Senior',
    email: 'elena.rivas@ventaspro.com',
    status: 'EN TURNO',
    shiftStart: '09:30',
    shiftEnd: '17:30',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    terminal: 'Terminal 01'
  },
  {
    name: 'Sofía Guerrero',
    role: 'Ventas',
    email: 'sofia.guerrero@ventaspro.com',
    status: 'EN DESCANSO',
    shiftStart: '10:00',
    shiftEnd: '18:00',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    terminal: 'Sección A'
  }
];

export const defaultPurchaseOrders: PurchaseOrder[] = [
  {
    orderId: '#PO-24012',
    supplier: 'Distribuidora Central S.A.',
    date: '14 Oct, 2023',
    amount: 4250.00,
    status: 'RECIBIDO'
  },
  {
    orderId: '#PO-24015',
    supplier: 'Vinos & Licores Premium',
    date: '22 Oct, 2023',
    amount: 12800.45,
    status: 'PENDIENTE'
  },
  {
    orderId: '#PO-23998',
    supplier: 'Importaciones Gala',
    date: '10 Oct, 2023',
    amount: 1120.00,
    status: 'CANCELADO'
  },
  {
    orderId: '#PO-24018',
    supplier: 'Panadería El Sol',
    date: 'Ayer, 08:45 AM',
    amount: 650.00,
    status: 'PENDIENTE'
  },
  {
    orderId: '#PO-24020',
    supplier: 'Carnes del Norte',
    date: 'Hoy, 09:12 AM',
    amount: 2340.00,
    status: 'EN TRÁNSITO'
  },
  {
    orderId: '#PO-23985',
    supplier: 'Lácteos Frescura',
    date: '05 Oct, 2023',
    amount: 1890.00,
    status: 'RECIBIDO'
  }
];

export const defaultTransactions: Transaction[] = [
  {
    ticketNo: 'TX-9021',
    dateTime: 'Hoy, 14:22',
    products: [
      { productId: '1', name: 'Teclado Mecánico K3', quantity: 1, price: 124.50 },
      { productId: '2', name: 'Ratón Inalámbrico Pro', quantity: 1, price: 89.00 }
    ],
    category: 'Ventas',
    subtotal: 176.45,
    tax: 37.05,
    total: 213.50,
    customerName: 'Ana García',
    status: 'COMPLETADO'
  },
  {
    ticketNo: 'TX-9020',
    dateTime: 'Hoy, 14:15',
    products: [
      { productId: '6', name: 'Lámpara Escritorio LED', quantity: 1, price: 45.00 }
    ],
    category: 'Servicios',
    subtotal: 37.19,
    tax: 7.81,
    total: 45.00,
    customerName: 'Suministros Oficina',
    status: 'COMPLETADO'
  },
  {
    ticketNo: 'TX-9019',
    dateTime: 'Ayer, 13:58',
    products: [
      { productId: '3', name: 'Cuaderno Eco Premium', quantity: 2, price: 15.90 }
    ],
    category: 'Inventario',
    subtotal: 26.28,
    tax: 5.52,
    total: 31.80,
    customerName: 'Compra de Mercancía',
    status: 'PENDIENTE'
  },
  {
    ticketNo: 'TX-9018',
    dateTime: 'Ayer, 13:45',
    products: [
      { productId: '4', name: 'Botella Térmica 750ml', quantity: 1, price: 34.00 }
    ],
    category: 'Ventas',
    subtotal: 28.10,
    tax: 5.90,
    total: 34.00,
    customerName: 'Juan Carlos',
    status: 'COMPLETADO'
  }
];

export const defaultInventoryMovements: InventoryMovement[] = [
  {
    dateTime: '14 May, 10:45',
    productId: '1',
    productName: 'Cartera Cuero Minimal',
    imageUrl: 'https://images.unsplash.com/photo-1512318015841-3c7451aa0ce9?auto=format&fit=crop&q=80&w=400',
    type: 'ENTRADA',
    quantity: 50,
    responsible: 'Carlos Méndez'
  },
  {
    dateTime: '14 May, 09:20',
    productId: '4',
    productName: 'Vela Aromática Sándalo',
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=400',
    type: 'MERMA',
    quantity: -2,
    responsible: 'Elena Rivas'
  },
  {
    dateTime: '14 May, 08:15',
    productId: '3',
    productName: 'Taza Cerámica Nordic',
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&q=80&w=400',
    type: 'AJUSTE',
    quantity: 5,
    responsible: 'Sistema (Auto)'
  },
  {
    dateTime: '13 May, 18:30',
    productId: '7',
    productName: 'Gafas de Sol Urban',
    imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&q=80&w=400',
    type: 'VENTA',
    quantity: -1,
    responsible: 'Terminal TPV-01'
  }
];

export const defaultSuppliers: Supplier[] = [
  {
    rifCedula: 'J-12345678-9',
    razonSocial: 'Distribuidora Central S.A.',
    direccion: 'Av. Francisco de Miranda, Edif. Centro Seguros, Chacao, Caracas',
    telefono: '+58 212 951 1122',
    contacto: 'María Alejandra Gómez',
    email: 'ventas@districentral.es',
    calificacion: 5
  },
  {
    rifCedula: 'J-87654321-0',
    razonSocial: 'Vinos & Licores Premium, C.A.',
    direccion: 'Zona Industrial El Piñonal, Galpón 4, Maracay, Aragua',
    telefono: '+58 243 234 5678',
    contacto: 'Carlos Eduardo Mendoza',
    email: 'contacto@vinospremium.com',
    calificacion: 4
  },
  {
    rifCedula: 'J-45678912-3',
    razonSocial: 'Importaciones Gala C.A.',
    direccion: 'Calle 72 con Av. Bella Vista, Centro Comercial Gala, Maracaibo, Zulia',
    telefono: '+58 261 798 4321',
    contacto: 'Gisela Bermúdez',
    email: 'gala@importgala.com',
    calificacion: 4
  }
];

