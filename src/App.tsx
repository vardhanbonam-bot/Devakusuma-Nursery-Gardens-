import React, { useState, useEffect } from "react";
import { InventoryItem, PurchaseRecord, SalesRecord, NurseryUser } from "./types";
import { INITIAL_INVENTORY, INITIAL_PURCHASES, INITIAL_SALES } from "./sampleData";
import { motion, AnimatePresence } from "motion/react";
import { fetchCollection, saveItem, removeItem, clearCollection } from "./lib/firebase";

// Components
import DashboardView from "./components/DashboardView";
import InventoryView from "./components/InventoryView";
import PurchaseView from "./components/PurchaseView";
import SalesView from "./components/SalesView";
import SignInView from "./components/SignInView";

// Icons
import { Sprout, LayoutDashboard, Trees, ShoppingCart, ShoppingBag, Leaf, HelpCircle, HardDrive, LogOut, User, AlertTriangle } from "lucide-react";

export default function App() {
  // Authentication user session State
  const [currentUser, setCurrentUser] = useState<NurseryUser | null>(null);

  // Modal confirmation states
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // State variables synchronized with localStorage
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);

  // Navigation tab tracker
  const [activeTab, setActiveTab ] = useState<"dashboard" | "inventory" | "purchase" | "sales">("dashboard");

  const isReadOnly = currentUser
    ? !(
        currentUser.username === "Sri Rama Satya" ||
        currentUser.username === "Surendra Bonam" ||
        currentUser.role.toLowerCase() === "stalwart" ||
        currentUser.role.toLowerCase() === "owner" ||
        currentUser.role.toLowerCase() === "head - manager"
      )
    : false;

  // Load from localStorage on mount (or use seed data)
  useEffect(() => {
    // 0. Purity system upgrade - safe cleanup of old sandboxed database entries
    const isPurityCleared = localStorage.getItem("devakusuma_purity_v1");
    if (!isPurityCleared) {
      localStorage.removeItem("devakusuma_inventory");
      localStorage.removeItem("devakusuma_purchases");
      localStorage.removeItem("devakusuma_sales");
      localStorage.setItem("devakusuma_purity_v1", "true");
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

    // 4. Async Firestore Sync
    const syncFromFirestore = async () => {
      try {
        const [dbInventory, dbPurchases, dbSales] = await Promise.all([
          fetchCollection<InventoryItem>("inventory"),
          fetchCollection<PurchaseRecord>("purchases"),
          fetchCollection<SalesRecord>("sales"),
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
      } catch (err) {
        console.warn("Could not sync records from Firestore, using offline cache:", err);
      }
    };

    syncFromFirestore();
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

    // Decrease Inventory quantity
    const matchedIdx = inventory.findIndex(
      (inv) =>
        inv.plantName.toLowerCase() === record.plantName.toLowerCase() &&
        inv.plantSize === record.plantSize
    );

    if (matchedIdx !== -1) {
      const updatedInventory = [...inventory];
      updatedInventory[matchedIdx].quantityAvailable = Math.max(
        0,
        updatedInventory[matchedIdx].quantityAvailable - record.quantitySold
      );
      setInventory(updatedInventory);
      localStorage.setItem("devakusuma_inventory", JSON.stringify(updatedInventory));
      saveItem("inventory", updatedInventory[matchedIdx].id, updatedInventory[matchedIdx]).catch(console.error);
    }

    return newSale; // Returns sale for modal trigger
  };

  // Wipe statistics reset (for easy demo testing)
  const handleResetData = () => {
    setShowResetModal(true);
  };

  const confirmResetData = () => {
    const invIds = inventory.map((i) => i.id);
    const purIds = purchases.map((i) => i.id);
    const salIds = sales.map((i) => i.id);

    clearCollection("inventory", invIds).catch((err) => console.error("Error clearing inventory:", err));
    clearCollection("purchases", purIds).catch((err) => console.error("Error clearing purchases:", err));
    clearCollection("sales", salIds).catch((err) => console.error("Error clearing sales:", err));

    localStorage.removeItem("devakusuma_inventory");
    localStorage.removeItem("devakusuma_purchases");
    localStorage.removeItem("devakusuma_sales");
    setInventory(INITIAL_INVENTORY);
    setPurchases(INITIAL_PURCHASES);
    setSales(INITIAL_SALES);
    setShowResetModal(false);
  };

  if (!currentUser) {
    return <SignInView onSignInSuccess={handleSignIn} />;
  }

  return (
    <div className="min-h-screen bg-editorial-bg text-editorial-text flex flex-col font-serif" id="devakusuma-root">
      {/* Editorial Navigation Toolbar */}
      <nav className="h-16 md:h-20 px-6 md:px-10 border-b border-editorial-primary/20 flex items-center justify-between bg-white/60 backdrop-blur-md sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Devakusuma Logo" className="w-10 h-10 md:w-14 md:h-14 object-contain" />
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
          </div>

          <div className="h-6 w-[1px] bg-editorial-primary/20" />

          {/* Operator Badge and Sign-Out in Header */}
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-sans shadow-xs shrink-0 select-none" 
              style={{ backgroundColor: currentUser.avatarColor }}
              title={`${currentUser.username} (${currentUser.role})`}
            >
              {currentUser.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left shrink-0">
              <span className="block text-[11px] font-sans font-bold text-editorial-dark leading-none">
                {currentUser.username}
              </span>
              <span className="block text-[9px] font-sans uppercase tracking-wider text-editorial-primary/70 font-semibold mt-0.5">
                {currentUser.role}
              </span>
            </div>
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
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold font-sans shadow-xs shrink-0 select-none" 
            style={{ backgroundColor: currentUser.avatarColor }}
            title={currentUser.username}
          >
            {currentUser.username.slice(0, 2).toUpperCase()}
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
          <DashboardView inventory={inventory} purchases={purchases} sales={sales} />
        )}

        {activeTab === "inventory" && (
          <InventoryView
            inventory={inventory}
            onAddPlant={handleAddPlant}
            onBulkImport={handleBulkImport}
            onUpdatePlant={handleUpdatePlant}
            onDeletePlant={handleDeletePlant}
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === "purchase" && (
          <PurchaseView inventory={inventory} purchases={purchases} onAddPurchase={handleAddPurchase} isReadOnly={isReadOnly} />
        )}

        {activeTab === "sales" && (
          <SalesView inventory={inventory} sales={sales} onAddSale={handleAddSale} isReadOnly={isReadOnly} />
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="py-6 px-6 md:px-10 flex flex-col md:flex-row items-center justify-between text-[10px] uppercase tracking-[0.2em] font-sans text-editorial-primary/70 border-t border-editorial-primary/10 bg-white/20 mt-12 shrink-0 gap-4 mb-20 md:mb-0">
        <div className="flex items-center gap-2">
          <Leaf className="w-3.5 h-3.5 text-editorial-primary font-bold" />
          <span>Devakusuma Nursery Gardens</span>
        </div>
        <div>
          <span>Operator: {currentUser.username} ({currentUser.role})</span>
        </div>
        <div className="flex gap-6 items-center">
          {!isReadOnly && (
            <>
              <button
                id="reset-db-btn"
                onClick={handleResetData}
                className="font-bold text-red-700/80 hover:text-red-700 transition-colors uppercase tracking-[0.2em]"
                title="Restores original stock catalog for demo review"
              >
                Reset Demo Seeds
              </button>
              <span>&bull;</span>
            </>
          )}
          <span>System Online</span>
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
      </AnimatePresence>
    </div>
  );
}
