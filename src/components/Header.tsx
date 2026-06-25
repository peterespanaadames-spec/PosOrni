/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface HeaderProps {
  currentTab: string;
  isFirebase: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, isFirebase, searchQuery, setSearchQuery }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Caracas' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getTitle = () => {
    switch (currentTab) {
      case 'tablero': return 'Tablero Principal';
      case 'terminal': return 'Terminal Punto de Venta (TPV)';
      case 'productos': return 'Gestión de Productos';
      case 'inventario': return 'Control de Inventario';
      case 'compras': return 'Gestión de Compras & Proveedores';
      case 'crm': return 'Directorio de Clientes (CRM)';
      case 'empleados': return 'Directorio de Equipo & Turnos';
      case 'informes': return 'Informes de Negocio & Analíticas';
      case 'finanzas': return 'Finanzas & Flujo de Caja';
      case 'configuracion': return 'Configuración del Sistema';
      default: return 'Panel de Control';
    }
  };

  return (
    <header className="bg-white border-b border-[#eaedff] py-4 px-8 flex items-center justify-between shrink-0 select-none font-sans" id="header-container">
      {/* Title & Date */}
      <div id="header-title-section">
        <h2 className="text-xl font-bold tracking-tight text-[#131b2e] leading-tight" id="header-title-text">{getTitle()}</h2>
        <div className="flex items-center gap-2 mt-0.5" id="header-subtitle-area">
          <span className="text-xs text-[#5f656c] font-medium">Caracas UTC-4</span>
          <span className="w-1.5 h-1.5 bg-[#bfc8c8] rounded-full"></span>
          <span className="text-xs text-[#5f656c] font-semibold font-mono">{timeStr}</span>
        </div>
      </div>

      {/* Global Search & Connection */}
      <div className="flex items-center gap-4" id="header-actions-section">
        {/* Search */}
        <div className="relative w-64" id="header-search-box">
          <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#5f656c] text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en todo el sistema..."
            className="w-full pl-10 pr-4 py-2 border border-[#eaedff] rounded-xl text-xs focus:outline-none focus:border-[#003535] placeholder:text-[#bfc8c8]"
            id="header-search-input"
          />
        </div>

        {/* Database Sync Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
          isFirebase
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
            : 'bg-amber-50 border-amber-100 text-amber-800'
        }`} id="header-sync-status">
          <span className={`w-2 h-2 rounded-full animate-pulse ${isFirebase ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>{isFirebase ? 'Cloud DB Activa' : 'Local Fallback'}</span>
        </div>

        {/* User Notifications Icon */}
        <div className="relative cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl border border-[#eaedff] hover:bg-[#faf8ff] text-[#595f66]" id="header-bell">
          <span className="material-symbols-outlined text-lg">notifications</span>
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-[#ba1a1a] rounded-full"></span>
        </div>
      </div>
    </header>
  );
};
