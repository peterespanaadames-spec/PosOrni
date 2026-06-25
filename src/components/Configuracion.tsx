/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BusinessSettings } from '../types';

interface ConfiguracionProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => Promise<void>;
}

export const Configuracion: React.FC<ConfiguracionProps> = ({ settings, onSaveSettings }) => {
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [taxLabel, setTaxLabel] = useState('IVA');
  const [taxRate, setTaxRate] = useState(21);
  const [currency, setCurrency] = useState('USD');
  const [separator, setSeparator] = useState<'coma' | 'punto'>('coma');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName);
      setTaxId(settings.taxId);
      setLegalAddress(settings.legalAddress);
      setTaxLabel(settings.taxLabel);
      setTaxRate(settings.taxRate);
      setCurrency(settings.currency);
      setSeparator(settings.separator);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const payload: BusinessSettings = {
        companyName,
        taxId,
        legalAddress,
        taxLabel,
        taxRate: Number(taxRate),
        currency,
        decimalFormat: '2',
        separator,
        applicableZones: ['ESPAÑA CONTINENTAL', 'PORTUGAL']
      };

      await onSaveSettings(payload);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="configuracion-view">
      <div className="max-w-2xl bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="config-form-card">
        {/* Header banner */}
        <div className="p-6 border-b border-[#eaedff] bg-[#f2f3ff]/30">
          <h3 className="text-sm font-bold text-[#131b2e]">Configuración General del Comercio</h3>
          <p className="text-[11px] text-[#5f656c] font-medium">Configure impuestos, dirección legal, facturación y divisas del TPV.</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-semibold">
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl flex items-center gap-2" id="config-success-alert">
              <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
              <span>✓ Los cambios de configuración han sido sincronizados con Firestore de forma segura.</span>
            </div>
          )}

          {/* Company Details */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-[#003535] uppercase tracking-wider border-b border-gray-100 pb-1.5">Datos Fiscales de la Empresa</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#595f66] mb-1">RAZÓN SOCIAL</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">RIF / CEDULA</label>
                <input
                  type="text"
                  required
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-mono font-bold text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#595f66] mb-1">DIRECCIÓN LEGAL</label>
              <input
                type="text"
                required
                value={legalAddress}
                onChange={(e) => setLegalAddress(e.target.value)}
                className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-semibold text-gray-800"
              />
            </div>
          </div>

          {/* Tax Parameters */}
          <div className="space-y-4 pt-3">
            <h4 className="text-[10px] font-extrabold text-[#003535] uppercase tracking-wider border-b border-gray-100 pb-1.5">Tributación & Impuestos</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#595f66] mb-1">ETIQUETA DE IMPUESTO</label>
                <input
                  type="text"
                  required
                  value={taxLabel}
                  onChange={(e) => setTaxLabel(e.target.value)}
                  placeholder="ej. IVA, VAT"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">TASA DE IMPUESTO GENERAL (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-bold text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Regional Formats */}
          <div className="space-y-4 pt-3">
            <h4 className="text-[10px] font-extrabold text-[#003535] uppercase tracking-wider border-b border-gray-100 pb-1.5">Regiones & Divisas</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#595f66] mb-1">DIVISA LOCAL</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-semibold text-gray-800"
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dólar Estadounidense ($)</option>
                  <option value="GBP">Libra Esterlina (£)</option>
                  <option value="MXN">Peso Mexicano ($)</option>
                  <option value="VES">Bolívares (Bs.)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">SEPARADOR DECIMAL</label>
                <select
                  value={separator}
                  onChange={(e) => setSeparator(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-semibold text-gray-800"
                >
                  <option value="coma">Coma (,)</option>
                  <option value="punto">Punto (.)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              id="config-save-btn"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{saving ? 'Guardando...' : 'Guardar Cambios de Configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
