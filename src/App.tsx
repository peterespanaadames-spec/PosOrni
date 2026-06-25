/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, seedDatabase, FirebaseService } from './firebase';
import { Product, Client, Employee, PurchaseOrder, Transaction, InventoryMovement, BusinessSettings, CartItem, Supplier, CashboxSession, CashboxTransaction, FinanceMovement } from './types';

// Import Views
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Header } from './components/Header';
import { Tablero } from './components/Tablero';
import { Terminal } from './components/Terminal';
import { Productos } from './components/Productos';
import { Inventario } from './components/Inventario';
import { Compras } from './components/Compras';
import { Proveedores } from './components/Proveedores';
import { CRM } from './components/CRM';
import { Empleados } from './components/Empleados';
import { Informes } from './components/Informes';
import { Finanzas } from './components/Finanzas';
import { Configuracion } from './components/Configuracion';
import { Caja } from './components/Caja';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentTab, setCurrentTab] = useState('tablero');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore / Local State
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cashboxSessions, setCashboxSessions] = useState<CashboxSession[]>([]);
  const [cashboxTransactions, setCashboxTransactions] = useState<CashboxTransaction[]>([]);
  const [financeMovements, setFinanceMovements] = useState<FinanceMovement[]>([]);
  const [bankBalances, setBankBalances] = useState<{ bdvCorriente: number; visa: number }>({ bdvCorriente: 18450.20, visa: -1240.50 });

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      // Running offline fallback mode
      setAuthChecking(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync data with Storage / Firebase when user is active
  const syncDatabase = async () => {
    try {
      await seedDatabase();
      const [
        dbSettings,
        dbProducts,
        dbClients,
        dbEmployees,
        dbPurchaseOrders,
        dbTransactions,
        dbMovements,
        dbSuppliers,
        dbSessions,
        dbCBTxs,
        dbFinanceMovements,
        dbBankBalances
      ] = await Promise.all([
        FirebaseService.getSettings(),
        FirebaseService.getProducts(),
        FirebaseService.getClients(),
        FirebaseService.getEmployees(),
        FirebaseService.getPurchaseOrders(),
        FirebaseService.getTransactions(),
        FirebaseService.getInventoryMovements(),
        FirebaseService.getSuppliers(),
        FirebaseService.getCashboxSessions(),
        FirebaseService.getCashboxTransactions(),
        FirebaseService.getFinanceMovements(),
        FirebaseService.getBankBalances()
      ]);

      setSettings(dbSettings);
      setProducts(dbProducts);
      setClients(dbClients);
      setEmployees(dbEmployees);
      setPurchaseOrders(dbPurchaseOrders);
      setSuppliers(dbSuppliers);
      setFinanceMovements(dbFinanceMovements);
      setBankBalances(dbBankBalances);
      setCashboxSessions(dbSessions.sort((a, b) => {
        const aDate = a.openedAt.includes(',') ? a.openedAt.split(',')[0] : a.openedAt;
        const bDate = b.openedAt.includes(',') ? b.openedAt.split(',')[0] : b.openedAt;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      }));
      setCashboxTransactions(dbCBTxs);
      // Sort transactions & movements by date descending for clean display
      setTransactions(dbTransactions.sort((a, b) => new Date(b.dateTime.includes('Hoy') ? Date.now() : b.dateTime).getTime() - new Date(a.dateTime.includes('Hoy') ? Date.now() : a.dateTime).getTime()));
      setMovements(dbMovements.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()));
    } catch (err) {
      console.error("Database synchronization failed:", err);
    }
  };

  useEffect(() => {
    if (user) {
      syncDatabase();
    }
  }, [user]);

  // Auth Handlers
  const handleLoginSuccess = (usr: any) => {
    setUser(usr);
  };

  const handleLogout = async () => {
    if (auth && !user?.isDemo) {
      await signOut(auth);
    }
    setUser(null);
    setCurrentTab('tablero');
  };

  // Cashbox handlers
  const handleOpenCaja = async (initialCash: number, notes?: string) => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const openedAtStr = today.toLocaleString('es-VE', { timeZone: 'America/Caracas' });

    const newSession: CashboxSession = {
      openedAt: openedAtStr,
      closedAt: null,
      date: todayStr,
      initialCash,
      expectedCash: initialCash,
      actualCash: null,
      difference: null,
      status: 'OPEN',
      openedBy: user?.displayName || 'Administrador',
      closedBy: null,
      notes: notes || ''
    };

    await FirebaseService.addCashboxSession(newSession);
    await syncDatabase();
  };

  const handleCloseCaja = async (id: string, actualCash: number, notes?: string) => {
    const today = new Date();
    const closedAtStr = today.toLocaleString('es-VE', { timeZone: 'America/Caracas' });

    // Calculate actual expectedCash from current transactions
    const sessionTxs = cashboxTransactions.filter(t => t.cashboxId === id);
    const initialAmt = cashboxSessions.find(s => s.id === id)?.initialCash || 0;
    
    const totalSalesCash = sessionTxs
      .filter(t => t.type === 'INGRESO' && t.reference?.startsWith('Ticket'))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalManualInflow = sessionTxs
      .filter(t => t.type === 'INGRESO' && !t.reference?.startsWith('Ticket'))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalManualOutflow = sessionTxs
      .filter(t => t.type === 'EGRESO')
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedCashAmt = initialAmt + totalSalesCash + totalManualInflow - totalManualOutflow;
    const difference = actualCash - expectedCashAmt;

    const update: Partial<CashboxSession> = {
      closedAt: closedAtStr,
      expectedCash: expectedCashAmt,
      actualCash,
      difference,
      status: 'CLOSED',
      closedBy: user?.displayName || 'Administrador',
      notes: notes || ''
    };

    await FirebaseService.updateCashboxSession(id, update);
    await syncDatabase();
  };

  const handleAddCajaTransaction = async (type: 'INGRESO' | 'EGRESO', amount: number, concept: string, notes?: string) => {
    const activeSession = cashboxSessions.find(s => s.status === 'OPEN');
    if (!activeSession || !activeSession.id) return;

    const today = new Date();
    const dateTimeStr = today.toLocaleString('es-VE', { timeZone: 'America/Caracas' });

    const newTx: CashboxTransaction = {
      cashboxId: activeSession.id,
      dateTime: dateTimeStr,
      type,
      amount,
      concept,
      reference: notes || '',
      responsible: user?.displayName || 'Administrador'
    };

    await FirebaseService.addCashboxTransaction(newTx);

    // Also update expectedCash on the session immediately
    const isIngreso = type === 'INGRESO';
    const newExpected = activeSession.expectedCash + (isIngreso ? amount : -amount);
    await FirebaseService.updateCashboxSession(activeSession.id, { expectedCash: newExpected });

    await syncDatabase();
  };

  // Checkout Handler (Transactions & stock decrement)
  const handleCheckout = async (
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
  ): Promise<Transaction | null> => {
    const today = new Date();
    const timeStr = today.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' });
    const dateTimeStr = `Hoy, ${timeStr}`;

    const newTx: Transaction = {
      ticketNo,
      dateTime: dateTimeStr,
      products: cart.map(item => ({
        productId: item.product.id || '',
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      category: 'Ventas',
      subtotal,
      tax,
      total,
      customerId: customer?.id || undefined,
      customerName: customer?.name || 'Cliente General',
      status: (payments?.pendiente && payments.pendiente > 0) ? 'PENDIENTE' : 'COMPLETADO',
      payments
    };

    try {
      // 1. Add Transaction
      const txId = await FirebaseService.addTransaction(newTx);
      newTx.id = txId;

      // 2. Decrement Stocks & Add movements
      for (const item of cart) {
        if (!item.product.id) continue;
        const newStock = Math.max(0, item.product.stock - item.quantity);
        await FirebaseService.updateProduct(item.product.id, { stock: newStock });

        // Add inventory movement log
        const mov: InventoryMovement = {
          dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
          productId: item.product.id,
          productName: item.product.name,
          type: 'VENTA',
          quantity: -item.quantity,
          responsible: 'Terminal TPV-01'
        };
        await FirebaseService.addInventoryMovement(mov);
      }

      // 3. Update Client total spent if linked
      if (customer && customer.id) {
        const updatedSpent = customer.totalSpent + total;
        await FirebaseService.updateClient(customer.id, {
          totalSpent: updatedSpent,
          lastPurchaseDate: 'Hoy',
          lastTicketNo: ticketNo
        });
      }

      // 4. Update Cashbox Session and Create automatic cash/electronic transactions
      const activeSession = cashboxSessions.find(s => s.status === 'OPEN');
      if (activeSession?.id) {
        let updatedExpectedCash = activeSession.expectedCash;

        // Register Cash Payment if present
        if (payments?.efectivo && payments.efectivo > 0) {
          const cashAmt = payments.efectivo;
          const newCBTx: CashboxTransaction = {
            cashboxId: activeSession.id,
            dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
            type: 'INGRESO',
            amount: cashAmt,
            concept: `Venta TPV - ${customer?.name || 'Cliente General'}`,
            reference: `Ticket ${ticketNo}`,
            responsible: user?.displayName || 'Sistema Terminal',
            paymentMethod: 'EFECTIVO',
            customerName: customer?.name || 'Cliente General'
          };
          await FirebaseService.addCashboxTransaction(newCBTx);
          updatedExpectedCash += cashAmt;
        }

        // Register Pago Móvil Venezuela if present
        if (payments?.pagoMovilVenezuela && payments.pagoMovilVenezuela > 0) {
          const pmVenAmt = payments.pagoMovilVenezuela;
          const newCBTx: CashboxTransaction = {
            cashboxId: activeSession.id,
            dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
            type: 'INGRESO',
            amount: pmVenAmt,
            concept: `Pago Móvil Venezuela - ${customer?.name || 'Cliente General'}`,
            reference: `Ticket ${ticketNo}`,
            responsible: user?.displayName || 'Sistema Terminal',
            paymentMethod: 'PAGO_MOVIL_VENEZUELA',
            customerName: customer?.name || 'Cliente General'
          };
          await FirebaseService.addCashboxTransaction(newCBTx);
        }

        // Register Pago Móvil Banesco if present
        if (payments?.pagoMovilBanesco && payments.pagoMovilBanesco > 0) {
          const pmBanAmt = payments.pagoMovilBanesco;
          const newCBTx: CashboxTransaction = {
            cashboxId: activeSession.id,
            dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
            type: 'INGRESO',
            amount: pmBanAmt,
            concept: `Pago Móvil Banesco - ${customer?.name || 'Cliente General'}`,
            reference: `Ticket ${ticketNo}`,
            responsible: user?.displayName || 'Sistema Terminal',
            paymentMethod: 'PAGO_MOVIL_BANESCO',
            customerName: customer?.name || 'Cliente General'
          };
          await FirebaseService.addCashboxTransaction(newCBTx);
        }

        // Register Pendiente (Cuentas por Cobrar / Crédito) if present
        if (payments?.pendiente && payments.pendiente > 0) {
          const penAmt = payments.pendiente;
          const newCBTx: CashboxTransaction = {
            cashboxId: activeSession.id,
            dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
            type: 'INGRESO',
            amount: penAmt,
            concept: `Crédito Pendiente - ${customer?.name || 'Cliente General'}`,
            reference: `Ticket ${ticketNo}`,
            responsible: user?.displayName || 'Sistema Terminal',
            paymentMethod: 'PENDIENTE',
            customerName: customer?.name || 'Cliente General'
          };
          await FirebaseService.addCashboxTransaction(newCBTx);
        }

        // Update expectedCash on the session if physical cash changed
        if (updatedExpectedCash !== activeSession.expectedCash) {
          await FirebaseService.updateCashboxSession(activeSession.id, { expectedCash: updatedExpectedCash });
        }
      }

      // Re-fetch database to align states
      await syncDatabase();
      return newTx;
    } catch (e) {
      console.error("Checkout execution pipeline failed:", e);
      return null;
    }
  };

  const handleSettlePendingDebt = async (
    transactionId: string,
    paymentMethod: 'EFECTIVO' | 'PAGO_MOVIL_VENEZUELA' | 'PAGO_MOVIL_BANESCO',
    amountPaid: number
  ) => {
    try {
      const tx = transactions.find(t => t.id === transactionId);
      if (!tx) return;

      const currentPayments = tx.payments || {};
      const previousPendiente = currentPayments.pendiente || 0;
      const newPayments = {
        ...currentPayments,
        pendiente: Math.max(0, previousPendiente - amountPaid),
        [paymentMethod === 'EFECTIVO' ? 'efectivo' : paymentMethod === 'PAGO_MOVIL_VENEZUELA' ? 'pagoMovilVenezuela' : 'pagoMovilBanesco']: 
          (currentPayments[paymentMethod === 'EFECTIVO' ? 'efectivo' : paymentMethod === 'PAGO_MOVIL_VENEZUELA' ? 'pagoMovilVenezuela' : 'pagoMovilBanesco'] || 0) + amountPaid
      };

      const isFullyPaid = newPayments.pendiente <= 0.05;
      const updatedStatus = isFullyPaid ? 'COMPLETADO' : 'PENDIENTE';

      await FirebaseService.updateTransaction(transactionId, {
        status: updatedStatus,
        payments: newPayments
      });

      const activeSession = cashboxSessions.find(s => s.status === 'OPEN');
      if (activeSession?.id) {
        const today = new Date();
        const methodNames: Record<string, string> = {
          'EFECTIVO': 'Efectivo',
          'PAGO_MOVIL_VENEZUELA': 'Pago Móvil Venezuela',
          'PAGO_MOVIL_BANESCO': 'Pago Móvil Banesco'
        };

        const newCBTx: CashboxTransaction = {
          cashboxId: activeSession.id,
          dateTime: today.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
          type: 'INGRESO',
          amount: amountPaid,
          concept: `Abono de Crédito - ${tx.customerName || 'Cliente'} (${methodNames[paymentMethod] || paymentMethod})`,
          reference: `Ticket ${tx.ticketNo}`,
          responsible: user?.displayName || 'Sistema Terminal',
          paymentMethod: paymentMethod,
          customerName: tx.customerName || 'Cliente'
        };
        await FirebaseService.addCashboxTransaction(newCBTx);

        if (paymentMethod === 'EFECTIVO') {
          const newExpected = activeSession.expectedCash + amountPaid;
          await FirebaseService.updateCashboxSession(activeSession.id, { expectedCash: newExpected });
        }
      }

      await syncDatabase();
    } catch (error) {
      console.error("Failed to settle pending debt:", error);
    }
  };

  // Products Handlers
  const handleAddProduct = async (product: Product) => {
    await FirebaseService.addProduct(product);
    await syncDatabase();
  };

  const handleUpdateProduct = async (id: string, product: Partial<Product>) => {
    await FirebaseService.updateProduct(id, product);
    await syncDatabase();
  };

  const handleDeleteProduct = async (id: string) => {
    await FirebaseService.deleteProduct(id);
    await syncDatabase();
  };

  // Inventory Manual Adjustments Handler
  const handleAddMovement = async (productId: string, type: 'ENTRADA' | 'SALIDA' | 'MERMA' | 'VENTA' | 'AJUSTE', qty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod || !prod.id) return;

    const todayStr = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
    const mov: InventoryMovement = {
      dateTime: todayStr,
      productId: prod.id,
      productName: prod.name,
      type,
      quantity: qty,
      responsible: user?.displayName || 'Administrador'
    };

    try {
      await FirebaseService.addInventoryMovement(mov);
      // Update actual product stock
      const updatedStock = Math.max(0, prod.stock + qty);
      await FirebaseService.updateProduct(prod.id, { stock: updatedStock });
      await syncDatabase();
    } catch (e) {
      console.error("Error applying movement adjustment:", e);
    }
  };

  // Purchase Orders Handlers
  const processStockForPurchaseOrder = async (po: PurchaseOrder) => {
    if (po.status === 'RECIBIDO' && !po.stockProcessed && po.items && po.items.length > 0) {
      const todayStr = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' });
      for (const item of po.items) {
        // Find product by id
        const prod = products.find(p => p.id === item.productId || p.sku === item.productId || p.name === item.name);
        if (prod && prod.id) {
          const mov: InventoryMovement = {
            dateTime: todayStr,
            productId: prod.id,
            productName: prod.name,
            type: 'ENTRADA',
            quantity: item.quantity,
            responsible: user?.displayName || 'Sistema (Compras)'
          };
          try {
            await FirebaseService.addInventoryMovement(mov);
            const newStock = prod.stock + item.quantity;
            await FirebaseService.updateProduct(prod.id, { stock: newStock });
          } catch (e) {
            console.error(`Error processing inventory movement for product ${prod.name}:`, e);
          }
        }
      }
      po.stockProcessed = true;
    }
  };

  const handleAddPurchaseOrder = async (po: PurchaseOrder) => {
    await processStockForPurchaseOrder(po);
    await FirebaseService.addPurchaseOrder(po);
    await syncDatabase();
  };

  const handleUpdatePurchaseOrder = async (id: string, poUpdate: Partial<PurchaseOrder>) => {
    const existingPO = purchaseOrders.find(p => p.id === id);
    if (existingPO) {
      const mergedPO = { ...existingPO, ...poUpdate };
      await processStockForPurchaseOrder(mergedPO);
      await FirebaseService.updatePurchaseOrder(id, mergedPO);
    } else {
      await FirebaseService.updatePurchaseOrder(id, poUpdate);
    }
    await syncDatabase();
  };

  // Client CRM Handlers
  const handleAddClient = async (client: Client) => {
    await FirebaseService.addClient(client);
    await syncDatabase();
  };

  const handleUpdateClient = async (id: string, client: Partial<Client>) => {
    await FirebaseService.updateClient(id, client);
    await syncDatabase();
  };

  // Suppliers Handlers
  const handleAddSupplier = async (supplier: Supplier) => {
    await FirebaseService.addSupplier(supplier);
    await syncDatabase();
  };

  const handleUpdateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    await FirebaseService.updateSupplier(id, supplier);
    await syncDatabase();
  };

  const handleDeleteSupplier = async (id: string) => {
    await FirebaseService.deleteSupplier(id);
    await syncDatabase();
  };

  // Employees Handlers
  const handleAddEmployee = async (employee: Employee) => {
    await FirebaseService.addEmployee(employee);
    await syncDatabase();
  };

  const handleUpdateEmployee = async (id: string, employee: Partial<Employee>) => {
    await FirebaseService.updateEmployee(id, employee);
    await syncDatabase();
  };

  // Settings Handler
  const handleSaveSettings = async (newSettings: BusinessSettings) => {
    await FirebaseService.saveSettings(newSettings);
    await syncDatabase();
  };

  // Financial Handlers
  const handleAddFinanceMovement = async (movement: FinanceMovement) => {
    await FirebaseService.addFinanceMovement(movement);
    await syncDatabase();
  };

  const handleUpdateBankBalances = async (balances: { bdvCorriente: number; visa: number }) => {
    await FirebaseService.saveBankBalances(balances);
    await syncDatabase();
  };

  // Render Switches
  const renderTabContent = () => {
    const currency = settings?.currency || 'USD';
    switch (currentTab) {
      case 'tablero':
        return (
          <Tablero
            products={products}
            transactions={transactions}
            purchaseOrders={purchaseOrders}
            setCurrentTab={setCurrentTab}
            currency={currency}
          />
        );
      case 'terminal':
        return (
          <Terminal
            products={products}
            clients={clients}
            taxRate={settings?.taxRate || 21}
            onCheckout={handleCheckout}
            currency={currency}
            activeCashbox={cashboxSessions.find(s => s.status === 'OPEN')}
            hasUnclosedPreviousCashbox={!!cashboxSessions.find(s => s.status === 'OPEN' && s.date !== new Date().toLocaleDateString('en-CA'))}
            setCurrentTab={setCurrentTab}
          />
        );
      case 'caja':
        return (
          <Caja
            user={user}
            currency={currency}
            sessions={cashboxSessions}
            transactions={cashboxTransactions}
            salesTransactions={transactions}
            onSettlePendingDebt={handleSettlePendingDebt}
            onOpenCaja={handleOpenCaja}
            onCloseCaja={handleCloseCaja}
            onAddTransaction={handleAddCajaTransaction}
            companyName={settings?.companyName || 'VentasPro'}
          />
        );
      case 'productos':
        return (
          <Productos
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            currency={currency}
          />
        );
      case 'inventario':
        return (
          <Inventario
            products={products}
            movements={movements}
            onAddMovement={handleAddMovement}
            currency={currency}
          />
        );
      case 'compras':
        return (
          <Compras
            purchaseOrders={purchaseOrders}
            onAddPurchaseOrder={handleAddPurchaseOrder}
            onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
            currency={currency}
            suppliers={suppliers}
            products={products}
            onAddProduct={handleAddProduct}
          />
        );
      case 'proveedores':
        return (
          <Proveedores
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
          />
        );
      case 'crm':
        return (
          <CRM
            clients={clients}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            currency={currency}
          />
        );
      case 'empleados':
        return (
          <Empleados
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
          />
        );
      case 'informes':
        return <Informes products={products} transactions={transactions} currency={currency} />;
      case 'finanzas':
        return (
          <Finanzas
            transactions={transactions}
            currency={currency}
            cashboxSessions={cashboxSessions}
            cashboxTransactions={cashboxTransactions}
            financeMovements={financeMovements}
            bankBalances={bankBalances}
            onAddFinanceMovement={handleAddFinanceMovement}
            onUpdateBankBalances={handleUpdateBankBalances}
            onSettlePendingDebt={handleSettlePendingDebt}
          />
        );
      case 'configuracion':
        return (
          <Configuracion
            settings={settings || {
              companyName: 'Cargando...',
              taxId: '',
              legalAddress: '',
              taxLabel: 'IVA',
              taxRate: 21,
              applicableZones: [],
              currency: 'USD',
              decimalFormat: '2',
              separator: 'coma'
            }}
            onSaveSettings={handleSaveSettings}
          />
        );
      default:
        return <div className="p-8 font-semibold">Sección en desarrollo...</div>;
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8ff] select-none text-[#003535] font-sans">
        <div className="text-center space-y-4">
          <span className="animate-spin text-4xl block">⏳</span>
          <p className="text-sm font-extrabold tracking-widest uppercase">Iniciando VentasPRO...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#faf8ff] font-sans">
      {/* Side Navigation panel */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onLogout={handleLogout}
        user={user}
      />

      {/* Main Coordinate Dashboard & Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header details */}
        <Header
          currentTab={currentTab}
          isFirebase={!!auth && !user?.isDemo}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Dynamic View container */}
        <div className="flex-1 overflow-hidden bg-gray-50/40">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
