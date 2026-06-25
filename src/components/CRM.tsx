/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface CRMProps {
  clients: Client[];
  onAddClient: (client: Client) => Promise<void>;
  onUpdateClient: (id: string, client: Partial<Client>) => Promise<void>;
  currency?: string;
}

export const CRM: React.FC<CRMProps> = ({ clients, onAddClient, onUpdateClient, currency = 'USD' }) => {
  const symbol = getCurrencySymbol(currency);
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('Todos');
  const [showModal, setShowModal] = useState(false);

  // Add Client Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [segment, setSegment] = useState<'VIP' | 'VIP PRESTIGE' | 'RECURRENTE' | 'NUEVO'>('NUEVO');

  const segments = ['Todos', 'VIP', 'VIP PRESTIGE', 'RECURRENTE', 'NUEVO'];

  // Filter client data
  const filtered = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = selectedSegment === 'Todos' || c.segment === selectedSegment;
    return matchesSearch && matchesSegment;
  });

  // Calculate stats
  const totalCount = clients.length;
  const vipCount = clients.filter(c => c.segment === 'VIP' || c.segment === 'VIP PRESTIGE').length;
  const totalSpentSum = clients.reduce((acc, curr) => acc + curr.totalSpent, 0);
  const avgSpent = totalCount > 0 ? totalSpentSum / totalCount : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const payload: Client = {
      name,
      email,
      phone,
      dni,
      segment,
      totalSpent: 0,
      lastPurchaseDate: 'Nunca',
      lastTicketNo: '--'
    };

    await onAddClient(payload);
    setShowModal(false);

    // Reset fields
    setName('');
    setEmail('');
    setPhone('');
    setDni('');
    setSegment('NUEVO');
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="crm-view">
      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="crm-kpi-row">
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">CLIENTES REGISTRADOS</span>
            <p className="text-2xl font-bold text-[#003535]">{totalCount} compradores</p>
            <span className="text-[10px] font-semibold text-emerald-600">Cartera de clientes activos</span>
          </div>
          <div className="w-12 h-12 bg-[#b4edec]/40 rounded-2xl flex items-center justify-center text-[#003535]">
            <span className="material-symbols-outlined text-2xl">people</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">CLIENTES VIP & PRESTIGE</span>
            <p className="text-2xl font-bold text-[#131b2e]">{vipCount} prioritarios</p>
            <span className="text-[10px] font-semibold text-emerald-600">Generan el 75% de los ingresos</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-2xl fill">stars</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">PROMEDIO COMPRA TICKET</span>
            <p className="text-2xl font-bold text-[#131b2e]">{symbol}{avgSpent.toFixed(2)}</p>
            <span className="text-[10px] font-semibold text-[#5f656c]">Ticket histórico por comprador</span>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 border border-[#eaedff] rounded-2xl shadow-sm" id="crm-toolbar">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[#5f656c]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full pl-9 pr-4 py-2 border border-[#eaedff] rounded-xl text-xs focus:outline-none focus:border-[#003535] placeholder:text-[#bfc8c8] font-medium"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#5f656c] mr-1">Segmento:</span>
            {segments.map(seg => (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  selectedSegment === seg
                    ? 'bg-[#003535]/10 border-[#003535] text-[#003535]'
                    : 'bg-white border-[#eaedff] text-[#595f66] hover:bg-gray-50'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Añadir Cliente</span>
        </button>
      </div>

      {/* CRM Clients Table */}
      <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="crm-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff]">
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Nombre del Cliente</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Identificación (DNI)</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Email & Teléfono</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Segmento</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Última Compra</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider text-right">Monto Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
              {filtered.map((cl, idx) => (
                <tr key={cl.id || idx} className="hover:bg-[#faf8ff] transition-colors" id={`row-client-${idx}`}>
                  <td className="py-4 px-6 font-bold">{cl.name}</td>
                  <td className="py-4 px-6 font-mono text-[#5f656c] font-semibold">{cl.dni || 'No asignado'}</td>
                  <td className="py-4 px-6 space-y-0.5">
                    <p className="font-semibold text-[#131b2e]">{cl.email}</p>
                    <p className="text-[10px] text-[#5f656c] font-medium font-mono">{cl.phone || '--'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider ${
                      cl.segment === 'VIP PRESTIGE'
                        ? 'bg-purple-50 text-purple-800 border border-purple-100'
                        : cl.segment === 'VIP'
                        ? 'bg-amber-50 text-amber-800 border border-amber-100'
                        : cl.segment === 'RECURRENTE'
                        ? 'bg-blue-50 text-blue-800 border border-blue-100'
                        : 'bg-gray-100 text-[#595f66]'
                    }`}>
                      {cl.segment}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#131b2e]">{cl.lastPurchaseDate || 'Nunca'}</p>
                      <p className="text-[10px] text-[#bfc8c8] font-bold">{cl.lastTicketNo || '--'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-extrabold text-[#003535] text-right font-mono">
                    {symbol}{cl.totalSpent.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#5f656c] font-medium">No se encontraron clientes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-[#eaedff] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="crm-modal">
            <div className="bg-[#003535] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Añadir Nuevo Cliente CRM</h3>
              <button onClick={() => setShowModal(false)} className="text-[#85bdbc] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#595f66] mb-1">NOMBRE COMPLETO</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Juan Pérez Galdós"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">DNI / NIF</label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="ej. 12345678Z"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">EMAIL DE CONTACTO</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan.perez@email.com"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">TELÉFONO</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ej. +34 600 111 222"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">SEGMENTO CRM</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                >
                  <option value="NUEVO">NUEVO</option>
                  <option value="RECURRENTE">RECURRENTE</option>
                  <option value="VIP">VIP</option>
                  <option value="VIP PRESTIGE">VIP PRESTIGE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-[#eaedff] hover:bg-gray-50 text-[#595f66] py-2.5 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#003535] hover:bg-[#0d4d4d] text-white py-2.5 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Registrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
