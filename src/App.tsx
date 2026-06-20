import React, { useState, useEffect } from "react";
import { InventoryItem, PurchaseRecord, SalesRecord, NurseryUser, ExpenseRecord, ExpenseCategory } from "./types";
import { INITIAL_INVENTORY, INITIAL_PURCHASES, INITIAL_SALES } from "./sampleData";
import { motion, AnimatePresence } from "motion/react";
import { fetchCollection, saveItem, removeItem, clearCollection, subscribeCollection } from "./lib/firebase";

// Components
import DashboardView from "./components/DashboardView";
import InventoryView from "./components/InventoryView";
import PurchaseView from "./components/PurchaseView";
import SalesView from "./components/SalesView";
import ExpensesView from "./components/ExpensesView";
import SignInView from "./components/SignInView";
import BrandingModal from "./components/BrandingModal";

// Icons
import { Sprout, LayoutDashboard, Trees, ShoppingCart, ShoppingBag, Leaf, HelpCircle, HardDrive, LogOut, User, AlertTriangle, Landmark } from "lucide-react";

export default function App() {
  // Animation splash intro state
  const [showSplash, setShowSplash] = useState(true);

  // Authentication user session State
  const [currentUser, setCurrentUser] = useState<NurseryUser | null>(null);

  // Modal confirmation states
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // State variables synchronized with localStorage
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [usersList, setUsersList] = useState<NurseryUser[]>([]);
  const [appLogo, setAppLogo] = useState<string>(() => {
    return localStorage.getItem("devakusuma_logo_url") || "/logo.svg";
  });
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  // Navigation tab tracker
  const [activeTab, setActiveTab ] = useState<"dashboard" | "inventory" | "purchase" | "sales" | "expenses">("dashboard");

  // Inactivity Security Constants
  const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour (configurable constant)
  const LAST_ACTIVE_KEY = "devakusuma_last_active_time";

  const isReadOnly = currentUser
    ? !(
        currentUser.username === "Sri Rama Satya" ||
        currentUser.username === "Surendra Bonam" ||
        currentUser.role.toLowerCase() === "stalwart" ||
        currentUser.role.toLowerCase() === "owner" ||
        currentUser.role.toLowerCase() === "head - manager"
      )
    : false;

  const canEditBranding = currentUser
    ? (
        currentUser.username.toLowerCase() === "sri rama satya" ||
        currentUser.username.toLowerCase() === "surendra bonam"
      )
    : false;

  // Load from localStorage on mount (or use seed data)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Listen for window focus & active interactions to prevent or trigger inactivity sign-out
  useEffect(() => {
    const checkInactivity = () => {
      const localSession = localStorage.getItem("devakusuma_session_user");
      if (!localSession) return;

      const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
      const now = Date.now();
      if (lastActive) {
        const lastActiveTime = parseInt(lastActive, 10);
        if (now - lastActiveTime > INACTIVITY_TIMEOUT_MS) {
          setCurrentUser(null);
          localStorage.removeItem("devakusuma_session_user");
          localStorage.removeItem("active_user");
          alert("You have been signed out due to 1 hour of inactivity.");
          return true;
        }
      }
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
      return false;
    };

    const recordActivity = () => {
      const localSession = localStorage.getItem("devakusuma_session_user");
      if (localSession) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    };

    // Listeners for activity
    window.addEventListener("focus", checkInactivity);
    window.addEventListener("mousedown", recordActivity);
    window.addEventListener("keydown", recordActivity);
    window.addEventListener("touchstart", recordActivity);
    window.addEventListener("scroll", recordActivity);

    return () => {
      window.removeEventListener("focus", checkInactivity);
      window.removeEventListener("mousedown", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      window.removeEventListener("touchstart", recordActivity);
      window.removeEventListener("scroll", recordActivity);
    };
  }, []);

  useEffect(() => {
    // 0. Purity system upgrade - safe cleanup of old sandboxed database entries
    const isPurityCleared = localStorage.getItem("devakusuma_purity_v1");
    if (!isPurityCleared) {
      localStorage.removeItem("devakusuma_inventory");
      localStorage.removeItem("devakusuma_purchases");
      localStorage.removeItem("devakusuma_sales");
      localStorage.setItem("devakusuma_purity_v1", "true");
    }

    // 0.25 Inactivity dynamic session check on app load
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    const now = Date.now();
    let isInactive = false;
    if (lastActive) {
      const lastActiveTime = parseInt(lastActive, 10);
      if (now - lastActiveTime > INACTIVITY_TIMEOUT_MS) {
        localStorage.removeItem("devakusuma_session_user");
        localStorage.removeItem("active_user");
        isInactive = true;
      }
    }
    localStorage.setItem(LAST_ACTIVE_KEY, now.toString());

    if (isInactive) {
      setTimeout(() => {
        alert("You have been signed out due to 1 hour of inactivity.");
      }, 500);
    }

    // 0.5 Authenticated session loading
    const localSession = localStorage.getItem("devakusuma_session_user");
    if (localSession) {
      try {
        const parsedSession = JSON.parse(localSession);
        if (parsedSession && parsedSession.username === "Surendra Bonam" && parsedSession.role !== "Head - Manager") {
          parsedSession.role = "Head - Manager";
          localStorage.setItem("devakusuma_session_user", JSON.stringify(parsedSession));
        }
        setCurrentUser(parsedSession);
      } catch (e) {
        setCurrentUser(null);
      }
    }

    // 1. Inventory loading
    const localInv = localStorage.getItem("devakusuma_inventory");
    if (localInv) {
      setInventory(JSON.parse(localInv));
    } else {
      setInventory(INITIAL_INVENTORY);
      localStorage.setItem("devakusuma_inventory", JSON.stringify(INITIAL_INVENTORY));
    }

    // 2. Purchases loading
    const localPur = localStorage.getItem("devakusuma_purchases");
    if (localPur) {
      setPurchases(JSON.parse(localPur));
    } else {
      setPurchases(INITIAL_PURCHASES);
      localStorage.setItem("devakusuma_purchases", JSON.stringify(INITIAL_PURCHASES));
    }

    // 3. Sales loading
    const localSal = localStorage.getItem("devakusuma_sales");
    if (localSal) {
      setSales(JSON.parse(localSal));
    } else {
      setSales(INITIAL_SALES);
      localStorage.setItem("devakusuma_sales", JSON.stringify(INITIAL_SALES));
    }

    // 3.5 Expenses and categories loading
    const localExp = localStorage.getItem("devakusuma_expenses");
    if (localExp) {
      setExpenses(JSON.parse(localExp));
    } else {
      setExpenses([]);
      localStorage.setItem("devakusuma_expenses", JSON.stringify([]));
    }

    const localCat = localStorage.getItem("devakusuma_categories");
    if (localCat) {
      setCategories(JSON.parse(localCat));
    } else {
      setCategories([]);
      localStorage.setItem("devakusuma_categories", JSON.stringify([]));
    }

    // 4. Async Firestore Sync
    const unsubscribes: (() => void)[] = [];

    const syncFromFirestore = async () => {
      try {
        const [dbInventory, dbPurchases, dbSales, dbExpenses, dbCategories] = await Promise.all([
          fetchCollection<InventoryItem>("inventory"),
          fetchCollection<PurchaseRecord>("purchases"),
          fetchCollection<SalesRecord>("sales"),
          fetchCollection<ExpenseRecord>("expenses"),
          fetchCollection<ExpenseCategory>("expenseCategories"),
        ]);

        if (dbInventory && dbInventory.length > 0) {
          setInventory(dbInventory);
          localStorage.setItem("devakusuma_inventory", JSON.stringify(dbInventory));
        } else {
          // Sync existing local inventory to empty Firestore
          const localInvData = localStorage.getItem("devakusuma_inventory");
          if (localInvData) {
            const parsed = JSON.parse(localInvData) as InventoryItem[];
            for (const item of parsed) {
              saveItem("inventory", item.id, item).catch(console.error);
            }
          }
        }

        if (dbPurchases && dbPurchases.length > 0) {
          setPurchases(dbPurchases);
          localStorage.setItem("devakusuma_purchases", JSON.stringify(dbPurchases));
        } else {
          // Sync existing local purchases to empty Firestore
          const localPurData = localStorage.getItem("devakusuma_purchases");
          if (localPurData) {
            const parsed = JSON.parse(localPurData) as PurchaseRecord[];
            for (const record of parsed) {
              saveItem("purchases", record.id, record).catch(console.error);
            }
          }
        }

        if (dbSales && dbSales.length > 0) {
          setSales(dbSales);
          localStorage.setItem("devakusuma_sales", JSON.stringify(dbSales));
        } else {
          // Sync existing local sales to empty Firestore
          const localSalData = localStorage.getItem("devakusuma_sales");
          if (localSalData) {
            const parsed = JSON.parse(localSalData) as SalesRecord[];
            for (const record of parsed) {
              saveItem("sales", record.id, record).catch(console.error);
            }
          }
        }

        if (dbExpenses && dbExpenses.length > 0) {
          setExpenses(dbExpenses);
          localStorage.setItem("devakusuma_expenses", JSON.stringify(dbExpenses));
        } else {
          const localExpData = localStorage.getItem("devakusuma_expenses");
          if (localExpData) {
            const parsed = JSON.parse(localExpData) as ExpenseRecord[];
            for (const record of parsed) {
              saveItem("expenses", record.id, record).catch(console.error);
            }
          }
        }

        if (dbCategories && dbCategories.length > 0) {
          setCategories(dbCategories);
          localStorage.setItem("devakusuma_categories", JSON.stringify(dbCategories));
        } else {
          const localCatData = localStorage.getItem("devakusuma_categories");
          if (localCatData) {
            const parsed = JSON.parse(localCatData) as ExpenseCategory[];
            for (const record of parsed) {
              saveItem("expenseCategories", record.id, record).catch(console.error);
            }
          }
        }

        // Setup real-time subscribers after initial seed/fill checks
        const u1 = subscribeCollection<InventoryItem>("inventory", (items) => {
          if (items) {
            setInventory(items);
            localStorage.setItem("devakusuma_inventory", JSON.stringify(items));
          }
        });
        const u2 = subscribeCollection<PurchaseRecord>("purchases", (items) => {
          if (items) {
            setPurchases(items);
            localStorage.setItem("devakusuma_purchases", JSON.stringify(items));
          }
        });
        const u3 = subscribeCollection<SalesRecord>("sales", (items) => {
          if (items) {
            setSales(items);
            localStorage.setItem("devakusuma_sales", JSON.stringify(items));
          }
        });
        const u4 = subscribeCollection<ExpenseRecord>("expenses", (items) => {
          if (items) {
            setExpenses(items);
            localStorage.setItem("devakusuma_expenses", JSON.stringify(items));
          }
        });
        const u5 = subscribeCollection<ExpenseCategory>("expenseCategories", (items) => {
          if (items) {
            setCategories(items);
            localStorage.setItem("devakusuma_categories", JSON.stringify(items));
          }
        });
        const u6 = subscribeCollection<NurseryUser>("users", (items) => {
          if (items) {
            setUsersList(items);
            localStorage.setItem("devakusuma_users", JSON.stringify(items));
            
            // Sync current user session so that if avatar/details are changed by other accounts, it reflects in this browser
            const storedSession = localStorage.getItem("devakusuma_session_user");
            if (storedSession) {
              try {
                const current = JSON.parse(storedSession) as NurseryUser;
                const freshSelf = items.find((u) => u.username === current.username);
                if (freshSelf) {
                  setCurrentUser(freshSelf);
                  localStorage.setItem("devakusuma_session_user", JSON.stringify(freshSelf));
                }
              } catch (e) {
                console.error("Error syncing current user with real-time users:", e);
              }
            }
          }
        });
        const u7 = subscribeCollection<{ id: string; logoUrl?: string }>("settings", (items) => {
          if (items) {
            const brandingDoc = items.find((item) => item.id === "branding");
            if (brandingDoc && brandingDoc.logoUrl) {
              setAppLogo(brandingDoc.logoUrl);
              localStorage.setItem("devakusuma_logo_url", brandingDoc.logoUrl);
            } else {
              setAppLogo("/logo.svg");
              localStorage.removeItem("devakusuma_logo_url");
            }
          }
        });

        unsubscribes.push(u1, u2, u3, u4, u5, u6, u7);
      } catch (err) {
        console.warn("Could not sync records from Firestore, using offline cache:", err);
      }
    };

    syncFromFirestore();

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  // System Handler: Manual Adding of Single Plant
  const handleAddPlant = (item: Omit<InventoryItem, "id">) => {
    const match = inventory.find(
      (inv) =>
        inv.plantName.toLowerCase() === item.plantName.toLowerCase() &&
        inv.plantSize === item.plantSize
    );

    let updatedList: InventoryItem[];
    if (match) {
      updatedList = inventory.map((inv) =>
        inv.id === match.id
          ? {
              ...inv,
              quantityAvailable: inv.quantityAvailable + item.quantityAvailable,
              sellingPrice: item.sellingPrice || inv.sellingPrice,
            }
          : inv
      );
      const updatedMatch = updatedList.find((inv) => inv.id === match.id);
      if (updatedMatch) {
        saveItem("inventory", updatedMatch.id, updatedMatch).catch(console.error);
      }
    } else {
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...item,
      };
      updatedList = [...inventory, newItem];
      saveItem("inventory", newItem.id, newItem).catch(console.error);
    }

    setInventory(updatedList);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedList));
  };

  // System Handler: Excel Bulk Imports (Tab-Separated or CSV Lists)
  const handleBulkImport = (newItems: Omit<InventoryItem, "id">[], overwriteExisting: boolean = true) => {
    const updatedInventory = [...inventory];
    const itemsToSave: InventoryItem[] = [];

    newItems.forEach((item) => {
      const matchIdx = updatedInventory.findIndex(
        (inv) =>
          inv.plantName.trim().toLowerCase() === item.plantName.trim().toLowerCase() &&
          inv.plantSize.trim().toLowerCase().replace(/\s+/g, '') === item.plantSize.trim().toLowerCase().replace(/\s+/g, '')
      );

      if (matchIdx !== -1) {
        if (overwriteExisting) {
          // Overwrite stock count with CSV value
          updatedInventory[matchIdx].quantityAvailable = item.quantityAvailable;
        } else {
          // Add to existing stock count
          updatedInventory[matchIdx].quantityAvailable += item.quantityAvailable;
        }
        if (item.sellingPrice) {
          updatedInventory[matchIdx].sellingPrice = item.sellingPrice;
        }
        itemsToSave.push(updatedInventory[matchIdx]);
      } else {
        // Find if there is an existing plant size in the master size options that matches case-insensitively,
        // otherwise capitalize words nicely.
        let resolvedSize = item.plantSize.trim();
        const availableSizes = ["1 ft", "2 ft", "3 ft", "4 ft", "5 ft", "Creeper", "Seedling", "Sapling"];
        const matchSize = availableSizes.find(
          (s) => s.toLowerCase().replace(/\s+/g, '') === resolvedSize.toLowerCase().replace(/\s+/g, '')
        );
        if (matchSize) {
          resolvedSize = matchSize;
        }

        const newItem = {
          id: `inv-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          plantName: item.plantName.trim(),
          plantSize: resolvedSize,
          quantityAvailable: item.quantityAvailable,
          sellingPrice: item.sellingPrice,
        };
        updatedInventory.push(newItem);
        itemsToSave.push(newItem);
      }
    });

    setInventory(updatedInventory);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
    for (const item of itemsToSave) {
      saveItem("inventory", item.id, item).catch(console.error);
    }
    alert(`Successfully processed and imported ${newItems.length} plants to Live Inventory!`);
  };

  // System Handler: Update/Edit Plant details
  const handleUpdatePlant = (updatedItem: InventoryItem) => {
    const updated = inventory.map((inv) => (inv.id === updatedItem.id ? updatedItem : inv));
    setInventory(updated);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updated));
    saveItem("inventory", updatedItem.id, updatedItem).catch(console.error);
  };

  // System Handler: Delete Plant from Inventory
  const handleDeletePlant = (id: string) => {
    const updated = inventory.filter((inv) => inv.id !== id);
    setInventory(updated);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updated));
    removeItem("inventory", id).catch(console.error);
  };

  // System Handler: Mass Delete Plants from Inventory
  const handleMassDeletePlants = (ids: string[]) => {
    const updated = inventory.filter((inv) => !ids.includes(inv.id));
    setInventory(updated);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updated));
    Promise.all(ids.map((id) => removeItem("inventory", id))).catch(console.error);
  };

  // System Handler: Authentication SignIn / SignOut Actions
  const handleSignIn = (user: NurseryUser) => {
    setCurrentUser(user);
    localStorage.setItem("devakusuma_session_user", JSON.stringify(user));
    localStorage.setItem("active_user", user.username);
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("devakusuma_session_user");
    localStorage.removeItem("active_user");
    setShowSignOutModal(false);
  };

  // System Handler: Purchasing (Buy Records)
  const handleAddPurchase = (record: Omit<PurchaseRecord, "id">, targetSellingPriceForNew: number) => {
    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...record,
    };

    const updatedPurchases = [...purchases, newPurchase];
    setPurchases(updatedPurchases);
    localStorage.setItem("devakusuma_purchases", JSON.stringify(updatedPurchases));
    saveItem("purchases", newPurchase.id, newPurchase).catch(console.error);

    // Automatically create a corresponding business expense record
    const associatedExpense: ExpenseRecord = {
      id: `exp-${newPurchase.id}`,
      date: record.purchaseDate,
      category: "Stock Purchase",
      description: `Stock Purchase: ${record.quantityPurchased}x ${record.plantName} (${record.plantSize})`,
      amount: record.totalPurchaseCost,
      paymentMode: "Other",
      paidTo: record.supplierName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedExpenses = [...expenses, associatedExpense];
    setExpenses(updatedExpenses);
    localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
    saveItem("expenses", associatedExpense.id, associatedExpense).catch(console.error);

    // Update inventory stock (Increase quantity)
    const matchIdx = inventory.findIndex(
      (inv) =>
        inv.plantName.toLowerCase() === record.plantName.toLowerCase() &&
        inv.plantSize === record.plantSize
    );

    const updatedInventory = [...inventory];
    if (matchIdx !== -1) {
      updatedInventory[matchIdx].quantityAvailable += record.quantityPurchased;
      saveItem("inventory", updatedInventory[matchIdx].id, updatedInventory[matchIdx]).catch(console.error);
    } else {
      // Auto-create new variety in inventory if it does not exist
      const newInvItem = {
        id: `inv-p-${Date.now()}`,
        plantName: record.plantName,
        plantSize: record.plantSize,
        quantityAvailable: record.quantityPurchased,
        sellingPrice: targetSellingPriceForNew || Math.round(record.costPerUnit * 1.5),
      };
      updatedInventory.push(newInvItem);
      saveItem("inventory", newInvItem.id, newInvItem).catch(console.error);
    }

    setInventory(updatedInventory);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
  };

  // System Handler: Sales Transaction & PDF Receipt Register
  const handleAddSale = (record: Omit<SalesRecord, "id" | "invoiceNumber">): SalesRecord => {
    // Generate simple auto-increment Invoice number
    const currentYear = new Date().getFullYear();
    const sequenceCount = sales.length + 1;
    const paddedSequence = String(sequenceCount).padStart(3, "0");
    const generatedInvoiceNumber = `DS-INV-${currentYear}-${paddedSequence}`;

    const newSale: SalesRecord = {
      id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      invoiceNumber: generatedInvoiceNumber,
      ...record,
    };

    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    localStorage.setItem("devakusuma_sales", JSON.stringify(updatedSales));
    saveItem("sales", newSale.id, newSale).catch(console.error);

    const updatedInventory = [...inventory];

    // Decrease Inventory quantity
    if (newSale.items && newSale.items.length > 0) {
      newSale.items.forEach((item) => {
        const matchedIdx = updatedInventory.findIndex(
          (inv) =>
            inv.plantName.toLowerCase() === item.plantName.toLowerCase() &&
            inv.plantSize.toLowerCase() === item.size.toLowerCase()
        );
        if (matchedIdx !== -1) {
          updatedInventory[matchedIdx].quantityAvailable = Math.max(
            0,
            updatedInventory[matchedIdx].quantityAvailable - item.quantity
          );
          saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
        } else {
          // Auto-create new variety in inventory for custom sizes sold directly
          const newInvItem = {
            id: `inv-p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            plantName: item.plantName,
            plantSize: item.size,
            quantityAvailable: 0,
            sellingPrice: item.sellingPrice,
          };
          updatedInventory.push(newInvItem);
          saveItem("inventory", newInvItem.id, newInvItem).catch(console.error);
        }
      });
    } else if (newSale.plantName && newSale.plantSize) {
      // Legacy single-item fallback
      const matchedIdx = updatedInventory.findIndex(
        (inv) =>
          inv.plantName.toLowerCase() === newSale.plantName!.toLowerCase() &&
          inv.plantSize.toLowerCase() === newSale.plantSize!.toLowerCase()
      );

      if (matchedIdx !== -1) {
        updatedInventory[matchedIdx].quantityAvailable = Math.max(
          0,
          updatedInventory[matchedIdx].quantityAvailable - (newSale.quantitySold || 0)
        );
        saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
      } else {
        const newInvItem = {
          id: `inv-p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          plantName: newSale.plantName!,
          plantSize: newSale.plantSize!,
          quantityAvailable: 0,
          sellingPrice: newSale.sellingPrice || 0,
        };
        updatedInventory.push(newInvItem);
        saveItem("inventory", newInvItem.id, newInvItem).catch(console.error);
      }
    }

    setInventory(updatedInventory);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));

    return newSale; // Returns sale for modal trigger
  };

  // System Handler: Delete / Cancel Sale
  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return;

    // Remove from local sales state
    const updatedSales = sales.filter((s) => s.id !== saleId);
    setSales(updatedSales);
    localStorage.setItem("devakusuma_sales", JSON.stringify(updatedSales));
    removeItem("sales", saleId).catch(console.error);

    const updatedInventory = [...inventory];

    // Rollback Inventory: add the quantity back
    if (saleToDelete.items && saleToDelete.items.length > 0) {
      saleToDelete.items.forEach((item) => {
        const matchedIdx = updatedInventory.findIndex(
          (inv) =>
            inv.plantName.toLowerCase() === item.plantName.toLowerCase() &&
            inv.plantSize.toLowerCase() === item.size.toLowerCase()
        );
        if (matchedIdx !== -1) {
          updatedInventory[matchedIdx].quantityAvailable += item.quantity;
          saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
        }
      });
    } else if (saleToDelete.plantName && saleToDelete.plantSize) {
      const matchedIdx = updatedInventory.findIndex(
        (inv) =>
          inv.plantName.toLowerCase() === saleToDelete.plantName!.toLowerCase() &&
          inv.plantSize === saleToDelete.plantSize
      );

      if (matchedIdx !== -1) {
        updatedInventory[matchedIdx].quantityAvailable += (saleToDelete.quantitySold || 0);
        saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
      }
    }

    setInventory(updatedInventory);
    localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
  };

  // System Handler: Update / Edit Sale
  const handleUpdateSale = (updatedSale: SalesRecord) => {
    const oldSale = sales.find((s) => s.id === updatedSale.id);
    if (!oldSale) return;

    // Update sales state
    const updatedSales = sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));
    setSales(updatedSales);
    localStorage.setItem("devakusuma_sales", JSON.stringify(updatedSales));
    saveItem("sales", updatedSale.id, updatedSale).catch(console.error);

    // Sync Inventory stock for legacy only (dynamic multi-item has editable customer/date and does not edit quantity post-sale)
    if (!(updatedSale.items && updatedSale.items.length > 0) && updatedSale.plantName) {
      // Diff in quantity sold
      const oldQty = oldSale.quantitySold || 0;
      const newQty = updatedSale.quantitySold || 0;
      const diffQty = oldQty - newQty;

      const matchedIdx = inventory.findIndex(
        (inv) =>
          inv.plantName.toLowerCase() === updatedSale.plantName!.toLowerCase() &&
          inv.plantSize === updatedSale.plantSize
      );

      if (matchedIdx !== -1) {
        const updatedInventory = [...inventory];
        updatedInventory[matchedIdx].quantityAvailable = Math.max(
          0,
          updatedInventory[matchedIdx].quantityAvailable + diffQty
        );
        setInventory(updatedInventory);
        localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
        saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
      }
    }
  };

  // System Handler: Delete Purchase
  const handleDeletePurchase = (purchaseId: string) => {
    const purchaseToDelete = purchases.find((p) => p.id === purchaseId);
    if (!purchaseToDelete) return;

    // Remove from purchases state
    const updatedPurchases = purchases.filter((p) => p.id !== purchaseId);
    setPurchases(updatedPurchases);
    localStorage.setItem("devakusuma_purchases", JSON.stringify(updatedPurchases));
    removeItem("purchases", purchaseId).catch(console.error);

    // Automatically remove corresponding expense record
    const associatedExpenseId = `exp-${purchaseId}`;
    const updatedExpenses = expenses.filter((e) => e.id !== associatedExpenseId);
    setExpenses(updatedExpenses);
    localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
    removeItem("expenses", associatedExpenseId).catch(console.error);

    // Rollback Inventory: subtract the purchased quantity
    const matchedIdx = inventory.findIndex(
      (inv) =>
        inv.plantName.toLowerCase() === purchaseToDelete.plantName.toLowerCase() &&
        inv.plantSize === purchaseToDelete.plantSize
    );

    if (matchedIdx !== -1) {
      const updatedInventory = [...inventory];
      updatedInventory[matchedIdx].quantityAvailable = Math.max(
        0,
        updatedInventory[matchedIdx].quantityAvailable - purchaseToDelete.quantityPurchased
      );
      setInventory(updatedInventory);
      localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
      saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
    }
  };

  // System Handler: Update Purchase
  const handleUpdatePurchase = (updatedPurchase: PurchaseRecord) => {
    const oldPurchase = purchases.find((p) => p.id === updatedPurchase.id);
    if (!oldPurchase) return;

    // Diff in quantity purchased (if old had 10 and we change to 12, we add 2 more stock)
    const diffQty = updatedPurchase.quantityPurchased - oldPurchase.quantityPurchased;

    // Update purchases state
    const updatedPurchases = purchases.map((p) => (p.id === updatedPurchase.id ? updatedPurchase : p));
    setPurchases(updatedPurchases);
    localStorage.setItem("devakusuma_purchases", JSON.stringify(updatedPurchases));
    saveItem("purchases", updatedPurchase.id, updatedPurchase).catch(console.error);

    // Automatically update the corresponding expense record in sync
    const associatedExpenseId = `exp-${updatedPurchase.id}`;
    const existingExpense = expenses.find((e) => e.id === associatedExpenseId);
    if (existingExpense) {
      const updatedExpense: ExpenseRecord = {
        ...existingExpense,
        date: updatedPurchase.purchaseDate,
        description: `Stock Purchase: ${updatedPurchase.quantityPurchased}x ${updatedPurchase.plantName} (${updatedPurchase.plantSize})`,
        amount: updatedPurchase.totalPurchaseCost,
        paidTo: updatedPurchase.supplierName,
        updatedAt: new Date().toISOString(),
      };
      const updatedExpenses = expenses.map((e) => (e.id === associatedExpenseId ? updatedExpense : e));
      setExpenses(updatedExpenses);
      localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
      saveItem("expenses", updatedExpense.id, updatedExpense).catch(console.error);
    } else {
      // Re-create the expense record if missing
      const associatedExpense: ExpenseRecord = {
        id: associatedExpenseId,
        date: updatedPurchase.purchaseDate,
        category: "Stock Purchase",
        description: `Stock Purchase: ${updatedPurchase.quantityPurchased}x ${updatedPurchase.plantName} (${updatedPurchase.plantSize})`,
        amount: updatedPurchase.totalPurchaseCost,
        paymentMode: "Other",
        paidTo: updatedPurchase.supplierName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedExpenses = [...expenses, associatedExpense];
      setExpenses(updatedExpenses);
      localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
      saveItem("expenses", associatedExpense.id, associatedExpense).catch(console.error);
    }

    // Sync Inventory stock
    const matchedIdx = inventory.findIndex(
      (inv) =>
        inv.plantName.toLowerCase() === updatedPurchase.plantName.toLowerCase() &&
        inv.plantSize === updatedPurchase.plantSize
    );

    if (matchedIdx !== -1) {
      const updatedInventory = [...inventory];
      updatedInventory[matchedIdx].quantityAvailable = Math.max(
        0,
        updatedInventory[matchedIdx].quantityAvailable + diffQty
      );
      setInventory(updatedInventory);
      localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
      saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
    }
  };

  // Expense Handler: Add new Expense
  const handleAddExpense = (newExpData: Omit<ExpenseRecord, "id" | "createdAt" | "updatedAt">) => {
    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...newExpData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
    saveItem("expenses", newExpense.id, newExpense).catch(console.error);
  };

  // Expense Handler: Update Expense
  const handleUpdateExpense = (updatedExpense: ExpenseRecord) => {
    const updatedExpenses = expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
    setExpenses(updatedExpenses);
    localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
    saveItem("expenses", updatedExpense.id, updatedExpense).catch(console.error);
  };

  // Expense Handler: Delete Expense
  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem("devakusuma_expenses", JSON.stringify(updatedExpenses));
    removeItem("expenses", id).catch(console.error);
  };

  // Expense Handler: Add Custom Category
  const handleAddCategory = (categoryName: string) => {
    const newCategory: ExpenseCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: categoryName,
    };
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    localStorage.setItem("devakusuma_categories", JSON.stringify(updatedCategories));
    saveItem("expenseCategories", newCategory.id, newCategory).catch(console.error);
  };

  // Wipe statistics reset (for easy demo testing)
  const handleResetData = () => {
    setShowResetModal(true);
  };

  const confirmResetData = () => {
    const invIds = inventory.map((i) => i.id);
    const purIds = purchases.map((i) => i.id);
    const salIds = sales.map((i) => i.id);
    const expIds = expenses.map((i) => i.id);
    const catIds = categories.map((i) => i.id);

    clearCollection("inventory", invIds).catch((err) => console.error("Error clearing inventory:", err));
    clearCollection("purchases", purIds).catch((err) => console.error("Error clearing purchases:", err));
    clearCollection("sales", salIds).catch((err) => console.error("Error clearing sales:", err));
    clearCollection("expenses", expIds).catch((err) => console.error("Error clearing expenses:", err));
    clearCollection("expenseCategories", catIds).catch((err) => console.error("Error clearing categories:", err));

    localStorage.removeItem("devakusuma_inventory");
    localStorage.removeItem("devakusuma_purchases");
    localStorage.removeItem("devakusuma_sales");
    localStorage.removeItem("devakusuma_expenses");
    localStorage.removeItem("devakusuma_categories");
    setInventory(INITIAL_INVENTORY);
    setPurchases(INITIAL_PURCHASES);
    setSales(INITIAL_SALES);
    setExpenses([]);
    setCategories([]);
    setShowResetModal(false);
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0C120E] text-[#FAFAF8] overflow-hidden select-none font-sans">
        {/* Soft, luxury ambient glow in logo brand colors */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0.12, 0.24, 0.15], scale: [1, 1.25, 1.1] }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            repeatType: "mirror", 
            ease: "easeInOut" 
          }}
          className="absolute w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-[#1B382B] to-[#D4AF37] filter blur-[120px] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm px-6">
          {/* Stylized Pot with Sprout Logo */}
          <div className="w-48 h-48 mb-6 flex items-center justify-center relative">
            <motion.div
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 0.45, rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-3 border border-dashed border-[#72E088]/30 rounded-full pointer-events-none"
            />
            <motion.div
              initial={{ opacity: 0, rotate: 360 }}
              animate={{ opacity: 0.15, rotate: 0 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-5 border border-dotted border-[#4A5D4E]/20 rounded-full pointer-events-none"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 85,
                damping: 14,
                delay: 0.1
              }}
              className="relative flex flex-col items-center justify-center w-36 h-36 border border-[#4A5D4E]/40 rounded-full bg-[#111A13]/90 shadow-2xl backdrop-blur-sm"
            >
              <div className="flex flex-col items-center relative -top-1">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.25, 1] }}
                  transition={{ delay: 0.35, duration: 1.0, ease: "easeOut" }}
                  className="text-[#72E088] filter drop-shadow-[0_0_10px_rgba(114,224,136,0.35)] -mb-0.5"
                >
                  <Sprout className="w-14 h-14" strokeWidth={1.5} />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="w-10 h-6 bg-gradient-to-b from-[#4A5D4E] to-[#243127] rounded-b-lg border-t-2 border-[#72E088]/40 shadow-inner"
                />
              </div>
            </motion.div>
          </div>

          {/* Title Header with Elegant Letter Spacing */}
          <motion.h1
            initial={{ opacity: 0, letterSpacing: "0.05em", y: 15 }}
            animate={{ opacity: 1, letterSpacing: "0.15em", y: 0 }}
            transition={{ delay: 0.45, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="font-serif italic text-3.5xl font-extrabold tracking-wider text-white"
          >
            Devakusuma
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
            className="text-[11px] md:text-xs font-sans font-extrabold uppercase tracking-[0.25em] text-[#72E088] mt-3"
          >
            Nursery Management System
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="text-[8px] font-mono uppercase tracking-[0.18em] text-[#a3b18a] mt-2"
          >
            Botanical Stock & Invoice Ledger
          </motion.p>

          {/* Gold highlight luxury progress bar */}
          <div className="w-32 h-[1.5px] bg-white/10 my-6 relative overflow-hidden rounded-full">
            <motion.div
              initial={{ left: "-100%" }}
              animate={{ left: "100%" }}
              transition={{ duration: 1.9, repeat: 0, ease: "easeInOut", delay: 0.3 }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
            />
          </div>

          {/* Micro loading logs sequence */}
          <div className="h-6 overflow-hidden relative w-64">
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: [0, 1, 1, 0], y: [15, 0, 0, -15] }}
              transition={{ times: [0, 0.1, 0.9, 1], duration: 1.1, delay: 0.2 }}
              className="block text-[8px] font-mono text-white/40 uppercase tracking-[0.15em] w-full"
            >
              Establishing secure seed connect...
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: [0, 1, 1, 0], y: [15, 0, 0, -15] }}
              transition={{ times: [0, 0.1, 0.9, 1], duration: 1.1, delay: 1.2 }}
              className="block text-[8px] font-mono text-white/40 uppercase tracking-[0.15em] absolute top-0 left-0 w-full"
            >
              Calibrating botanical stocks...
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 2.3 }}
              className="block text-[8px] font-mono text-[#72E088] uppercase tracking-[0.15em] font-bold absolute top-0 left-0 w-full"
            >
              Ledger synchronized &bull; live
            </motion.span>
          </div>
        </div>

        {/* Absolute decorative bottom notes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-8 text-[8px] font-sans text-white/40 tracking-[0.3em] uppercase"
        >
          Karnataka, India &bull; Est. 1977
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="sign-in-screen"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-screen"
        >
          <SignInView onSignInSuccess={handleSignIn} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text flex flex-col font-serif" id="devakusuma-root">
      {/* Editorial Navigation Toolbar */}
      <nav className="h-16 md:h-20 px-6 md:px-10 border-b border-editorial-primary/20 flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          {canEditBranding ? (
            <div 
              className="relative group cursor-pointer" 
              onClick={() => setShowBrandingModal(true)}
              title="Click to edit App Logo & member display pictures"
            >
              <img src={appLogo} alt="Devakusuma Logo" className="w-10 h-10 md:w-14 md:h-14 object-contain transition-all group-hover:scale-105 group-hover:brightness-95" referrerPolicy="no-referrer" />
              <div className="absolute -bottom-1 -right-1 bg-editorial-primary text-white p-1 rounded-full shadow-xs opacity-80 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </div>
          ) : (
            <img src={appLogo} alt="Devakusuma Logo" className="w-10 h-10 md:w-14 md:h-14 object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <span className="text-sm md:text-2xl font-bold tracking-tight text-editorial-dark font-serif italic">Devakusuma Nursery Gardens</span>
            <span className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/70 ml-2 font-medium">Farm OS</span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs menu in Editorial Style - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-4" id="desktop-tabs">
          <div className="flex gap-1">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 md:px-5 py-2 rounded-full text-xs font-sans uppercase tracking-widest font-bold transition-colors ${
                activeTab === "dashboard"
                  ? "bg-editorial-primary text-white"
                  : "text-editorial-text hover:bg-editorial-primary/10"
              }`}
            >
              Dashboard
            </button>

            <button
              id="tab-inventory"
              onClick={() => setActiveTab("inventory")}
              className={`px-4 md:px-5 py-2 rounded-full text-xs font-sans uppercase tracking-widest font-bold transition-colors ${
                activeTab === "inventory"
                  ? "bg-editorial-primary text-white"
                  : "text-editorial-text hover:bg-editorial-primary/10"
              }`}
            >
              Inventory
            </button>

            <button
              id="tab-purchase"
              onClick={() => setActiveTab("purchase")}
              className={`px-4 md:px-5 py-2 rounded-full text-xs font-sans uppercase tracking-widest font-bold transition-colors ${
                activeTab === "purchase"
                  ? "bg-editorial-primary text-white"
                  : "text-editorial-text hover:bg-editorial-primary/10"
              }`}
            >
              Purchase
            </button>

            <button
              id="tab-sales"
              onClick={() => setActiveTab("sales")}
              className={`px-4 md:px-5 py-2 rounded-full text-xs font-sans uppercase tracking-widest font-bold transition-colors ${
                activeTab === "sales"
                  ? "bg-editorial-primary text-white"
                  : "text-editorial-text hover:bg-editorial-primary/10"
              }`}
            >
              Sales
            </button>

            <button
              id="tab-expenses"
              onClick={() => setActiveTab("expenses")}
              className={`px-4 md:px-5 py-2 rounded-full text-xs font-sans uppercase tracking-widest font-bold transition-colors ${
                activeTab === "expenses"
                  ? "bg-editorial-primary text-white"
                  : "text-editorial-text hover:bg-editorial-primary/10"
              }`}
            >
              Expenses
            </button>
          </div>

          <div className="h-6 w-[1px] bg-editorial-primary/20" />

          {/* Operator Badge and Sign-Out in Header */}
          <div className="flex items-center gap-3">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-sans shadow-xs shrink-0 select-none overflow-hidden ${
                canEditBranding ? "cursor-pointer hover:ring-2 hover:ring-editorial-primary/45 transition-all" : ""
              }`} 
              style={{ backgroundColor: currentUser.avatarImage ? undefined : currentUser.avatarColor }}
              title={`${currentUser.username} (${currentUser.role}) - Click to customize`}
              onClick={canEditBranding ? () => setShowBrandingModal(true) : undefined}
            >
              {currentUser.avatarImage ? (
                <img src={currentUser.avatarImage} alt={currentUser.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                currentUser.username.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="text-left shrink-0">
              <span className="block text-[11px] font-sans font-bold text-editorial-dark leading-none">
                {currentUser.username}
              </span>
              <span className="block text-[9px] font-sans uppercase tracking-wider text-editorial-primary/70 font-semibold mt-0.5">
                {currentUser.role}
              </span>
            </div>
            {canEditBranding && (
              <button
                type="button"
                onClick={() => setShowBrandingModal(true)}
                className="p-1.5 rounded-lg border border-editorial-primary/15 hover:border-editorial-primary hover:bg-stone-50 text-editorial-primary/70 transition cursor-pointer"
                title="Edit Logo & Display Pictures"
              >
                <User className="w-3.5 h-3.5 text-editorial-primary" />
              </button>
            )}
            <button
               type="button"
               id="desktop-sign-out-btn"
               onClick={handleSignOut}
               className="p-1.5 rounded-lg border border-editorial-primary/15 hover:border-red-200 hover:bg-red-50 text-editorial-primary/70 hover:text-red-700 transition cursor-pointer"
               title="Sign Out / Switch Operator"
             >
               <LogOut className="w-3.5 h-3.5" />
             </button>
           </div>
         </div>
 
         {/* Mobile logout/user indicator */}
         <div className="flex md:hidden items-center gap-2">
           <div 
             className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold font-sans shadow-xs shrink-0 select-none overflow-hidden ${
               canEditBranding ? "cursor-pointer ring-1 ring-editorial-primary/10 hover:ring-2 hover:ring-editorial-primary/40 transition-all" : ""
             }`} 
             style={{ backgroundColor: currentUser.avatarImage ? undefined : currentUser.avatarColor }}
             title={`${currentUser.username} - Tap to customize`}
             onClick={canEditBranding ? () => setShowBrandingModal(true) : undefined}
           >
             {currentUser.avatarImage ? (
               <img src={currentUser.avatarImage} alt={currentUser.username} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
               currentUser.username.slice(0, 2).toUpperCase()
             )}
           </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="p-1.5 rounded-lg border border-editorial-primary/15 hover:bg-red-50 text-editorial-primary/80 hover:text-red-700 transition cursor-pointer"
            title="Sign Out / Switch Operator"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Main Container Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 pb-28 md:p-10 space-y-8">
        {activeTab === "dashboard" && (
          <DashboardView
            inventory={inventory}
            purchases={purchases}
            sales={sales}
            expenses={expenses}
            onDeleteSale={handleDeleteSale}
            onUpdateSale={handleUpdateSale}
            onDeletePurchase={handleDeletePurchase}
            onUpdatePurchase={handleUpdatePurchase}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "inventory" && (
          <InventoryView
            inventory={inventory}
            onAddPlant={handleAddPlant}
            onBulkImport={handleBulkImport}
            onUpdatePlant={handleUpdatePlant}
            onDeletePlant={handleDeletePlant}
            onMassDeletePlants={handleMassDeletePlants}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "purchase" && (
          <PurchaseView
            inventory={inventory}
            purchases={purchases}
            onAddPurchase={handleAddPurchase}
            onDeletePurchase={handleDeletePurchase}
            onUpdatePurchase={handleUpdatePurchase}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "sales" && (
          <SalesView
            inventory={inventory}
            sales={sales}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
            onUpdateSale={handleUpdateSale}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesView
            expenses={expenses}
            categories={categories}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddCategory={handleAddCategory}
            isReadOnly={isReadOnly}
          />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="py-8 px-6 md:px-10 flex flex-col md:flex-row items-center justify-between border-t border-editorial-primary/10 bg-white/20 mt-12 shrink-0 gap-4 mb-20 md:mb-0">
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2 text-xs md:text-sm uppercase tracking-[0.2em] font-sans font-extrabold text-editorial-primary/95">
            <Leaf className="w-4 h-4 text-editorial-primary font-bold fill-editorial-accent/15" />
            <span>Devakusuma Nursery Gardens</span>
          </div>
          <div className="text-xs font-serif italic text-stone-500 mt-0.5 flex items-center justify-center md:justify-start gap-1.5">
            <span>Operator:</span>
            <span className="font-sans font-extrabold text-[#D4AF37] not-italic uppercase tracking-wider text-[11.5px]">{currentUser.username}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center md:justify-end text-[10px] uppercase tracking-[0.15em] text-editorial-primary/75 font-sans">
          {!isReadOnly && (
            <button
              id="reset-db-btn"
              onClick={handleResetData}
              className="font-bold text-red-600 hover:text-red-800 hover:underline transition-all uppercase cursor-pointer"
              title="Restores original stock catalog for demo review"
            >
              Reset Demo Seeds
            </button>
          )}
        </div>
      </footer>

      {/* Dynamic Navigation Tabs menu in Editorial Style - Sticky / Permanent Bottom Bar on Mobile */}
      <div 
        id="mobile-bottom-tabs" 
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white/95 backdrop-blur-md border-t border-editorial-primary/15 flex items-center justify-around py-2 px-2 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] h-16 shrink-0"
      >
        <button
          id="mobile-tab-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "dashboard"
              ? "text-editorial-primary font-bold"
              : "text-editorial-text/50 font-medium"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">Dashboard</span>
        </button>

        <button
          id="mobile-tab-inventory"
          onClick={() => setActiveTab("inventory")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "inventory"
              ? "text-editorial-primary font-bold"
              : "text-editorial-text/50 font-medium"
          }`}
        >
          <Trees className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">Inventory</span>
        </button>

        <button
          id="mobile-tab-purchase"
          onClick={() => setActiveTab("purchase")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "purchase"
              ? "text-editorial-primary font-bold"
              : "text-editorial-text/50 font-medium"
          }`}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">Purchase</span>
        </button>

        <button
          id="mobile-tab-sales"
          onClick={() => setActiveTab("sales")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "sales"
              ? "text-editorial-primary font-bold"
              : "text-editorial-text/50 font-medium"
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">Sales</span>
        </button>

        <button
          id="mobile-tab-expenses"
          onClick={() => setActiveTab("expenses")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
            activeTab === "expenses"
              ? "text-editorial-primary font-bold"
              : "text-editorial-text/50 font-medium"
          }`}
        >
          <Landmark className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-sans uppercase tracking-wider font-semibold">Expenses</span>
        </button>
      </div>

      {/* Confirmation Overlay Modals */}
      <AnimatePresence>
        {/* Sign Out Modal */}
        {showSignOutModal && (
          <div key="signout-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-dark/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white border border-editorial-primary/15 rounded-3xl p-6 shadow-xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-bold text-editorial-dark">
                  Sign Out of License
                </h3>
                <p className="text-xs text-stone-500 font-serif italic mt-1.5">
                  Are you sure you want to end your active operator session for <span className="font-sans font-bold text-editorial-dark not-italic">{currentUser.username}</span>?
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSignOutModal(false)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={confirmSignOut}
                  id="modal-confirm-signout"
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition cursor-pointer shadow-xs"
                >
                  Yes, Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Reset Seeds Modal */}
        {showResetModal && (
          <div key="reset-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-dark/60 backdrop-blur-xs select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white border border-editorial-primary/15 rounded-3xl p-6 shadow-xl"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-655 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-serif font-bold text-editorial-dark">
                  Reset Botanical Seeds
                </h3>
                <p className="text-xs text-stone-500 font-serif italic mt-1.5 px-2">
                  This will restore the original nursery catalog templates and erase all your custom transactions, edits, sales, and purchases.
                </p>
                <p className="text-[10px] text-red-700 font-sans font-bold uppercase tracking-wider mt-3">
                  This action is permanent and cannot be undone!
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetData}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl bg-editorial-dark hover:bg-black text-white transition cursor-pointer shadow-xs"
                >
                  Yes, Reset Catalog
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Branding & Profile Customization Modal */}
        {showBrandingModal && currentUser && (
          <BrandingModal
            isOpen={showBrandingModal}
            onClose={() => setShowBrandingModal(false)}
            currentUser={currentUser}
            usersList={usersList}
            appLogo={appLogo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
