/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getCurrencySymbol } from '../utils/currency';
import { Transaction, CashboxSession, CashboxTransaction, FinanceMovement } from '../types';

interface FinanzasProps {
  transactions?: Transaction[];
  currency?: string;
  cashboxSessions?: CashboxSession[];
  cashboxTransactions?: CashboxTransaction[];
  financeMovements?: FinanceMovement[];
  bankBalances?: { bdvCorriente: number; visa: number };
  onAddFinanceMovement?: (movement: FinanceMovement) => Promise<void>;
  onUpdateBankBalances?: (balances: { bdvCorriente: number; visa: number }) => Promise<void>;
  onSettlePendingDebt?: (transactionId: string, paymentMethod: 'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO', amountPaid: number) => Promise<void>;
}

export const Finanzas: React.FC<FinanzasProps> = ({
  transactions = [],
  currency = 'USD',
  cashboxSessions = [],
  cashboxTransactions = [],
  financeMovements = [],
  bankBalances = { bdvCorriente: 18450.20, visa: -1240.50 },
  onAddFinanceMovement,
  onUpdateBankBalances,
  onSettlePendingDebt,
}) => {
  const symbol = getCurrencySymbol(currency);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // States for settling pending debts directly in Finanzas
  const [settlingTx, setSettlingTx] = useState<Transaction | null>(null);
  const [settleMethod, setSettleMethod] = useState<'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO'>('EFECTIVO');
  const [settleLoading, setSettleLoading] = useState(false);

  // Form state for registering custom financial movements
  const [isAddMovementOpen, setIsAddMovementOpen] = useState(false);
  const [newConcept, setNewConcept] = useState('');
  const [newType, setNewType] = useState<'INGRESO' | 'EGRESO'>('EGRESO');
  const [newAccount, setNewAccount] = useState('Banco de Venezuela Corriente');
  const [newAmount, setNewAmount] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate real-time transaction aggregates for each payment type from sales
  const totalEfectivo = transactions.reduce((sum, t) => {
    if (t.payments) {
      return sum + (t.payments.efectivo || 0);
    } else {
      // Backwards compatibility for default transactions
      return sum + (t.status === 'COMPLETADO' ? t.total : 0);
    }
  }, 0);

  const totalPMVenezuela = transactions.reduce((sum, t) => {
    return sum + (t.payments?.pagoMovilVenezuela || 0);
  }, 0);

  const totalPMBanesco = transactions.reduce((sum, t) => {
    return sum + (t.payments?.pagoMovilBanesco || 0);
  }, 0);

  const totalPendientes = transactions.reduce((sum, t) => {
    if (t.payments) {
      return sum + (t.payments.pendiente || 0);
    } else {
      return sum + (t.status === 'PENDIENTE' ? t.total : 0);
    }
  }, 0);

  const pendingSales = (transactions || [])
    .filter((s) => s.status === 'PENDIENTE' || (s.payments?.pendiente && s.payments.pendiente > 0));

  // Sum manual inputs and manual outputs from cashbox transactions
  const totalCajaManualIngresos = cashboxTransactions.reduce((sum, tx) => {
    if (tx.type === 'INGRESO' && !tx.reference?.startsWith('Ticket')) {
      return sum + tx.amount;
    }
    return sum;
  }, 0);

  const totalCajaManualEgresos = cashboxTransactions.reduce((sum, tx) => {
    if (tx.type === 'EGRESO') {
      return sum + tx.amount;
    }
    return sum;
  }, 0);

  const totalCajaInitialCash = cashboxSessions.reduce((sum, s) => sum + s.initialCash, 0);
  const baseCash = cashboxSessions.length > 0 ? totalCajaInitialCash : 1250.00;

  // Sum up custom database financial movements per account
  const bdvCorrienteMovementsSum = financeMovements
    .filter(m => m.account === 'Banco de Venezuela Corriente')
    .reduce((sum, m) => sum + (m.type === 'EGRESO' ? -m.amount : m.amount), 0);

  const visaMovementsSum = financeMovements
    .filter(m => m.account === 'Tarjeta de Crédito Visa' || m.account === 'Visa')
    .reduce((sum, m) => sum + (m.type === 'EGRESO' ? -m.amount : m.amount), 0);

  // Financial Accounts with respective bases + dynamic transactions
  const balances = {
    bdvCorriente: bankBalances.bdvCorriente + bdvCorrienteMovementsSum,
    visa: bankBalances.visa + visaMovementsSum,
    cash: baseCash + totalEfectivo + totalCajaManualIngresos - totalCajaManualEgresos,
    bdv: 3500.00 + totalPMVenezuela,
    banesco: 4200.00 + totalPMBanesco,
    cxc: 250.00 + totalPendientes
  };

  const totalLiquidity = balances.bdvCorriente + balances.visa + balances.cash + balances.bdv + balances.banesco + balances.cxc;

  const handleSync = async (accountKey: 'bdvCorriente' | 'visa') => {
    setSyncing(accountKey);
    try {
      const increment = accountKey === 'bdvCorriente' ? 1200 : -150;
      const updated = {
        ...bankBalances,
        [accountKey]: bankBalances[accountKey] + increment
      };
      if (onUpdateBankBalances) {
        await onUpdateBankBalances(updated);
      }
      setToast(`Sincronización de ${accountKey === 'bdvCorriente' ? 'Banco de Venezuela Corriente' : 'Visa'} finalizada con éxito.`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error("Failed to sync balance:", err);
    } finally {
      setSyncing(null);
    }
  };

  const handleAddMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim() || !newAmount || isNaN(Number(newAmount))) {
      alert('Por favor complete todos los campos requeridos con valores válidos.');
      return;
    }
    setSubmitting(true);
    try {
      if (onAddFinanceMovement) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ', ' + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        await onAddFinanceMovement({
          concept: newConcept,
          type: newType,
          amount: Number(newAmount),
          date: formattedDate,
          account: newAccount,
          details: newDetails
        });
        setToast('Movimiento financiero registrado con éxito.');
        setTimeout(() => setToast(null), 3000);
        setIsAddMovementOpen(false);
        // Reset form
        setNewConcept('');
        setNewType('EGRESO');
        setNewAccount('Banco de Venezuela Corriente');
        setNewAmount('');
        setNewDetails('');
      }
    } catch (err) {
      console.error(err);
      alert('Error al registrar movimiento.');
    } finally {
      setSubmitting(false);
    }
  };

  // Convert real transactions to ledger format
  const realLedgerItems = transactions.map((t, idx) => {
    // Build human-friendly description of payments
    let detailParts: string[] = [];
    if (t.payments) {
      if (t.payments.efectivo) detailParts.push(`Efectivo: ${symbol}${t.payments.efectivo.toFixed(2)}`);
      if (t.payments.pagoMovilVenezuela) detailParts.push(`P.M. Venezuela: ${symbol}${t.payments.pagoMovilVenezuela.toFixed(2)}`);
      if (t.payments.pagoMovilBanesco) detailParts.push(`P.M. Banesco: ${symbol}${t.payments.pagoMovilBanesco.toFixed(2)}`);
      if (t.payments.pendiente) detailParts.push(`Pendiente: ${symbol}${t.payments.pendiente.toFixed(2)}`);
    } else {
      detailParts.push(t.status === 'PENDIENTE' ? 'Pendiente' : 'Efectivo');
    }
    const paymentDetail = detailParts.join(' | ');

    // Determine target ledger account matching payment type
    let accountName = 'Caja Registradora';
    if (t.payments) {
      const p = t.payments;
      const amounts = [
        { name: 'efectivo', value: p.efectivo || 0 },
        { name: 'pagoMovilVenezuela', value: p.pagoMovilVenezuela || 0 },
        { name: 'pagoMovilBanesco', value: p.pagoMovilBanesco || 0 },
        { name: 'pendiente', value: p.pendiente || 0 }
      ];
      // Find the payment method with maximum value
      amounts.sort((a, b) => b.value - a.value);
      if (amounts[0].value > 0) {
        const primary = amounts[0].name;
        if (primary === 'pagoMovilVenezuela') accountName = 'Banco de Venezuela';
        else if (primary === 'pagoMovilBanesco') accountName = 'Banco Banesco';
        else if (primary === 'pendiente') accountName = 'Cuentas por Cobrar';
      }
    } else if (t.status === 'PENDIENTE') {
      accountName = 'Cuentas por Cobrar';
    }

    const typeLabel = (t.status === 'PENDIENTE' || (t.payments?.pendiente && !t.payments.efectivo && !t.payments.pagoMovilVenezuela && !t.payments.pagoMovilBanesco)) ? 'PENDIENTE' : 'INGRESO';

    return {
      id: t.ticketNo || `TX-${9000 + idx}`,
      concept: `Venta TPV - ${t.customerName || 'Cliente General'}`,
      type: typeLabel,
      amount: t.total,
      date: t.dateTime || 'Hoy',
      account: accountName,
      details: paymentDetail
    };
  });

  // Convert manual cashbox transactions to ledger format
  const manualCajaLedgerItems = cashboxTransactions
    .filter(tx => !tx.reference?.startsWith('Ticket'))
    .map((tx, idx) => {
      return {
        id: tx.id || `CAJA-TX-${idx}`,
        concept: `[Caja] ${tx.concept}`,
        type: tx.type,
        amount: tx.type === 'EGRESO' ? -tx.amount : tx.amount,
        date: tx.dateTime,
        account: 'Caja Registradora',
        details: `Responsable: ${tx.responsible}`
      };
    });

  // Convert custom database financial movements to ledger format
  const dbFinanceLedgerItems = financeMovements.map((fm, idx) => {
    return {
      id: fm.id || `FIN-TX-${idx}`,
      concept: fm.concept,
      type: fm.type,
      amount: fm.type === 'EGRESO' ? -fm.amount : fm.amount,
      date: fm.date,
      account: fm.account,
      details: fm.details || ''
    };
  });

  const fullLedger = [...realLedgerItems, ...manualCajaLedgerItems, ...dbFinanceLedgerItems];

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none relative" id="finanzas-view">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#003535] text-white text-xs font-bold py-3 px-5 rounded-2xl shadow-xl z-50 flex items-center gap-2 border border-[#85bdbc]/30 animate-bounce animate-duration-300">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Corporate Liquidity banner card */}
      <div className="bg-gradient-to-r from-[#003535] to-[#0a4646] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="liquidity-banner">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#85bdbc]/10 rounded-xl flex items-center justify-center text-[#85bdbc]">
            <span className="material-symbols-outlined text-2xl font-bold">account_balance_wallet</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#85bdbc] uppercase tracking-wider block">Flujo Consolidado Total</span>
            <h3 className="text-2xl font-extrabold text-white font-mono">{symbol}{totalLiquidity.toFixed(2)}</h3>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-[#85bdbc] border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-6">
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider">Cuentas Corrientes:</span>
            <span className="text-white font-mono font-bold">{symbol}{(balances.bdvCorriente + balances.bdv + balances.banesco).toFixed(2)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider">Caja & Efectivo:</span>
            <span className="text-white font-mono font-bold">{symbol}{balances.cash.toFixed(2)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-bold uppercase tracking-wider">Por Cobrar:</span>
            <span className="text-amber-300 font-mono font-bold">{symbol}{balances.cxc.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Grid: Financial Accounts segmented by Nature */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-[#595f66] uppercase tracking-wider">Cuentas de Tesorería por Naturaleza de Ingreso</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="bank-connection-grid">
          {/* Card 1: Caja Registradora */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="account-cash-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-emerald-600 font-bold">payments</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Caja Registradora</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">Efectivo Físico</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">ACTIVO</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider">SALDO EN EFECTIVO</span>
              <p className="text-2xl font-extrabold text-[#131b2e] font-mono">{symbol}{balances.cash.toFixed(2)}</p>
            </div>
            <div className="text-[10px] text-[#5f656c] bg-gray-50 p-2.5 rounded-xl flex justify-between font-semibold">
              <span>Monto Base Inicial:</span>
              <span className="font-mono">{symbol}1,250.00</span>
            </div>
          </div>

          {/* Card 2: Pago Movil Venezuela (BDV) */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="account-bdv-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-red-600 font-bold font-fill">account_balance</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Banco de Venezuela</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">Pago Móvil BDV</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">EN LÍNEA</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider font-semibold">SALDO PAGO MÓVIL BDV</span>
              <p className="text-2xl font-extrabold text-[#131b2e] font-mono">{symbol}{balances.bdv.toFixed(2)}</p>
            </div>
            <div className="text-[10px] text-[#5f656c] bg-gray-50 p-2.5 rounded-xl flex justify-between font-semibold">
              <span>Monto Base BDV:</span>
              <span className="font-mono">{symbol}3,500.00</span>
            </div>
          </div>

          {/* Card 3: Pago Movil Banesco */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="account-banesco-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-green-600 font-bold">credit_card</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Banco Banesco</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">Pago Móvil Banesco</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">EN LÍNEA</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider font-semibold">SALDO P.M. BANESCO</span>
              <p className="text-2xl font-extrabold text-[#131b2e] font-mono">{symbol}{balances.banesco.toFixed(2)}</p>
            </div>
            <div className="text-[10px] text-[#5f656c] bg-gray-50 p-2.5 rounded-xl flex justify-between font-semibold">
              <span>Monto Base Banesco:</span>
              <span className="font-mono">{symbol}4,200.00</span>
            </div>
          </div>

          {/* Card 4: Cuentas por Cobrar (Pendiente) */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="account-cxc-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-amber-600 font-bold">hourglass_empty</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Cuentas por Cobrar</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">Ventas Pendientes</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold font-mono">DIFERIDO</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider font-semibold">CARTERA POR RECAUDAR</span>
              <p className="text-2xl font-extrabold text-amber-600 font-mono">{symbol}{balances.cxc.toFixed(2)}</p>
            </div>
            <div className="text-[10px] text-[#5f656c] bg-gray-50 p-2.5 rounded-xl flex justify-between font-semibold">
              <span>Base por recaudar:</span>
              <span className="font-mono">{symbol}250.00</span>
            </div>
          </div>

          {/* Card 5: Banco de Venezuela Corriente */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="bank-bdv-corriente-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-blue-800 font-bold font-fill">account_balance</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Banco de Venezuela Corriente</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">Nº •••• 5678</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold font-mono">CONECTADO</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider">SALDO DISPONIBLE</span>
              <p className="text-2xl font-extrabold text-[#131b2e] font-mono">{symbol}{balances.bdvCorriente.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleSync('bdvCorriente')}
              disabled={syncing !== null}
              className="w-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#003535] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">sync</span>
              <span>{syncing === 'bdvCorriente' ? 'Sincronizando...' : 'Sincronizar Saldo'}</span>
            </button>
          </div>

          {/* Card 6: Tarjeta de Crédito Visa */}
          <div className="bg-white border border-[#eaedff] p-5 rounded-2xl shadow-sm flex flex-col justify-between" id="bank-visa-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-2xl text-slate-800 font-bold">credit_card</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#131b2e]">Tarjeta de Crédito Visa</h4>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase font-mono">LÍNEA DE CRÉDITO</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold font-mono">CONECTADO</span>
            </div>
            <div className="space-y-0.5 mb-4">
              <span className="text-[10px] font-bold text-[#5f656c] uppercase tracking-wider font-semibold">CONSUMO ACTUAL</span>
              <p className="text-2xl font-extrabold text-red-600 font-mono">{symbol}{balances.visa.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleSync('visa')}
              disabled={syncing !== null}
              className="w-full bg-[#f2f3ff] hover:bg-[#eaedff] text-[#003535] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">sync</span>
              <span>{syncing === 'visa' ? 'Sincronizando...' : 'Sincronizar Consumo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cumulative Pending Accounts Card */}
      <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="pending-accounts-finance-card">
        <div className="p-5 border-b border-[#eaedff] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-amber-50/10">
          <div>
            <h3 className="text-sm font-bold text-[#131b2e] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 font-bold">hourglass_empty</span>
              <span>Relación Acumulativa de Cuentas por Cobrar (Clientes con Créditos)</span>
            </h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Control unificado de saldos pendientes y cobranza de la terminal facturadora</p>
          </div>
          <div className="bg-amber-100/40 border border-amber-200/50 rounded-2xl px-4 py-2 text-right">
            <span className="text-[9px] font-extrabold text-amber-800 uppercase block tracking-wider font-bold">Total Acumulado por Recaudar</span>
            <span className="text-sm font-black text-amber-700 font-mono">{symbol}{totalPendientes.toFixed(2)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                <th className="py-4 px-6">Nº Ticket</th>
                <th className="py-4 px-6">Cliente</th>
                <th className="py-4 px-6">Fecha del Ticket</th>
                <th className="py-4 px-6 text-right">Total Facturado</th>
                <th className="py-4 px-6 text-right">Abonado</th>
                <th className="py-4 px-6 text-right text-amber-700">Monto Pendiente</th>
                <th className="py-4 px-6 text-center">Acciones de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
              {pendingSales.map((tx, idx) => {
                const totalAmt = tx.total;
                const pendingAmt = tx.payments?.pendiente || totalAmt;
                const paidAmt = totalAmt - pendingAmt;
                return (
                  <tr key={tx.id || idx} className="hover:bg-amber-50/10 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-[#5f656c]">{tx.ticketNo}</td>
                    <td className="py-4 px-6 font-bold">{tx.customerName || 'Cliente General'}</td>
                    <td className="py-4 px-6 font-semibold text-[#5f656c]">{tx.dateTime}</td>
                    <td className="py-4 px-6 text-right font-mono font-semibold">{symbol}{totalAmt.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right font-mono font-semibold text-emerald-600">
                      {paidAmt > 0 ? `${symbol}${paidAmt.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-extrabold text-amber-700">
                      {symbol}{pendingAmt.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          setSettlingTx(tx);
                          setSettleMethod('EFECTIVO');
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-xs font-bold font-fill">monetization_on</span>
                        <span>Saldar Cuenta</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {pendingSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 font-medium text-xs">
                    No existen cuentas pendientes por recaudar en este momento. ¡Cartera de crédito en cero!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger transactions list table */}
      <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="finance-ledger-card">
        <div className="p-5 border-b border-[#eaedff] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#131b2e]">Libro Diario Contable (Movimientos Financieros)</h3>
            <p className="text-[11px] text-[#5f656c] font-medium">Libro contable consolidado sincronizado con la base de datos de transacciones</p>
          </div>
          <button
            onClick={() => setIsAddMovementOpen(true)}
            className="self-start sm:self-center bg-[#003535] hover:bg-[#0a4646] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            <span>Registrar Movimiento</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                <th className="py-4 px-6">ID Operación</th>
                <th className="py-4 px-6">Concepto / Operación</th>
                <th className="py-4 px-6">Fecha / Hora</th>
                <th className="py-4 px-6">Cuenta Sincronizada</th>
                <th className="py-4 px-6">Método de Cobro (Naturaleza)</th>
                <th className="py-4 px-6 text-center">Tipo</th>
                <th className="py-4 px-6 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
              {fullLedger.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-[#faf8ff] transition-colors" id={`row-ledger-${idx}`}>
                  <td className="py-4 px-6 font-mono font-bold text-[#5f656c]">{item.id}</td>
                  <td className="py-4 px-6 font-bold">{item.concept}</td>
                  <td className="py-4 px-6 font-semibold text-[#5f656c]">{item.date}</td>
                  <td className="py-4 px-6 font-medium text-[#131b2e]">{item.account}</td>
                  <td className="py-4 px-6 font-medium text-slate-500 max-w-xs truncate">{item.details}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${
                      item.type === 'INGRESO'
                        ? 'bg-emerald-50 text-emerald-800'
                        : item.type === 'PENDIENTE'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className={`py-4 px-6 font-extrabold text-right font-mono ${item.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.amount > 0 ? `+${symbol}${item.amount.toFixed(2)}` : `-${symbol}${Math.abs(item.amount).toFixed(2)}`}
                  </td>
                </tr>
              ))}
              {fullLedger.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 font-medium text-xs">
                    No se han registrado movimientos financieros aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Financial Movement Modal */}
      {isAddMovementOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="add-movement-modal">
          <div className="bg-white rounded-3xl w-full max-w-md border border-[#eaedff] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-extrabold text-[#131b2e] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-lg font-bold">account_balance_wallet</span>
                  <span>Registrar Movimiento Financiero</span>
                </h4>
                <p className="text-[10px] text-gray-400">Ingrese un nuevo movimiento de ingreso o egreso en el flujo de caja</p>
              </div>
              <button 
                onClick={() => setIsAddMovementOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMovementSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#595f66] uppercase block">Concepto de la Operación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de Alquiler, Abono de cliente, etc."
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  className="w-full bg-[#f2f3ff]/40 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#003535] placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase block">Tipo de Flujo *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'INGRESO' | 'EGRESO')}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#003535]"
                  >
                    <option value="EGRESO">Egreso (Gasto)</option>
                    <option value="INGRESO">Ingreso (Entrada)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase block">Monto ({symbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-[#f2f3ff]/40 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-[#003535] placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#595f66] uppercase block">Cuenta Afectada *</label>
                <select
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#003535]"
                >
                  <option value="Banco de Venezuela Corriente">Banco de Venezuela Corriente</option>
                  <option value="Tarjeta de Crédito Visa">Tarjeta de Crédito Visa</option>
                  <option value="Banco Banesco">Banco Banesco (Pago Móvil)</option>
                  <option value="Banco de Venezuela">Banco de Venezuela (Pago Móvil)</option>
                  <option value="Caja Registradora">Caja Registradora (Efectivo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#595f66] uppercase block">Detalles / Destinatario</label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora Oriente, Factura Nº 1024"
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  className="w-full bg-[#f2f3ff]/40 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#003535] placeholder:text-gray-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMovementOpen(false)}
                  className="flex-1 py-2.5 border border-[#eaedff] text-xs font-semibold rounded-xl text-[#595f66] hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#003535] hover:bg-[#0a4646] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Pending Debt Modal Overlay inside Finanzas */}
      {settlingTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="settle-debt-modal-finanzas">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-[#eaedff] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 text-[#131b2e]">
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
                      setToast('Deuda saldada correctamente.');
                      setTimeout(() => setToast(null), 3000);
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
          </div>
        </div>
      )}
    </div>
  );
};
