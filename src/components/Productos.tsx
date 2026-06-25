/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface ProductosProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  currency?: string;
}

const DEFAULT_IMAGE_PRESETS = [
  { label: 'Teclado/Accesorios', url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=400' },
  { label: 'Ratón/Electrónica', url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=400' },
  { label: 'Libros/Papelería', url: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&q=80&w=400' },
  { label: 'Lámparas/Hogar', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=400' },
  { label: 'Mochilas/Moda', url: 'https://images.unsplash.com/photo-1512318015841-3c7451aa0ce9?auto=format&fit=crop&q=80&w=400' }
];

export const Productos: React.FC<ProductosProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct, currency = 'USD' }) => {
  const symbol = getCurrencySymbol(currency);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [unitOfMeasure, setUnitOfMeasure] = useState('Unidades');
  const [costPrice, setCostPrice] = useState(0.80);
  const [markupPercent, setMarkupPercent] = useState(25);
  const [price, setPrice] = useState(1.00);
  const [stock, setStock] = useState(0);
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGE_PRESETS[0].url);

  const [alert, setAlert] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const triggerAlert = (type: 'success' | 'info' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 5000);
  };

  // Recalculate price dynamically: Precio Venta = Costo * (1 + Ganancia / 100)
  React.useEffect(() => {
    const calculated = Number(costPrice) * (1 + Number(markupPercent) / 100);
    setPrice(Number(calculated.toFixed(2)));
  }, [costPrice, markupPercent]);

  const categories = [
    'Todos',
    'General',
    'Papelería',
    'Librería',
    'Servicios',
    'Electrónica',
    'Accesorio',
    'Hogar',
    'Repostería',
    'Bebidas',
    'Insumos'
  ];

  const unitsOfMeasure = [
    'Unidades',
    'Cajas',
    'Piezas',
    'Resma',
    'Paquetes',
    'Litros',
    'Metros',
    'Kilogramos'
  ];

  // Filter products list
  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'Todos' || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const getNextSku = () => {
    const numericSkus = products
      .map(p => {
        const clean = p.sku.trim();
        if (/^\d+$/.test(clean)) {
          return parseInt(clean, 10);
        }
        // Match any sequence of digits in the SKU (e.g. extracts 12 from SKU-0012)
        const match = clean.match(/\d+/g);
        if (match && match.length > 0) {
          return parseInt(match[match.length - 1], 10);
        }
        return NaN;
      })
      .filter(val => !isNaN(val));

    const nextNum = numericSkus.length > 0 ? Math.max(...numericSkus) + 1 : 1;
    //return String(nextNum).padStart(3, '0');
    return `SKU-${String(nextNum).padStart(4, '0')}`;
  };

  const handleOpenAddModal = () => {
    setEditProduct(null);
    setName('');
    setSku(getNextSku());
    setCategory('General');
    setUnitOfMeasure('Unidades');
    setCostPrice(0.80);
    setMarkupPercent(25);
    setPrice(1.00);
    setStock(0);
    setImageUrl(DEFAULT_IMAGE_PRESETS[0].url);
    setShowModal(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setCategory(prod.category);
    setUnitOfMeasure(prod.unitOfMeasure || 'Unidades');
    setCostPrice(prod.costPrice !== undefined ? prod.costPrice : Number((prod.price / 1.25).toFixed(2)));
    setMarkupPercent(prod.markupPercent !== undefined ? prod.markupPercent : 25);
    setPrice(prod.price);
    setStock(prod.stock);
    setImageUrl(prod.imageUrl);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSku = sku.trim();
    const cleanSku = finalSku.toLowerCase();

    // Check if the sku already exists (for other products)
    const exists = products.some(p => 
      p.sku.trim().toLowerCase() === cleanSku && 
      (!editProduct || p.id !== editProduct.id)
    );

    if (exists) {
      // If it exists, find a new non-conflicting consecutive SKU
      let nextNum = 1;
      const skuPattern = /SKU-(\d+)/i;
      
      // Map all numeric values from existing SKUs matching the format
      const numericSkus = products
        .map(p => {
          const match = p.sku.match(skuPattern);
          return match ? parseInt(match[1], 10) : NaN;
        })
        .filter(val => !isNaN(val));

      if (numericSkus.length > 0) {
        nextNum = Math.max(...numericSkus) + 1;
      }

      let generatedSku = `SKU-${String(nextNum).padStart(4, '0')}`;
      
      // Make sure we keep incrementing if it's somehow still taken
      while (products.some(p => 
        p.sku.trim().toLowerCase() === generatedSku.toLowerCase() && 
        (!editProduct || p.id !== editProduct.id)
      )) {
        nextNum++;
        generatedSku = `SKU-${String(nextNum).padStart(4, '0')}`;
      }
      
      finalSku = generatedSku;
      triggerAlert('info', `El código "${sku}" ya existe. Se ha asignado un nuevo código único consecutivo: "${finalSku}"`);
    }

    const payload: Product = {
      name,
      sku: finalSku,
      category,
      price: Number(price),
      stock: Number(stock),
      imageUrl,
      description: `Product updated on ${new Date().toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}`,
      createdAt: editProduct ? editProduct.createdAt : new Date().toISOString(),
      unitOfMeasure: unitOfMeasure,
      costPrice: Number(costPrice),
      markupPercent: Number(markupPercent),
      minStock: 0 // Default minimum stock is exactly 0
    };

    if (editProduct && editProduct.id) {
      await onUpdateProduct(editProduct.id, payload);
    } else {
      await onAddProduct(payload);
    }
    setShowModal(false);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none" id="productos-view">
      {alert && (
        <div 
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
            alert.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : alert.type === 'info'
              ? 'bg-sky-50 border-sky-100 text-sky-800'
              : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}
          id="productos-alert-banner"
        >
          <span className="material-symbols-outlined text-base">
            {alert.type === 'success' ? 'check_circle' : alert.type === 'info' ? 'info' : 'error'}
          </span>
          <span>{alert.text}</span>
        </div>
      )}
      {/* Header filter layout actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 border border-[#eaedff] rounded-2xl shadow-sm" id="prod-toolbar">
        {/* Search & Select dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-[#5f656c]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full pl-9 pr-4 py-2 border border-[#eaedff] rounded-xl text-xs focus:outline-none focus:border-[#003535] placeholder:text-[#bfc8c8] font-medium"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#5f656c] mr-1">Categoría:</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                  selectedCat === cat
                    ? 'bg-[#003535]/10 border-[#003535] text-[#003535]'
                    : 'bg-white border-[#eaedff] text-[#595f66] hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenAddModal}
          className="bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
          id="btn-add-product"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>Añadir Producto</span>
        </button>
      </div>

      {/* Product Catalog Table */}
      <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="prod-table-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff]">
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Imagen</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Detalles del Producto</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">SKU</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Categoría</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">U. Medida</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">P. Costo</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">% Ganancia</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">P. Venta</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Stock</th>
                <th className="py-4 px-6 text-[10px] font-bold text-[#595f66] uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
              {filtered.map((prod) => {
                const outOfStock = prod.stock <= 0;
                const lowStock = prod.stock > 0 && prod.stock <= 5;
                const displayCost = prod.costPrice !== undefined ? prod.costPrice : Number((prod.price / 1.25).toFixed(2));
                const displayMarkup = prod.markupPercent !== undefined ? prod.markupPercent : 25;
                return (
                  <tr key={prod.id} className="hover:bg-[#faf8ff] transition-colors" id={`row-prod-${prod.sku}`}>
                    {/* Image */}
                    <td className="py-4 px-6">
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-12 h-12 rounded-xl object-cover border border-[#eaedff] bg-gray-50"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    {/* Title */}
                    <td className="py-4 px-6 font-bold">{prod.name}</td>
                    {/* SKU */}
                    <td className="py-4 px-6 font-mono text-[#5f656c] font-semibold">{prod.sku}</td>
                    {/* Category */}
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#f2f3ff] text-[#003535]">
                        {prod.category}
                      </span>
                    </td>
                    {/* Unit of measure */}
                    <td className="py-4 px-6 font-medium text-slate-500 font-sans">
                      {prod.unitOfMeasure || 'Unidades'}
                    </td>
                    {/* Cost Price */}
                    <td className="py-4 px-6 font-semibold text-[#5f656c]">{symbol}{displayCost.toFixed(2)}</td>
                    {/* Markup Percent */}
                    <td className="py-4 px-6 font-semibold text-[#5f656c]">{displayMarkup}%</td>
                    {/* Price */}
                    <td className="py-4 px-6 font-bold text-[#003535]">{symbol}{prod.price.toFixed(2)}</td>
                    {/* Stock level badge */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs font-extrabold ${outOfStock ? 'text-red-600' : lowStock ? 'text-amber-500' : 'text-emerald-600'}`}>
                          {prod.stock} {(prod.unitOfMeasure || 'Unidades').toLowerCase()}
                        </span>
                        <div className="w-20 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${outOfStock ? 'bg-red-500' : lowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, (prod.stock / 50) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    {/* Actions buttons */}
                    <td className="py-4 px-6 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditModal(prod)}
                        className="p-1.5 hover:bg-[#b4edec]/30 text-[#003535] rounded-lg transition-colors cursor-pointer"
                        title="Editar Producto"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => prod.id && onDeleteProduct(prod.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Producto"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-[#5f656c] font-medium">
                    No se encontraron productos con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Agregar / Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="modal-container">
          <div className="bg-white rounded-3xl w-full max-w-md border border-[#eaedff] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" id="product-modal">
            {/* Modal Header */}
            <div className="bg-[#003535] text-white p-5 flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight">{editProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#85bdbc] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[#595f66] mb-1">NOMBRE DEL PRODUCTO</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Monitor Curvo 27\"
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#595f66] mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[#595f66] mb-1">CATEGORÍA</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                  >
                    {categories.filter(c => c !== 'Todos').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#595f66] mb-1">PRECIO DE COSTO ({symbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                    placeholder="ej. 0.80"
                  />
                </div>
                <div>
                  <label className="block text-[#595f66] mb-1">% GANANCIA</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={markupPercent}
                    onChange={(e) => setMarkupPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                    placeholder="ej. 25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#595f66] mb-1">PRECIO VENTA ({symbol}) (CALCULADO)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled
                    value={price}
                    className="w-full px-3 py-2 border border-[#eaedff] bg-gray-50 text-gray-500 rounded-xl font-medium cursor-not-allowed"
                    title="Calculado automáticamente como Costo * (1 + Ganancia/100)"
                  />
                </div>
                <div>
                  <label className="block text-[#595f66] mb-1">STOCK INICIAL</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">UNIDAD DE MEDIDA</label>
                <select
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                >
                  {unitsOfMeasure.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#595f66] mb-1">SELECCIONAR FOTO DE CATÁLOGO</label>
                <select
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium mb-2"
                >
                  {DEFAULT_IMAGE_PRESETS.map((preset, i) => (
                    <option key={i} value={preset.url}>{preset.label}</option>
                  ))}
                  <option value="custom">-- Pegar URL Personalizada --</option>
                </select>
                {imageUrl !== 'custom' && !DEFAULT_IMAGE_PRESETS.some(p => p.url === imageUrl) && (
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Pegar enlace HTTPS de la foto..."
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                  />
                )}
                {imageUrl === 'custom' && (
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl focus:outline-none focus:border-[#003535] font-medium"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-[#eaedff] hover:bg-gray-50 text-[#595f66] py-2.5 rounded-xl font-bold transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#003535] hover:bg-[#0d4d4d] text-white py-2.5 rounded-xl font-bold transition-all cursor-pointer text-center"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
