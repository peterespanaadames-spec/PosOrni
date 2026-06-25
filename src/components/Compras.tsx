/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { PurchaseOrder, Supplier, Product } from '../types';
import { getCurrencySymbol } from '../utils/currency';

interface ComprasProps {
  purchaseOrders: PurchaseOrder[];
  onAddPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  onUpdatePurchaseOrder: (id: string, po: Partial<PurchaseOrder>) => Promise<void>;
  currency?: string;
  suppliers: Supplier[];
  products: Product[];
  onAddProduct?: (product: Product) => Promise<void>;
}

export const Compras: React.FC<ComprasProps> = ({ 
  purchaseOrders, 
  onAddPurchaseOrder, 
  onUpdatePurchaseOrder, 
  currency = 'USD',
  suppliers = [],
  products = [],
  onAddProduct
}) => {
  const symbol = getCurrencySymbol(currency);
  const [activeTab, setActiveTab] = useState<'list' | 'generate_po' | 'load_invoice'>('list');
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Order for Detail Modal
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);

  // --- GENERAL NOTIFICATION ---
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const triggerAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 5000);
  };

  // --- QUICK CREATE PRODUCT STATE ---
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('General');
  const [newProdUnitOfMeasure, setNewProdUnitOfMeasure] = useState('Unidades');
  const [newProdCostPrice, setNewProdCostPrice] = useState(0.80);
  const [newProdMarkupPercent, setNewProdMarkupPercent] = useState(25);
  const [newProdPrice, setNewProdPrice] = useState(1.00);
  const [newProdStock, setNewProdStock] = useState(0);
  const [newProdSourceForm, setNewProdSourceForm] = useState<'po' | 'invoice'>('po');
  const [pendingSelectProductSku, setPendingSelectProductSku] = useState<string | null>(null);

  // Recalculate price dynamically for quick-create product
  useEffect(() => {
    const calculated = Number(newProdCostPrice) * (1 + Number(newProdMarkupPercent) / 100);
    setNewProdPrice(Number(calculated.toFixed(2)));
  }, [newProdCostPrice, newProdMarkupPercent]);

  // Handle open create product modal
  const handleOpenCreateProduct = (source: 'po' | 'invoice') => {
    setNewProdSourceForm(source);
    setNewProdName('');
    
    // Auto-generate SKU
    const numericSkus = products
      .map(p => {
        const clean = p.sku.trim();
        if (/^\d+$/.test(clean)) {
          return parseInt(clean, 10);
        }
        return NaN;
      })
      .filter(val => !isNaN(val));
    const nextNum = numericSkus.length > 0 ? Math.max(...numericSkus) + 1 : 1;
    setNewProdSku(String(nextNum).padStart(3, '0'));
    
    setNewProdCategory('General');
    setNewProdUnitOfMeasure('Unidades');
    setNewProdCostPrice(0.80);
    setNewProdMarkupPercent(25);
    setNewProdPrice(1.00);
    setNewProdStock(0);
    setShowCreateProductModal(true);
  };

  const handleSaveQuickProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdSku) {
      triggerAlert('error', 'Por favor complete el nombre y código del producto.');
      return;
    }
    
    const payload: Product = {
      name: newProdName,
      sku: newProdSku,
      category: newProdCategory,
      price: Number(newProdPrice),
      stock: Number(newProdStock),
      imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=400',
      description: `Creado desde Compras el ${new Date().toLocaleDateString('es-VE', { timeZone: 'America/Caracas' })}`,
      createdAt: new Date().toISOString(),
      unitOfMeasure: newProdUnitOfMeasure,
      costPrice: Number(newProdCostPrice),
      markupPercent: Number(newProdMarkupPercent),
      minStock: 0 // Default minimum stock is exactly 0
    };

    try {
      if (onAddProduct) {
        await onAddProduct(payload);
        triggerAlert('success', `Producto "${newProdName}" creado con éxito.`);
        setPendingSelectProductSku(newProdSku);
        setShowCreateProductModal(false);
      } else {
        triggerAlert('error', 'La función de crear producto no está disponible.');
      }
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Error al crear el producto.');
    }
  };

  // Effect to select the newly created product when the products array updates and contains our SKU!
  useEffect(() => {
    if (pendingSelectProductSku && products.length > 0) {
      const found = products.find(p => p.sku === pendingSelectProductSku);
      if (found && found.id) {
        if (newProdSourceForm === 'po') {
          setPoSelectedProductId(found.id);
          setPoSelectedPrice(found.costPrice || found.price);
        } else {
          setInvSelectedProductId(found.id);
          setInvSelectedPrice(found.costPrice || found.price);
        }
        setPendingSelectProductSku(null);
      }
    }
  }, [products, pendingSelectProductSku, newProdSourceForm]);

  // --- GENERAR ORDEN DE COMPRA STATE ---
  const [poOrderId, setPoOrderId] = useState('');
  const [poDate, setPoDate] = useState('');
  const [poSupplier, setPoSupplier] = useState('');
  const [poItems, setPoItems] = useState<any[]>([]);
  const [poDiscount, setPoDiscount] = useState<number>(0);
  const [poTax, setPoTax] = useState<number>(16);
  const [poPaymentMethod, setPoPaymentMethod] = useState('Transferencia');
  const [poPaymentTerm, setPoPaymentTerm] = useState('30 días');
  const [poDeliveryDate, setPoDeliveryDate] = useState('');
  const [poDeliveryAddress, setPoDeliveryAddress] = useState('Almacén Central de VentasPRO');
  const [poDeliveryContact, setPoDeliveryContact] = useState('Coordinador de Almacén');
  const [poElaboratedBy, setPoElaboratedBy] = useState('Analista de Compras');
  const [poAuthorizedBy, setPoAuthorizedBy] = useState('Gerente de Operaciones');

  // Interactive Product Selector for PO
  const [poSelectedProductId, setPoSelectedProductId] = useState('');
  const [poSelectedQty, setPoSelectedQty] = useState<number>(1);
  const [poSelectedPrice, setPoSelectedPrice] = useState<number>(0);

  // Pre-fill fields for New PO with consecutive numbering starting from OC-00001
  const initNewPOForm = () => {
    const ocOrders = purchaseOrders.filter(p => p.orderId && p.orderId.startsWith('OC-'));
    let nextNum = 1;
    if (ocOrders.length > 0) {
      const numbers = ocOrders.map(p => {
        const match = p.orderId.match(/OC-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    const consecutiveID = `OC-${String(nextNum).padStart(5, '0')}`;
    setPoOrderId(consecutiveID);
    setPoDate(new Date().toISOString().split('T')[0]);
    setPoSupplier(suppliers.length > 0 ? suppliers[0].razonSocial : '');
    setPoItems([]);
    setPoDiscount(0);
    setPoTax(16);
    setPoPaymentMethod('Transferencia');
    setPoPaymentTerm('30 días');
    setPoDeliveryDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPoDeliveryAddress('Almacén Central, Calle Principal, Edif. VentasPRO');
    setPoDeliveryContact('Coordinador de Logística');
    setPoElaboratedBy('Analista de Compras');
    setPoAuthorizedBy('Gerente de Operaciones');

    // Reset item selector
    setPoSelectedProductId(products.length > 0 ? products[0].id || '' : '');
    setPoSelectedQty(1);
    setPoSelectedPrice(products.length > 0 ? products[0].costPrice || products[0].price : 0);
  };

  // Trigger default setup when tab changes to generate_po
  useEffect(() => {
    if (activeTab === 'generate_po') {
      initNewPOForm();
    }
  }, [activeTab]);

  // Update item price when product selection changes in PO form
  useEffect(() => {
    if (poSelectedProductId) {
      const prod = products.find(p => p.id === poSelectedProductId);
      if (prod) {
        setPoSelectedPrice(prod.costPrice || prod.price);
      }
    }
  }, [poSelectedProductId]);

  const handleAddProductToPO = () => {
    if (!poSelectedProductId) return;
    const prod = products.find(p => p.id === poSelectedProductId);
    if (!prod) return;

    // Check if product already added
    const existingIndex = poItems.findIndex(item => item.productId === poSelectedProductId);
    if (existingIndex !== -1) {
      const updated = [...poItems];
      updated[existingIndex].quantity += Number(poSelectedQty);
      setPoItems(updated);
    } else {
      setPoItems([...poItems, {
        productId: prod.id,
        name: prod.name,
        quantity: Number(poSelectedQty),
        price: Number(poSelectedPrice)
      }]);
    }
    // reset item selector default qty
    setPoSelectedQty(1);
  };

  const handleRemoveItemFromPO = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  // Calculate totals for PO
  const poSubtotal = poItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const poDiscountVal = poSubtotal * (poDiscount / 100);
  const poTaxable = poSubtotal - poDiscountVal;
  const poTaxVal = poTaxable * (poTax / 100);
  const poTotalAmount = poTaxable + poTaxVal;


  // --- CARGAR FACTURA STATE ---
  const [invLinkedPO, setInvLinkedPO] = useState('');
  const [invInvoiceNo, setInvInvoiceNo] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invSupplier, setInvSupplier] = useState('');
  const [invItems, setInvItems] = useState<any[]>([]);
  const [invDiscount, setInvDiscount] = useState<number>(0);
  const [invTax, setInvTax] = useState<number>(16);
  const [invPaymentMethod, setInvPaymentMethod] = useState('Transferencia');
  const [invPaymentTerm, setInvPaymentTerm] = useState('30 días');
  const [invReceivedBy, setInvReceivedBy] = useState('Jefe de Almacén');
  const [invSupervisedBy, setInvSupervisedBy] = useState('Gerente de Operaciones');

  // Interactive Product Selector for Invoice
  const [invSelectedProductId, setInvSelectedProductId] = useState('');
  const [invSelectedQty, setInvSelectedQty] = useState<number>(1);
  const [invSelectedPrice, setInvSelectedPrice] = useState<number>(0);

  // Initialize/Reset Invoice Form
  const initNewInvoiceForm = () => {
    setInvLinkedPO('Ninguna');
    setInvInvoiceNo(`FAC-${Math.floor(10000 + Math.random() * 90000)}`);
    setInvDate(new Date().toISOString().split('T')[0]);
    setInvSupplier(suppliers.length > 0 ? suppliers[0].razonSocial : '');
    setInvItems([]);
    setInvDiscount(0);
    setInvTax(16);
    setInvPaymentMethod('Transferencia');
    setInvPaymentTerm('30 días');
    setInvReceivedBy('Jefe de Almacén');
    setInvSupervisedBy('Gerente de Operaciones');

    setInvSelectedProductId(products.length > 0 ? products[0].id || '' : '');
    setInvSelectedQty(1);
    setInvSelectedPrice(products.length > 0 ? products[0].costPrice || products[0].price : 0);
  };

  useEffect(() => {
    if (activeTab === 'load_invoice') {
      initNewInvoiceForm();
    }
  }, [activeTab]);

  // Update item price when product selection changes in Invoice form
  useEffect(() => {
    if (invSelectedProductId) {
      const prod = products.find(p => p.id === invSelectedProductId);
      if (prod) {
        setInvSelectedPrice(prod.costPrice || prod.price);
      }
    }
  }, [invSelectedProductId]);

  // When selected PO dropdown changes, pull data from that PO!
  const handleLinkedPOChange = (orderId: string) => {
    setInvLinkedPO(orderId);
    if (orderId === 'Ninguna') return;

    const matchedPO = purchaseOrders.find(po => po.orderId === orderId);
    if (matchedPO) {
      setInvSupplier(matchedPO.supplier);
      
      // If the PO had custom fields stored
      const poAny = matchedPO as any;
      if (poAny.amount) {
        // Pre-fill amount fields if PO items exist
        if (poAny.items && Array.isArray(poAny.items)) {
          setInvItems(poAny.items);
        } else {
          // Fallback, create a single custom row
          setInvItems([{
            productId: 'custom',
            name: `Reabastecimiento según Orden ${orderId}`,
            quantity: 1,
            price: poAny.amount
          }]);
        }
        setInvDiscount(poAny.poDiscount || 0);
        setInvTax(poAny.poTax || 16);
        setInvPaymentMethod(poAny.poPaymentMethod || 'Transferencia');
        setInvPaymentTerm(poAny.poPaymentTerm || '30 días');
      }
    }
  };

  const handleAddProductToInvoice = () => {
    if (!invSelectedProductId) return;
    const prod = products.find(p => p.id === invSelectedProductId);
    if (!prod) return;

    const existingIndex = invItems.findIndex(item => item.productId === invSelectedProductId);
    if (existingIndex !== -1) {
      const updated = [...invItems];
      updated[existingIndex].quantity += Number(invSelectedQty);
      setInvItems(updated);
    } else {
      setInvItems([...invItems, {
        productId: prod.id,
        name: prod.name,
        quantity: Number(invSelectedQty),
        price: Number(invSelectedPrice)
      }]);
    }
    setInvSelectedQty(1);
  };

  const handleRemoveItemFromInvoice = (idx: number) => {
    setInvItems(invItems.filter((_, i) => i !== idx));
  };

  // Calculate totals for Invoice
  const invSubtotal = invItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const invDiscountVal = invSubtotal * (invDiscount / 100);
  const invTaxable = invSubtotal - invDiscountVal;
  const invTaxVal = invTaxable * (invTax / 100);
  const invTotalAmount = invTaxable + invTaxVal;


  // --- SUBMISSIONS ---
  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poOrderId || !poSupplier) {
      triggerAlert('error', 'Por favor complete la identificación del documento.');
      return;
    }
    if (poItems.length === 0) {
      triggerAlert('error', 'Por favor añada al menos un producto al detalle de los ítems.');
      return;
    }

    const matchedSupplier = suppliers.find(s => s.razonSocial === poSupplier);

    const newPO: any = {
      orderId: poOrderId,
      supplier: poSupplier,
      supplierId: matchedSupplier?.id || '',
      date: 'Hoy, ' + new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }),
      amount: Number(poTotalAmount),
      status: 'PENDIENTE',
      // Dynamic Rich Fields
      items: poItems,
      poDiscount,
      poTax,
      poPaymentMethod,
      poPaymentTerm,
      poDeliveryDate,
      poDeliveryAddress,
      poDeliveryContact,
      elaboratedBy: poElaboratedBy,
      authorizedBy: poAuthorizedBy,
      createdAt: new Date().toISOString()
    };

    try {
      await onAddPurchaseOrder(newPO);
      triggerAlert('success', `Orden de Compra ${poOrderId} generada exitosamente.`);
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Ocurrió un error al guardar la orden.');
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invInvoiceNo || !invSupplier) {
      triggerAlert('error', 'Por favor complete la identificación de la factura.');
      return;
    }
    if (invItems.length === 0) {
      triggerAlert('error', 'Por favor añada al menos un producto al detalle de los ítems.');
      return;
    }

    const matchedSupplier = suppliers.find(s => s.razonSocial === invSupplier);

    const newInvoice: any = {
      orderId: invInvoiceNo, // Saved as an order id row for general listings
      supplier: invSupplier,
      supplierId: matchedSupplier?.id || '',
      date: 'Hoy, ' + new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }),
      amount: Number(invTotalAmount),
      status: 'RECIBIDO', // Invoices are automatically received
      // Dynamic Rich Fields
      isInvoice: true,
      invoiceNo: invInvoiceNo,
      linkedPOId: invLinkedPO !== 'Ninguna' ? invLinkedPO : '',
      items: invItems,
      poDiscount: invDiscount,
      poTax: invTax,
      poPaymentMethod: invPaymentMethod,
      poPaymentTerm: invPaymentTerm,
      receivedBy: invReceivedBy,
      supervisedBy: invSupervisedBy,
      createdAt: new Date().toISOString()
    };

    try {
      await onAddPurchaseOrder(newInvoice);

      // If we linked an existing PO, update its status to 'RECIBIDO' as well!
      if (invLinkedPO && invLinkedPO !== 'Ninguna') {
        const foundPO = purchaseOrders.find(p => p.orderId === invLinkedPO);
        if (foundPO && foundPO.id) {
          await onUpdatePurchaseOrder(foundPO.id, { status: 'RECIBIDO' });
        }
      }

      triggerAlert('success', `Factura ${invInvoiceNo} cargada y recibida exitosamente.`);
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Ocurrió un error al guardar la factura.');
    }
  };


  // --- FILE DRAG & DROP FOR FAST DIGITALIZATION ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (file: File) => {
    setParsing(true);
    setUploadSuccess('');
    
    setTimeout(async () => {
      try {
        const orderId = `PO-${Math.floor(24000 + Math.random() * 100)}`;
        const chosenSupplier = suppliers.length > 0 
          ? suppliers[Math.floor(Math.random() * suppliers.length)].razonSocial 
          : 'Distribuidora Central S.A.';
        const randomAmount = Math.floor(1200 + Math.random() * 3500);

        // Build some realistic items for the parsed PDF
        const parsedItems = [
          {
            productId: products[0]?.id || 'p01',
            name: products[0]?.name || 'Producto Importado A',
            quantity: 50,
            price: Math.floor(randomAmount * 0.4 / 50)
          },
          {
            productId: products[1]?.id || 'p02',
            name: products[1]?.name || 'Producto Importado B',
            quantity: 20,
            price: Math.floor(randomAmount * 0.6 / 20)
          }
        ];

        const newPO: any = {
          orderId,
          supplier: chosenSupplier,
          date: 'Hoy, ' + new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }),
          amount: randomAmount,
          status: 'RECIBIDO', // Parsed invoices are registered directly as received
          isInvoice: true,
          invoiceNo: `FAC-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
          items: parsedItems,
          poDiscount: 0,
          poTax: 16,
          poPaymentMethod: 'Transferencia',
          poPaymentTerm: 'Contado',
          receivedBy: 'Carga Digital IA',
          supervisedBy: 'Automatización VentasPRO',
          createdAt: new Date().toISOString()
        };

        await onAddPurchaseOrder(newPO);
        // Pre-fill the form with the digitalized values for visualization
        setInvInvoiceNo(newPO.invoiceNo);
        setInvSupplier(chosenSupplier);
        setInvItems(parsedItems);
        setInvDiscount(0);
        setInvTax(16);
        setInvDate(new Date().toISOString().split('T')[0]);
        setUploadSuccess(`Factura digitalizada correctamente. Se ha registrado la Compra ${orderId} para ${chosenSupplier} por ${symbol}${randomAmount.toFixed(2)}.`);
        triggerAlert('success', `Carga digitalizada de factura completada.`);
      } catch (e) {
        console.error(e);
        triggerAlert('error', 'Error al procesar el archivo digital.');
      } finally {
        setParsing(false);
      }
    }, 1500);
  };

  // Update status wrapper
  const handleUpdateStatus = async (id: string, status: 'RECIBIDO' | 'PENDIENTE' | 'CANCELADO' | 'EN TRÁNSITO') => {
    await onUpdatePurchaseOrder(id, { status });
    triggerAlert('success', 'Estado de la orden actualizado.');
  };

  // Open detail viewer
  const handleViewOrderDetail = (po: any) => {
    setSelectedOrderDetail(po);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full select-none text-slate-800" id="compras-view">
      
      {/* Alert Banner */}
      {alertMsg && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${
            alertMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
          id="compras-toast"
        >
          <span className="material-symbols-outlined text-lg">
            {alertMsg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-xs font-bold">{alertMsg.text}</span>
        </div>
      )}

      {/* TAB 1: LISTADO (Styled exactly like the image) */}
      {activeTab === 'list' && (
        <div className="bg-white border border-[#eaedff] rounded-2xl shadow-sm overflow-hidden" id="compras-table-card">
          <div className="p-6 border-b border-[#eaedff] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-[#131b2e] tracking-tight">Registro de Compras, Órdenes y Facturas</h3>
              <p className="text-[11px] text-[#5f656c] font-semibold">Haga clic sobre una fila para ver el desglose de productos y condiciones comerciales.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('generate_po')}
                className="bg-[#003535] hover:bg-[#002525] text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-[#003535]"
              >
                <span className="w-4 h-4 border border-white rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">+</span>
                <span>Generar Orden</span>
              </button>
              <button
                onClick={() => setActiveTab('load_invoice')}
                className="bg-[#003535] hover:bg-[#002525] text-white text-[11px] font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-[#003535]"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span>Cargar Factura</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f2f3ff]/30 border-b border-[#eaedff] text-[10px] font-bold text-[#595f66] uppercase">
                  <th className="py-4 px-6">Tipo</th>
                  <th className="py-4 px-6">Código / Doc ID</th>
                  <th className="py-4 px-6">Proveedor</th>
                  <th className="py-4 px-6">Fecha Emisión</th>
                  <th className="py-4 px-6">Importe</th>
                  <th className="py-4 px-6">Estado</th>
                  <th className="py-4 px-6 text-right">Actualizar / Acciones</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                  {purchaseOrders.map((po, idx) => {
                    const isInvoice = (po as any).isInvoice || false;
                    return (
                      <tr 
                        key={po.id || idx} 
                        className="hover:bg-[#faf8ff] cursor-pointer transition-colors"
                        onClick={() => handleViewOrderDetail(po)}
                        id={`row-po-${po.orderId}`}
                      >
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                            isInvoice 
                              ? 'bg-[#b4edec]/40 text-[#003535]' 
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {isInvoice ? 'Factura' : 'Orden'}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-bold">{po.orderId}</td>
                        <td className="py-4 px-6 font-semibold">{po.supplier}</td>
                        <td className="py-4 px-6 text-[#5f656c] font-medium">{po.date}</td>
                        <td className="py-4 px-6 font-extrabold text-[#003535]">{symbol}{po.amount.toFixed(2)}</td>
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            po.status === 'RECIBIDO'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                              : po.status === 'PENDIENTE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-100'
                              : po.status === 'CANCELADO'
                              ? 'bg-red-50 text-red-800 border border-red-100'
                              : 'bg-blue-50 text-blue-800 border border-blue-100'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={po.status}
                            onChange={(e) => po.id && handleUpdateStatus(po.id, e.target.value as any)}
                            className="px-2 py-1.5 border border-[#eaedff] rounded-xl text-xs bg-white focus:outline-none focus:border-[#003535] font-semibold text-[#003535]"
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="EN TRÁNSITO">EN TRÁNSITO</option>
                            <option value="RECIBIDO">RECIBIDO</option>
                            <option value="CANCELADO">CANCELADO</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  {purchaseOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-[#5f656c] font-medium">No hay compras ni órdenes de compra registradas.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* TAB 2: GENERAR ORDEN DE COMPRA */}
      {activeTab === 'generate_po' && (
        <form onSubmit={handleSavePO} className="bg-white border border-[#eaedff] rounded-3xl shadow-sm p-8 space-y-8" id="form-generar-po">
          <div className="border-b border-[#eaedff] pb-4">
            <h3 className="text-base font-bold text-[#003535] flex items-center gap-2">
              <span className="material-symbols-outlined">post_add</span>
              <span>Generar Orden de Compra</span>
            </h3>
            <p className="text-xs text-[#5f656c] font-medium">Complete todos los bloques para emitir un pedido de compra estructurado hacia el proveedor.</p>
          </div>

          {/* Bloque 1: Identificación del Documento */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              1. Identificación del Documento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Número de Orden de Compra <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={poOrderId}
                  onChange={(e) => setPoOrderId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-gray-50/50"
                  placeholder="ej. OC-00001"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Fecha de Emisión <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Proveedor de Destino <span className="text-red-500">*</span>
                </label>
                {suppliers.length > 0 ? (
                  <select
                    value={poSupplier}
                    onChange={(e) => setPoSupplier(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.razonSocial}>
                        {s.razonSocial} (RIF: {s.rifCedula})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex flex-col gap-1">
                    <span>⚠️ No hay proveedores en el directorio.</span>
                    <span className="text-[10px] text-gray-500 font-medium">Por favor registre al menos un proveedor primero.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 2: Detalle de los Ítems (Interactive POS style) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              2. Detalle de los Ítems (Cargar productos como en Terminal de Venta)
            </h4>
            
            {/* Interactive Picker bar */}
            <div className="bg-[#f2f3ff]/40 p-4 border border-[#eaedff] rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Seleccionar Producto
                </label>
                <select
                  value={poSelectedProductId}
                  onChange={(e) => {
                    if (e.target.value === 'CREATE_NEW_PRODUCT') {
                      handleOpenCreateProduct('po');
                      setPoSelectedProductId('');
                    } else {
                      setPoSelectedProductId(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white text-[#003535] font-bold"
                >
                  <option value="" className="text-[#595f66] font-normal">Seleccione un producto del inventario...</option>
                  <option value="CREATE_NEW_PRODUCT" className="text-[#003535] font-extrabold">+ ➕ Crear Nuevo Producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="text-[#131b2e] font-medium">
                      {p.name} (Stock: {p.stock} | SKU: {p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min="1"
                  value={poSelectedQty}
                  onChange={(e) => setPoSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Costo Unitario ({symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={poSelectedPrice}
                  onChange={(e) => setPoSelectedPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddProductToPO}
                  className="w-full bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer h-[36px]"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* List of current items added */}
            <div className="border border-[#eaedff] rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f2f3ff]/20 border-b border-[#eaedff] text-[9px] font-bold text-[#595f66] uppercase">
                    <th className="py-3 px-5">Producto</th>
                    <th className="py-3 px-5 text-center">Cantidad</th>
                    <th className="py-3 px-5 text-right">Precio Unitario</th>
                    <th className="py-3 px-5 text-right">Subtotal</th>
                    <th className="py-3 px-5 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                  {poItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-5 text-center font-semibold text-slate-700">{item.quantity} units</td>
                      <td className="py-3 px-5 text-right font-mono text-slate-600">{symbol}{item.price.toFixed(2)}</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-[#003535]">
                        {symbol}{(item.quantity * item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromPO(idx)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {poItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        Cargue productos arriba para iniciar la estructura de la orden de compra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque 3: Condiciones Comerciales y Logísticas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              3. Condiciones Comerciales y Logísticas
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-[#eaedff]">
              
              {/* Financial/Taxes */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-bold text-[#003535] tracking-wider uppercase">Impuestos & Descuentos</h5>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={poDiscount}
                    onChange={(e) => setPoDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Impuestos (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={poTax}
                    onChange={(e) => setPoTax(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  />
                </div>
              </div>

              {/* Payment conditions */}
              <div className="space-y-4 border-l border-[#eaedff] pl-0 md:pl-6">
                <h5 className="text-[11px] font-bold text-[#003535] tracking-wider uppercase">Condiciones de Pago</h5>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Método de Pago</label>
                  <select
                    value={poPaymentMethod}
                    onChange={(e) => setPoPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                    <option value="Crédito">Línea de Crédito Comercial</option>
                    <option value="Efectivo Divisas">Efectivo (Divisas)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Plazo Estipulado</label>
                  <input
                    type="text"
                    value={poPaymentTerm}
                    onChange={(e) => setPoPaymentTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                    placeholder="ej. 30 días, Inmediato"
                  />
                </div>
              </div>

              {/* Delivery Conditions */}
              <div className="space-y-4 border-l border-[#eaedff] pl-0 md:pl-6">
                <h5 className="text-[11px] font-bold text-[#003535] tracking-wider uppercase">Condiciones de Entrega</h5>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Fecha Límite de Entrega</label>
                  <input
                    type="date"
                    value={poDeliveryDate}
                    onChange={(e) => setPoDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] mb-1">Área o Persona de Contacto</label>
                  <input
                    type="text"
                    value={poDeliveryContact}
                    onChange={(e) => setPoDeliveryContact(e.target.value)}
                    className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                    placeholder="ej. Coordinador de Inventarios"
                  />
                </div>
              </div>

              {/* Delivery Address Full Width */}
              <div className="col-span-full border-t border-[#eaedff] pt-4 mt-2">
                <label className="block text-[10px] font-bold text-[#595f66] mb-1">Dirección Exacta de Recepción</label>
                <textarea
                  rows={2}
                  value={poDeliveryAddress}
                  onChange={(e) => setPoDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  placeholder="Escriba la dirección física de la sucursal o almacén..."
                />
              </div>

            </div>
          </div>

          {/* Bloque 4: Firmas y Elaboración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#eaedff] pt-6">
            <div>
              <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                Elaborado Por: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={poElaboratedBy}
                onChange={(e) => setPoElaboratedBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                Autorización / Firma Digital: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={poAuthorizedBy}
                onChange={(e) => setPoAuthorizedBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
              />
            </div>
          </div>

          {/* Footer Totals Summary and Buttons */}
          <div className="border-t border-[#eaedff] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6" id="po-totals-bar">
            {/* Dynamic Totals */}
            <div className="flex flex-wrap gap-6 text-xs font-semibold text-slate-600">
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Subtotal</p>
                <p className="text-sm font-bold text-slate-800">{symbol}{poSubtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Descuento ({poDiscount}%)</p>
                <p className="text-sm font-bold text-red-600">-{symbol}{poDiscountVal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">IVA ({poTax}%)</p>
                <p className="text-sm font-bold text-slate-800">+{symbol}{poTaxVal.toFixed(2)}</p>
              </div>
              <div className="border-l border-[#eaedff] pl-6">
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Importe Total General</p>
                <p className="text-lg font-black text-[#003535]">{symbol}{poTotalAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 border border-[#eaedff] text-slate-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#003535] hover:bg-[#0d4d4d] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Emitir Orden de Compra
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: CARGAR FACTURA */}
      {activeTab === 'load_invoice' && (
        <div className="space-y-6" id="cargar-factura-container">
          
          {/* DIGITAL INVOICE IMPORT CARD */}
          <div className="bg-white border border-[#eaedff] p-8 rounded-3xl shadow-sm space-y-4 animate-fade-in" id="compras-upload-section">
            <div>
              <h3 className="text-base font-extrabold text-[#131b2e] tracking-tight">Importación de Facturas Digitales</h3>
              <p className="text-xs text-[#5f656c] font-semibold mt-1">Arrastre o suba un archivo PDF/Imagen para digitalizar y registrar una compra automáticamente mediante IA.</p>
            </div>

            {/* Drag & Drop File Container */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-[#003535] bg-[#003535]/5' 
                  : 'border-[#eaedff] hover:border-[#003535] hover:bg-[#faf8ff]'
              }`}
              id="drag-drop-box"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
              />
              
              {parsing ? (
                <div className="space-y-3 text-center flex flex-col items-center" id="upload-parsing-spinner">
                  <div className="animate-spin text-3xl">⚙️</div>
                  <div>
                    <p className="text-xs font-bold text-[#003535]">Procesando Factura...</p>
                    <p className="text-[10px] text-[#bfc8c8] mt-1">Mapeando ítems, impuestos, importes totales y proveedores...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center" id="upload-static-ui">
                  <div className="w-12 h-12 rounded-full bg-[#003535]/10 flex items-center justify-center text-[#003535]">
                    <span className="material-symbols-outlined text-2xl font-bold">cloud_upload</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#131b2e]">Arrastre y suelte su factura o haga clic aquí</p>
                    <p className="text-xs text-[#828894] mt-1 font-medium">Soporta PDF, JPG, PNG. La IA cargará los productos automáticamente al inventario.</p>
                  </div>
                </div>
              )}
            </div>

            {uploadSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2" id="upload-success-alert">
                <span className="material-symbols-outlined text-base font-bold shrink-0">check_circle</span>
                <span>{uploadSuccess}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveInvoice} className="bg-white border border-[#eaedff] rounded-3xl shadow-sm p-8 space-y-8 animate-fade-in" id="form-cargar-factura">
            <div className="border-b border-[#eaedff] pb-4">
              <h3 className="text-base font-bold text-[#003535] flex items-center gap-2">
                <span className="material-symbols-outlined">receipt_long</span>
                <span>Cargar Factura de Proveedor (Ingreso Manual / Verificación)</span>
              </h3>
              <p className="text-xs text-[#5f656c] font-medium">Registre y valide una factura física. Vincúlela a una Orden de Compra previa para sincronizar precios y cantidades de reabastecimiento.</p>
            </div>

          {/* Bloque 1: Identificación de la Factura */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              1. Identificación del Documento
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Vincular Orden de Compra <span className="text-blue-500 font-bold">(Jalar Orden)</span>
                </label>
                <select
                  value={invLinkedPO}
                  onChange={(e) => handleLinkedPOChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-indigo-200 bg-indigo-50/20 rounded-xl text-xs font-bold focus:outline-none focus:border-[#003535] text-[#003535]"
                >
                  <option value="Ninguna">-- No vincular orden (Carga libre) --</option>
                  {purchaseOrders
                    .filter(p => !(p as any).isInvoice) // only show POs, not other invoices
                    .map((po) => (
                      <option key={po.id} value={po.orderId}>
                        {po.orderId} - {po.supplier} ({symbol}{po.amount.toFixed(2)})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Número de Factura <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invInvoiceNo}
                  onChange={(e) => setInvInvoiceNo(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                  placeholder="ej. Nro Factura Proveedor"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Fecha de Emisión <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invDate}
                  onChange={(e) => setInvDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1.5">
                  Proveedor Emisor <span className="text-red-500">*</span>
                </label>
                {suppliers.length > 0 ? (
                  <select
                    value={invSupplier}
                    onChange={(e) => setInvSupplier(e.target.value)}
                    disabled={invLinkedPO !== 'Ninguna'}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.razonSocial}>
                        {s.razonSocial} (RIF: {s.rifCedula})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    Por favor registre al menos un proveedor primero.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloque 2: Detalle de los Ítems (Interactive POS style) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              2. Detalle de los Ítems (Cargar productos como en Terminal de Venta)
            </h4>
            
            {/* Interactive Picker bar */}
            <div className="bg-[#f2f3ff]/40 p-4 border border-[#eaedff] rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Seleccionar Producto
                </label>
                <select
                  value={invSelectedProductId}
                  onChange={(e) => {
                    if (e.target.value === 'CREATE_NEW_PRODUCT') {
                      handleOpenCreateProduct('invoice');
                      setInvSelectedProductId('');
                    } else {
                      setInvSelectedProductId(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white text-[#003535] font-bold"
                >
                  <option value="" className="text-[#595f66] font-normal">Seleccione un producto...</option>
                  <option value="CREATE_NEW_PRODUCT" className="text-[#003535] font-extrabold">+ ➕ Crear Nuevo Producto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="text-[#131b2e] font-medium">
                      {p.name} (Stock: {p.stock} | SKU: {p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Cantidad Facturada
                </label>
                <input
                  type="number"
                  min="1"
                  value={invSelectedQty}
                  onChange={(e) => setInvSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Costo Unitario Facturado ({symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invSelectedPrice}
                  onChange={(e) => setInvSelectedPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddProductToInvoice}
                  className="w-full bg-[#003535] hover:bg-[#0d4d4d] text-white text-xs font-bold py-2 px-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer h-[36px]"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* List of current items added */}
            <div className="border border-[#eaedff] rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f2f3ff]/20 border-b border-[#eaedff] text-[9px] font-bold text-[#595f66] uppercase">
                    <th className="py-3 px-5">Producto</th>
                    <th className="py-3 px-5 text-center">Cantidad</th>
                    <th className="py-3 px-5 text-right">Precio Facturado</th>
                    <th className="py-3 px-5 text-right">Subtotal</th>
                    <th className="py-3 px-5 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eaedff]/40 text-xs text-[#131b2e]">
                  {invItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-5 font-bold text-slate-800">{item.name}</td>
                      <td className="py-3 px-5 text-center font-semibold text-slate-700">{item.quantity} units</td>
                      <td className="py-3 px-5 text-right font-mono text-slate-600">{symbol}{item.price.toFixed(2)}</td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-[#003535]">
                        {symbol}{(item.quantity * item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemFromInvoice(idx)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-medium">
                        Por favor agregue los productos o vincule una orden de compra arriba para pre-cargar el detalle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque 3: Condiciones Comerciales y Logísticas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#131b2e] tracking-wider uppercase border-l-4 border-[#003535] pl-2">
              3. Condiciones Comerciales y Recepción
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-[#eaedff]">
              
              {/* Financial/Taxes */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-bold text-[#003535] tracking-wider uppercase">Impuestos & Descuentos</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#595f66] mb-1">Descuento (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invDiscount}
                      onChange={(e) => setInvDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#595f66] mb-1">Impuestos (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invTax}
                      onChange={(e) => setInvTax(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Payment conditions */}
              <div className="space-y-4 border-l border-[#eaedff] pl-0 md:pl-6">
                <h5 className="text-[11px] font-bold text-[#003535] tracking-wider uppercase">Condiciones de Pago</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#595f66] mb-1">Método de Pago</label>
                    <select
                      value={invPaymentMethod}
                      onChange={(e) => setInvPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                    >
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                      <option value="Crédito">Línea de Crédito Comercial</option>
                      <option value="Efectivo Divisas">Efectivo (Divisas)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#595f66] mb-1">Plazo Estipulado</label>
                    <input
                      type="text"
                      value={invPaymentTerm}
                      onChange={(e) => setInvPaymentTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535] bg-white"
                      placeholder="ej. 30 días"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bloque 4: Recepción y Supervisión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-[#eaedff] pt-6">
            <div>
              <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                Recibido Por (Persona/Área): <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invReceivedBy}
                onChange={(e) => setInvReceivedBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                Supervisado Por: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={invSupervisedBy}
                onChange={(e) => setInvSupervisedBy(e.target.value)}
                className="w-full px-4 py-2 border border-[#eaedff] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#003535]"
              />
            </div>
          </div>

          {/* Footer Totals Summary and Buttons */}
          <div className="border-t border-[#eaedff] pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6" id="invoice-totals-bar">
            {/* Dynamic Totals */}
            <div className="flex flex-wrap gap-6 text-xs font-semibold text-slate-600">
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Subtotal Facturado</p>
                <p className="text-sm font-bold text-slate-800">{symbol}{invSubtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Descuento Facturado</p>
                <p className="text-sm font-bold text-red-600">-{symbol}{invDiscountVal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Impuestos Facturados ({invTax}%)</p>
                <p className="text-sm font-bold text-slate-800">+{symbol}{invTaxVal.toFixed(2)}</p>
              </div>
              <div className="border-l border-[#eaedff] pl-6">
                <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Importe Total Facturado</p>
                <p className="text-lg font-black text-[#003535]">{symbol}{invTotalAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-5 py-2.5 border border-[#eaedff] text-slate-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#003535] hover:bg-[#0d4d4d] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Registrar Factura
              </button>
            </div>
          </div>
        </form>
        </div>
      )}


      {/* DETAIL MODAL FOR ORDER/INVOICE */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 bg-[#001010]/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="compras-detail-modal">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-[#eaedff] flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 bg-[#003535] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-[#b4edec]">
                  {selectedOrderDetail.isInvoice ? 'receipt_long' : 'post_add'}
                </span>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Detalle de {selectedOrderDetail.isInvoice ? `Factura ${selectedOrderDetail.invoiceNo || selectedOrderDetail.orderId}` : `Orden de Compra ${selectedOrderDetail.orderId}`}
                  </h3>
                  <p className="text-[10px] text-[#85bdbc] font-semibold uppercase">Proveedor: {selectedOrderDetail.supplier}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="p-1 hover:bg-[#0d4d4d] rounded-lg text-[#85bdbc] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
              
              {/* Basic Meta row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-[9px] text-[#bfc8c8] font-bold uppercase leading-none mb-1">Fecha Emisión</p>
                  <p className="text-xs font-bold text-slate-800">{selectedOrderDetail.date}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#bfc8c8] font-bold uppercase leading-none mb-1">Estado Recepción</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    selectedOrderDetail.status === 'RECIBIDO'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}>
                    {selectedOrderDetail.status}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] text-[#bfc8c8] font-bold uppercase leading-none mb-1">Método Pago</p>
                  <p className="text-xs font-bold text-slate-800">{selectedOrderDetail.poPaymentMethod || 'Transferencia'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#bfc8c8] font-bold uppercase leading-none mb-1">Plazo de Pago</p>
                  <p className="text-xs font-bold text-slate-800">{selectedOrderDetail.poPaymentTerm || '30 días'}</p>
                </div>
              </div>

              {/* Items Detail Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-l-4 border-[#003535] pl-2">
                  Detalle de Productos Facturados / Pedidos
                </h4>
                <div className="border border-[#eaedff] rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#eaedff] text-[9px] font-bold text-slate-500 uppercase">
                        <th className="py-2.5 px-4">Producto</th>
                        <th className="py-2.5 px-4 text-center">Cantidad</th>
                        <th className="py-2.5 px-4 text-right">Precio</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaedff]/40 font-medium">
                      {selectedOrderDetail.items && Array.isArray(selectedOrderDetail.items) ? (
                        selectedOrderDetail.items.map((it: any, i: number) => (
                          <tr key={i}>
                            <td className="py-2.5 px-4 font-bold text-slate-700">{it.name}</td>
                            <td className="py-2.5 px-4 text-center">{it.quantity} unidades</td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-500">{symbol}{it.price.toFixed(2)}</td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#003535]">{symbol}{(it.quantity * it.price).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-3 px-4 font-bold text-slate-700">Reabastecimiento Global</td>
                          <td className="py-3 px-4 text-center">1</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{symbol}{selectedOrderDetail.amount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#003535]">{symbol}{selectedOrderDetail.amount.toFixed(2)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Logistic Conditions / Signatures depending on document type */}
              {selectedOrderDetail.isInvoice ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#eaedff] pt-4 text-xs font-semibold text-slate-600">
                  <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-bold uppercase mb-1">Recibido Por (Físico/Sistemas)</p>
                    <p className="text-slate-800 font-bold">{selectedOrderDetail.receivedBy || 'Responsable de Almacén'}</p>
                  </div>
                  <div className="bg-indigo-50/20 p-3 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-indigo-800 font-bold uppercase mb-1">Supervisado Por</p>
                    <p className="text-slate-800 font-bold">{selectedOrderDetail.supervisedBy || 'Gerente Operativo'}</p>
                  </div>
                  {selectedOrderDetail.linkedPOId && (
                    <div className="col-span-full p-2.5 bg-slate-50 text-[10px] text-slate-500 rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">link</span>
                      <span>Esta factura se cargó vinculada a la Orden de Compra previa: <strong>{selectedOrderDetail.linkedPOId}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 border-t border-[#eaedff] pt-4 text-xs font-semibold text-slate-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-[#bfc8c8] font-bold uppercase mb-0.5">Fecha Entrega Límite</p>
                      <p className="text-slate-800 font-bold">{selectedOrderDetail.poDeliveryDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#bfc8c8] font-bold uppercase mb-0.5">Persona / Área de Recepción</p>
                      <p className="text-slate-800 font-bold">{selectedOrderDetail.poDeliveryContact || 'Responsable del Almacén'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#bfc8c8] font-bold uppercase mb-0.5">Dirección de Despacho</p>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedOrderDetail.poDeliveryAddress || 'Almacén Principal'}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#eaedff]/60 pt-4">
                    <div>
                      <p className="text-[10px] text-[#003535] font-bold uppercase mb-0.5">Elaborado Por</p>
                      <p className="text-slate-800 font-bold">{selectedOrderDetail.elaboratedBy || 'Analista de Compras'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#003535] font-bold uppercase mb-0.5">Autorizado Por (Firma)</p>
                      <p className="text-slate-800 font-bold">{selectedOrderDetail.authorizedBy || 'Gerente de Sucursal'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic totals summary */}
              <div className="bg-[#003535]/5 p-4 rounded-2xl border border-[#003535]/10 flex justify-between items-center text-xs">
                <div>
                  <p className="text-[10px] text-[#bfc8c8] font-bold uppercase">Importe Total del Documento</p>
                  <p className="text-[9px] text-[#5f656c] font-medium">Incluye descuentos {selectedOrderDetail.poDiscount || 0}% e impuestos {selectedOrderDetail.poTax || 16}%</p>
                </div>
                <p className="text-xl font-black text-[#003535]">{symbol}{selectedOrderDetail.amount.toFixed(2)}</p>
              </div>

            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-[#eaedff] flex items-center justify-end">
              <button
                onClick={() => setSelectedOrderDetail(null)}
                className="px-5 py-2 bg-[#003535] hover:bg-[#0d4d4d] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CREATE PRODUCT MODAL */}
      {showCreateProductModal && (
        <div className="fixed inset-0 bg-[#001010]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="quick-create-product-modal">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#eaedff] flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 bg-[#003535] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-[#b4edec]">add_circle</span>
                <h3 className="text-sm font-bold tracking-tight">Crear Nuevo Producto</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateProductModal(false)}
                className="p-1 hover:bg-[#0d4d4d] rounded-lg text-[#85bdbc] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuickProduct} className="p-6 overflow-y-auto space-y-4 text-slate-800 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                  Nombre del Producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535]"
                  placeholder="ej. Refresco Coca-Cola 1.5L"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Código SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535]"
                    placeholder="ej. 010"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  >
                    <option value="General">General</option>
                    <option value="Papelería">Papelería</option>
                    <option value="Librería">Librería</option>
                    <option value="Electrónica">Electrónica</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Hogar">Hogar</option>
                    <option value="Insumos">Insumos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Unidad de Medida
                  </label>
                  <select
                    value={newProdUnitOfMeasure}
                    onChange={(e) => setNewProdUnitOfMeasure(e.target.value)}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535] bg-white"
                  >
                    <option value="Unidades">Unidades</option>
                    <option value="Cajas">Cajas</option>
                    <option value="Piezas">Piezas</option>
                    <option value="Paquetes">Paquetes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Stock Inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-[#eaedff] pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Costo ({symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newProdCostPrice}
                    onChange={(e) => setNewProdCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1">
                    Ganancia (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={newProdMarkupPercent}
                    onChange={(e) => setNewProdMarkupPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-4 py-2.5 border border-[#eaedff] rounded-xl font-semibold focus:outline-none focus:border-[#003535]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#595f66] uppercase tracking-wider mb-1 text-[#003535]">
                    Venta ({symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled
                    value={newProdPrice}
                    className="w-full px-4 py-2.5 border border-[#eaedff] bg-gray-50 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-xl text-[11px] text-teal-800">
                💡 El stock mínimo por defecto se configurará en <strong>0</strong> unidades.
              </div>

              {/* Actions */}
              <div className="border-t border-[#eaedff] pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateProductModal(false)}
                  className="px-4 py-2 border border-[#eaedff] text-slate-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003535] hover:bg-[#0d4d4d] text-white rounded-xl font-bold transition-all shadow-md"
                >
                  Crear Producto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
