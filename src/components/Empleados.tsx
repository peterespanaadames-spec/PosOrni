/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee } from '../types';

interface EmpleadosProps {
  employees: Employee[];
  onUpdateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  onAddEmployee: (employee: Employee) => Promise<void>;
}

export const Empleados: React.FC<EmpleadosProps> = ({ employees, onUpdateEmployee, onAddEmployee }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Cajero');
  const [email, setEmail] = useState('');
  const [terminal, setTerminal] = useState('Terminal 01');

  // Math metrics
  const activeCount = employees.filter(e => e.status === 'EN TURNO').length;
  const breakCount = employees.filter(e => e.status === 'EN DESCANSO').length;

  const handleToggleStatus = async (emp: Employee) => {
    if (!emp.id) return;
    let nextStatus: 'EN TURNO' | 'EN DESCANSO' | 'INACTIVO' = 'EN TURNO';
    if (emp.status === 'EN TURNO') nextStatus = 'EN DESCANSO';
    else if (emp.status === 'EN DESCANSO') nextStatus = 'INACTIVO';

    await onUpdateEmployee(emp.id, { status: nextStatus });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const payload: Employee = {
      name,
      role,
      email,
      status: 'INACTIVO',
      shiftStart: '09:00',
      shiftEnd: '17:00',
      imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
      terminal
    };

    await onAddEmployee(payload);
    setShowModal(false);

    // Reset
    setName('');
    setEmail('');
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="empleados-view">
      {/* Shift status Banner */}
      <div className="bg-[#b4edec]/30 border border-[#85bdbc] p-4.5 rounded-2xl flex items-center justify-between" id="shifts-banner">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-[#003535] fill">schedule_send</span>
          <div className="space-y-0.5">
            <h4 className="text-xs font-extrabold text-[#003535] uppercase tracking-wider">Planificación de Horarios de Equipo</h4>
            <p className="text-xs font-semibold text-[#104f4f]">Próximo cambio de turno automatizado: Elena Rivas (Cajera Senior) entra en turno a las 09:30 AM.</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
        >
          Añadir Miembro
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="empleados-kpi-row">
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">CANTIDAD DE EQUIPO</span>
            <p className="text-2xl font-bold text-[#131b2e]">{employees.length} contratados</p>
            <span className="text-[10px] font-semibold text-[#5f656c]">Colaboradores registrados</span>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">MIEMBROS EN TURNO</span>
            <p className="text-2xl font-bold text-emerald-600">{activeCount} activos</p>
            <span className="text-[10px] font-semibold text-emerald-600 font-mono">● EN TERMINAL</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-2xl fill">work</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">MIEMBROS EN DESCANSO</span>
            <p className="text-2xl font-bold text-amber-500">{breakCount} descansando</p>
            <span className="text-[10px] font-semibold text-amber-500 font-mono">⌛ TIEMPO RECREO</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-2xl fill">coffee</span>
          </div>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="employees-grid">
        {employees.map((emp, idx) => (
          <div key={emp.id || idx} className="bg-white border border-[#eaedff] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between" id={`emp-card-${idx}`}>
            {/* Employee header */}
            <div className="flex items-center gap-3.5">
              <img
                src={emp.imageUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'}
                alt={emp.name}
                className="w-14 h-14 rounded-2xl object-cover border border-[#eaedff]"
                referrerPolicy="no-referrer"
              />
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-[#131b2e] truncate">{emp.name}</h4>
                <p className="text-[10px] font-extrabold text-[#5f656c] uppercase tracking-wider">{emp.role}</p>
                <p className="text-[10px] text-[#bfc8c8] font-semibold font-mono truncate">{emp.email}</p>
              </div>
            </div>

            {/* Shift hours details */}
            <div className="p-3 bg-gray-50/50 rounded-xl border border-[#eaedff] space-y-2 text-xs font-semibold text-[#595f66]">
              <div className="flex justify-between items-center">
                <span>Horario de Turno:</span>
                <span className="font-mono text-[#131b2e] font-bold">{emp.shiftStart} - {emp.shiftEnd}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Puesto TPV:</span>
                <span className="font-mono text-[#003535] font-bold">{emp.terminal}</span>
              </div>
            </div>

            {/* Shift actions trigger */}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#f2f3ff]" id="emp-actions">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  emp.status === 'EN TURNO'
                    ? 'bg-emerald-500'
                    : emp.status === 'EN DESCANSO'
                    ? 'bg-amber-500'
                    : 'bg-red-400'
                }`}></span>
                <span className="text-[11px] font-bold text-[#131b2e]">{emp.status}</span>
              </div>

              <button
                onClick={() => handleToggleStatus(emp)}
                className="text-xs font-bold text-[#003535] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Cambiar Estado</span>
                <span className="material-symbols-outlined text-xs">autorenew</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-[#eaedff] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#003535] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold">Añadir Nuevo Miembro de Equipo</h3>
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
                  placeholder="ej. Elena Rivas"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">CARGO / ROL</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="ej. Cajera Senior"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">EMAIL DE LA EMPRESA</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena.rivas@ventaspro.com"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">TERMINAL ASIGNADA</label>
                <select
                  value={terminal}
                  onChange={(e) => setTerminal(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                >
                  <option value="Terminal 01">Terminal 01</option>
                  <option value="Terminal 02">Terminal 02</option>
                  <option value="Terminal 03">Terminal 03</option>
                  <option value="Terminal 04">Terminal 04</option>
                  <option value="Sección A">Sección A</option>
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
                  Registrar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
