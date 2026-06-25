/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Transaction } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface InformesProps {
  products: Product[];
  transactions: Transaction[];
  currency?: string;
}

export const Informes: React.FC<InformesProps> = ({ products, transactions, currency = 'USD' }) => {
  const symbol = getCurrencySymbol(currency);
  const now = new Date();

  // Selected period state: 'diario' (daily), 'semanal' (weekly), 'mensual' (monthly), 'trimestral' (quarterly)
  const [selectedPeriod, setSelectedPeriod] = useState<'diario' | 'semanal' | 'mensual' | 'trimestral'>('diario');
  
  // Demo mode toggle state
  const [useDemo, setUseDemo] = useState<boolean>(false);
  
  // Print preview modal state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printFormat, setPrintFormat] = useState<'ticket' | 'carta'>('carta');

  // --- Dynamic Date Parsing Helper ---
  const parseTransactionDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const currentDate = new Date();
    const lower = dateStr.toLowerCase();

    // 1. "hoy, HH:MM" or "hoy"
    if (lower.includes('hoy')) {
      const match = lower.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const d = new Date(currentDate);
        d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
        return d;
      }
      return currentDate;
    }

    // 2. "ayer, HH:MM" or "ayer"
    if (lower.includes('ayer')) {
      const yesterday = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
      const match = lower.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        yesterday.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
      }
      return yesterday;
    }

    // 3. DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY (e.g. "25/6/2026, 14:32:10")
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1; // 0-indexed
      const year = parseInt(slashMatch[3], 10);
      const d = new Date(year, month, day);
      const timeMatch = dateStr.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      }
      return d;
    }

    // 4. "14 May, 10:45" or "14 May" or "14 May, 2026"
    const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const wordDateMatch = lower.match(/(\d{1,2})\s+([a-zñáéíóú]+)/i);
    if (wordDateMatch) {
      const day = parseInt(wordDateMatch[1], 10);
      const monthStr = wordDateMatch[2].substring(0, 3);
      
      let monthIdx = -1;
      for (let i = 0; i < 12; i++) {
        if (monthStr.startsWith(monthsEs[i]) || monthStr.startsWith(monthsEn[i])) {
          monthIdx = i;
          break;
        }
      }
      
      if (monthIdx !== -1) {
        const yearMatch = lower.match(/\b(20\d{2})\b/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : currentDate.getFullYear();
        const d = new Date(year, monthIdx, day);
        const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          d.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
        }
        return d;
      }
    }

    // Fallback standard parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return currentDate;
  };

  // --- Dynamic Calendar-Accurate Demo Data Generator ---
  const getAdjustedDemoTransactions = (period: 'diario' | 'semanal' | 'mensual' | 'trimestral'): Transaction[] => {
    if (period === 'diario') {
      return [
        {
          ticketNo: 'TX-D101',
          dateTime: 'Hoy, 08:30',
          products: [{ productId: '1', name: 'Teclado Mecánico K3', quantity: 1, price: 124.50 }],
          subtotal: 102.89,
          tax: 21.61,
          total: 124.50,
          customerName: 'Pedro Montilla',
          status: 'COMPLETADO',
          payments: { efectivo: 124.50 }
        },
        {
          ticketNo: 'TX-D102',
          dateTime: 'Hoy, 11:15',
          products: [{ productId: '3', name: 'Cuaderno Eco Premium', quantity: 3, price: 15.90 }],
          subtotal: 39.42,
          tax: 8.28,
          total: 47.70,
          customerName: 'Ana María Silva',
          status: 'COMPLETADO',
          payments: { pagoMovilVenezuela: 47.70 }
        },
        {
          ticketNo: 'TX-D103',
          dateTime: 'Hoy, 14:40',
          products: [
            { productId: '2', name: 'Ratón Inalámbrico Pro', quantity: 1, price: 89.00 },
            { productId: '4', name: 'Botella Térmica 750ml', quantity: 1, price: 34.00 }
          ],
          subtotal: 101.65,
          tax: 21.35,
          total: 123.00,
          customerName: 'Carlos Gómez',
          status: 'COMPLETADO',
          payments: { pagoMovilBanesco: 123.00 }
        },
        {
          ticketNo: 'TX-D104',
          dateTime: 'Hoy, 19:10',
          products: [{ productId: '6', name: 'Lámpara Escritorio LED', quantity: 1, price: 45.00 }],
          subtotal: 37.19,
          tax: 7.81,
          total: 45.00,
          customerName: 'Julia Cabrera',
          status: 'COMPLETADO',
          payments: { efectivo: 45.00 }
        }
      ];
    }
    
    if (period === 'semanal') {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        const currentDay = now.getDay();
        const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + i;
        d.setDate(diff);
        days.push(d);
      }
      
      const formatDayTime = (date: Date, timeStr: string) => {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}, ${timeStr}`;
      };

      return [
        {
          ticketNo: 'TX-W101',
          dateTime: formatDayTime(days[0], '10:15'), // Lunes
          products: [{ productId: '1', name: 'Teclado Mecánico K3', quantity: 2, price: 124.50 }],
          subtotal: 205.78,
          tax: 43.22,
          total: 249.00,
          customerName: 'Eduardo Lara',
          status: 'COMPLETADO',
          payments: { efectivo: 249.00 }
        },
        {
          ticketNo: 'TX-W102',
          dateTime: formatDayTime(days[2], '15:30'), // Miércoles
          products: [{ productId: '2', name: 'Ratón Inalámbrico Pro', quantity: 3, price: 89.00 }],
          subtotal: 220.66,
          tax: 46.34,
          total: 267.00,
          customerName: 'Fabiola Ruiz',
          status: 'COMPLETADO',
          payments: { pagoMovilVenezuela: 267.00 }
        },
        {
          ticketNo: 'TX-W103',
          dateTime: formatDayTime(days[4], '11:45'), // Viernes
          products: [{ productId: '4', name: 'Botella Térmica 750ml', quantity: 5, price: 34.00 }],
          subtotal: 140.49,
          tax: 29.51,
          total: 170.00,
          customerName: 'Gustavo Díaz',
          status: 'COMPLETADO',
          payments: { pagoMovilBanesco: 170.00 }
        },
        {
          ticketNo: 'TX-W104',
          dateTime: formatDayTime(days[5], '16:20'), // Sábado
          products: [{ productId: '6', name: 'Lámpara Escritorio LED', quantity: 2, price: 45.00 }],
          subtotal: 74.38,
          tax: 15.62,
          total: 90.00,
          customerName: 'Héctor Soto',
          status: 'COMPLETADO',
          payments: { efectivo: 90.00 }
        }
      ];
    }
    
    if (period === 'mensual') {
      const formatMonthTime = (dayNum: number, timeStr: string) => {
        const d = new Date(now.getFullYear(), now.getMonth(), dayNum);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}, ${timeStr}`;
      };

      return [
        {
          ticketNo: 'TX-M101',
          dateTime: formatMonthTime(3, '09:40'),
          products: [{ productId: '1', name: 'Teclado Mecánico K3', quantity: 5, price: 124.50 }],
          subtotal: 514.46,
          tax: 108.04,
          total: 622.50,
          customerName: 'Inversiones Alfa',
          status: 'COMPLETADO',
          payments: { pagoMovilBanesco: 622.50 }
        },
        {
          ticketNo: 'TX-M102',
          dateTime: formatMonthTime(10, '14:15'),
          products: [{ productId: '2', name: 'Ratón Inalámbrico Pro', quantity: 8, price: 89.00 }],
          subtotal: 588.43,
          tax: 123.57,
          total: 712.00,
          customerName: 'Corporación Beta',
          status: 'COMPLETADO',
          payments: { efectivo: 712.00 }
        },
        {
          ticketNo: 'TX-M103',
          dateTime: formatMonthTime(18, '11:00'),
          products: [{ productId: '3', name: 'Cuaderno Eco Premium', quantity: 25, price: 15.90 }],
          subtotal: 328.51,
          tax: 68.99,
          total: 397.50,
          customerName: 'Distribuidora Gama',
          status: 'COMPLETADO',
          payments: { pagoMovilVenezuela: 397.50 }
        },
        {
          ticketNo: 'TX-M104',
          dateTime: formatMonthTime(25, '15:50'),
          products: [{ productId: '4', name: 'Botella Térmica 750ml', quantity: 12, price: 34.00 }],
          subtotal: 337.19,
          tax: 70.81,
          total: 408.00,
          customerName: 'Eventos Delta',
          status: 'COMPLETADO',
          payments: { efectivo: 408.00 }
        }
      ];
    }
    
    // quarterly
    const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const formatQuarterTime = (monthOffset: number, dayNum: number, timeStr: string) => {
      const d = new Date(now.getFullYear(), currentQuarterStartMonth + monthOffset, dayNum);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}, ${timeStr}`;
    };

    return [
      {
        ticketNo: 'TX-Q101',
        dateTime: formatQuarterTime(0, 12, '10:00'),
        products: [{ productId: '1', name: 'Teclado Mecánico K3', quantity: 15, price: 124.50 }],
        subtotal: 1543.39,
        tax: 324.11,
        total: 1867.50,
        customerName: 'Asociación Metropolitana',
        status: 'COMPLETADO',
        payments: { efectivo: 1867.50 }
      },
      {
        ticketNo: 'TX-Q102',
        dateTime: formatQuarterTime(1, 18, '14:30'),
        products: [{ productId: '6', name: 'Lámpara Escritorio LED', quantity: 20, price: 45.00 }],
        subtotal: 743.80,
        tax: 156.20,
        total: 900.00,
        customerName: 'Sindicato de Comercio',
        status: 'COMPLETADO',
        payments: { pagoMovilBanesco: 900.00 }
      },
      {
        ticketNo: 'TX-Q103',
        dateTime: formatQuarterTime(2, 5, '11:15'),
        products: [{ productId: '2', name: 'Ratón Inalámbrico Pro', quantity: 15, price: 89.00 }],
        subtotal: 1103.31,
        tax: 231.69,
        total: 1335.00,
        customerName: 'Fundación Educativa',
        status: 'COMPLETADO',
        payments: { pagoMovilVenezuela: 1335.00 }
      }
    ];
  };

  // --- Filter Transactions based on Selection ---
  const filteredRealTransactions = transactions.filter(t => {
    const d = parseTransactionDate(t.dateTime);
    if (selectedPeriod === 'diario') {
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === 'semanal') {
      const startOfWeek = new Date(now);
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return d >= startOfWeek && d <= endOfWeek;
    } else if (selectedPeriod === 'mensual') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else { // quarterly
      return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
    }
  });

  // Decide if we fallback to demo data (either explicitly forced or no real transactions are recorded in the range)
  const isDemoActive = useDemo || filteredRealTransactions.length === 0;
  const activeTransactions = isDemoActive 
    ? getAdjustedDemoTransactions(selectedPeriod)
    : filteredRealTransactions;

  // --- Periodic Calculations ---
  const totalSales = activeTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalTransactions = activeTransactions.length;
  const avgTicketVal = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Most common payment method helper
  const getTopPaymentMethod = () => {
    const counts = { efectivo: 0, pagoMovilVenezuela: 0, pagoMovilBanesco: 0, pendiente: 0 };
    activeTransactions.forEach(t => {
      if (t.payments) {
        if (t.payments.efectivo) counts.efectivo += t.payments.efectivo;
        if (t.payments.pagoMovilVenezuela) counts.pagoMovilVenezuela += t.payments.pagoMovilVenezuela;
        if (t.payments.pagoMovilBanesco) counts.pagoMovilBanesco += t.payments.pagoMovilBanesco;
        if (t.payments.pendiente) counts.pendiente += t.payments.pendiente;
      }
    });

    const entries = Object.entries(counts);
    entries.sort((a, b) => b[1] - a[1]);
    
    if (entries[0][1] === 0) return 'Ninguno';
    
    const names: { [key: string]: string } = {
      efectivo: 'Efectivo',
      pagoMovilVenezuela: 'Pago Móvil (Venezuela)',
      pagoMovilBanesco: 'Pago Móvil (Banesco)',
      pendiente: 'Crédito Pendiente'
    };
    return names[entries[0][0]] || 'Mixto';
  };

  const topPaymentMethod = getTopPaymentMethod();

  // Categorized sales calculation
  const categorySales: { [key: string]: number } = {};
  activeTransactions.forEach(t => {
    t.products.forEach(p => {
      const fullProd = products.find(prod => prod.name === p.name);
      const cat = fullProd ? fullProd.category : 'Otros';
      categorySales[cat] = (categorySales[cat] || 0) + (p.price * p.quantity);
    });
  });

  const categoriesList = Object.keys(categorySales).map(key => ({
    name: key,
    value: categorySales[key]
  })).sort((a,b) => b.value - a.value);

  // Top products list based on quantity sold
  const productQuantities: { [key: string]: { qty: number, price: number, img: string } } = {};
  activeTransactions.forEach(t => {
    t.products.forEach(p => {
      const fullProd = products.find(prod => prod.name === p.name);
      const img = fullProd ? fullProd.imageUrl : 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=100';
      if (!productQuantities[p.name]) {
        productQuantities[p.name] = { qty: 0, price: p.price, img };
      }
      productQuantities[p.name].qty += p.quantity;
    });
  });

  const topSellingList = Object.keys(productQuantities).map(name => ({
    name,
    qty: productQuantities[name].qty,
    price: productQuantities[name].price,
    img: productQuantities[name].img,
    revenue: productQuantities[name].qty * productQuantities[name].price
  })).sort((a,b) => b.qty - a.qty).slice(0, 4);

  // --- Dynamic Visual Chart Calculations ---
  const getChartData = () => {
    if (selectedPeriod === 'diario') {
      const brackets = [
        { label: 'Mañana (8:00 - 12:00)', hours: [8, 9, 10, 11], total: 0 },
        { label: 'Mediodía (12:00 - 16:00)', hours: [12, 13, 14, 15], total: 0 },
        { label: 'Tarde (16:00 - 20:00)', hours: [16, 17, 18, 19], total: 0 },
        { label: 'Noche (20:00 - 24:00)', hours: [20, 21, 22, 23], total: 0 },
      ];
      
      activeTransactions.forEach(t => {
        const d = parseTransactionDate(t.dateTime);
        const h = d.getHours();
        const bracket = brackets.find(b => b.hours.includes(h));
        if (bracket) {
          bracket.total += t.total;
        } else {
          if (h < 8) brackets[0].total += t.total;
          else brackets[3].total += t.total;
        }
      });
      return brackets.map(b => ({ name: b.label, total: b.total }));
    }
    
    if (selectedPeriod === 'semanal') {
      const days = [
        { name: 'Lunes', index: 1, total: 0 },
        { name: 'Martes', index: 2, total: 0 },
        { name: 'Miércoles', index: 3, total: 0 },
        { name: 'Jueves', index: 4, total: 0 },
        { name: 'Viernes', index: 5, total: 0 },
        { name: 'Sábado', index: 6, total: 0 },
        { name: 'Domingo', index: 0, total: 0 },
      ];
      
      activeTransactions.forEach(t => {
        const d = parseTransactionDate(t.dateTime);
        const dayIdx = d.getDay();
        const match = days.find(day => day.index === dayIdx);
        if (match) {
          match.total += t.total;
        }
      });
      return days;
    }
    
    if (selectedPeriod === 'mensual') {
      const weeks = [
        { name: 'Semana 1 (1-7)', days: [1,2,3,4,5,6,7], total: 0 },
        { name: 'Semana 2 (8-14)', days: [8,9,10,11,12,13,14], total: 0 },
        { name: 'Semana 3 (15-21)', days: [15,16,17,18,19,20,21], total: 0 },
        { name: 'Semana 4 (22-28)', days: [22,23,24,25,26,27,28], total: 0 },
        { name: 'Semana 5 (29-31)', days: [29,30,31], total: 0 },
      ];
      
      activeTransactions.forEach(t => {
        const d = parseTransactionDate(t.dateTime);
        const dayNum = d.getDate();
        const match = weeks.find(w => w.days.includes(dayNum));
        if (match) {
          match.total += t.total;
        }
      });
      return weeks;
    }
    
    // quarterly
    const currentQuarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const monthNamesEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const qMonths = [
      { name: monthNamesEs[currentQuarterStartMonth], monthIdx: currentQuarterStartMonth, total: 0 },
      { name: monthNamesEs[currentQuarterStartMonth + 1], monthIdx: currentQuarterStartMonth + 1, total: 0 },
      { name: monthNamesEs[currentQuarterStartMonth + 2], monthIdx: currentQuarterStartMonth + 2, total: 0 },
    ];
    
    activeTransactions.forEach(t => {
      const d = parseTransactionDate(t.dateTime);
      const m = d.getMonth();
      const match = qMonths.find(qm => qm.monthIdx === m);
      if (match) {
        match.total += t.total;
      }
    });
    return qMonths;
  };

  const chartData = getChartData();
  const maxChartVal = Math.max(...chartData.map(d => d.total), 100);

  // --- CSV Exporter ---
  const exportToCSV = () => {
    const headers = ['Ticket Nro', 'Fecha/Hora', 'Cliente', 'Subtotal', 'Impuesto', 'Total', 'Metodo Pago', 'Estado'];
    const rows = activeTransactions.map(t => {
      let payMethod = 'Otro';
      if (t.payments) {
        if (t.payments.efectivo) payMethod = 'Efectivo';
        else if (t.payments.pagoMovilVenezuela) payMethod = 'Pago Movil VE';
        else if (t.payments.pagoMovilBanesco) payMethod = 'Pago Movil Banesco';
        else if (t.payments.pendiente) payMethod = 'Pendiente';
      }
      return [
        t.ticketNo,
        t.dateTime,
        t.customerName || 'Cliente General',
        t.subtotal.toFixed(2),
        t.tax.toFixed(2),
        t.total.toFixed(2),
        payMethod,
        t.status
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_ventas_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Period Labels ---
  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'diario': return 'Diario (Hoy)';
      case 'semanal': return 'Semanal (Esta Semana)';
      case 'mensual': return 'Mensual (Este Mes)';
      case 'trimestral': return 'Trimestral (Este Trimestre)';
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="informes-view">
      
      {/* Top action header card */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 bg-white p-6 border border-[#eaedff] rounded-2xl shadow-sm" id="informes-toolbar">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold text-[#131b2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003535]">analytics</span>
            Informes y Cierres de Ventas
          </h2>
          <p className="text-xs text-[#5f656c] font-medium">Analiza el rendimiento comercial y genera cierres de caja imprimibles.</p>
        </div>

        {/* User Selection Menu for period & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle Simulated Data */}
          <div className="flex items-center gap-2 bg-[#f8f9ff] px-3.5 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold text-[#131b2e]">
            <span>Datos Demo:</span>
            <button 
              onClick={() => setUseDemo(!useDemo)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useDemo || filteredRealTransactions.length === 0 ? 'bg-emerald-600' : 'bg-gray-300'}`}
              type="button"
              id="demo-data-toggle"
              title={filteredRealTransactions.length === 0 ? "Activado automáticamente por falta de transacciones reales" : "Activar para ver gráficos completos"}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useDemo || filteredRealTransactions.length === 0 ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Selector Menu Buttons */}
          <div className="flex bg-[#f2f3ff] p-1 rounded-xl border border-[#eaedff]">
            {(['diario', 'semanal', 'mensual', 'trimestral'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 capitalize ${
                  selectedPeriod === p 
                    ? 'bg-[#003535] text-white shadow-sm' 
                    : 'text-[#595f66] hover:text-[#131b2e]'
                }`}
                id={`btn-period-${p}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Action Tools */}
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 border border-[#eaedff] text-[#003535] rounded-xl text-xs font-bold bg-white hover:bg-[#fcfcff] flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
            id="btn-export-csv"
            title="Exportar registros a archivo Excel/CSV"
          >
            <span className="material-symbols-outlined text-base">download</span>
            CSV
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-[#003535] text-white rounded-xl text-xs font-bold hover:bg-[#002020] flex items-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
            id="btn-open-print"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* Demo status alert banner */}
      {isDemoActive && (
        <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-[11px] font-semibold text-amber-800 flex items-center justify-between" id="demo-banner">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-amber-600 animate-pulse">warning</span>
            <span>
              {filteredRealTransactions.length === 0 
                ? "No hay transacciones registradas en este período. Mostrando datos de simulación interactiva." 
                : "Se encuentra visualizando los datos de demostración pre-cargados."}
            </span>
          </div>
          {filteredRealTransactions.length > 0 && (
            <button 
              onClick={() => setUseDemo(false)} 
              className="underline hover:text-amber-950 font-bold ml-2 shrink-0"
            >
              Ver mis datos reales ({filteredRealTransactions.length})
            </button>
          )}
        </div>
      )}

      {/* Metrics line stats tailored for Selected Period */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="informes-metrics-row">
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-1" id="metric-period-revenue">
          <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">INGRESOS DEL PERÍODO</span>
          <p className="text-2xl font-bold text-[#003535]">{symbol}{totalSales.toFixed(2)}</p>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">trending_up</span> Facturación acumulada
          </span>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-1" id="metric-period-txs">
          <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">TRANSACCIONES</span>
          <p className="text-2xl font-bold text-[#131b2e]">{totalTransactions} vts</p>
          <span className="text-[10px] font-semibold text-[#5f656c] flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">receipt_long</span> Ventas procesadas
          </span>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-1" id="metric-period-ticket">
          <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">TICKET PROMEDIO</span>
          <p className="text-2xl font-bold text-[#131b2e]">{symbol}{avgTicketVal.toFixed(2)}</p>
          <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">arrow_drop_up</span> Valor por cliente
          </span>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-1" id="metric-period-pago">
          <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">MÉTODO PAGO PREFERIDO</span>
          <p className="text-base font-bold text-[#003535] truncate pt-1">{topPaymentMethod}</p>
          <span className="text-[10px] font-semibold text-[#5f656c]">Mayor volumen de entrada</span>
        </div>
      </div>

      {/* Visual Analytics and Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="informes-charts-grid">
        
        {/* Sales Dynamic Visual Bar Chart */}
        <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between" id="visual-trend-card">
          <div>
            <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#003535]">bar_chart</span>
              Tendencia de Ventas - Período {getPeriodLabel()}
            </h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Historial gráfico de facturación por intervalo de tiempo</p>
          </div>

          {/* Custom Columns Visual Chart */}
          <div className="h-64 flex flex-col justify-end pt-4" id="visual-trend-canvas">
            <div className="flex-1 flex items-end justify-between gap-4 border-b border-[#eaedff] pb-1 relative">
              
              {/* Horizontal Help Line Markers */}
              <div className="absolute inset-x-0 top-0 border-t border-dashed border-[#f1f3ff] text-[8px] font-mono text-[#bfc8c8] text-right pt-0.5">
                máx {symbol}{maxChartVal.toFixed(0)}
              </div>
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#f1f3ff] text-[8px] font-mono text-[#bfc8c8] text-right pt-0.5">
                {symbol}{(maxChartVal / 2).toFixed(0)}
              </div>

              {chartData.map((d, idx) => {
                const heightPct = maxChartVal > 0 ? (d.total / maxChartVal) * 85 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 scale-0 group-hover:scale-100 bg-[#131b2e] text-white font-mono text-[9px] font-bold px-2 py-1 rounded shadow-md transition-all duration-150 z-10 whitespace-nowrap">
                      {symbol}{d.total.toFixed(2)}
                    </div>

                    {/* Colored Bar */}
                    <div 
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[48px] bg-gradient-to-t from-[#003535] to-[#85bdbc] rounded-t-lg transition-all duration-500 ease-out hover:brightness-110 shadow-sm relative"
                    >
                      {/* Inner highlight */}
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-white/20 rounded-t-lg" />
                    </div>

                    {/* Value Label inside bar if it's high enough */}
                    {d.total > 0 && (
                      <span className="text-[9px] font-bold text-[#003535] font-mono mt-1 shrink-0">
                        {symbol}{d.total.toFixed(0)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom text labels */}
            <div className="flex justify-between gap-4 pt-2">
              {chartData.map((d, idx) => (
                <span key={idx} className="flex-1 text-center text-[9px] font-bold text-[#595f66] truncate">
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Category Breakdown visual Donut Chart */}
        <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between" id="visual-category-card">
          <div>
            <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#003535]">donut_large</span>
              Distribución por Categorías - {getPeriodLabel()}
            </h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Volumen de ventas segmentado por tipo de artículo</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            {/* Custom SVG Donut wheel with precise styling */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0" id="donut-svg-container">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f2f3ff" strokeWidth="6" />
                
                {/* Visual arc segments (dynamic visual representation) */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#003535" strokeWidth="6" 
                  strokeDasharray="45 55" strokeDashoffset="0" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#a3b4cd" strokeWidth="6" 
                  strokeDasharray="30 70" strokeDashoffset="-45" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#85bdbc" strokeWidth="6" 
                  strokeDasharray="15 85" strokeDashoffset="-75" />
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#5f656c" strokeWidth="6" 
                  strokeDasharray="10 90" strokeDashoffset="-90" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold text-[#003535] leading-none">{symbol}{totalSales.toFixed(0)}</span>
                <span className="text-[7px] font-bold text-[#bfc8c8] uppercase tracking-wider mt-0.5">TOTAL PERÍODO</span>
              </div>
            </div>

            {/* Legends list */}
            <div className="space-y-2.5 flex-1 w-full" id="donut-legends">
              {categoriesList.map((cat, i) => {
                const colors = ['#003535', '#a3b4cd', '#85bdbc', '#5f656c'];
                const color = colors[i % colors.length];
                const percentage = totalSales > 0 ? (cat.value / totalSales) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs font-semibold text-[#595f66] p-1.5 border-b border-[#f2f3ff] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                      <span className="text-[#131b2e] truncate max-w-[100px]">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-[#003535] shrink-0">
                      {symbol}{cat.value.toFixed(2)} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
              {categoriesList.length === 0 && (
                <div className="text-xs font-semibold text-[#bfc8c8] text-center py-6">
                  No hay datos registrados en este período.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top products & Periodic Detailed sales log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="informes-bottom-grid">
        
        {/* Left Col: Artículos Más Vendidos */}
        <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-1" id="top-selling-card">
          <div>
            <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#003535]">star</span>
              Artículos Más Vendidos
            </h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Ranking del período según unidades cobradas</p>
          </div>

          <div className="space-y-3" id="top-products-list">
            {topSellingList.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-[#eaedff] rounded-xl hover:bg-[#faf8ff] transition-colors" id={`top-prod-${idx}`}>
                <div className="flex items-center gap-2.5">
                  <img src={prod.img} alt={prod.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-[#eaedff] shrink-0" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#131b2e] truncate max-w-[120px]">{prod.name}</h4>
                    <p className="text-[9px] text-[#5f656c] font-mono font-semibold">Uds: {prod.qty} u.</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-[#003535] font-mono">{symbol}{prod.revenue.toFixed(2)}</span>
                  <p className="text-[8px] text-[#bfc8c8] font-bold uppercase tracking-wider">REVENUE</p>
                </div>
              </div>
            ))}
            {topSellingList.length === 0 && (
              <div className="py-12 text-center text-xs text-[#5f656c] font-medium">
                No hay ventas en este período para generar el ranking.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Detalle de Transacciones */}
        <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2 flex flex-col justify-between" id="periodic-sales-log-card">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#003535]">list_alt</span>
              Registros del Período
            </h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Listado detallado de tickets y cobros correspondientes</p>
          </div>

          <div className="overflow-x-auto border border-[#eaedff] rounded-xl h-60" id="sales-log-table-wrapper">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#fcfcff] border-b border-[#eaedff] text-[#595f66] font-bold">
                  <th className="py-2 px-3">Ticket Nro</th>
                  <th className="py-2 px-3">Fecha / Hora</th>
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3 text-right">Monto Total</th>
                  <th className="py-2 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f3ff] font-medium text-[#131b2e]">
                {activeTransactions.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[#f8f9ff]">
                    <td className="py-2 px-3 font-mono font-bold text-[#003535]">{t.ticketNo}</td>
                    <td className="py-2 px-3 text-[#5f656c]">{t.dateTime}</td>
                    <td className="py-2 px-3 truncate max-w-[120px]">{t.customerName || 'Cliente General'}</td>
                    <td className="py-2 px-3 font-mono text-right font-bold text-[#003535]">{symbol}{t.total.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        t.status === 'COMPLETADO' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {activeTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#5f656c] font-medium">
                      No se han encontrado registros en este rango de fecha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pt-2 text-[10px] text-[#bfc8c8] font-bold uppercase tracking-wider text-right">
            Total Registros: {activeTransactions.length}
          </div>
        </div>
      </div>

      {/* --- Elegant Print Preview Modal --- */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-[#070b13]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="print-preview-modal">
          
          {/* Dynamic Style block to inject printing configurations */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-report, #printable-report * {
                visibility: visible !important;
              }
              #printable-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: white !important;
                color: black !important;
                padding: 10px !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-[#eaedff] flex flex-col h-[85vh]" id="print-modal-box">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#eaedff] flex items-center justify-between no-print shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#003535]">print</span>
                  Asistente de Reportes Impresos
                </h3>
                <p className="text-[11px] text-[#5f656c] font-semibold">Configura el formato físico del reporte periódico de caja.</p>
              </div>

              {/* Toggles and close */}
              <div className="flex items-center gap-4">
                <div className="flex bg-[#f2f3ff] p-1 rounded-xl border border-[#eaedff] text-xs font-bold">
                  <button 
                    onClick={() => setPrintFormat('carta')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${printFormat === 'carta' ? 'bg-[#003535] text-white' : 'text-[#595f66] hover:text-[#131b2e]'}`}
                  >
                    Formato Carta (A4)
                  </button>
                  <button 
                    onClick={() => setPrintFormat('ticket')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${printFormat === 'ticket' ? 'bg-[#003535] text-white' : 'text-[#595f66] hover:text-[#131b2e]'}`}
                  >
                    Formato Tique (80mm)
                  </button>
                </div>

                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="w-8 h-8 rounded-full border border-[#eaedff] text-[#595f66] hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition-all shrink-0"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="p-6 bg-gray-50 flex-1 overflow-y-auto flex justify-center" id="print-preview-container">
              
              {/* Report Layout Container */}
              <div 
                id="printable-report"
                className={`bg-white text-gray-900 border border-[#eaedff] h-fit transition-all duration-300 ${
                  printFormat === 'ticket' 
                    ? 'w-[80mm] p-4 text-xs font-mono shadow-sm' 
                    : 'w-full max-w-[210mm] p-10 shadow-lg text-sm rounded-xl'
                }`}
              >
                {/* Header (Corporate Details) */}
                <div className="text-center space-y-2 border-b border-gray-200 pb-4 mb-4">
                  <h1 className={`${printFormat === 'ticket' ? 'text-sm font-bold' : 'text-xl font-black'} uppercase tracking-tight text-gray-950`}>
                    VENTASPRO RETAIL S.L.
                  </h1>
                  <p className={`${printFormat === 'ticket' ? 'text-[9px]' : 'text-xs'} text-gray-600 font-medium`}>
                    RIF: J-12345678-9 | Tel: +58 212 951 1122
                  </p>
                  <p className={`${printFormat === 'ticket' ? 'text-[9px]' : 'text-xs'} text-gray-600 font-medium`}>
                    Calle Principal Nro. 123, Chacao, Caracas
                  </p>
                  
                  {/* Division Line */}
                  <div className="border-t border-dashed border-gray-300 my-2" />

                  <h2 className={`${printFormat === 'ticket' ? 'text-xs font-bold' : 'text-md font-bold'} text-gray-900 uppercase`}>
                    REPORTE DE VENTAS {selectedPeriod}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-semibold font-mono">
                    Emitido: {now.toLocaleString('es-VE')}
                  </p>
                </div>

                {/* KPI Overview Metrics */}
                <div className={`mb-6 ${printFormat === 'ticket' ? 'space-y-1.5' : 'grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100'}`}>
                  <div className={printFormat === 'ticket' ? 'flex justify-between border-b border-gray-100 pb-1' : ''}>
                    <span className="text-gray-500 text-[10px] font-bold uppercase block">Ingresos Totales</span>
                    <strong className="text-gray-950 text-md font-bold block font-mono">{symbol}{totalSales.toFixed(2)}</strong>
                  </div>
                  <div className={printFormat === 'ticket' ? 'flex justify-between border-b border-gray-100 pb-1' : ''}>
                    <span className="text-gray-500 text-[10px] font-bold uppercase block">Nro. Ventas</span>
                    <strong className="text-gray-950 text-md font-bold block font-mono">{totalTransactions} vts</strong>
                  </div>
                  <div className={printFormat === 'ticket' ? 'flex justify-between border-b border-gray-100 pb-1 border-dashed' : ''}>
                    <span className="text-gray-500 text-[10px] font-bold uppercase block">Ticket Promedio</span>
                    <strong className="text-gray-950 text-md font-bold block font-mono">{symbol}{avgTicketVal.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Categories Table Summary */}
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-gray-950 uppercase border-b border-gray-200 pb-1 mb-2">
                    Resumen por Categorías
                  </h3>
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-600">
                        <th className="py-1">Categoría</th>
                        <th className="py-1 text-right">Subtotal</th>
                        <th className="py-1 text-right">Porcentaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoriesList.map((cat, i) => {
                        const pct = totalSales > 0 ? (cat.value / totalSales) * 100 : 0;
                        return (
                          <tr key={i} className="text-gray-900">
                            <td className="py-1 font-sans font-medium">{cat.name}</td>
                            <td className="py-1 text-right font-bold">{symbol}{cat.value.toFixed(2)}</td>
                            <td className="py-1 text-right text-gray-500">{pct.toFixed(0)}%</td>
                          </tr>
                        );
                      })}
                      {categoriesList.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 text-center text-gray-500">No hay categorías.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Top Products Table Summary */}
                <div className="mb-6">
                  <h3 className="text-[11px] font-bold text-gray-950 uppercase border-b border-gray-200 pb-1 mb-2">
                    Artículos más Vendidos
                  </h3>
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-600">
                        <th className="py-1">Producto</th>
                        <th className="py-1 text-center">Unidades</th>
                        <th className="py-1 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSellingList.map((prod, i) => (
                        <tr key={i} className="text-gray-900">
                          <td className="py-1 font-sans font-medium truncate max-w-[150px]">{prod.name}</td>
                          <td className="py-1 text-center font-bold">{prod.qty} u.</td>
                          <td className="py-1 text-right font-bold">{symbol}{prod.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                      {topSellingList.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-2 text-center text-gray-500">No hay artículos vendidos.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Ticket List */}
                <div className="mb-8">
                  <h3 className="text-[11px] font-bold text-gray-950 uppercase border-b border-gray-200 pb-1 mb-2">
                    Relación de Tickets de Caja
                  </h3>
                  <table className="w-full text-left font-mono text-[9px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-600">
                        <th className="py-1">Doc. Nro</th>
                        <th className="py-1">Cliente</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTransactions.map((t, i) => (
                        <tr key={i} className="text-gray-900">
                          <td className="py-1 font-bold">{t.ticketNo}</td>
                          <td className="py-1 text-gray-600 truncate max-w-[100px] font-sans">{t.customerName || 'General'}</td>
                          <td className="py-1 text-right font-bold">{symbol}{t.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Corporate Footer (Signatures) */}
                <div className="mt-12 text-center space-y-6 pt-4 border-t border-dashed border-gray-300">
                  <p className="text-[9px] text-gray-500 italic">
                    "Garantía de transparencia comercial - Sistema de VentasPRO"
                  </p>
                  
                  {/* Signature Area (Always Letter formatted) */}
                  {printFormat === 'carta' && (
                    <div className="grid grid-cols-2 gap-12 pt-8 text-center text-[10px] text-gray-700 font-bold uppercase font-mono">
                      <div className="space-y-1">
                        <div className="border-b border-gray-400 mx-8 h-8" />
                        <p>Firma Cajero / Operador</p>
                      </div>
                      <div className="space-y-1">
                        <div className="border-b border-gray-400 mx-8 h-8" />
                        <p>Firma Gerente / Auditor</p>
                      </div>
                    </div>
                  )}

                  {printFormat === 'ticket' && (
                    <div className="space-y-4 text-center text-[9px] font-bold uppercase font-mono">
                      <div className="border-b border-gray-300 mx-12 pt-8" />
                      <p>Firma Responsable Autorizado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-[#eaedff] flex items-center justify-between no-print shrink-0 bg-gray-50 rounded-b-2xl">
              <span className="text-[11px] font-semibold text-[#5f656c] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-600 animate-pulse">check_circle</span>
                Documento listo para envío e impresión fiscal.
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 border border-[#eaedff] text-[#595f66] rounded-xl text-xs font-bold bg-white hover:bg-gray-100 transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-[#003535] text-white rounded-xl text-xs font-bold hover:bg-[#002020] flex items-center gap-1.5 shadow-md transition-all active:scale-[0.98]"
                  id="btn-trigger-print"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Proceder a Imprimir / Guardar PDF
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
