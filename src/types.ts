/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusinessSettings {
  id?: string;
  companyName: string;
  taxId: string;
  legalAddress: string;
  taxLabel: string;
  taxRate: number;
  applicableZones: string[];
  currency: string;
  decimalFormat: string;
  separator: 'coma' | 'punto';
}

export interface Product {
  id?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  description?: string;
  createdAt: string;
  unitOfMeasure?: string;
  costPrice?: number;
  markupPercent?: number;
  minStock?: number;
}

export interface InventoryMovement {
  id?: string;
  dateTime: string;
  productId: string;
  productName: string;
  imageUrl?: string;
  type: 'ENTRADA' | 'SALIDA' | 'MERMA' | 'VENTA' | 'AJUSTE';
  quantity: number;
  responsible: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id?: string;
  ticketNo: string;
  dateTime: string; // e.g., "Hoy, 14:32" or ISO string
  products: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  category?: string;
  subtotal: number;
  tax: number;
  total: number;
  customerId?: string;
  customerName?: string;
  status: 'COMPLETADO' | 'PENDIENTE' | 'CANCELADO';
  payments?: {
    efectivo?: number;
    pagoMovilVenezuela?: number;
    pagoMovilBanesco?: number;
    pendiente?: number;
  };
}

export interface PurchaseOrder {
  id?: string;
  orderId: string;
  supplier: string;
  supplierId?: string;
  date: string;
  amount: number;
  status: 'RECIBIDO' | 'PENDIENTE' | 'CANCELADO' | 'EN TRÁNSITO';
  isInvoice?: boolean;
  items?: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  stockProcessed?: boolean;
}

export interface Supplier {
  id?: string;
  rifCedula: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  contacto: string;
  email: string;
  calificacion: number; // 1-5 estrellas
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  dni?: string;
  segment: 'VIP' | 'VIP PRESTIGE' | 'RECURRENTE' | 'NUEVO';
  totalSpent: number;
  lastPurchaseDate?: string;
  lastTicketNo?: string;
}

export interface Employee {
  id?: string;
  name: string;
  role: string;
  email: string;
  status: 'EN TURNO' | 'EN DESCANSO' | 'INACTIVO';
  shiftStart: string;
  shiftEnd: string;
  imageUrl: string;
  terminal: string;
}

export interface CashboxSession {
  id?: string;
  openedAt: string;       // ISO string or formatted string
  closedAt?: string | null;
  date: string;           // "YYYY-MM-DD"
  initialCash: number;
  expectedCash: number;   // initialCash + manual entries - manual withdrawals + sales cash payments
  actualCash?: number | null;
  difference?: number | null;
  status: 'OPEN' | 'CLOSED';
  openedBy: string;
  closedBy?: string | null;
  notes?: string;
}

export interface CashboxTransaction {
  id?: string;
  cashboxId: string;
  dateTime: string;       // "Hoy, HH:MM" or ISO
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  concept: string;
  reference?: string;     // e.g. "Ticket #1234"
  responsible: string;
  paymentMethod?: 'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO' | 'PENDIENTE';
  customerName?: string;
}

export interface FinanceMovement {
  id?: string;
  concept: string;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  date: string;
  account: string;
  details?: string;
}


