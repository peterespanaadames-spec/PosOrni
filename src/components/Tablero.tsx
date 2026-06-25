/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product, Transaction, PurchaseOrder } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface TableroProps {
  products: Product[];
  transactions: Transaction[];
  purchaseOrders: PurchaseOrder[];
  setCurrentTab: (tab: string) => void;
  currency?: string;
}

export const Tablero: React.FC<TableroProps> = ({ products, transactions, purchaseOrders, setCurrentTab, currency = 'USD' }) => {
  const symbol = getCurrencySymbol(currency);
  // Math calculations based on database arrays
  const lowStockCount = products.filter(p => p.stock <= 5).length;
  const pendingPurchasesCount = purchaseOrders.filter(po => po.status === 'PENDIENTE').length;

  // Calculate today's sales
  const todayStr = 'Hoy';
  const todayTransactions = transactions.filter(t => t.dateTime.startsWith(todayStr));
  const todaySalesTotal = todayTransactions.reduce((acc, curr) => acc + curr.total, 0);

  // Calculate monthly total for the current calendar month only
  const isCurrentMonth = (dateTimeStr: string): boolean => {
    if (!dateTimeStr) return false;
    
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();

    // 1. Check for "Hoy"
    if (dateTimeStr.toLowerCase().includes('hoy')) {
      return true;
    }

    // 2. Check for "Ayer"
    if (dateTimeStr.toLowerCase().includes('ayer')) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return yesterday.getMonth() === currentMonth && yesterday.getFullYear() === currentYear;
    }

    // 3. Try parsing with standard Date parser
    let cleanStr = dateTimeStr.trim();
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.getMonth() === currentMonth && (cleanStr.includes(String(currentYear)) || !/\b20\d{2}\b/.test(cleanStr));
    }

    // 4. Custom parsing for formats like "14 May, 10:45"
    const monthsEs = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const monthsEn = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    
    const lowerStr = cleanStr.toLowerCase();
    
    let foundMonthIdx = -1;
    for (let i = 0; i < 12; i++) {
      if (lowerStr.includes(monthsEs[i]) || lowerStr.includes(monthsEn[i])) {
        foundMonthIdx = i;
        break;
      }
    }

    if (foundMonthIdx !== -1) {
      const monthMatches = foundMonthIdx === currentMonth;
      const yearMatch = lowerStr.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        return monthMatches && parseInt(yearMatch[1], 10) === currentYear;
      }
      return monthMatches;
    }

    // 5. Check if it's DD/MM/YYYY or YYYY-MM-DD
    const ddmmyyyy = lowerStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      return month === currentMonth && year === currentYear;
    }

    const yyyymmdd = lowerStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      return month === currentMonth && year === currentYear;
    }

    return false;
  };

  const monthlySalesTotal = transactions
    .filter(t => isCurrentMonth(t.dateTime))
    .reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full" id="tablero-view">
      {/* 4 KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5" id="tablero-kpi-grid">
        {/* KPI 1 */}
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm" id="kpi-today-sales">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">VENTAS DIARIAS</span>
            <p className="text-2xl font-bold text-[#131b2e]">{symbol}{todaySalesTotal.toFixed(2)}</p>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span> +12.4% vs ayer
            </span>
          </div>
          <div className="w-12 h-12 bg-[#b4edec]/40 rounded-2xl flex items-center justify-center text-[#003535]">
            <span className="material-symbols-outlined text-2xl font-semibold">payments</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm" id="kpi-monthly-sales">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">FACTURACIÓN MENSUAL</span>
            <p className="text-2xl font-bold text-[#131b2e]">{symbol}{monthlySalesTotal.toFixed(2)}</p>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span> +8.2% este mes
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-2xl font-semibold">monitoring</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm" id="kpi-pending-orders">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">COMPRAS PENDIENTES</span>
            <p className="text-2xl font-bold text-[#131b2e]">{pendingPurchasesCount}</p>
            <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">schedule</span> Requiere revisión
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <span className="material-symbols-outlined text-2xl font-semibold">shopping_cart_checkout</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm" id="kpi-stock-alerts">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">ALERTAS DE STOCK</span>
            <p className="text-2xl font-bold text-[#131b2e]">{lowStockCount}</p>
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              <span className="material-symbols-outlined text-xs">{lowStockCount > 0 ? 'warning' : 'check_circle'}</span> 
              {lowStockCount > 0 ? 'Niveles críticos' : 'Todo en orden'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <span className="material-symbols-outlined text-2xl font-semibold">warehouse</span>
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="tablero-split-section">
        {/* Sales trend & charts left column */}
        <div className="lg:col-span-2 space-y-6" id="tablero-left-column">
          {/* Trend Chart Mock Card */}
          <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-4" id="sales-trend-card">
            <div className="flex items-center justify-between" id="trend-header">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]">Gráfico de Ventas de la Semana</h3>
                <p className="text-[11px] text-[#5f656c] font-medium">Volumen de transacciones registradas</p>
              </div>
              <span className="text-xs font-semibold text-[#003535] bg-[#b4edec]/30 px-3 py-1 rounded-full cursor-pointer hover:bg-[#b4edec]/50">Exportar CSV</span>
            </div>

            {/* Custom Interactive SVG Line Chart */}
            <div className="h-56 w-full flex items-end justify-between pt-4 relative" id="trend-chart-area">
              {/* Background horizontal lines */}
              <div className="absolute inset-x-0 top-0 border-t border-[#f2f3ff] h-0"></div>
              <div className="absolute inset-x-0 top-1/4 border-t border-[#f2f3ff] h-0"></div>
              <div className="absolute inset-x-0 top-2/4 border-t border-[#f2f3ff] h-0"></div>
              <div className="absolute inset-x-0 top-3/4 border-t border-[#f2f3ff] h-0"></div>

              {/* Dynamic weekly sales rendering bars/lines */}
              <div className="w-full h-full absolute inset-0 z-10 flex items-end justify-around px-4">
                {[
                  { day: 'Lunes', val: 1200, pct: '45%' },
                  { day: 'Martes', val: 1800, pct: '62%' },
                  { day: 'Miércoles', val: 1450, pct: '52%' },
                  { day: 'Jueves', val: 2400, pct: '85%' },
                  { day: 'Viernes', val: 2850, pct: '98%' },
                  { day: 'Sábado', val: 2100, pct: '75%' },
                  { day: 'Domingo', val: todaySalesTotal || 950, pct: `${Math.min(100, Math.max(25, (todaySalesTotal / 3000) * 100))}%` }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 group w-12" id={`chart-bar-${idx}`}>
                    {/* Tooltip on hover */}
                    <span className="opacity-0 group-hover:opacity-100 bg-[#003535] text-white text-[10px] font-semibold py-1 px-2 rounded-lg absolute bottom-[105%] transition-opacity shadow-md pointer-events-none z-20">
                      {symbol}{item.val.toFixed(0)}
                    </span>
                    {/* Bar graphic with rounded top */}
                    <div 
                      className="w-4 bg-gradient-to-t from-[#003535]/80 to-[#003535] rounded-t-lg transition-all duration-500 ease-out cursor-pointer hover:shadow-lg hover:shadow-[#003535]/20 hover:scale-x-125"
                      style={{ height: item.pct }}
                    ></div>
                    <span className="text-[10px] font-semibold text-[#5f656c] font-mono">{item.day.slice(0,3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activities/transactions */}
          <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-4" id="recent-tickets-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#131b2e]">Últimas Transacciones Registradas</h3>
                <p className="text-[11px] text-[#5f656c] font-medium">Historial sincronizado con Firestore</p>
              </div>
              <button 
                onClick={() => setCurrentTab('terminal')} 
                className="text-xs font-bold text-[#003535] hover:underline cursor-pointer"
              >
                Abrir TPV
              </button>
            </div>

            <div className="overflow-x-auto" id="recent-tickets-table-container">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#eaedff]">
                    <th className="pb-3 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Ticket</th>
                    <th className="pb-3 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Fecha / Hora</th>
                    <th className="pb-3 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Comprador</th>
                    <th className="pb-3 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Monto Total</th>
                    <th className="pb-3 text-[10px] font-bold text-[#595f66] uppercase tracking-wider text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaedff]/40 text-xs">
                  {transactions.slice(0, 4).map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-[#faf8ff] transition-colors">
                      <td className="py-3.5 font-bold text-[#131b2e]">{tx.ticketNo}</td>
                      <td className="py-3.5 text-[#5f656c] font-medium">{tx.dateTime}</td>
                      <td className="py-3.5 text-[#131b2e] font-semibold">{tx.customerName || 'Cliente General'}</td>
                      <td className="py-3.5 font-bold text-[#003535]">{symbol}{tx.total.toFixed(2)}</td>
                      <td className="py-3.5 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          tx.status === 'COMPLETADO'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : tx.status === 'PENDIENTE'
                            ? 'bg-amber-50 text-amber-800 border border-amber-100'
                            : 'bg-red-50 text-red-800 border border-red-100'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#5f656c]">No hay transacciones registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column sidebar summaries */}
        <div className="space-y-6" id="tablero-right-column">
          {/* Quick POS action box */}
          <div className="bg-[#003535] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden" id="quick-action-terminal-banner">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#0d4d4d] rounded-full filter blur-xl opacity-40 -mr-10 -mt-10"></div>
            <div className="relative z-10 space-y-4">
              <span className="material-symbols-outlined text-4xl text-[#85bdbc] fill">add_to_queue</span>
              <div className="space-y-1">
                <h4 className="text-base font-bold tracking-tight">Terminal Punto de Venta</h4>
                <p className="text-xs text-[#85bdbc] leading-relaxed">Inicie una nueva venta rápidamente. Seleccione artículos, aplique descuentos y cobre con tarjeta o efectivo.</p>
              </div>
              <button
                onClick={() => setCurrentTab('terminal')}
                className="w-full bg-[#85bdbc] hover:bg-white text-[#003535] py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                id="tablero-open-pos-btn"
              >
                <span>Nueva Venta</span>
                <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Critical Inventory alerts summary panel */}
          <div className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm space-y-4" id="dashboard-stock-alerts-card">
            <div>
              <h3 className="text-sm font-bold text-[#131b2e]">Artículos Bajo en Stock</h3>
              <p className="text-[11px] text-[#5f656c] font-medium">Requiere reabastecimiento urgente</p>
            </div>

            <div className="space-y-3" id="alert-items-list">
              {products.filter(p => p.stock <= 5).slice(0, 3).map((prod, idx) => (
                <div key={prod.id || idx} className="flex items-center justify-between p-3 border border-[#eaedff] rounded-xl hover:bg-[#faf8ff] transition-colors" id={`alert-item-${idx}`}>
                  <div className="flex items-center gap-3">
                    <img src={prod.imageUrl} alt={prod.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 shrink-0" referrerPolicy="no-referrer" />
                    <div>
                      <h4 className="text-xs font-bold text-[#131b2e] truncate max-w-[120px]">{prod.name}</h4>
                      <p className="text-[10px] text-[#5f656c] font-mono">SKU: {prod.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${prod.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {prod.stock === 0 ? 'Agotado' : `${prod.stock} u.`}
                    </span>
                    <p className="text-[9px] text-[#bfc8c8] font-bold uppercase">STOCK ACTUAL</p>
                  </div>
                </div>
              ))}
              {products.filter(p => p.stock <= 5).length === 0 && (
                <div className="text-center py-6 text-xs text-[#5f656c] font-medium flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-3xl text-emerald-500 fill">check_circle</span>
                  <span>Todos los productos tienen niveles de stock excelentes.</span>
                </div>
              )}
            </div>

            {lowStockCount > 0 && (
              <button
                onClick={() => setCurrentTab('inventario')}
                className="w-full border border-[#eaedff] hover:bg-[#faf8ff] text-[#003535] py-2 rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                id="tablero-view-inventory-btn"
              >
                Gestionar Inventario ({lowStockCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
