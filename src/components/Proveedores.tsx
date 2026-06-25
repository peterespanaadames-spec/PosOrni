/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Supplier } from '../types';

interface ProveedoresProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => Promise<void>;
  onUpdateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const Proveedores: React.FC<ProveedoresProps> = ({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form Fields
  const [rifCedula, setRifCedula] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contacto, setContacto] = useState('');
  const [email, setEmail] = useState('');
  const [calificacion, setCalificacion] = useState<number>(5);

  const resetForm = () => {
    setRifCedula('');
    setRazonSocial('');
    setDireccion('');
    setTelefono('');
    setContacto('');
    setEmail('');
    setCalificacion(5);
    setEditingSupplier(null);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setRifCedula(sup.rifCedula);
    setRazonSocial(sup.razonSocial);
    setDireccion(sup.direccion);
    setTelefono(sup.telefono);
    setContacto(sup.contacto);
    setEmail(sup.email);
    setCalificacion(sup.calificacion || 5);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rifCedula || !razonSocial || !contacto) return;

    const payload: Supplier = {
      rifCedula,
      razonSocial,
      direccion,
      telefono,
      contacto,
      email,
      calificacion
    };

    if (editingSupplier && editingSupplier.id) {
      await onUpdateSupplier(editingSupplier.id, payload);
    } else {
      await onAddSupplier(payload);
    }

    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este proveedor?')) {
      await onDeleteSupplier(id);
    }
  };

  // Filter supplier data
  const filtered = suppliers.filter(s => {
    const term = search.toLowerCase();
    return (
      s.razonSocial.toLowerCase().includes(term) ||
      s.rifCedula.toLowerCase().includes(term) ||
      s.contacto.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  });

  // Calculate statistics for KPIs
  const totalCount = suppliers.length;
  const avgRating = totalCount > 0 ? (suppliers.reduce((acc, curr) => acc + (curr.calificacion || 0), 0) / totalCount).toFixed(1) : '0.0';
  const excellentCount = suppliers.filter(s => s.calificacion === 5).length;

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="proveedores-view">
      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="proveedores-kpi-row">
        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">PROVEEDORES REGISTRADOS</span>
            <p className="text-2xl font-bold text-[#003535]">{totalCount} empresas</p>
            <span className="text-[10px] font-semibold text-[#5f656c]">Directorio de compra activo</span>
          </div>
          <div className="w-12 h-12 bg-[#b4edec]/40 rounded-2xl flex items-center justify-center text-[#003535]">
            <span className="material-symbols-outlined text-2xl">local_shipping</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">PROVEEDORES EXCELENTES (5 ★)</span>
            <p className="text-2xl font-bold text-amber-600">{excellentCount} calificados</p>
            <span className="text-[10px] font-semibold text-emerald-600">Servicio y entregas garantizados</span>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-2xl fill">stars</span>
          </div>
        </div>

        <div className="bg-white border border-[#eaedff] p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#595f66] tracking-wider uppercase">CALIFICACIÓN PROMEDIO</span>
            <p className="text-2xl font-bold text-[#131b2e]">{avgRating} / 5.0</p>
            <span className="text-[10px] font-semibold text-slate-500">Nivel de satisfacción general</span>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500">
            <span className="material-symbols-outlined text-2xl">star_half</span>
          </div>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 border border-[#eaedff] rounded-2xl shadow-sm" id="proveedores-toolbar">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[#5f656c]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por razón social, RIF, contacto..."
              className="w-full pl-9 pr-4 py-2 border border-[#eaedff] rounded-xl text-xs focus:outline-none focus:border-[#003535] placeholder:text-[#bfc8c8] font-medium"
            />
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-base">add_business</span>
          <span>Añadir Proveedor</span>
        </button>
      </div>

      {/* Grid view of dynamic supplier cards "Fichas" */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="proveedores-grid">
        {filtered.map((sup) => (
          <div 
            key={sup.id} 
            className="bg-white border border-[#eaedff] p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-[#b4edec] transition-all relative flex flex-col justify-between"
            id={`ficha-proveedor-${sup.id}`}
          >
            <div>
              {/* Header: Name and Star Rating */}
              <div className="flex items-start justify-between gap-2 border-b border-[#faf8ff] pb-3 mb-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-[#85bdbc] bg-[#003535]/10 px-2 py-0.5 rounded-md uppercase">
                    RIF: {sup.rifCedula}
                  </span>
                  <h3 className="text-sm font-bold text-[#131b2e] tracking-tight">{sup.razonSocial}</h3>
                </div>
                <div className="flex items-center gap-0.5" title={`Calificación: ${sup.calificacion || 5} estrellas`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star} 
                      className={`material-symbols-outlined text-sm ${
                        star <= (sup.calificacion || 5) ? 'text-amber-400 fill' : 'text-gray-200'
                      }`}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>

              {/* Body: Fields */}
              <div className="space-y-3.5 text-xs text-[#5f656c] font-medium mb-6">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-gray-400 text-sm shrink-0">badge</span>
                  <div>
                    <p className="text-[10px] text-[#bfc8c8] font-bold uppercase leading-none mb-0.5">Gerente o Contacto</p>
                    <p className="text-[#131b2e]">{sup.contacto}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-gray-400 text-sm shrink-0">phone</span>
                  <div>
                    <p className="text-[10px] text-[#bfc8c8] font-bold uppercase leading-none mb-0.5">Teléfono</p>
                    <p className="text-[#131b2e]">{sup.telefono || 'Sin teléfono'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-gray-400 text-sm shrink-0">mail</span>
                  <div>
                    <p className="text-[10px] text-[#bfc8c8] font-bold uppercase leading-none mb-0.5">Correo Electrónico</p>
                    <p className="text-[#131b2e] truncate max-w-[200px]">{sup.email || 'Sin correo'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-gray-400 text-sm shrink-0">location_on</span>
                  <div>
                    <p className="text-[10px] text-[#bfc8c8] font-bold uppercase leading-none mb-0.5">Dirección Física</p>
                    <p className="text-slate-600 line-clamp-2 leading-relaxed">{sup.direccion || 'Sin dirección registrada'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[#faf8ff] pt-3.5">
              <button
                onClick={() => handleOpenEdit(sup)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-slate-500 hover:text-[#003535] transition-colors flex items-center justify-center cursor-pointer"
                title="Editar Proveedor"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button
                onClick={() => sup.id && handleDelete(sup.id)}
                className="p-1.5 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-colors flex items-center justify-center cursor-pointer"
                title="Eliminar Proveedor"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-[#eaedff] rounded-2xl shadow-sm text-[#5f656c] font-medium">
            No se encontraron proveedores con estos filtros.
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-[#001010]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#eaedff] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#003535] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-[#b4edec]">add_business</span>
                <h3 className="text-base font-bold tracking-tight">
                  {editingSupplier ? 'Editar Proveedor' : 'Añadir Nuevo Proveedor'}
                </h3>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-1 hover:bg-[#0d4d4d] rounded-lg text-[#85bdbc] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    RIF / CÉDULA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={rifCedula}
                    onChange={(e) => setRifCedula(e.target.value.toUpperCase())}
                    placeholder="ej. J-12345678-9"
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    RAZON SOCIAL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="ej. Distribuidora Central C.A."
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    TELF.
                  </label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="ej. +58 212 555 1234"
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    GERENTE O CONTACTO <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. ventas@empresa.com"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  DIRECCIÓN
                </label>
                <textarea
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="ej. Av. Francisco de Miranda, Edificio Seguros..."
                  rows={2}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] text-xs font-semibold"
                />
              </div>

              {/* Star rating selector with full interactivity */}
              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-2">
                  CALIFICACIÓN DEL PROVEEDOR
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-[#faf8ff] px-4 py-2 border border-[#eaedff] rounded-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setCalificacion(star)}
                        className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                        title={`Calificar con ${star} estrellas`}
                      >
                        <span 
                          className={`material-symbols-outlined text-2xl ${
                            star <= calificacion ? 'text-amber-400 fill' : 'text-gray-300'
                          }`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#5f656c]">
                    {calificacion === 5 ? 'Excelente' : calificacion === 4 ? 'Muy Bueno' : calificacion === 3 ? 'Aceptable' : calificacion === 2 ? 'Regular' : 'Malo'} ({calificacion} ★)
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-[#eaedff] pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-[#eaedff] text-slate-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003535] text-white rounded-xl text-xs font-bold hover:bg-[#0d4d4d] transition-colors cursor-pointer"
                >
                  {editingSupplier ? 'Guardar Cambios' : 'Añadir Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
