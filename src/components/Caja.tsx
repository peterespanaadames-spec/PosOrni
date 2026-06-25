/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CashboxSession, CashboxTransaction, Transaction } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface CajaProps {
  user: any;
  currency?: string;
  sessions: CashboxSession[];
  transactions: CashboxTransaction[];
  salesTransactions?: Transaction[];
  onSettlePendingDebt?: (transactionId: string, paymentMethod: 'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO', amountPaid: number) => Promise<void>;
  onOpenCaja: (initialCash: number, notes?: string) => Promise<void>;
  onCloseCaja: (id: string, actualCash: number, notes?: string) => Promise<void>;
  onAddTransaction: (type: 'INGRESO' | 'EGRESO', amount: number, concept: string, notes?: string) => Promise<void>;
  companyName?: string;
}

export const Caja: React.FC<CajaProps> = ({
  user,
  currency = 'USD',
  sessions,
  transactions,
  salesTransactions = [],
  onSettlePendingDebt,
  onOpenCaja,
  onCloseCaja,
  onAddTransaction,
  companyName = 'VentasPro',
}) => {
  const symbol = getCurrencySymbol(currency);
  const [toast, setToast] = useState<string | null>(null);
  const [printReportData, setPrintReportData] = useState<any | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'efectivo' | 'pago_movil' | 'pendientes'>('efectivo');

  // Settling debt modal state
  const [settlingTx, setSettlingTx] = useState<Transaction | null>(null);
  const [settleMethod, setSettleMethod] = useState<'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO'>('EFECTIVO');
  const [settleLoading, setSettleLoading] = useState(false);

  // Opening form state
  const [initialCashStr, setInitialCashStr] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [openingLoading, setOpeningLoading] = useState(false);

  // Close form state
  const [actualCashStr, setActualCashStr] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingLoading, setClosingLoading] = useState(false);

  // Manual transaction form state
  const [txType, setTxType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [txAmountStr, setTxAmountStr] = useState('');
  const [txConcept, setTxConcept] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  // Active Session helper
  const activeSession = sessions.find((s) => s.status === 'OPEN');

  // Filter sessions and transactions
  const activeSessionTransactions = activeSession
    ? transactions.filter((t) => t.cashboxId === activeSession.id)
    : [];

  // Check if there is an unclosed session from a PREVIOUS day
  const todayStr = new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD"
  const previousUnclosedSession = sessions.find(
    (s) => s.status === 'OPEN' && s.date !== todayStr
  );

  // Filter active session transactions by payment method
  const cashTransactions = activeSessionTransactions.filter(
    (t) => !t.paymentMethod || t.paymentMethod === 'EFECTIVO'
  );

  const pagoMovilTransactions = activeSessionTransactions.filter(
    (t) => t.paymentMethod === 'PAGO_MOVIL_VENEZUELA' || t.paymentMethod === 'PAGO_MOVIL_BANESCO'
  );

  const pendienteSessionTransactions = activeSessionTransactions.filter(
    (t) => t.paymentMethod === 'PENDIENTE'
  );

  // Calculate session aggregates
  const initialCash = activeSession?.initialCash || 0;
  
  const totalSalesCash = activeSessionTransactions
    .filter((t) => t.type === 'INGRESO' && t.reference?.startsWith('Ticket') && (!t.paymentMethod || t.paymentMethod === 'EFECTIVO'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalManualInflow = activeSessionTransactions
    .filter((t) => t.type === 'INGRESO' && !t.reference?.startsWith('Ticket') && (!t.paymentMethod || t.paymentMethod === 'EFECTIVO'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalManualOutflow = activeSessionTransactions
    .filter((t) => t.type === 'EGRESO')
    .reduce((sum, t) => sum + t.amount, 0);

  const expectedCash = initialCash + totalSalesCash + totalManualInflow - totalManualOutflow;

  // Electronic & Credit aggregates for active session
  const totalSalesPagoMovilVenezuela = activeSessionTransactions
    .filter((t) => t.type === 'INGRESO' && t.paymentMethod === 'PAGO_MOVIL_VENEZUELA')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSalesPagoMovilBanesco = activeSessionTransactions
    .filter((t) => t.type === 'INGRESO' && t.paymentMethod === 'PAGO_MOVIL_BANESCO')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSalesPagoMovil = totalSalesPagoMovilVenezuela + totalSalesPagoMovilBanesco;

  const totalSalesPendiente = activeSessionTransactions
    .filter((t) => t.type === 'INGRESO' && t.paymentMethod === 'PENDIENTE')
    .reduce((sum, t) => sum + t.amount, 0);

  // Global pending relations list (All unpaid/credits in database)
  const allPendingSales = (salesTransactions || [])
    .filter((s) => s.status === 'PENDIENTE' || (s.payments?.pendiente && s.payments.pendiente > 0));

  const totalGlobalPendingAmount = allPendingSales
    .reduce((sum, s) => sum + (s.payments?.pendiente || 0), 0);

  // Handlers
  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    const initialAmt = parseFloat(initialCashStr);
    if (isNaN(initialAmt) || initialAmt < 0) {
      alert('Por favor introduzca un monto inicial válido.');
      return;
    }

    if (previousUnclosedSession) {
      alert(
        `Debes cerrar la caja pendiente del día anterior (${previousUnclosedSession.date}) antes de abrir una nueva.`
      );
      return;
    }

    setOpeningLoading(true);
    try {
      await onOpenCaja(initialAmt, openingNotes);
      
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      const openedAtStr = today.toLocaleString('es-VE', { timeZone: 'America/Caracas' });
      const pendingList = allPendingSales.map(tx => ({
        ticketNo: tx.ticketNo,
        customerName: tx.customerName || 'Cliente General',
        amount: tx.payments?.pendiente || tx.total
      }));

      setPrintReportData({
        type: 'APERTURA',
        date: todayStr,
        openedAt: openedAtStr,
        openedBy: user?.displayName || 'Administrador',
        initialCash: initialAmt,
        notes: openingNotes,
        pendingSalesCount: pendingList.length,
        pendingSalesTotal: totalGlobalPendingAmount,
        pendingSalesList: pendingList
      });

      setInitialCashStr('');
      setOpeningNotes('');
      showToast('Caja abierta exitosamente y se generó el reporte impreso.');
    } catch (err) {
      console.error(err);
      alert('Error abriendo caja.');
    } finally {
      setOpeningLoading(false);
    }
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !activeSession.id) return;

    const actualAmt = parseFloat(actualCashStr);
    if (isNaN(actualAmt) || actualAmt < 0) {
      alert('Por favor introduzca el arqueo de efectivo real en caja.');
      return;
    }

    setClosingLoading(true);
    try {
      const today = new Date();
      const closedAtStr = today.toLocaleString('es-VE', { timeZone: 'America/Caracas' });
      const pendingList = allPendingSales.map(tx => ({
        ticketNo: tx.ticketNo,
        customerName: tx.customerName || 'Cliente General',
        amount: tx.payments?.pendiente || tx.total
      }));

      const reportPayload = {
        type: 'CIERRE' as const,
        date: activeSession.date,
        openedAt: activeSession.openedAt,
        closedAt: closedAtStr,
        openedBy: activeSession.openedBy,
        closedBy: user?.displayName || 'Administrador',
        initialCash: activeSession.initialCash,
        expectedCash: expectedCash,
        actualCash: actualAmt,
        difference: actualAmt - expectedCash,
        notes: closingNotes,
        salesCash: totalSalesCash,
        manualInflow: totalManualInflow,
        manualOutflow: totalManualOutflow,
        pagoMovilVenezuela: totalSalesPagoMovilVenezuela,
        pagoMovilBanesco: totalSalesPagoMovilBanesco,
        pendingSalesCount: pendingList.length,
        pendingSalesTotal: totalGlobalPendingAmount,
        pendingSalesList: pendingList
      };

      await onCloseCaja(activeSession.id, actualAmt, closingNotes);
      
      setPrintReportData(reportPayload);
      setActualCashStr('');
      setClosingNotes('');
      showToast('Caja cerrada con éxito y se generó el reporte impreso.');
    } catch (err) {
      console.error(err);
      alert('Error cerrando caja.');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmountStr);
    if (isNaN(amt) || amt <= 0) {
      alert('Introduzca un monto mayor a cero.');
      return;
    }
    if (!txConcept.trim()) {
      alert('Introduzca un concepto o descripción del movimiento.');
      return;
    }

    setTxLoading(true);
    try {
      await onAddTransaction(txType, amt, txConcept.trim(), txNotes.trim());
      setTxAmountStr('');
      setTxConcept('');
      setTxNotes('');
      showToast('Movimiento de caja registrado exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error registrando movimiento de caja.');
    } finally {
      setTxLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const parseDateTime = (dateTimeStr: string) => {
    try {
      if (dateTimeStr.includes('Hoy')) return dateTimeStr;
      const date = new Date(dateTimeStr);
      return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateTimeStr;
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none relative" id="caja-view">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#003535] text-white text-xs font-bold py-3 px-5 rounded-2xl shadow-xl z-50 flex items-center gap-2 border border-[#85bdbc]/30 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Warning if a previous session is still open */}
      {previousUnclosedSession && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl shadow-xs flex items-start gap-3 animate-pulse" id="caja-warning-previous-open">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">warning</span>
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Caja del Día Anterior Pendiente por Cerrar</h4>
            <p className="text-xs font-medium text-amber-800">
              Hay una sesión de caja abierta con fecha <span className="font-bold">{previousUnclosedSession.date}</span>. El sistema tiene bloqueada la facturación de nuevas ventas y la apertura de hoy hasta que se realice el arqueo y cierre formal de la caja pendiente.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner with Session Status */}
      <div className="bg-gradient-to-r from-[#003535] to-[#0a4646] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="caja-status-banner">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${activeSession ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            <span className="material-symbols-outlined text-2xl font-bold">
              {activeSession ? 'lock_open' : 'lock'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85bdbc] uppercase tracking-wider block">Estado de Caja Diaria</span>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-white">
                {activeSession ? `ABIERTA - Sesión del ${activeSession.date}` : 'CERRADA - Requiere Apertura'}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${activeSession ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {activeSession ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
          </div>
        </div>
        {activeSession && (
          <div className="text-xs text-[#85bdbc] border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6 space-y-1">
            <p className="font-semibold text-white">Cajero: <span className="font-normal font-mono text-[#85bdbc]">{activeSession.openedBy}</span></p>
            <p className="text-[10px]">Apertura: {activeSession.openedAt}</p>
          </div>
        )}
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-gray-200 gap-1.5" id="caja-tab-selectors">
        <button
          onClick={() => setActiveTab('efectivo')}
          className={`py-3 px-5 text-xs font-extrabold uppercase flex items-center gap-2 border-b-2 cursor-pointer transition-all ${activeTab === 'efectivo' ? 'border-[#003535] text-[#003535]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <span className="material-symbols-outlined text-sm font-bold">payments</span>
          <span>Efectivo y Arqueo</span>
        </button>
        <button
          onClick={() => setActiveTab('pago_movil')}
          className={`py-3 px-5 text-xs font-extrabold uppercase flex items-center gap-2 border-b-2 cursor-pointer transition-all ${activeTab === 'pago_movil' ? 'border-[#003535] text-[#003535]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <span className="material-symbols-outlined text-sm font-bold">phone_android</span>
          <span>Pago Móvil ({symbol}{totalSalesPagoMovil.toFixed(2)})</span>
        </button>
        <button
          onClick={() => setActiveTab('pendientes')}
          className={`py-3 px-5 text-xs font-extrabold uppercase flex items-center gap-2 border-b-2 cursor-pointer transition-all ${activeTab === 'pendientes' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          <span className="material-symbols-outlined text-sm font-bold">receipt_long</span>
          <span>Relación de Pendientes ({allPendingSales.length})</span>
        </button>
      </div>

      {activeTab === 'pendientes' ? (
        /* PENDIENTES GRID (Accessible both open and closed) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="caja-pendientes-workspace">
          <div className="lg:col-span-2 space-y-6">
            {/* Pendientes summary */}
            <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">Relación de Cuentas por Cobrar (Pendientes)</h4>
                <p className="text-xs text-amber-800 font-medium">Deudas activas y créditos otorgados que deben ser registrados en la caja diaria.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">MONTO TOTAL ADEUDADO</span>
                <p className="text-2xl font-black text-amber-800 font-mono">{symbol}{totalGlobalPendingAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Table of Pending sales */}
            <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="caja-pendientes-ledger">
              <div className="p-5 border-b border-[#eaedff] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#131b2e] uppercase">Cuentas Pendientes</h3>
                  <p className="text-[11px] text-[#5f656c] font-medium">Registro histórico detallado de clientes con deudas por saldar.</p>
                </div>
                <span className="text-[10px] font-bold bg-[#f2f3ff] text-amber-700 px-2.5 py-1 rounded-xl font-mono">
                  {allPendingSales.length} deudas
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                      <th className="py-3.5 px-5">Operación / Ticket</th>
                      <th className="py-3.5 px-5">Fecha</th>
                      <th className="py-3.5 px-5">Cliente</th>
                      <th className="py-3.5 px-5 text-right">Monto Adeudado</th>
                      <th className="py-3.5 px-5 text-center">Estado</th>
                      <th className="py-3.5 px-5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                    {allPendingSales.map((tx, idx) => {
                      const amountOwed = tx.payments?.pendiente || tx.total;
                      return (
                        <tr key={tx.id || idx} className="hover:bg-[#faf8ff] transition-colors">
                          <td className="py-3.5 px-5 font-mono text-xs font-bold">Ticket {tx.ticketNo}</td>
                          <td className="py-3.5 px-5 font-mono text-[#5f656c]">{tx.dateTime}</td>
                          <td className="py-3.5 px-5 font-bold text-slate-700">{tx.customerName || 'Cliente General'}</td>
                          <td className="py-3.5 px-5 font-extrabold text-right font-mono text-amber-600">
                            {symbol}{amountOwed.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider bg-amber-50 text-amber-800">
                              PENDIENTE
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => setSettlingTx(tx)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[10px]">payments</span>
                              <span>Saldar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {allPendingSales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400 font-medium text-xs">
                          No existen deudas pendientes en el historial del negocio. ¡Todo al día!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-[#131b2e] uppercase">Gestión de Crédito</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                Esta sección enumera todas las ventas realizadas bajo la modalidad de **Crédito Pendiente**.
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                Cuando el cliente cancele o realice un abono, haga clic en el botón **"Saldar"** de la fila correspondiente para registrar la recepción del dinero e ingresarlo en las cuentas de hoy.
              </p>
              <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-[10px] font-semibold text-amber-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-sm shrink-0">info</span>
                <span>Al saldar una cuenta, se generará de manera automática un ingreso en la caja de hoy.</span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'pago_movil' ? (
        activeSession ? (
          /* PAGO MOVIL ACTIVE WORKSPACE */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="caja-pagomovil-workspace">
            <div className="lg:col-span-2 space-y-6">
              {/* Pago Móvil Summary Panel */}
              <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">Canales de Pago Móvil Activos</h4>
                  <p className="text-xs text-blue-700 font-medium">Resumen de conciliación bancaria de transacciones recibidas por vía electrónica hoy.</p>
                </div>
                <div className="flex gap-6">
                  <div className="text-right border-r border-blue-200/50 pr-6">
                    <span className="text-[9px] font-bold text-blue-800 uppercase block">PAGO MÓVIL BANESCO</span>
                    <p className="text-xl font-black text-blue-800 font-mono">{symbol}{totalSalesPagoMovilBanesco.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-blue-800 uppercase block">PAGO MÓVIL VENEZUELA</span>
                    <p className="text-xl font-black text-blue-800 font-mono">{symbol}{totalSalesPagoMovilVenezuela.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Table of Pago Móvil transactions */}
              <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="caja-pagomovil-ledger">
                <div className="p-5 border-b border-[#eaedff] flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#131b2e] uppercase">Transacciones de Pago Móvil</h3>
                    <p className="text-[11px] text-[#5f656c] font-medium">Relación de pagos electrónicos asociados a tickets facturados hoy.</p>
                  </div>
                  <span className="text-[10px] font-bold bg-[#f2f3ff] text-[#003535] px-2.5 py-1 rounded-xl font-mono">
                    {pagoMovilTransactions.length} pagos
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                        <th className="py-3.5 px-5">Hora</th>
                        <th className="py-3.5 px-5">Cliente</th>
                        <th className="py-3.5 px-5">Operación / Ticket</th>
                        <th className="py-3.5 px-5 text-center">Banco Canal</th>
                        <th className="py-3.5 px-5 text-right">Monto Recibido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                      {pagoMovilTransactions.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-[#faf8ff] transition-colors">
                          <td className="py-3.5 px-5 font-mono text-[#5f656c]">{parseDateTime(tx.dateTime)}</td>
                          <td className="py-3.5 px-5 font-bold text-slate-700">{tx.customerName || 'Cliente General'}</td>
                          <td className="py-3.5 px-5 font-mono text-xs font-semibold">{tx.reference || '-'}</td>
                          <td className="py-3.5 px-5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${tx.paymentMethod === 'PAGO_MOVIL_BANESCO' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              {tx.paymentMethod === 'PAGO_MOVIL_BANESCO' ? 'BANESCO' : 'VENEZUELA'}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 font-extrabold text-right font-mono text-[#003535]">
                            {symbol}{tx.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {pagoMovilTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-gray-400 font-medium text-xs">
                            No se han registrado pagos por Pago Móvil en esta sesión de caja.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-[#131b2e] uppercase">Canales Electrónicos</h4>
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                  Los montos recibidos por Pago Móvil ingresan directamente a las cuentas bancarias de la empresa y no forman parte del arqueo físico de efectivo de caja.
                </p>
                <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl font-mono text-[9px] text-blue-800 space-y-1">
                  <p className="font-extrabold uppercase">Canales del Día:</p>
                  <p>• Venezuela: {symbol}{totalSalesPagoMovilVenezuela.toFixed(2)}</p>
                  <p>• Banesco: {symbol}{totalSalesPagoMovilBanesco.toFixed(2)}</p>
                  <p className="font-extrabold border-t border-blue-200/50 pt-1 mt-1">Total: {symbol}{totalSalesPagoMovil.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PAGO MOVIL CLOSED WORKSPACE */
          <div className="bg-[#f2f3ff]/30 border border-dashed border-[#eaedff] rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4" id="caja-pagomovil-closed">
            <div className="w-16 h-16 bg-[#b4edec]/30 text-[#003535] rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-bold">lock</span>
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-sm font-extrabold text-[#131b2e] uppercase">Caja Cerrada</h4>
              <p className="text-xs text-[#5f656c] font-medium leading-relaxed">
                Por favor, realice la apertura de la caja diaria para poder consultar o conciliar las transacciones de Pago Móvil de hoy.
              </p>
            </div>
          </div>
        )
      ) : activeSession ? (
        /* ACTIVE SESSION LAYOUT (EFECTIVO) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="caja-active-workspace">
          {/* Dashboard Summary Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cash KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="caja-kpis-grid">
              {/* Card 1: Carga Inicial */}
              <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider">Carga de Efectivo</span>
                  <span className="material-symbols-outlined text-lg text-blue-500">input</span>
                </div>
                <div>
                  <span className="text-[9px] block text-[#bfc8c8] font-bold uppercase">Base de Apertura</span>
                  <p className="text-xl font-extrabold text-[#131b2e] font-mono">{symbol}{initialCash.toFixed(2)}</p>
                </div>
              </div>

              {/* Card 2: Ingresos Totales */}
              <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Entradas</span>
                  <span className="material-symbols-outlined text-lg text-emerald-600">trending_up</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-[8px] block text-[#bfc8c8] font-bold uppercase">En Ventas</span>
                    <p className="text-xs font-bold text-[#131b2e] font-mono">+{symbol}{totalSalesCash.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-[8px] block text-[#bfc8c8] font-bold uppercase">Manuales</span>
                    <p className="text-xs font-bold text-[#131b2e] font-mono">+{symbol}{totalManualInflow.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Egresos Totales */}
              <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Total Egresos</span>
                  <span className="material-symbols-outlined text-lg text-red-500">trending_down</span>
                </div>
                <div>
                  <span className="text-[9px] block text-[#bfc8c8] font-bold uppercase">Salidas / Gastos</span>
                  <p className="text-xl font-extrabold text-[#ba1a1a] font-mono">-{symbol}{totalManualOutflow.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Expected Cash Large Panel */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">Balance Teórico Esperado</h4>
                <p className="text-xs text-emerald-700 font-medium">Monto que debe haber en la caja física según los registros contables actuales.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">EFECTIVO CALCULADO</span>
                <p className="text-3xl font-black text-emerald-800 font-mono">{symbol}{expectedCash.toFixed(2)}</p>
              </div>
            </div>

            {/* Table of transactions/movements in the current session */}
            <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="caja-transactions-ledger">
              <div className="p-5 border-b border-[#eaedff] flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#131b2e] uppercase">Movimientos de Caja Diaria</h3>
                  <p className="text-[11px] text-[#5f656c] font-medium">Historial detallado de ingresos y egresos de efectivo de la sesión activa.</p>
                </div>
                <span className="text-[10px] font-bold bg-[#f2f3ff] text-[#003535] px-2.5 py-1 rounded-xl font-mono">
                  {cashTransactions.length} movs
                </span>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                      <th className="py-3.5 px-5">Hora</th>
                      <th className="py-3.5 px-5">Responsable</th>
                      <th className="py-3.5 px-5">Concepto</th>
                      <th className="py-3.5 px-5">Referencia</th>
                      <th className="py-3.5 px-5 text-center">Tipo</th>
                      <th className="py-3.5 px-5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                    {cashTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-[#faf8ff] transition-colors">
                        <td className="py-3.5 px-5 font-mono text-[#5f656c]">{parseDateTime(tx.dateTime)}</td>
                        <td className="py-3.5 px-5 font-medium text-slate-700">{tx.responsible}</td>
                        <td className="py-3.5 px-5 font-bold">{tx.concept}</td>
                        <td className="py-3.5 px-5 font-mono text-[10px] text-[#bfc8c8]">{tx.reference || '-'}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${tx.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`py-3.5 px-5 font-extrabold text-right font-mono ${tx.type === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.type === 'INGRESO' ? `+${symbol}${tx.amount.toFixed(2)}` : `-${symbol}${tx.amount.toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                    {cashTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400 font-medium text-xs">
                          No se han registrado movimientos de efectivo en esta sesión.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Action forms panel: manual transaction & cerrar caja */}
          <div className="space-y-6">
            {/* Form: Manual cash insertion / withdrawal */}
            <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-4" id="caja-tx-form">
              <div>
                <h4 className="text-xs font-bold text-[#131b2e] uppercase">Registrar Entrada / Salida</h4>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Movimientos de Efectivo Manuales</p>
              </div>

              <form onSubmit={handleAddTx} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Tipo de Movimiento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTxType('INGRESO')}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${txType === 'INGRESO' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      Ingreso
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('EGRESO')}
                      className={`py-2 px-3 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${txType === 'EGRESO' ? 'bg-red-50 border-ba1a1a text-[#ba1a1a]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                      Egreso / Retiro
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Monto en Efectivo</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-400">{symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={txAmountStr}
                      onChange={(e) => setTxAmountStr(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold font-mono focus:outline-none focus:border-[#003535]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Concepto / Motivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cambio para sencillo, pago delivery"
                    value={txConcept}
                    onChange={(e) => setTxConcept(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-medium focus:outline-none focus:border-[#003535]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Notas Adicionales (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles extras del movimiento"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-medium focus:outline-none focus:border-[#003535] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={txLoading}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${txType === 'INGRESO' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10' : 'bg-[#ba1a1a] hover:bg-[#a01616] text-white shadow-md shadow-red-600/10'}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {txType === 'INGRESO' ? 'add_circle' : 'remove_circle'}
                  </span>
                  <span>{txLoading ? 'Registrando...' : `Registrar ${txType === 'INGRESO' ? 'Ingreso' : 'Egreso'}`}</span>
                </button>
              </form>
            </div>

            {/* Form: Arqueo y Cierre de caja */}
            <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm space-y-4" id="caja-close-form">
              <div>
                <h4 className="text-xs font-bold text-[#131b2e] uppercase text-[#ba1a1a]">Arqueo de Cierre de Caja</h4>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Cerrar Sesión Activa del Día</p>
              </div>

              <form onSubmit={handleClose} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Efectivo Real en Caja (Físico)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-400">{symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Efectivo contado físico"
                      required
                      value={actualCashStr}
                      onChange={(e) => setActualCashStr(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border border-[#eaedff] rounded-xl text-sm font-bold font-mono focus:outline-none focus:border-[#ba1a1a]"
                    />
                  </div>
                </div>

                {/* Real-time difference analysis helper */}
                {actualCashStr && !isNaN(parseFloat(actualCashStr)) && (
                  <div className={`p-3.5 rounded-xl border text-xs font-bold ${Math.abs(parseFloat(actualCashStr) - expectedCash) < 0.05 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex justify-between">
                      <span>Efectivo Teórico:</span>
                      <span className="font-mono">{symbol}{expectedCash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo Declarado:</span>
                      <span className="font-mono">{symbol}{parseFloat(actualCashStr).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-gray-300 mt-1.5 pt-1.5 font-extrabold">
                      <span>Diferencia (Sobrante/Faltante):</span>
                      <span className="font-mono">
                        {(parseFloat(actualCashStr) - expectedCash) >= 0 ? '+' : ''}
                        {symbol}{(parseFloat(actualCashStr) - expectedCash).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-gray-500 mt-1.5 uppercase tracking-wide">
                      {Math.abs(parseFloat(actualCashStr) - expectedCash) < 0.05
                        ? '✓ Cuadre perfecto'
                        : (parseFloat(actualCashStr) - expectedCash) > 0
                        ? '⚠ Sobrante en caja'
                        : '⚠ Faltante en caja (Faltan fondos)'}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Observaciones de Cierre (Opcional)</label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Faltante por dar cambio, etc."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-medium focus:outline-none focus:border-[#ba1a1a] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={closingLoading}
                  className="w-full bg-[#ba1a1a] hover:bg-[#a01616] text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-600/10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>{closingLoading ? 'Procesando Cierre...' : 'Cerrar Caja y Guardar Arqueo'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* CLOSED STATE - REQUIRES OPENING FORM (EFECTIVO) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="caja-closed-workspace">
          {/* Opening session card */}
          <div className="bg-white border border-[#eaedff] p-6 rounded-3xl shadow-sm space-y-5 lg:col-span-1" id="caja-opening-card">
            <div>
              <h3 className="text-sm font-bold text-[#131b2e] uppercase">Apertura de Caja Diaria</h3>
              <p className="text-xs text-[#5f656c] font-medium">Asigne el saldo base de efectivo para dar inicio a la facturación diaria.</p>
            </div>

            <form onSubmit={handleOpen} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Fondo Base de Caja (Carga Inicial)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-gray-400">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={initialCashStr}
                    onChange={(e) => setInitialCashStr(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 border border-[#eaedff] rounded-xl text-sm font-bold font-mono focus:outline-none focus:border-[#003535]"
                  />
                </div>
                <p className="text-[9px] text-[#bfc8c8] font-semibold uppercase">MONTO EN EFECTIVO PARA SENCILLO / CAMBIO</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Notas de Apertura (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Ej. Sencillo en billetes bajos"
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-medium focus:outline-none focus:border-[#003535] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={openingLoading || !!previousUnclosedSession}
                className="w-full bg-[#003535] hover:bg-[#0d4d4d] text-white py-3.5 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#003535]/10 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm font-bold">lock_open</span>
                <span>{openingLoading ? 'Abriendo Caja...' : 'Realizar Apertura de Caja'}</span>
              </button>
            </form>
          </div>

          {/* Block instruction panel */}
          <div className="lg:col-span-2 bg-[#f2f3ff]/30 border border-dashed border-[#eaedff] rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-[#b4edec]/30 text-[#003535] rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-bold">lock</span>
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-sm font-extrabold text-[#131b2e] uppercase">Módulo de Ventas Bloqueado</h4>
              <p className="text-xs text-[#5f656c] font-medium leading-relaxed">
                De acuerdo a las normativas de control fiscal y financiero, **no se permite realizar facturaciones ni registrar ventas** en la terminal POS si no existe una sesión de caja diaria abierta.
              </p>
              <p className="text-xs text-emerald-700 font-bold leading-relaxed">
                Por favor, asigne un fondo inicial de efectivo y abra la caja en el formulario de la izquierda para habilitar la terminal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History of Past Sessions */}
      <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="caja-history">
        <div className="p-5 border-b border-[#eaedff]">
          <h3 className="text-xs font-bold text-[#131b2e] uppercase">Historial de Cajas Diarias</h3>
          <p className="text-[11px] text-[#5f656c] font-medium">Historial completo de cierres diarios, arqueos manuales y discrepancias de efectivo.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Apertura</th>
                <th className="py-4 px-6">Cierre</th>
                <th className="py-4 px-6">Fondo Inicial</th>
                <th className="py-4 px-6">Esperado</th>
                <th className="py-4 px-6">Declarado</th>
                <th className="py-4 px-6">Diferencia</th>
                <th className="py-4 px-6">Responsable</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
              {sessions.map((session, idx) => (
                <tr key={session.id || idx} className="hover:bg-[#faf8ff] transition-colors">
                  <td className="py-4 px-6 font-bold">{session.date}</td>
                  <td className="py-4 px-6 font-mono text-[#5f656c] text-[11px]">{session.openedAt}</td>
                  <td className="py-4 px-6 font-mono text-[#5f656c] text-[11px]">{session.closedAt || '-'}</td>
                  <td className="py-4 px-6 font-mono font-bold">{symbol}{session.initialCash.toFixed(2)}</td>
                  <td className="py-4 px-6 font-mono font-bold text-[#131b2e]">{symbol}{session.expectedCash.toFixed(2)}</td>
                  <td className="py-4 px-6 font-mono font-bold">
                    {session.actualCash !== undefined && session.actualCash !== null ? `${symbol}${session.actualCash.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-4 px-6">
                    {session.difference !== undefined && session.difference !== null ? (
                      <span className={`font-mono font-extrabold ${session.difference === 0 ? 'text-emerald-600' : session.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {session.difference > 0 ? '+' : ''}
                        {symbol}{session.difference.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[#bfc8c8] font-bold">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-semibold text-[#5f656c]">{session.openedBy}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${session.status === 'OPEN' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-800'}`}>
                      {session.status === 'OPEN' ? 'ABIERTA' : 'CERRADA'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => {
                        const sessionTxs = transactions.filter(t => t.cashboxId === session.id);
                        
                        const totalSalesCash = sessionTxs
                          .filter((t) => t.type === 'INGRESO' && t.reference?.startsWith('Ticket') && (!t.paymentMethod || t.paymentMethod === 'EFECTIVO'))
                          .reduce((sum, t) => sum + t.amount, 0);

                        const totalManualInflow = sessionTxs
                          .filter((t) => t.type === 'INGRESO' && !t.reference?.startsWith('Ticket') && (!t.paymentMethod || t.paymentMethod === 'EFECTIVO'))
                          .reduce((sum, t) => sum + t.amount, 0);

                        const totalManualOutflow = sessionTxs
                          .filter((t) => t.type === 'EGRESO')
                          .reduce((sum, t) => sum + t.amount, 0);

                        const totalPMVenezuela = sessionTxs
                          .filter((t) => t.type === 'INGRESO' && t.paymentMethod === 'PAGO_MOVIL_VENEZUELA')
                          .reduce((sum, t) => sum + t.amount, 0);

                        const totalPMBanesco = sessionTxs
                          .filter((t) => t.type === 'INGRESO' && t.paymentMethod === 'PAGO_MOVIL_BANESCO')
                          .reduce((sum, t) => sum + t.amount, 0);

                        const pendingList = allPendingSales.map(tx => ({
                          ticketNo: tx.ticketNo,
                          customerName: tx.customerName || 'Cliente General',
                          amount: tx.payments?.pendiente || tx.total
                        }));

                        setPrintReportData({
                          type: session.status === 'OPEN' ? 'APERTURA' : 'CIERRE',
                          date: session.date,
                          openedAt: session.openedAt,
                          closedAt: session.closedAt || undefined,
                          openedBy: session.openedBy,
                          closedBy: session.closedBy || undefined,
                          initialCash: session.initialCash,
                          expectedCash: session.expectedCash,
                          actualCash: session.actualCash || undefined,
                          difference: session.difference || undefined,
                          notes: session.notes,
                          salesCash: totalSalesCash,
                          manualInflow: totalManualInflow,
                          manualOutflow: totalManualOutflow,
                          pagoMovilVenezuela: totalPMVenezuela,
                          pagoMovilBanesco: totalPMBanesco,
                          pendingSalesCount: pendingList.length,
                          pendingSalesTotal: totalGlobalPendingAmount,
                          pendingSalesList: pendingList
                        });
                      }}
                      className="px-2.5 py-1.5 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#003535] rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">print</span>
                      <span>Imprimir</span>
                    </button>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-gray-400 font-medium text-xs">
                    No hay registros de sesiones de caja diarias en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Pending Debt Modal Overlay */}
      {settlingTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="settle-debt-modal">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-[#eaedff] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-extrabold text-[#131b2e] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-lg font-bold">monetization_on</span>
                  <span>Saldar Cuenta Pendiente</span>
                </h4>
                <p className="text-[10px] text-gray-400 font-mono">Ticket Nº {settlingTx.ticketNo}</p>
              </div>
              <button 
                onClick={() => setSettlingTx(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!activeSession ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2 text-center text-red-900">
                <span className="material-symbols-outlined text-red-500 font-bold text-xl">lock</span>
                <p className="text-xs font-bold uppercase">Caja Cerrada</p>
                <p className="text-[10px] font-medium leading-relaxed">
                  Debe abrir la caja del día de hoy antes de realizar cobros y saldar cuentas pendientes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#f2f3ff]/50 p-3.5 rounded-xl border border-gray-100 space-y-1.5 text-xs text-[#131b2e]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-bold">{settlingTx.customerName || 'Cliente General'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha del Ticket:</span>
                    <span className="font-mono">{settlingTx.dateTime}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-1.5 mt-1.5 font-bold text-amber-700 text-sm">
                    <span>Monto Adeudado:</span>
                    <span className="font-mono">{symbol}{(settlingTx.payments?.pendiente || settlingTx.total).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase block">Método de Pago de Recepción</label>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setSettleMethod('EFECTIVO')}
                      className={`w-full py-2.5 px-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${settleMethod === 'EFECTIVO' ? 'bg-[#b4edec]/30 border-[#003535] text-[#003535]' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm font-bold">payments</span>
                        Efectivo (Ingresa a Caja Física)
                      </span>
                      {settleMethod === 'EFECTIVO' && <span className="material-symbols-outlined text-sm font-bold">check_circle</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleMethod('PAGO_MOVIL_VENEZUELA')}
                      className={`w-full py-2.5 px-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${settleMethod === 'PAGO_MOVIL_VENEZUELA' ? 'bg-[#b4edec]/30 border-[#003535] text-[#003535]' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm font-bold">qr_code_2</span>
                        Pago Móvil Venezuela
                      </span>
                      {settleMethod === 'PAGO_MOVIL_VENEZUELA' && <span className="material-symbols-outlined text-sm font-bold">check_circle</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleMethod('PAGO_MOVIL_BANESCO')}
                      className={`w-full py-2.5 px-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${settleMethod === 'PAGO_MOVIL_BANESCO' ? 'bg-[#b4edec]/30 border-[#003535] text-[#003535]' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm font-bold">account_balance</span>
                        Pago Móvil Banesco
                      </span>
                      {settleMethod === 'PAGO_MOVIL_BANESCO' && <span className="material-symbols-outlined text-sm font-bold">check_circle</span>}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSettlingTx(null)}
                    className="flex-1 py-2.5 border border-[#eaedff] text-xs font-semibold rounded-xl text-[#595f66] hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!onSettlePendingDebt || !settlingTx.id) return;
                      setSettleLoading(true);
                      try {
                        const amt = settlingTx.payments?.pendiente || settlingTx.total;
                        await onSettlePendingDebt(settlingTx.id, settleMethod, amt);
                        setSettlingTx(null);
                        showToast('Deuda saldada correctamente.');
                      } catch (err) {
                        console.error(err);
                        alert('Error al saldar la deuda.');
                      } finally {
                        setSettleLoading(false);
                      }
                    }}
                    disabled={settleLoading}
                    className="flex-1 py-2.5 bg-[#003535] hover:bg-[#0a4646] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    {settleLoading ? 'Procesando...' : 'Confirmar Cobro'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Report Modal Overlay */}
      {printReportData && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" id="print-report-modal">
          <div className="bg-white rounded-3xl w-full max-w-md border border-[#eaedff] shadow-2xl p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h4 className="text-sm font-extrabold text-[#131b2e] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-lg font-bold">receipt_long</span>
                  <span>Reporte de Caja Emitido</span>
                </h4>
                <p className="text-[10px] text-gray-400 font-medium">Documento listo para impresión física o PDF</p>
              </div>
              <button 
                onClick={() => setPrintReportData(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Ticket wrapper (This element gets printed) */}
            <div id="printable-report" className="bg-[#fafbfd] border border-[#eaedff] p-6 rounded-2xl font-mono text-xs text-gray-800 space-y-4 shadow-inner max-h-[420px] overflow-y-auto">
              {/* CSS Rule specifically to override everything on window.print() */}
              <style>{`
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
                    max-height: none !important;
                    overflow: visible !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    background: white !important;
                    font-size: 11pt !important;
                    color: black !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#131b2e] uppercase tracking-wider">{companyName}</p>
                <p className="text-[10px] text-gray-500">SISTEMA POS DE CONTROL DIARIO</p>
                <p className="text-[10px] text-gray-500">----------------------------------</p>
                <p className="text-xs font-bold text-gray-900 uppercase">
                  {printReportData.type === 'APERTURA' ? 'REPORTE DE APERTURA' : 'REPORTE DE CIERRE Y ARQUEO'}
                </p>
                <p className="text-[10px] text-gray-500">----------------------------------</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>FECHA REF:</span>
                  <span className="font-bold">{printReportData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>APERTURA:</span>
                  <span className="font-bold">{printReportData.openedAt || '-'}</span>
                </div>
                {printReportData.type === 'CIERRE' && (
                  <div className="flex justify-between">
                    <span>CIERRE:</span>
                    <span className="font-bold">{printReportData.closedAt || '-'}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>RESPONSABLE:</span>
                  <span className="font-bold uppercase">{printReportData.type === 'APERTURA' ? printReportData.openedBy : (printReportData.closedBy || printReportData.openedBy)}</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center">==================================</p>

              {/* Financial Summary */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>(+) FONDO INICIAL:</span>
                  <span className="font-bold">{symbol}{printReportData.initialCash.toFixed(2)}</span>
                </div>
                
                {printReportData.type === 'CIERRE' && (
                  <>
                    <div className="flex justify-between">
                      <span>(+) VENTAS EFECTIVO:</span>
                      <span className="font-bold">{symbol}{(printReportData.salesCash || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(+) INGRESOS MANUALES:</span>
                      <span className="font-bold text-emerald-700">+{symbol}{(printReportData.manualInflow || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>(-) RETIROS MANUALES:</span>
                      <span className="font-bold text-red-600">-{symbol}{(printReportData.manualOutflow || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-gray-300">----------------------------------</p>
                    <div className="flex justify-between font-bold text-[#131b2e]">
                      <span>(=) EFECTIVO ESPERADO:</span>
                      <span>{symbol}{(printReportData.expectedCash || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-950">
                      <span>(=) EFECTIVO ARQUEADO:</span>
                      <span>{symbol}{(printReportData.actualCash || 0).toFixed(2)}</span>
                    </div>
                    
                    {/* Discrepancy */}
                    <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 font-bold">
                      <span>DIFERENCIA / SALDO:</span>
                      <span className={printReportData.difference === 0 ? 'text-emerald-700' : printReportData.difference > 0 ? 'text-blue-700' : 'text-red-700'}>
                        {printReportData.difference > 0 ? '+' : ''}{symbol}{(printReportData.difference || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Electronic Channels */}
                    <p className="text-[10px] text-gray-400 text-center">==================================</p>
                    <div className="text-center font-bold text-[10px] text-gray-600 tracking-wider">CANALES ELECTRÓNICOS (VENTAS)</div>
                    <p className="text-[10px] text-gray-300">----------------------------------</p>
                    <div className="flex justify-between text-[10px]">
                      <span>P. MÓVIL VENEZUELA:</span>
                      <span className="font-bold">{symbol}{(printReportData.pagoMovilVenezuela || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>P. MÓVIL BANESCO:</span>
                      <span className="font-bold">{symbol}{(printReportData.pagoMovilBanesco || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {printReportData.notes && (
                <>
                  <p className="text-[10px] text-gray-400 text-center">==================================</p>
                  <div className="text-[10px] italic">
                    <span className="font-bold block not-italic">NOTAS DE CAJA:</span>
                    "{printReportData.notes}"
                  </div>
                </>
              )}

              {/* Cumulative Pending Accounts (Debts) Relation */}
              <p className="text-[10px] text-gray-400 text-center">==================================</p>
              <div className="text-center font-bold text-[10px] text-gray-700 tracking-wider">RELACIÓN ACUMULATIVA DE CUENTAS PENDIENTES</div>
              <p className="text-[10px] text-gray-300">----------------------------------</p>
              
              {printReportData.pendingSalesList && printReportData.pendingSalesList.length > 0 ? (
                <div className="space-y-1.5 text-[10px]">
                  {printReportData.pendingSalesList.map((pending: any, pIdx: number) => (
                    <div key={pIdx} className="flex justify-between border-b border-dotted border-gray-200 pb-0.5">
                      <span>T-{pending.ticketNo} {pending.customerName.slice(0, 15)}</span>
                      <span className="font-bold font-mono">{symbol}{pending.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 font-bold text-[11px] text-amber-800">
                    <span>TOTAL DEUDA ACUMULADA:</span>
                    <span className="font-mono">{symbol}{printReportData.pendingSalesTotal.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 text-center italic py-1">No hay cuentas pendientes por cobrar.</p>
              )}

              <p className="text-[10px] text-gray-500 text-center">----------------------------------</p>
              <div className="text-center space-y-1 text-[9px] text-gray-400">
                <p>FIN DE REPORTE DIARIO</p>
                <p>VentasPro Terminal Impresa</p>
              </div>
            </div>

            {/* Actions for modal */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setPrintReportData(null)}
                className="flex-1 py-3 border border-gray-200 text-xs font-semibold rounded-2xl text-gray-500 hover:bg-gray-50 cursor-pointer text-center transition-colors"
              >
                Cerrar Reporte
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 bg-[#003535] hover:bg-[#0a4646] text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#003535]/15 transition-colors"
              >
                <span className="material-symbols-outlined text-sm font-bold">print</span>
                <span>Imprimir Reporte</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
