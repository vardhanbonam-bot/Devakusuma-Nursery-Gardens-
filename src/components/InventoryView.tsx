import React, { useState, useRef } from "react";
import { InventoryItem } from "../types";
import { Leaf, Plus, Sparkles, AlertTriangle, FileSpreadsheet, Search, Check, Upload, Edit2, Trash2 } from "lucide-react";

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAddPlant: (item: Omit<InventoryItem, "id">) => void;
  onBulkImport: (items: Omit<InventoryItem, "id">[], overwriteExisting?: boolean) => void;
  onUpdatePlant: (item: InventoryItem) => void;
  onDeletePlant: (id: string) => void;
  onMassDeletePlants?: (ids: string[]) => void;
  isReadOnly?: boolean;
}

export default function InventoryView({
  inventory,
  onAddPlant,
  onBulkImport,
  onUpdatePlant,
  onDeletePlant,
  onMassDeletePlants,
  isReadOnly = false,
}: InventoryViewProps) {
  // Add Plant Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [plantName, setPlantName] = useState("");
  const [plantSize, setPlantSize] = useState("1 ft");
  const [quantity, setQuantity] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlantName, setEditPlantName] = useState("");
  const [editPlantSize, setEditPlantSize] = useState("");
  const [editQuantityAvailable, setEditQuantityAvailable] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [sizeFilter, setSizeFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All"); // All, Low, Normal

  // Bulk Import State
  const [showImportArea, setShowImportArea] = useState(false);
  const [rawPasteData, setRawPasteData] = useState("");
  const [importPreview, setImportPreview] = useState<Omit<InventoryItem, "id">[]>([]);
  const [importError, setImportError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [overwriteOnImport, setOverwriteOnImport] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Sizes for Dropdowns
  const sizeOptions = ["1 ft", "2 ft", "3 ft", "4 ft", "5 ft", "Creeper", "Seedling", "Sapling"];

  // Handle manual submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantName.trim()) return;

    const qtyNum = parseInt(quantity, 10);
    const priceNum = parseFloat(sellingPrice);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Please enter a valid quantity of 1 or more.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid selling price of 0 or more.");
      return;
    }

    onAddPlant({
      plantName: plantName.trim(),
      plantSize,
      quantityAvailable: qtyNum,
      sellingPrice: priceNum,
    });

    // Reset Form
    setPlantName("");
    setPlantSize("1 ft");
    setQuantity("");
    setSellingPrice("");
    setShowAddForm(false);
  };

  // Helper function to robustly parse a CSV/TSV line respecting quotes
  const parseCSVLine = (line: string, delimiter: string) => {
    if (delimiter !== ",") {
      return line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ""));
    }
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  // Parse TSV/CSV from Excel or file
  const parseSpreadsheetData = (text: string) => {
    if (!text.trim()) {
      setImportPreview([]);
      setImportError("");
      return;
    }

    try {
      const lines = text.split(/\r?\n/);
      const parsed: Omit<InventoryItem, "id">[] = [];

      // Auto-detect delimiter by counting tabs, commas, or semicolons in the first few lines
      let tabsCount = 0;
      let commasCount = 0;
      let semicolonsCount = 0;
      const scanLines = lines.slice(0, 5);
      for (const rawLine of scanLines) {
        tabsCount += (rawLine.match(/\t/g) || []).length;
        commasCount += (rawLine.match(/,/g) || []).length;
        semicolonsCount += (rawLine.match(/;/g) || []).length;
      }

      let delimiter = ",";
      if (tabsCount > commasCount && tabsCount > semicolonsCount) {
        delimiter = "\t";
      } else if (semicolonsCount > commasCount && semicolonsCount > tabsCount) {
        delimiter = ";";
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = parseCSVLine(line, delimiter);

        // Standardized Header skipping routine
        const firstCol = parts[0]?.toLowerCase() || "";
        const secondCol = parts[1]?.toLowerCase() || "";
        const thirdCol = parts[2]?.toLowerCase() || "";
        const fourthCol = parts[3]?.toLowerCase() || "";

        if (
          firstCol.includes("name") || 
          firstCol.includes("plant") ||
          secondCol.includes("size") || 
          thirdCol.includes("qty") || 
          thirdCol.includes("quantity") || 
          fourthCol.includes("price") || 
          fourthCol.includes("cost")
        ) {
          continue;
        }

        if (parts.length >= 1) {
          const name = parts[0];
          if (!name) continue;

          let size = "1 ft";
          let qty = 10;
          let price = 100;

          if (parts.length === 2) {
            // [Name, Quantity] or [Name, Size]
            const parsedQty = parseInt(parts[1], 10);
            if (!isNaN(parsedQty)) {
              qty = parsedQty;
            } else {
              size = parts[1];
            }
          } else if (parts.length === 3) {
            // [Name, Size, Quantity] or [Name, Quantity, Price]
            const secondPartIsNum = !isNaN(parseInt(parts[1], 10));
            if (secondPartIsNum) {
              qty = parseInt(parts[1], 10);
              price = parseFloat(parts[2]);
            } else {
              size = parts[1];
              qty = parseInt(parts[2], 10);
            }
          } else if (parts.length >= 4) {
            // [Name, Size, Quantity, Price]
            size = parts[1] || "1 ft";
            qty = parseInt(parts[2], 10);
            price = parseFloat(parts[3]);
          }

          if (isNaN(qty)) qty = 10;
          if (isNaN(price)) price = 100;

          parsed.push({
            plantName: name,
            plantSize: size,
            quantityAvailable: qty,
            sellingPrice: price,
          });
        }
      }

      if (parsed.length === 0) {
        setImportError("Could not find readable columns. Format must be: Plant Name | Size | Quantity | Price");
        setImportPreview([]);
      } else {
        setImportPreview(parsed);
        setImportError("");
      }
    } catch (err) {
      setImportError("Error parsing file. Ensure columns are separated by comma, tab, or semicolon.");
      setImportPreview([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".csv") || file.name.endsWith(".txt") || file.type === "text/csv" || file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawPasteData(text);
        parseSpreadsheetData(text);
      };
      reader.readAsText(file);
    } else {
      setImportError("Unsupported file type. Please upload a .csv or .txt file.");
    }
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawPasteData(val);
    parseSpreadsheetData(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawPasteData(text);
      parseSpreadsheetData(text);
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset value key to let the file upload again if edited
  };

  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;
    onBulkImport(importPreview, overwriteOnImport);
    setRawPasteData("");
    setImportPreview([]);
    setShowImportArea(false);
  };

  const startEditing = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditPlantName(item.plantName);
    setEditPlantSize(item.plantSize);
    setEditQuantityAvailable(String(item.quantityAvailable));
    setEditSellingPrice(String(item.sellingPrice));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (id: string) => {
    if (!editPlantName.trim()) {
      alert("Plant Name is required.");
      return;
    }

    const qtyNum = parseInt(editQuantityAvailable, 10);
    const priceNum = parseFloat(editSellingPrice);

    if (isNaN(qtyNum) || qtyNum < 0) {
      alert("Please enter a valid quantity of 0 or more.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Please enter a valid selling price of 0 or more.");
      return;
    }

    onUpdatePlant({
      id,
      plantName: editPlantName.trim(),
      plantSize: editPlantSize,
      quantityAvailable: qtyNum,
      sellingPrice: priceNum,
    });

    setEditingId(null);
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.plantName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSize = sizeFilter === "All" || item.plantSize === sizeFilter;
    const isLow = item.quantityAvailable <= 100;
    const matchesStock =
      stockFilter === "All" ||
      (stockFilter === "Low" && isLow) ||
      (stockFilter === "Normal" && !isLow);

    return matchesSearch && matchesSize && matchesStock;
  });

  const totalStockVal = inventory.reduce(
    (sum, item) => sum + item.quantityAvailable * item.sellingPrice,
    0
  );

  // Toggle single item selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle selection of all items in current filtered view
  const visibleIds = filteredInventory.map((item) => item.id);
  const areAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (areAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const next = [...prev];
        visibleIds.forEach((id) => {
          if (!next.includes(id)) {
            next.push(id);
          }
        });
        return next;
      });
    }
  };

  const handleMassDelete = () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `⚠️ Are you sure you want to delete ${selectedIds.length} selected varieties from your inventory?\n\nThis will permanently remove them from catalog.`
      )
    ) {
      if (onMassDeletePlants) {
        onMassDeletePlants(selectedIds);
      } else {
        selectedIds.forEach((id) => onDeletePlant(id));
      }
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-8" id="inventory-module">
      {/* Upper header section in Editorial style */}
      <div className="border border-editorial-primary/10 bg-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 mr-1 ml-1 md:mx-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-editorial-primary">
              Nursery Catalog
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-primary/70">
              Live Stock
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-editorial-dark tracking-tight">
            Live Plant Inventory
          </h2>
          <p className="text-xs md:text-sm text-editorial-primary/80 max-w-2xl font-serif italic pb-1">
            Check, search, and update active stock sizes, quantities, and selling prices.
          </p>
        </div>

        {isReadOnly ? (
          <div className="px-4 py-2 border border-stone-200 bg-stone-50 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 shadow-xs select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
            View Only Mode
          </div>
        ) : (
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <button
              id="btn-add-plant-form"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowImportArea(false);
              }}
              className="px-3 md:px-5 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-sans uppercase tracking-wider font-bold transition bg-editorial-primary text-white hover:bg-editorial-dark shrink-0 cursor-pointer"
            >
              + Add Single Plant
            </button>
            <button
              id="btn-import-excel"
              onClick={() => {
                setShowImportArea(!showImportArea);
                setShowAddForm(false);
              }}
              className="px-3 md:px-5 py-2 md:py-2.5 rounded-full text-[10px] md:text-xs font-sans uppercase tracking-wider font-bold transition border border-editorial-primary/20 text-editorial-dark bg-editorial-bg hover:bg-white shrink-0 cursor-pointer"
            >
              Import Excel / CSV
            </button>
          </div>
        )}
      </div>

      {/* Add New Plant Form */}
      {showAddForm && (
        <form
          id="form-add-plant"
          onSubmit={handleSubmit}
          className="bg-white p-6 md:p-8 rounded-2xl border border-editorial-primary/10 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-2 border-b border-editorial-primary/10 pb-3">
            <Sparkles className="w-4 h-4 text-editorial-accent" />
            <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans">
              Register New Seedling or Plant Block
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Plant Name</label>
              <input
                id="input-plant-name"
                type="text"
                required
                placeholder="e.g., Red Fragrant Rose"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/40 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Plant Size</label>
              <select
                id="input-plant-size"
                value={plantSize}
                onChange={(e) => setPlantSize(e.target.value)}
                className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/40 focus:outline-none focus:bg-white"
              >
                {sizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Initial Quantity</label>
              <input
                id="input-plant-qty"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="e.g., 10"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+$/.test(val)) {
                    setQuantity(val);
                  }
                }}
                className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/40 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Selling Price (₹)</label>
              <input
                id="input-plant-price"
                type="text"
                inputMode="decimal"
                required
                placeholder="e.g., 100"
                value={sellingPrice}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setSellingPrice(val);
                  }
                }}
                className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/40 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          {plantName.trim() !== "" && (
            <div className="bg-editorial-bg border border-editorial-primary/10 rounded-xl p-4 flex flex-col md:flex-row justify-between text-xs font-serif italic gap-2 text-editorial-primary">
              <div>
                <span>Preview entry: </span>
                <strong className="text-editorial-dark font-sans not-italic font-bold">{plantName} ({plantSize})</strong>
              </div>
              <div className="flex gap-4 font-mono text-[11px] not-italic text-editorial-dark flex-wrap">
                <span>Qty: {quantity || 0}</span>
                <span>Price: ₹{sellingPrice || 0}</span>
                <span className="underline decoration-editorial-accent font-bold">Total Value of Stock: ₹{(Number(quantity || 0) * Number(sellingPrice || 0)).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 font-sans font-bold uppercase tracking-wider text-editorial-primary/60 hover:text-editorial-dark text-[11px] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-sans uppercase tracking-wider font-bold transition bg-editorial-primary text-white hover:bg-editorial-dark cursor-pointer"
            >
              Add to Catalog
            </button>
          </div>
        </form>
      )}

      {/* Excel/CSV Import Area */}
      {showImportArea && (
        <div id="import-dashboard" className="bg-white p-6 md:p-8 rounded-2xl border border-editorial-primary/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-editorial-primary/10 pb-3">
            <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-editorial-accent" />
              Easy Spreadsheet Porter (Excel / CSV)
            </h3>
            <span className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold">Fast Bulk Upload</span>
          </div>

          <p className="text-xs text-editorial-primary/80 leading-relaxed font-serif italic max-w-3xl">
            Copy cells directly from excel (columns must consist of: <strong>Plant Name</strong>, <strong>Size</strong>, <strong>Quantity</strong>, and <strong>Selling Price</strong>) and paste them in the text box below. Or, drag & upload a standard <code>.csv</code> or <code>.txt</code> file.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-editorial-accent bg-editorial-accent/5 scale-[1.01]"
                      : "border-editorial-primary/20 bg-editorial-bg hover:bg-white hover:border-editorial-primary"
                  }`}
                >
                  <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-editorial-accent' : 'text-editorial-primary/65'}`} />
                  <div className="space-y-1">
                    <p className="text-xs font-sans font-bold uppercase tracking-widest text-editorial-dark">
                      {isDragging ? "Drop your file here!" : "Drag & Drop CSV / TXT here"}
                    </p>
                    <p className="text-[10px] font-sans text-editorial-primary/60">
                      Or click here to browse files on your computer
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80 block mb-1">
                  Paste rows directly (Tab-separated or comma):
                </label>
                <textarea
                  id="tsv-raw-paste"
                  value={rawPasteData}
                  onChange={handlePasteChange}
                  placeholder={`Red Rose Garden\t2 ft\t45\t180\nHoly Basil\t1 ft\t100\t50\nMango Tree\t3 ft\t15\t350`}
                  rows={6}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Preview Column */}
            <div className="border border-editorial-primary/10 rounded-xl bg-editorial-bg p-5 space-y-4 flex flex-col justify-between max-h-[280px] overflow-y-auto">
              <div>
                <h4 className="text-[10px] font-sans uppercase tracking-widest text-editorial-dark font-bold border-b border-editorial-primary/10 pb-2 mb-3">
                  Import Preview ({importPreview.length} Varieties)
                </h4>
                {importError && (
                  <div className="text-xs text-red-700 bg-red-55 p-3 rounded-xl flex items-center gap-1.5 border border-red-200/50 font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}
                {importPreview.length > 0 && (
                  <div className="space-y-2 text-xs max-h-[160px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-5 text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70 pb-1 border-b border-editorial-primary/10">
                      <span className="col-span-2">Plant Details</span>
                      <span className="text-center font-mono">Qty</span>
                      <span className="text-right font-mono">Price</span>
                      <span className="text-right font-mono">Total Est.</span>
                    </div>
                    {importPreview.slice(0, 10).map((p, idx) => (
                      <div key={idx} className="grid grid-cols-5 items-center text-editorial-dark border-b border-editorial-primary/5 py-1">
                        <span className="col-span-2 truncate font-serif font-medium leading-tight" title={`${p.plantName} (${p.plantSize})`}>
                          {p.plantName} <span className="text-editorial-primary font-mono text-[9px] font-normal block">({p.plantSize})</span>
                        </span>
                        <span className="font-mono text-[11px] text-center">{p.quantityAvailable}</span>
                        <span className="font-semibold text-editorial-dark font-mono text-right">₹{p.sellingPrice}</span>
                        <span className="font-semibold text-editorial-dark font-mono text-right">₹{p.quantityAvailable * p.sellingPrice}</span>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <div className="text-center text-editorial-primary/60 text-[9px] pt-2 font-mono uppercase tracking-wider">
                        ...and {importPreview.length - 10} more items
                      </div>
                    )}
                  </div>
                )}
                {importPreview.length === 0 && !importError && (
                  <p className="text-xs text-editorial-primary/60 italic text-center py-10 font-serif">
                    No items loaded. Copy/paste from spreadsheet to preview list before saving.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {importPreview.length > 0 && (
                  <div className="bg-white border border-editorial-primary/10 rounded-xl p-3.5 space-y-2 text-left">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="checkbox-overwrite-on-import"
                        checked={overwriteOnImport}
                        onChange={(e) => setOverwriteOnImport(e.target.checked)}
                        className="mt-0.5 rounded border-stone-300 text-editorial-primary focus:ring-editorial-primary h-3.5 w-3.5 accent-editorial-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-dark block">
                          Overwrite / Sync Stock levels
                        </span>
                        <span className="text-[9px] font-sans text-editorial-primary/65 block leading-normal">
                          If checked, existing plants will have their stock values set to the exact quantities specified in the CSV. Uncheck to add/accummulate instead.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {importPreview.length > 0 && (
                  <button
                    type="button"
                    id="btn-confirm-import"
                    onClick={handleConfirmImport}
                    className="w-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-[10px] font-sans uppercase tracking-widest py-3 rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Import to Live Inventory Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Quick Summary Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-editorial-primary/10 p-5 rounded-2xl shadow-xs">
          <p className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-1">Distinct Varieties</p>
          <p className="text-3xl font-serif font-medium text-editorial-dark">{inventory.length}</p>
        </div>
        <div className="bg-white border border-editorial-primary/10 p-5 rounded-2xl shadow-xs">
          <p className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-1">Total Plants in Hand</p>
          <p className="text-3xl font-serif font-medium text-editorial-dark">
            {inventory.reduce((sum, item) => sum + item.quantityAvailable, 0)}
          </p>
        </div>
        <div className="bg-white border border-editorial-primary/10 p-5 rounded-2xl shadow-xs">
          <p className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-1">Low Stock Alerts</p>
          <p className="text-3xl font-serif font-medium text-red-700/80">
            {inventory.filter((i) => i.quantityAvailable <= 100).length}
          </p>
        </div>
        <div className="bg-white border border-editorial-primary/15 p-5 rounded-2xl shadow-xs bg-editorial-bg">
          <p className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary font-bold mb-1">Est. Value of Stock</p>
          <p className="text-3xl font-serif font-medium text-editorial-dark">
            ₹{totalStockVal.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Main List & Table with Search Filters */}
      <div className="bg-white border border-editorial-primary/10 rounded-2xl shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 bg-editorial-bg border-b border-editorial-primary/10 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-editorial-primary/50" />
            <input
              id="search-input"
              type="text"
              placeholder="Search botanical catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-mono bg-white border border-editorial-primary/15 pl-10 pr-4 py-2.5 rounded-xl text-editorial-dark focus:border-editorial-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80 whitespace-nowrap">Size:</span>
              <select
                id="select-size-filter"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="text-xs font-serif bg-white border border-editorial-primary/15 rounded-lg p-2 text-editorial-dark focus:outline-none"
              >
                <option value="All">All Sizes</option>
                {sizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80 whitespace-nowrap">Stock level:</span>
              <select
                id="select-stock-filter"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="text-xs font-serif bg-white border border-editorial-primary/15 rounded-lg p-2 text-editorial-dark focus:outline-none"
              >
                <option value="All">All Stock levels</option>
                <option value="Low">Low Stock (≤ 100 units)</option>
                <option value="Normal">In Stock (&gt; 100 units)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Action Panel */}
        {selectedIds.length > 0 && !isReadOnly && (
          <div className="bg-red-50 border-b border-red-150 px-6 py-3.5 flex items-center justify-between text-xs transition-all duration-250">
            <div className="flex items-center gap-3 font-medium text-red-800">
              <span className="inline-flex items-center justify-center bg-red-100 text-red-800 rounded-full h-5.5 w-5.5 font-bold font-mono text-[10px]">
                {selectedIds.length}
              </span>
              <span className="font-sans font-medium">varieties selected for mass action</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 md:px-4 py-2 rounded-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 font-bold uppercase text-[9px] tracking-wider transition cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={handleMassDelete}
                className="px-4 md:px-5 py-2 rounded-full bg-red-650 hover:bg-red-700 text-white font-bold uppercase text-[9px] tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Catalog Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-editorial-primary/10 bg-editorial-bg text-[9px] uppercase tracking-[0.15em] font-sans font-bold text-editorial-primary/75">
                {!isReadOnly && (
                  <th className="py-4 px-6 md:px-8 w-12 text-center select-none">
                    <input
                      type="checkbox"
                      checked={areAllVisibleSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-stone-300 text-editorial-primary focus:ring-editorial-primary h-4.5 w-4.5 accent-editorial-primary cursor-pointer align-middle"
                    />
                  </th>
                )}
                <th className="py-4 px-6 md:px-8">Plant Details</th>
                <th className="py-4 px-6">Size</th>
                <th className="py-4 px-6 text-center">In Stock</th>
                <th className="py-4 px-6 text-right">Selling Price</th>
                <th className="py-4 px-6 text-right">Total Est. Value</th>
                <th className="py-4 px-6 text-center">Status</th>
                {!isReadOnly && <th className="py-4 px-6 text-center w-36">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-primary/5">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 6 : 8} className="py-16 text-center text-sm text-editorial-primary/60 italic font-serif">
                    No items match the filters. Add or import plants to populate the list!
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const isLow = item.quantityAvailable <= 100;
                  const itemValue = item.quantityAvailable * item.sellingPrice;
                  const isEditing = item.id === editingId;

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-editorial-accent/5 transition-colors">
                        {!isReadOnly && <td className="py-3 px-6 text-center pb-3"></td>}
                        <td className="py-3 px-6 md:px-8">
                          <input
                            type="text"
                            value={editPlantName}
                            onChange={(e) => setEditPlantName(e.target.value)}
                            className="w-full text-xs font-serif font-semibold bg-white border border-editorial-primary/20 rounded-lg p-2.5 text-editorial-dark focus:outline-none focus:border-editorial-primary"
                            placeholder="Plant Name"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <select
                            value={editPlantSize}
                            onChange={(e) => setEditPlantSize(e.target.value)}
                            className="text-xs font-serif bg-white border border-editorial-primary/20 rounded-lg p-2.5 text-editorial-dark focus:outline-none w-full"
                          >
                            {sizeOptions.map((sz) => (
                              <option key={sz} value={sz}>
                                {sz}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editQuantityAvailable}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                setEditQuantityAvailable(val);
                              }
                            }}
                            className="w-[75px] mx-auto block text-xs font-mono text-center bg-white border border-editorial-primary/20 rounded-lg p-2.5 text-editorial-dark focus:outline-none focus:border-editorial-primary"
                            placeholder="Qty"
                          />
                        </td>
                        <td className="py-3 px-6">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editSellingPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setEditSellingPrice(val);
                              }
                            }}
                            className="w-24 ml-auto block text-xs font-mono text-right bg-white border border-editorial-primary/20 rounded-lg p-2.5 text-editorial-dark focus:outline-none focus:border-editorial-primary"
                            placeholder="Price"
                          />
                        </td>
                        <td className="py-3 px-6 text-right font-mono text-xs font-semibold text-editorial-dark">
                          ₹{((parseInt(editQuantityAvailable, 10) || 0) * (parseFloat(editSellingPrice) || 0)).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className="text-[10px] font-sans uppercase tracking-wider text-editorial-accent font-bold">
                            Editing
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEditing(item.id)}
                              className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] uppercase font-sans tracking-widest font-bold shadow-xs transition cursor-pointer"
                              title="Save changes"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="px-2.5 py-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[9px] uppercase font-sans tracking-widest font-bold transition cursor-pointer border border-stone-200"
                              title="Cancel editing"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-editorial-primary/5 transition-colors ${
                        isLow ? "bg-red-50/10" : ""
                      }`}
                    >
                      {!isReadOnly && (
                        <td className="py-4 px-6 md:px-8 text-center select-none">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleToggleSelect(item.id)}
                            className="rounded border-stone-300 text-editorial-primary focus:ring-editorial-primary h-4.5 w-4.5 accent-editorial-primary cursor-pointer align-middle"
                          />
                        </td>
                      )}
                      <td className="py-4 px-6 md:px-8 font-serif font-semibold text-[14px] text-editorial-dark">
                        {item.plantName}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-editorial-primary/80">
                        {item.plantSize}
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-xs font-semibold text-editorial-dark">
                        {item.quantityAvailable} units
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-editorial-dark">
                        ₹{item.sellingPrice}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs font-semibold text-editorial-dark">
                        ₹{itemValue.toLocaleString("en-IN")}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider font-bold rounded-full bg-red-50 text-red-700 border border-red-200/50">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-sans uppercase tracking-wider font-bold rounded-full bg-editorial-primary/10 text-editorial-primary">
                            Healthy
                          </span>
                        )}
                      </td>
                      {!isReadOnly && (
                        <td className="py-4 px-6 text-center">
                          {deleteConfirmId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-[9px] font-sans text-red-700 font-bold uppercase tracking-wider">
                                Sure?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeletePlant(item.id);
                                  setDeleteConfirmId(null);
                                }}
                                className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[9px] uppercase font-sans font-bold cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-0.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-[9px] uppercase font-sans font-bold cursor-pointer border border-stone-300/30"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditing(item)}
                                className="p-1.5 rounded-lg border border-editorial-primary/10 hover:border-editorial-primary/35 hover:bg-editorial-primary/5 text-editorial-primary/80 hover:text-editorial-dark transition cursor-pointer"
                                title="Edit Variety"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="p-1.5 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-50 text-red-600/70 hover:text-red-700 transition cursor-pointer"
                                title="Delete Variety"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
