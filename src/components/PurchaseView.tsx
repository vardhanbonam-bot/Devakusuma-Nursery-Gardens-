import React, { useState } from "react";
import { PurchaseRecord, InventoryItem } from "../types";
import { ShoppingCart, Plus, Calendar, User, Sparkles } from "lucide-react";

interface PurchaseViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  onAddPurchase: (purchase: Omit<PurchaseRecord, "id">, targetSellingPriceForNew: number) => void;
  onDeletePurchase?: (purchaseId: string) => void;
  onUpdatePurchase?: (purchase: PurchaseRecord) => void;
  isReadOnly?: boolean;
}

export default function PurchaseView({ inventory, purchases, onAddPurchase, isReadOnly = false }: PurchaseViewProps) {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [supplierName, setSupplierName] = useState("");
  const [plantName, setPlantName] = useState("");
  const [plantSize, setPlantSize] = useState("");
  const [quantityPurchased, setQuantityPurchased] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  // For new plants, we need to gather an expected selling price to initialize inventory properly.
  const [expectedSellingPrice, setExpectedSellingPrice] = useState("");

  // Unique sizes existing in inventory for this specific plant name
  const existingSizesForPlant = React.useMemo(() => {
    if (!plantName.trim()) return [];
    return Array.from(
      new Set(
        inventory
          .filter((item) => item.plantName.toLowerCase() === plantName.trim().toLowerCase())
          .map((item) => item.plantSize)
      )
    );
  }, [plantName, inventory]);

  // Adjust size selection depending on plant name changes
  React.useEffect(() => {
    if (existingSizesForPlant.length > 0) {
      setPlantSize(existingSizesForPlant[0]);
    } else {
      setPlantSize("");
    }
  }, [plantName, existingSizesForPlant]);

  const finalPlantSize = plantSize.trim();

  // Check if plant already exists in inventory
  const matchedItem = inventory.find(
    (item) =>
      item.plantName.toLowerCase() === plantName.trim().toLowerCase() &&
      item.plantSize.toLowerCase() === finalPlantSize.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantName.trim() || !supplierName.trim()) return;

    if (!finalPlantSize) {
      alert("Please specify a valid plant size.");
      return;
    }

    const qtyNum = parseInt(quantityPurchased, 10);
    const costNum = parseFloat(costPerUnit);
    const espNum = parseFloat(expectedSellingPrice);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Please enter a valid Quantity Purchased of 1 or more.");
      return;
    }
    if (isNaN(costNum) || costNum <= 0) {
      alert("Please enter a valid Cost Per Unit of more than 0.");
      return;
    }
    if (!matchedItem && (isNaN(espNum) || espNum < 0)) {
      alert("Please enter a valid Expected Selling Price of 0 or more.");
      return;
    }

    const totalCost = qtyNum * costNum;

    onAddPurchase(
      {
        purchaseDate,
        supplierName: supplierName.trim(),
        plantName: plantName.trim(),
        plantSize: finalPlantSize,
        quantityPurchased: qtyNum,
        costPerUnit: costNum,
        totalPurchaseCost: totalCost,
      },
      matchedItem ? matchedItem.sellingPrice : espNum
    );

    // Reset Form
    setSupplierName("");
    setPlantName("");
    setPlantSize("1 ft");
    setCustomSizeText("");
    setIsCustomSize(false);
    setQuantityPurchased("");
    setCostPerUnit("");
    setExpectedSellingPrice("");
    alert("Purchase successfully saved! Live inventory has been increased.");
  };

  const handleCostChange = (costStr: string) => {
    setCostPerUnit(costStr);
    const cost = parseFloat(costStr);
    if (!isNaN(cost) && !matchedItem) {
      setExpectedSellingPrice(String(Math.round(cost * 1.5)));
    } else if (costStr === "") {
      setExpectedSellingPrice("");
    }
  };

  const formatRupees = (amount: number) => {
    return "₹" + amount.toLocaleString("en-IN");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-editorial-dark" id="purchase-module">
      {/* Input Form Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-editorial-primary/10 bg-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-editorial-primary">
                Procurements
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-primary/70">
                Inflow Logs
              </span>
            </div>
            <h2 className="text-3xl font-serif font-semibold text-editorial-dark tracking-tight">
              Buy & Purchase Plants
            </h2>
            <p className="text-sm text-editorial-primary/80 max-w-2xl font-serif italic">
              Record new batch purchases from suppliers to restock the nursery instantly.
            </p>
          </div>
        </div>

        {isReadOnly ? (
          <div className="bg-stone-50 border border-stone-200 p-8 rounded-2xl shadow-xs text-center space-y-4 py-20">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="font-serif text-[15px] font-bold text-stone-800">Purchase Recording Disabled</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-serif italic">
                Your current active operator role is view-only. Only Owners, Stalwarts, and Head - Managers can add and record new supplier purchases.
              </p>
            </div>
          </div>
        ) : (
          <form
            id="form-record-purchase"
            onSubmit={handleSubmit}
            className="bg-white p-6 md:p-8 border border-editorial-primary/10 rounded-2xl shadow-sm space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Purchase Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-editorial-primary/40" />
                  <input
                    id="purchase-date"
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Supplier Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-editorial-primary/40" />
                  <input
                    id="supplier-name"
                    type="text"
                    required
                    placeholder="e.g., Kerala Farms Wholesale"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                    list="suppliers-list"
                  />
                  <datalist id="suppliers-list">
                    {Array.from(new Set(purchases.map((p) => p.supplierName))).map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Plant Name</label>
                <input
                  id="purchase-plant-name"
                  type="text"
                  required
                  placeholder="e.g., Mango Graft (Alphonso)"
                  value={plantName}
                  onChange={(e) => setPlantName(e.target.value)}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  list="plants-inventory-autocomplete"
                />
                <datalist id="plants-inventory-autocomplete">
                  {Array.from(new Set(inventory.map((i) => i.plantName))).map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Plant Size *</label>
                <input
                  id="purchase-plant-size"
                  type="text"
                  required
                  placeholder="e.g. 2 ft, 8 inch, XL"
                  value={plantSize}
                  onChange={(e) => setPlantSize(e.target.value)}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  list="purchase-sizes-autocomplete"
                />
                <datalist id="purchase-sizes-autocomplete">
                  {existingSizesForPlant.length > 0 ? (
                    existingSizesForPlant.map((sz) => (
                      <option key={sz} value={sz} />
                    ))
                  ) : (
                    Array.from(new Set(inventory.map((i) => i.plantSize))).map((sz) => (
                      <option key={sz} value={sz} />
                    ))
                  )}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Quantity Purchased</label>
                <input
                  id="purchase-qty"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="e.g., 10"
                  value={quantityPurchased}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantityPurchased(val);
                    }
                  }}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Cost Per Unit (₹)</label>
                <input
                  id="purchase-cost-unit"
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="e.g., 50"
                  value={costPerUnit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      handleCostChange(val);
                    }
                  }}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Total Purchase Cost</label>
                <div className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 font-semibold text-editorial-dark">
                  {formatRupees(Number(quantityPurchased || 0) * Number(costPerUnit || 0))}
                </div>
              </div>
            </div>

            {/* New Plant Handling */}
            {!matchedItem && plantName.trim() !== "" && (
              <div className="bg-editorial-bg border border-editorial-primary/15 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-1.5 text-editorial-dark text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-editorial-accent" />
                  <span className="font-sans uppercase tracking-wider text-[10.5px]">Notice: New plant & size type</span>
                </div>
                <p className="text-xs text-editorial-primary font-serif italic leading-relaxed">
                  Since this plant does not exist in live inventory, a new catalog card will be initialized. Please specify the standard selling price:
                </p>
                <div className="w-48">
                  <label className="text-[9px] font-sans uppercase tracking-[0.1em] font-bold text-editorial-primary block mb-1">Selling Price (₹)</label>
                  <input
                    id="expected-sell-price"
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="e.g., 75"
                    value={expectedSellingPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setExpectedSellingPrice(val);
                      }
                    }}
                    className="w-full text-xs font-mono font-bold bg-white border border-editorial-primary/10 rounded p-2 focus:outline-none text-editorial-dark"
                  />
                </div>
              </div>
            )}

            {matchedItem && (
              <div className="bg-editorial-bg border border-editorial-primary/5 p-4 rounded-xl text-xs text-editorial-primary leading-relaxed font-serif">
                <span className="font-semibold text-editorial-dark">Updates existing variety!</span> This matches <strong>{matchedItem.plantName} ({matchedItem.plantSize})</strong>. Live storage increases from <strong>{matchedItem.quantityAvailable} units</strong> to <strong>{matchedItem.quantityAvailable + Number(quantityPurchased || 0)} units</strong>. Current customer charge: <strong>{formatRupees(matchedItem.sellingPrice)}</strong>.
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                id="submit-purchase"
                className="w-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-full transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Save Supplier Purchase Receipt
              </button>
            </div>
          </form>
        )}
      </div>

      {/* History panel on the right */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold">Recent Receipts</h3>
        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs divide-y divide-editorial-primary/5 max-h-[500px] overflow-y-auto">
          {purchases.length === 0 ? (
            <p className="text-xs text-editorial-primary/40 italic text-center py-10 font-serif">
              No previous purchases recorded yet. Saved entries appear here.
            </p>
          ) : (
            [...purchases].reverse().slice(0, 15).map((pur) => (
              <div key={pur.id} className="py-4 first:pt-0 last:pb-0 space-y-2 text-editorial-dark">
                <div className="flex justify-between items-start border-b border-editorial-primary/5 pb-1.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-serif font-bold text-editorial-dark truncate">{pur.plantName}</h4>
                    <p className="text-[10px] text-editorial-primary/70 font-sans tracking-wide truncate">Supplier: {pur.supplierName}</p>
                  </div>
                  <span className="text-[9px] text-editorial-primary/50 font-mono whitespace-nowrap shrink-0">{pur.purchaseDate}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-editorial-primary bg-editorial-bg border border-editorial-primary/5 p-2 rounded-lg">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Size</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">{pur.plantSize}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Qty</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">{pur.quantityPurchased}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Unit Cost</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">₹{pur.costPerUnit}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Total Cost</span>
                    <span className="font-bold text-editorial-dark text-[11px]">₹{pur.totalPurchaseCost}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
