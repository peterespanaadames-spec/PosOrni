/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product, Client, CartItem, Transaction, CashboxSession } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface TerminalProps {
  products: Product[];
  clients: Client[];
  taxRate: number;
  onCheckout: (
    cart: CartItem[],
    subtotal: number,
    tax: number,
    total: number,
    customer: Client | null,
    ticketNo: string,
    payments?: {
      efectivo?: number;
      pagoMovilVenezuela?: number;
      pagoMovilBanesco?: number;
      pendiente?: number;
    }
  ) => Promise<Transaction | null>;
  currency?: string;
  activeCashbox?: CashboxSession | null;
  hasUnclosedPreviousCashbox?: boolean;
  setCurrentTab?: (tab: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  products,
  clients,
  taxRate,
  onCheckout,
  currency = 'USD',
  activeCashbox = null,
  hasUnclosedPreviousCashbox = false,
  setCurrentTab,
}) => {
  const symbol = getCurrencySymbol(currency);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0); // decimal percentage e.g. 0.1 for 10%
  const [couponError, setCouponError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  // New States for Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['Efectivo']);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({
    efectivo: '',
    pagoMovilVenezuela: '',
    pagoMovilBanesco: '',
    pendiente: ''
  });

  // Derive categories from products
  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered products
  const filteredProducts = selectedCategory === 'Todos'
    ? products
    : products.filter(p => p.category === selectedCategory);

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        // Check stock boundary
        if (existing.quantity >= product.stock) return prevCart;
        return prevCart.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          // Check stock limit
          if (newQty > item.product.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Math equations
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountAmount = cartSubtotal * couponDiscount;
  const taxableAmount = cartSubtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRate / 100);
  const cartTotal = taxableAmount + taxAmount;

  // Applying coupon
  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode) return;
    const code = couponCode.trim().toUpperCase();
    if (code === 'PRO20') {
      setCouponDiscount(0.20);
    } else if (code === 'BIENVENIDA') {
      setCouponDiscount(0.10);
    } else {
      setCouponError('Código inválido');
      setCouponDiscount(0);
    }
  };

  // Open Payment Modal
  const openPaymentModal = () => {
    if (cart.length === 0) return;
    setPaymentAmounts({
      efectivo: cartTotal.toFixed(2),
      pagoMovilVenezuela: '',
      pagoMovilBanesco: '',
      pendiente: ''
    });
    setSelectedMethods(['Efectivo']);
    setShowPaymentModal(true);
  };

  // Toggle Payment Method Checklist
  const toggleMethod = (method: string) => {
    setSelectedMethods(prev => {
      const isSelected = prev.includes(method);
      let newMethods: string[];
      if (isSelected) {
        newMethods = prev.filter(m => m !== method);
      } else {
        newMethods = [...prev, method];
      }

      const currentAmounts = { ...paymentAmounts };
      if (isSelected) {
        currentAmounts[method] = '';
      }

      if (newMethods.length === 0) {
        setPaymentAmounts({ efectivo: '', pagoMovilVenezuela: '', pagoMovilBanesco: '', pendiente: '' });
      } else if (newMethods.length === 1) {
        const activeMethod = newMethods[0];
        currentAmounts[activeMethod] = cartTotal.toFixed(2);
        Object.keys(currentAmounts).forEach(k => {
          if (k !== activeMethod) currentAmounts[k] = '';
        });
      } else {
        const activeMethod = method;
        if (!isSelected) {
          const sumOthers = newMethods
            .filter(m => m !== activeMethod)
            .reduce((sum, m) => sum + (parseFloat(currentAmounts[m]) || 0), 0);
          const remaining = Math.max(0, cartTotal - sumOthers);
          currentAmounts[activeMethod] = remaining > 0 ? remaining.toFixed(2) : '';
        }
      }

      setPaymentAmounts(currentAmounts);
      return newMethods;
    });
  };

  // Amount Input changes
  const handleAmountChange = (method: string, val: string) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [method]: val
    }));
  };

  // Check out execution confirm from Modal
  const handleConfirmarCobro = async () => {
    const totalEntered = selectedMethods.reduce((sum, m) => {
      return sum + (parseFloat(paymentAmounts[m]) || 0);
    }, 0);
    const difference = cartTotal - totalEntered;
    const isPaymentValid = Math.abs(difference) < 0.05 && selectedMethods.length > 0;

    if (!isPaymentValid || checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const ticketNo = `TX-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const finalPayments: {
        efectivo?: number;
        pagoMovilVenezuela?: number;
        pagoMovilBanesco?: number;
        pendiente?: number;
      } = {};
      
      selectedMethods.forEach(method => {
        const amt = parseFloat(paymentAmounts[method]) || 0;
        if (amt > 0) {
          finalPayments[method as keyof typeof finalPayments] = amt;
        }
      });

      const completedTx = await onCheckout(
        cart,
        taxableAmount,
        taxAmount,
        cartTotal,
        selectedClient,
        ticketNo,
        finalPayments
      );
      if (completedTx) {
        setReceipt(completedTx);
        setCart([]);
        setSelectedClient(null);
        setCouponCode('');
        setCouponDiscount(0);
        setShowPaymentModal(false);
      }
    } catch (e) {
      console.error("Checkout execution failed:", e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex h-full select-none overflow-hidden" id="terminal-view">
      {/* Products Side - Left (70%) */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto" id="terminal-products-container">
        {/* Category Horizontal Chips Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" id="terminal-categories-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#003535] text-white border-[#003535] shadow-md shadow-[#003535]/10'
                  : 'bg-white text-[#595f66] border-[#eaedff] hover:bg-gray-50'
              }`}
              id={`cat-chip-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Visual Cards Catalog Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4" id="terminal-products-grid">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock <= 0;
            const isLowStock = prod.stock > 0 && prod.stock <= 5;
            const inCartItem = cart.find(item => item.product.id === prod.id);
            const inCartQty = inCartItem ? inCartItem.quantity : 0;
            const remainingStock = prod.stock - inCartQty;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && remainingStock > 0 && addToCart(prod)}
                className={`bg-white border border-[#eaedff] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#b4edec] transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isOutOfStock || remainingStock <= 0 ? 'opacity-55' : ''
                }`}
                id={`terminal-prod-card-${prod.sku}`}
              >
                {/* Product Image & Badge */}
                <div className="relative aspect-square w-full bg-gray-50 overflow-hidden shrink-0">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {isOutOfStock ? (
                    <span className="absolute top-2.5 right-2.5 bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-lg tracking-wider uppercase">AGOTADO</span>
                  ) : isLowStock ? (
                    <span className="absolute top-2.5 right-2.5 bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-lg tracking-wider uppercase">BAJO STOCK</span>
                  ) : null}

                  {inCartQty > 0 && (
                    <span className="absolute top-2.5 left-2.5 bg-[#003535] text-white text-xs font-bold w-6 h-6 rounded-lg flex items-center justify-center shadow-md">
                      {inCartQty}
                    </span>
                  )}
                </div>

                {/* Info and Price Footer */}
                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#5f656c] tracking-widest uppercase font-mono">{prod.category}</span>
                    <h4 className="text-xs font-bold text-[#131b2e] line-clamp-2 leading-snug">{prod.name}</h4>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#f2f3ff] mt-auto">
                    <span className="text-xs font-bold text-[#5f656c] font-mono">Stock: {remainingStock} u.</span>
                    <span className="text-sm font-extrabold text-[#003535]">{symbol}{prod.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Sidebar Panel - Right (30%) */}
      <div className="w-96 bg-white border-l border-[#eaedff] flex flex-col h-full shrink-0 select-none" id="terminal-cart-sidebar">
        {/* Cart Header */}
        <div className="p-5 border-b border-[#eaedff] flex items-center justify-between bg-[#f2f3ff]/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[#003535] font-semibold">shopping_cart</span>
            <span className="text-sm font-bold text-[#131b2e]">Carrito Activo</span>
          </div>
          <span className="text-xs font-bold text-[#003535] bg-[#b4edec]/30 px-2.5 py-0.5 rounded-lg font-mono">
            {cart.reduce((acc, item) => acc + item.quantity, 0)} arts
          </span>
        </div>

        {/* Client Selector */}
        <div className="p-4 border-b border-[#eaedff] bg-gray-50/50 shrink-0 space-y-2">
          <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider">Comprador CRM</label>
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const selected = clients.find(cl => cl.id === e.target.value);
              setSelectedClient(selected || null);
            }}
            className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs bg-white focus:outline-none focus:border-[#003535] font-medium"
            id="cart-client-select"
          >
            <option value="">-- Cliente General --</option>
            {clients.map(cl => (
              <option key={cl.id} value={cl.id}>{cl.name} ({cl.segment})</option>
            ))}
          </select>
        </div>

        {/* Scrollable Cart items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" id="cart-items-list-container">
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 p-3 border border-[#eaedff] rounded-xl hover:bg-[#faf8ff] transition-colors relative group" id={`cart-row-${item.product.sku}`}>
              {/* Product Thumbnail */}
              <img src={item.product.imageUrl} alt={item.product.name} className="w-11 h-11 rounded-lg object-cover bg-gray-100 shrink-0" referrerPolicy="no-referrer" />
              
              {/* Product Quantities & Titles */}
              <div className="flex-1 overflow-hidden space-y-1">
                <h5 className="text-xs font-bold text-[#131b2e] truncate">{item.product.name}</h5>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id!, -1)}
                    className="w-5 h-5 bg-[#f2f3ff] hover:bg-[#eaedff] text-xs font-extrabold rounded flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-[#131b2e] w-6 text-center font-mono">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id!, 1)}
                    className="w-5 h-5 bg-[#f2f3ff] hover:bg-[#eaedff] text-xs font-extrabold rounded flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-[10px] text-[#bfc8c8] font-bold font-mono">x {symbol}{item.product.price.toFixed(2)}</span>
                </div>
              </div>

              {/* Price Tag & Remove Option */}
              <div className="text-right flex flex-col justify-between items-end h-11">
                <button
                  onClick={() => removeFromCart(item.product.id!)}
                  className="text-[#bfc8c8] hover:text-[#ba1a1a] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
                <span className="text-xs font-extrabold text-[#003535] font-mono">
                  {symbol}{(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#5f656c] py-20 space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#bfc8c8] fill">production_quantity_limits</span>
              <div className="space-y-1">
                <p className="text-xs font-bold">Carrito Vacío</p>
                <p className="text-[10px] text-[#bfc8c8]">Seleccione productos de la izquierda para iniciar el cobro.</p>
              </div>
            </div>
          )}
        </div>

        {/* Coupons, Taxes & Cash Out section */}
        <div className="p-5 border-t border-[#eaedff] bg-gray-50/50 shrink-0 space-y-4" id="cart-totals-area">
          {/* Coupon Code input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="CUPÓN (ej. PRO20)"
              className="flex-1 px-3 py-1.5 border border-[#eaedff] rounded-xl text-xs uppercase focus:outline-none focus:border-[#003535] placeholder:text-[#bfc8c8] bg-white font-semibold"
              id="coupon-input"
            />
            <button
              onClick={handleApplyCoupon}
              className="bg-[#0d4d4d] hover:bg-[#003535] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Aplicar
            </button>
          </div>
          {couponError && <p className="text-[10px] font-bold text-red-600 -mt-2">{couponError}</p>}
          {couponDiscount > 0 && (
            <p className="text-[10px] font-bold text-emerald-600 -mt-2">✓ Descuento de {(couponDiscount * 100)}% aplicado con éxito</p>
          )}

          {/* Checkout pricing breakdowns */}
          <div className="space-y-2 text-xs font-medium text-[#5f656c] border-b border-[#eaedff] pb-3" id="totals-breakdown">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-mono text-[#131b2e] font-semibold">{symbol}{cartSubtotal.toFixed(2)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>Descuento</span>
                <span className="font-mono font-semibold">-{symbol}{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Impuesto ({taxRate}%)</span>
              <span className="font-mono text-[#131b2e] font-semibold">{symbol}{taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between font-extrabold text-[#131b2e] text-base" id="final-total">
            <span>TOTAL COBRO</span>
            <span className="font-mono text-[#003535]">{symbol}{cartTotal.toFixed(2)}</span>
          </div>

          {/* Cashbox Enforcements */}
          {hasUnclosedPreviousCashbox ? (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center space-y-2.5" id="caja-bloqueada-prev">
              <span className="material-symbols-outlined text-red-600 text-2xl font-bold">lock</span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-950 uppercase">Arqueo Pendiente</p>
                <p className="text-[10px] text-red-800 font-medium">Debe cerrar la caja del día anterior antes de facturar.</p>
              </div>
              <button
                onClick={() => setCurrentTab && setCurrentTab('caja')}
                className="w-full bg-[#ba1a1a] hover:bg-[#a01616] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
              >
                Ir a Caja Diaria
              </button>
            </div>
          ) : !activeCashbox ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center space-y-2.5" id="caja-bloqueada-no-open">
              <span className="material-symbols-outlined text-amber-600 text-2xl font-bold">lock</span>
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-950 uppercase font-bold">Caja Cerrada</p>
                <p className="text-[10px] text-amber-800 font-medium">Debe realizar la apertura de caja diaria antes de facturar.</p>
              </div>
              <button
                onClick={() => setCurrentTab && setCurrentTab('caja')}
                className="w-full bg-[#0d4d4d] hover:bg-[#003535] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
              >
                Realizar Apertura de Caja
              </button>
            </div>
          ) : (
            /* Cobrar main action button */
            <button
              onClick={openPaymentModal}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full bg-[#003535] hover:bg-[#0d4d4d] text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-[#003535]/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="cart-cobrar-btn"
            >
              {checkoutLoading ? (
                <span className="animate-spin">⏳ Procesando...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">payment</span>
                  <span>COBRAR TICKET</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Checkout Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="receipt-modal-container">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-[#eaedff] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" id="receipt-modal">
            {/* Success icon banner */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                <span className="material-symbols-outlined text-2xl font-bold fill">check</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#131b2e]">¡Venta Procesada!</h4>
                <p className="text-[10px] text-[#5f656c] font-medium font-mono">Nº de Ticket: {receipt.ticketNo}</p>
              </div>
            </div>

            {/* Receipt detail checklist lines */}
            <div className="border-t border-b border-dashed border-[#bfc8c8]/50 py-4 space-y-3 text-xs" id="receipt-invoice-details">
              <div className="flex justify-between text-[#5f656c] text-[10px] font-mono">
                <span>Fecha: {receipt.dateTime}</span>
                <span>TPV Terminal 01</span>
              </div>
              <div className="flex justify-between text-[#5f656c] text-[10px] font-mono">
                <span>Cliente: {receipt.customerName || 'Cliente General'}</span>
                <span>Cajero: Administrador</span>
              </div>

              {/* Items listing */}
              <div className="space-y-2 pt-2 border-t border-[#f2f3ff]" id="receipt-items-list">
                {receipt.products.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[#131b2e]">
                    <span className="font-semibold">{p.name} <span className="text-[#5f656c] font-mono">x{p.quantity}</span></span>
                    <span className="font-mono font-bold">{symbol}{(p.price * p.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Breakdown numbers */}
              <div className="space-y-1.5 pt-3 border-t border-dashed border-[#bfc8c8]/50 text-[#5f656c] text-[10px]" id="receipt-math-details">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono">{symbol}{receipt.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA ({taxRate}%)</span>
                  <span className="font-mono">{symbol}{receipt.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#003535] pt-1 border-b border-gray-100 pb-1.5">
                  <span>TOTAL COBRADO</span>
                  <span className="font-mono">{symbol}{receipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Breakdown of payment methods */}
              {receipt.payments && Object.keys(receipt.payments).length > 0 && (
                <div className="pt-1.5 text-[#5f656c] text-[10px] space-y-1 font-sans">
                  <span className="font-extrabold text-[#131b2e] uppercase block tracking-wider text-[9px] mb-1">REGISTRO DE PAGO:</span>
                  {receipt.payments.efectivo !== undefined && receipt.payments.efectivo > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>• Efectivo:</span>
                      <span>{symbol}{receipt.payments.efectivo.toFixed(2)}</span>
                    </div>
                  )}
                  {receipt.payments.pagoMovilVenezuela !== undefined && receipt.payments.pagoMovilVenezuela > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>• Pago Móvil Venezuela:</span>
                      <span>{symbol}{receipt.payments.pagoMovilVenezuela.toFixed(2)}</span>
                    </div>
                  )}
                  {receipt.payments.pagoMovilBanesco !== undefined && receipt.payments.pagoMovilBanesco > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>• Pago Móvil Banesco:</span>
                      <span>{symbol}{receipt.payments.pagoMovilBanesco.toFixed(2)}</span>
                    </div>
                  )}
                  {receipt.payments.pendiente !== undefined && receipt.payments.pendiente > 0 && (
                    <div className="flex justify-between font-mono text-amber-600 font-semibold">
                      <span>• Cuentas por Cobrar (Pendiente):</span>
                      <span>{symbol}{receipt.payments.pendiente.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print/Close Action trigger button */}
            <div className="flex gap-2.5">
              <button
                onClick={() => window.print()}
                className="flex-1 border border-[#eaedff] hover:bg-gray-50 text-[#003535] py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 bg-[#003535] hover:bg-[#0d4d4d] text-white py-2.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer text-center"
              >
                Cerrar Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Selection Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="payment-modal-container">
          <div className="bg-white rounded-3xl w-full max-w-md border border-[#eaedff] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" id="payment-modal">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#131b2e]">Registro de Pago</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-xs font-bold text-[#5f656c]">Monto Total de Venta:</span>
                <span className="text-lg font-extrabold text-[#003535] font-mono">{symbol}{cartTotal.toFixed(2)}</span>
              </div>

              {/* Selection options checklist */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Métodos de Pago Seleccionados:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo', icon: 'payments' },
                    { id: 'pagoMovilVenezuela', label: 'PM Venezuela', icon: 'account_balance' },
                    { id: 'pagoMovilBanesco', label: 'PM Banesco', icon: 'credit_card' },
                    { id: 'pendiente', label: 'Pendiente', icon: 'hourglass_empty' }
                  ].map(method => {
                    const isChecked = selectedMethods.includes(method.id);
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => toggleMethod(method.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                          isChecked 
                            ? 'bg-[#f2f3ff] border-[#0d4d4d] text-[#0d4d4d]' 
                            : 'bg-white border-gray-200 text-[#595f66] hover:bg-gray-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{method.icon}</span>
                        <span className="text-[11px] font-bold">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic inputs for selected methods */}
              {selectedMethods.length > 0 && (
                <div className="space-y-3 bg-[#faf8ff] p-4 rounded-2xl border border-[#eaedff]">
                  <label className="text-[10px] font-bold text-[#595f66] uppercase tracking-wider block">Registrar Montos:</label>
                  <div className="space-y-2.5">
                    {[
                      { id: 'efectivo', label: 'Monto Efectivo' },
                      { id: 'pagoMovilVenezuela', label: 'Monto Pago Móvil Venezuela' },
                      { id: 'pagoMovilBanesco', label: 'Monto Pago Móvil Banesco' },
                      { id: 'pendiente', label: 'Monto Pendiente por Cobrar' }
                    ].map(method => {
                      if (!selectedMethods.includes(method.id)) return null;
                      return (
                        <div key={method.id} className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-gray-100">
                          <span className="text-[11px] font-bold text-[#131b2e] pl-1">{method.label}:</span>
                          <div className="relative flex items-center w-36">
                            <span className="absolute left-2.5 text-[11px] font-bold text-gray-400">{symbol}</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={paymentAmounts[method.id] || ''}
                              onChange={(e) => handleAmountChange(method.id, e.target.value)}
                              className="w-full text-right pr-2.5 pl-6 py-1 border border-gray-200 rounded-lg text-xs font-semibold font-mono focus:outline-none focus:border-[#0d4d4d]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Math Check and validation bar */}
              <div className="p-3.5 rounded-2xl border text-xs flex justify-between items-center font-bold bg-white" style={{
                borderColor: Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)) < 0.05 ? '#10b981' : '#f59e0b'
              }}>
                <div className="space-y-0.5">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Suma Registrada:</span>
                    <span className="font-mono text-[#131b2e] font-extrabold">{symbol}{selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase">Diferencia:</span>
                    <span className={`font-mono font-extrabold ${Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {symbol}{Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)) < 0.05 ? (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span> Cuadrado
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">warning</span> Pendiente {symbol}{(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0) > 0 ? 'Faltan' : 'Sobran') + ' ' + Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCobro}
                disabled={checkoutLoading || !(Math.abs(cartTotal - selectedMethods.reduce((sum, m) => sum + (parseFloat(paymentAmounts[m]) || 0), 0)) < 0.05) || selectedMethods.length === 0}
                className="flex-1 bg-[#003535] hover:bg-[#0d4d4d] text-white py-2.5 rounded-xl text-xs font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
              >
                {checkoutLoading ? 'Procesando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
