/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  user: any;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onLogout, user }) => {
  const menuItems = [
    { id: 'tablero', label: 'Tablero', icon: 'dashboard' },
    { id: 'terminal', label: 'Terminal', icon: 'point_of_sale' },
    { id: 'caja', label: 'Caja Diaria', icon: 'payments' },
    { id: 'productos', label: 'Productos', icon: 'inventory_2' },
    { id: 'inventario', label: 'Inventario', icon: 'warehouse' },
    { id: 'compras', label: 'Compras', icon: 'shopping_bag' },
    { id: 'proveedores', label: 'Proveedores', icon: 'local_shipping' },
    { id: 'crm', label: 'CRM', icon: 'group' },
    { id: 'informes', label: 'Informes', icon: 'analytics' },
    { id: 'finanzas', label: 'Finanzas', icon: 'account_balance_wallet' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' }
  ];

  return (
    <aside className="w-64 bg-[#003535] text-white flex flex-col h-screen select-none shrink-0 border-r border-[#0d4d4d]" id="sidebar-container">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#0d4d4d] flex items-center gap-3" id="sidebar-brand-header">
        <span className="material-symbols-outlined text-2xl text-[#85bdbc] fill">point_of_sale</span>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">VentasPRO</h1>
          <span className="text-[10px] text-[#85bdbc] font-medium uppercase tracking-wider">Punto de Venta</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" id="sidebar-nav-menu">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
                isActive
                  ? 'bg-white text-[#003535] shadow-md shadow-[#003535]/25 font-semibold'
                  : 'text-[#85bdbc] hover:bg-[#0d4d4d] hover:text-white'
              }`}
              id={`nav-item-${item.id}`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'fill' : ''}`}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-[#0d4d4d] bg-[#002b2b]" id="sidebar-user-footer">
        <div className="flex items-center gap-3 mb-3" id="sidebar-user-profile">
          <img
            src={user?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'}
            alt="User avatar"
            className="w-10 h-10 rounded-xl border border-[#0d4d4d] object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate" id="sidebar-user-name">
              {user?.displayName || 'Administrador'}
            </p>
            <p className="text-[10px] text-[#85bdbc] truncate font-mono">
              {user?.isDemo ? 'Sesión de Demo' : user?.email || 'admin@ventaspro.com'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full bg-[#0d4d4d] hover:bg-[#104f4f] text-[#85bdbc] hover:text-white py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#104f4f]"
          id="sidebar-logout-button"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
