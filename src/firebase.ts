/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, limit, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { BusinessSettings, Product, Client, Employee, PurchaseOrder, Transaction, InventoryMovement, Supplier, CashboxSession, CashboxTransaction, FinanceMovement } from './types';
import {
  defaultSettings,
  defaultProducts,
  defaultClients,
  defaultEmployees,
  defaultPurchaseOrders,
  defaultTransactions,
  defaultInventoryMovements,
  defaultSuppliers
} from './seedData';

// Check if firebase config is valid/present
const isFirebaseValid = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== "MY_GEMINI_API_KEY";

let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

if (isFirebaseValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    // Specify custom firestore databaseId if provided
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
    googleProvider = new GoogleAuthProvider();
    console.log("Firebase initialized successfully with DB ID:", firebaseConfig.firestoreDatabaseId);
  } catch (e) {
    console.error("Error initializing real Firebase. Falling back to local storage.", e);
  }
} else {
  console.warn("No valid Firebase configuration found. App running in local storage fallback mode.");
}

// Memory / LocalStorage fallback databases
const localDB = {
  get: (key: string, defaultVal: any) => {
    const data = localStorage.getItem(`ventaspro_${key}`);
    return data ? JSON.parse(data) : defaultVal;
  },
  set: (key: string, val: any) => {
    localStorage.setItem(`ventaspro_${key}`, JSON.stringify(val));
  }
};

// Seeding function
export async function seedDatabase() {
  if (db) {
    try {
      // 1. Settings
      const settingsRef = doc(db, 'settings', 'business_settings');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, defaultSettings);
        console.log("Settings seeded to Firestore");
      }

      // 2. Products
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(query(productsRef, limit(1)));
      if (productsSnap.empty) {
        for (const prod of defaultProducts) {
          await addDoc(productsRef, prod);
        }
        console.log("Products seeded to Firestore");
      }

      // 3. Clients
      const clientsRef = collection(db, 'clients');
      const clientsSnap = await getDocs(query(clientsRef, limit(1)));
      if (clientsSnap.empty) {
        for (const cl of defaultClients) {
          await addDoc(clientsRef, cl);
        }
        console.log("Clients seeded to Firestore");
      }

      // 4. Employees
      const employeesRef = collection(db, 'employees');
      const employeesSnap = await getDocs(query(employeesRef, limit(1)));
      if (employeesSnap.empty) {
        for (const emp of defaultEmployees) {
          await addDoc(employeesRef, emp);
        }
        console.log("Employees seeded to Firestore");
      }

      // 5. Purchase Orders
      const purchaseOrdersRef = collection(db, 'purchase_orders');
      const poSnap = await getDocs(query(purchaseOrdersRef, limit(1)));
      if (poSnap.empty) {
        for (const po of defaultPurchaseOrders) {
          await addDoc(purchaseOrdersRef, po);
        }
        console.log("Purchase Orders seeded to Firestore");
      }

      // 6. Transactions
      const transRef = collection(db, 'transactions');
      const transSnap = await getDocs(query(transRef, limit(1)));
      if (transSnap.empty) {
        for (const t of defaultTransactions) {
          await addDoc(transRef, t);
        }
        console.log("Transactions seeded to Firestore");
      }

      // 7. Inventory movements
      const movsRef = collection(db, 'inventory_movements');
      const movSnap = await getDocs(query(movsRef, limit(1)));
      if (movSnap.empty) {
        for (const m of defaultInventoryMovements) {
          await addDoc(movsRef, m);
        }
        console.log("Inventory movements seeded to Firestore");
      }

      // 8. Suppliers
      const suppliersRef = collection(db, 'suppliers');
      const suppliersSnap = await getDocs(query(suppliersRef, limit(1)));
      if (suppliersSnap.empty) {
        for (const s of defaultSuppliers) {
          await addDoc(suppliersRef, s);
        }
        console.log("Suppliers seeded to Firestore");
      }

      // 9. Finance Movements & Bank Balances
      const finRef = collection(db, 'finance_movements');
      const finSnap = await getDocs(query(finRef, limit(1)));
      if (finSnap.empty) {
        const defaultFinanceMovements = [
          { concept: 'Pago de Factura Proveedor', type: 'EGRESO', amount: 650.00, date: 'Ayer, 08:45', account: 'Banco de Venezuela Corriente', details: 'Suministros Mayoristas' },
          { concept: 'Suministros Oficina Papelería', type: 'EGRESO', amount: 34.50, date: '14 May, 12:30', account: 'Tarjeta Visa de Crédito', details: 'Compra papelería' }
        ];
        for (const fm of defaultFinanceMovements) {
          await addDoc(finRef, fm);
        }
        console.log("Finance movements seeded to Firestore");
      }

      const balDocRef = doc(db, 'finances', 'bank_balances');
      const balDocSnap = await getDoc(balDocRef);
      if (!balDocSnap.exists()) {
        await setDoc(balDocRef, { bdvCorriente: 18450.20, visa: -1240.50 });
        console.log("Bank balances seeded to Firestore");
      }

    } catch (error) {
      console.error("Error seeding Firebase Firestore database:", error);
    }
  } else {
    // Local storage seeding
    if (!localStorage.getItem('ventaspro_seeded')) {
      localDB.set('settings', defaultSettings);
      localDB.set('products', defaultProducts.map((p, idx) => ({ ...p, id: `p_${idx}` })));
      localDB.set('clients', defaultClients.map((c, idx) => ({ ...c, id: `c_${idx}` })));
      localDB.set('employees', defaultEmployees.map((e, idx) => ({ ...e, id: `e_${idx}` })));
      localDB.set('purchase_orders', defaultPurchaseOrders.map((po, idx) => ({ ...po, id: `po_${idx}` })));
      localDB.set('transactions', defaultTransactions.map((t, idx) => ({ ...t, id: `t_${idx}` })));
      localDB.set('inventory_movements', defaultInventoryMovements.map((m, idx) => ({ ...m, id: `m_${idx}` })));
      localDB.set('suppliers', defaultSuppliers.map((s, idx) => ({ ...s, id: `s_${idx}` })));
      
      const defaultFinanceMovements = [
        { id: 'fm_1', concept: 'Pago de Factura Proveedor', type: 'EGRESO', amount: 650.00, date: 'Ayer, 08:45', account: 'Banco de Venezuela Corriente', details: 'Suministros Mayoristas' },
        { id: 'fm_2', concept: 'Suministros Oficina Papelería', type: 'EGRESO', amount: 34.50, date: '14 May, 12:30', account: 'Tarjeta Visa de Crédito', details: 'Compra papelería' }
      ];
      localDB.set('finance_movements', defaultFinanceMovements);
      localDB.set('bank_balances', { bdvCorriente: 18450.20, visa: -1240.50 });

      localStorage.setItem('ventaspro_seeded', 'true');
      console.log("Seeded local storage successfully");
    }
  }
}

// Data fetching helper interfaces
export const FirebaseService = {
  // Settings
  async getSettings(): Promise<BusinessSettings> {
    if (db) {
      try {
        const docRef = doc(db, 'settings', 'business_settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as BusinessSettings;
        }
      } catch (e) {
        console.error("Firestore getSettings failed:", e);
      }
    }
    return localDB.get('settings', defaultSettings);
  },

  async saveSettings(settings: BusinessSettings): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, 'settings', 'business_settings');
        await setDoc(docRef, settings, { merge: true });
        return;
      } catch (e) {
        console.error("Firestore saveSettings failed:", e);
      }
    }
    localDB.set('settings', settings);
  },

  // Products CRUD
  async getProducts(): Promise<Product[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const list: Product[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Product);
        });
        return list;
      } catch (e) {
        console.error("Firestore getProducts failed:", e);
      }
    }
    return localDB.get('products', []);
  },

  async addProduct(product: Product): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'products'), product);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addProduct failed:", e);
      }
    }
    const list = localDB.get('products', []);
    const newId = `p_${Date.now()}`;
    const newProduct = { ...product, id: newId };
    list.push(newProduct);
    localDB.set('products', list);
    return newId;
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'products', id), product);
        return;
      } catch (e) {
        console.error("Firestore updateProduct failed:", e);
      }
    }
    const list: Product[] = localDB.get('products', []);
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...product };
      localDB.set('products', list);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    if (db) {
      try {
        await deleteDoc(doc(db, 'products', id));
        return;
      } catch (e) {
        console.error("Firestore deleteProduct failed:", e);
      }
    }
    const list: Product[] = localDB.get('products', []);
    const filtered = list.filter(p => p.id !== id);
    localDB.set('products', filtered);
  },

  // Clients CRUD
  async getClients(): Promise<Client[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        const list: Client[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Client);
        });
        return list;
      } catch (e) {
        console.error("Firestore getClients failed:", e);
      }
    }
    return localDB.get('clients', []);
  },

  async addClient(client: Client): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'clients'), client);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addClient failed:", e);
      }
    }
    const list = localDB.get('clients', []);
    const newId = `c_${Date.now()}`;
    const newClient = { ...client, id: newId };
    list.push(newClient);
    localDB.set('clients', list);
    return newId;
  },

  async updateClient(id: string, client: Partial<Client>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'clients', id), client);
        return;
      } catch (e) {
        console.error("Firestore updateClient failed:", e);
      }
    }
    const list: Client[] = localDB.get('clients', []);
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...client };
      localDB.set('clients', list);
    }
  },

  // Employees CRUD
  async getEmployees(): Promise<Employee[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'employees'));
        const list: Employee[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Employee);
        });
        return list;
      } catch (e) {
        console.error("Firestore getEmployees failed:", e);
      }
    }
    return localDB.get('employees', []);
  },

  async addEmployee(employee: Employee): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'employees'), employee);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addEmployee failed:", e);
      }
    }
    const list = localDB.get('employees', []);
    const newId = `e_${Date.now()}`;
    const newEmp = { ...employee, id: newId };
    list.push(newEmp);
    localDB.set('employees', list);
    return newId;
  },

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'employees', id), employee);
        return;
      } catch (e) {
        console.error("Firestore updateEmployee failed:", e);
      }
    }
    const list: Employee[] = localDB.get('employees', []);
    const index = list.findIndex(e => e.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...employee };
      localDB.set('employees', list);
    }
  },

  // Purchase Orders CRUD
  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'purchase_orders'));
        const list: PurchaseOrder[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
        });
        return list;
      } catch (e) {
        console.error("Firestore getPurchaseOrders failed:", e);
      }
    }
    return localDB.get('purchase_orders', []);
  },

  async addPurchaseOrder(po: PurchaseOrder): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'purchase_orders'), po);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addPurchaseOrder failed:", e);
      }
    }
    const list = localDB.get('purchase_orders', []);
    const newId = `po_${Date.now()}`;
    const newPO = { ...po, id: newId };
    list.push(newPO);
    localDB.set('purchase_orders', list);
    return newId;
  },

  async updatePurchaseOrder(id: string, po: Partial<PurchaseOrder>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'purchase_orders', id), po);
        return;
      } catch (e) {
        console.error("Firestore updatePurchaseOrder failed:", e);
      }
    }
    const list: PurchaseOrder[] = localDB.get('purchase_orders', []);
    const index = list.findIndex(p => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...po };
      localDB.set('purchase_orders', list);
    }
  },

  // Transactions (Sales) CRUD
  async getTransactions(): Promise<Transaction[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'transactions'));
        const list: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        return list;
      } catch (e) {
        console.error("Firestore getTransactions failed:", e);
      }
    }
    return localDB.get('transactions', []);
  },

  async addTransaction(transaction: Transaction): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'transactions'), transaction);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addTransaction failed:", e);
      }
    }
    const list = localDB.get('transactions', []);
    const newId = `t_${Date.now()}`;
    const newT = { ...transaction, id: newId };
    list.push(newT);
    localDB.set('transactions', list);
    return newId;
  },

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'transactions', id), transaction);
        return;
      } catch (e) {
        console.error("Firestore updateTransaction failed:", e);
      }
    }
    const list: Transaction[] = localDB.get('transactions', []);
    const index = list.findIndex(t => t.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...transaction };
      localDB.set('transactions', list);
    }
  },

  // Inventory movements CRUD
  async getInventoryMovements(): Promise<InventoryMovement[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory_movements'));
        const list: InventoryMovement[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as InventoryMovement);
        });
        return list;
      } catch (e) {
        console.error("Firestore getInventoryMovements failed:", e);
      }
    }
    return localDB.get('inventory_movements', []);
  },

  async addInventoryMovement(mov: InventoryMovement): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'inventory_movements'), mov);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addInventoryMovement failed:", e);
      }
    }
    const list = localDB.get('inventory_movements', []);
    const newId = `m_${Date.now()}`;
    const newM = { ...mov, id: newId };
    list.push(newM);
    localDB.set('inventory_movements', list);
    return newId;
  },

  // Suppliers CRUD
  async getSuppliers(): Promise<Supplier[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'suppliers'));
        const list: Supplier[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Supplier);
        });
        return list;
      } catch (e) {
        console.error("Firestore getSuppliers failed:", e);
      }
    }
    return localDB.get('suppliers', []);
  },

  async addSupplier(supplier: Supplier): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'suppliers'), supplier);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addSupplier failed:", e);
      }
    }
    const list = localDB.get('suppliers', []);
    const newId = `s_${Date.now()}`;
    const newS = { ...supplier, id: newId };
    list.push(newS);
    localDB.set('suppliers', list);
    return newId;
  },

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'suppliers', id), supplier);
        return;
      } catch (e) {
        console.error("Firestore updateSupplier failed:", e);
      }
    }
    const list: Supplier[] = localDB.get('suppliers', []);
    const index = list.findIndex(s => s.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...supplier };
      localDB.set('suppliers', list);
    }
  },

  async deleteSupplier(id: string): Promise<void> {
    if (db) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
        return;
      } catch (e) {
        console.error("Firestore deleteSupplier failed:", e);
      }
    }
    const list: Supplier[] = localDB.get('suppliers', []);
    const filtered = list.filter(s => s.id !== id);
    localDB.set('suppliers', filtered);
  },

  // Cashbox Sessions CRUD
  async getCashboxSessions(): Promise<CashboxSession[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'cashboxes'));
        const list: CashboxSession[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CashboxSession);
        });
        return list;
      } catch (e) {
        console.error("Firestore getCashboxSessions failed:", e);
      }
    }
    return localDB.get('cashbox_sessions', []);
  },

  async addCashboxSession(session: CashboxSession): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'cashboxes'), session);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addCashboxSession failed:", e);
      }
    }
    const list = localDB.get('cashbox_sessions', []);
    const newId = `cb_${Date.now()}`;
    const newSession = { ...session, id: newId };
    list.push(newSession);
    localDB.set('cashbox_sessions', list);
    return newId;
  },

  async updateCashboxSession(id: string, session: Partial<CashboxSession>): Promise<void> {
    if (db) {
      try {
        await updateDoc(doc(db, 'cashboxes', id), session);
        return;
      } catch (e) {
        console.error("Firestore updateCashboxSession failed:", e);
      }
    }
    const list: CashboxSession[] = localDB.get('cashbox_sessions', []);
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...session };
      localDB.set('cashbox_sessions', list);
    }
  },

  // Cashbox Transactions CRUD
  async getCashboxTransactions(): Promise<CashboxTransaction[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'cashbox_transactions'));
        const list: CashboxTransaction[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CashboxTransaction);
        });
        return list;
      } catch (e) {
        console.error("Firestore getCashboxTransactions failed:", e);
      }
    }
    return localDB.get('cashbox_transactions', []);
  },

  async addCashboxTransaction(tx: CashboxTransaction): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'cashbox_transactions'), tx);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addCashboxTransaction failed:", e);
      }
    }
    const list = localDB.get('cashbox_transactions', []);
    const newId = `cbtx_${Date.now()}`;
    const newTx = { ...tx, id: newId };
    list.push(newTx);
    localDB.set('cashbox_transactions', list);
    return newId;
  },

  // Finance Movements CRUD
  async getFinanceMovements(): Promise<FinanceMovement[]> {
    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'finance_movements'));
        const list: FinanceMovement[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as FinanceMovement);
        });
        return list;
      } catch (e) {
        console.error("Firestore getFinanceMovements failed:", e);
      }
    }
    return localDB.get('finance_movements', []);
  },

  async addFinanceMovement(movement: FinanceMovement): Promise<string> {
    if (db) {
      try {
        const docRef = await addDoc(collection(db, 'finance_movements'), movement);
        return docRef.id;
      } catch (e) {
        console.error("Firestore addFinanceMovement failed:", e);
      }
    }
    const list = localDB.get('finance_movements', []);
    const newId = `fmov_${Date.now()}`;
    const newM = { ...movement, id: newId };
    list.push(newM);
    localDB.set('finance_movements', list);
    return newId;
  },

  // Bank Balances Helper
  async getBankBalances(): Promise<{ bdvCorriente: number; visa: number }> {
    if (db) {
      try {
        const docRef = doc(db, 'finances', 'bank_balances');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            bdvCorriente: data.bdvCorriente ?? 18450.20,
            visa: data.visa ?? -1240.50
          };
        }
      } catch (e) {
        console.error("Firestore getBankBalances failed:", e);
      }
    }
    const cached = localDB.get('bank_balances', null);
    if (cached) return cached;
    return { bdvCorriente: 18450.20, visa: -1240.50 };
  },

  async saveBankBalances(balances: { bdvCorriente: number; visa: number }): Promise<void> {
    if (db) {
      try {
        const docRef = doc(db, 'finances', 'bank_balances');
        await setDoc(docRef, balances, { merge: true });
        return;
      } catch (e) {
        console.error("Firestore saveBankBalances failed:", e);
      }
    }
    localDB.set('bank_balances', balances);
  }
};

export { auth, db, googleProvider };
