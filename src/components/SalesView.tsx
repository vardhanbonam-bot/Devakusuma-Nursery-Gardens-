import React, { useState } from "react";
import { SalesRecord, InventoryItem, SaleLineItem } from "../types";
import { FileText, Calendar, User, ShoppingBag, AlertTriangle, Download, Share2, Printer, X, CheckCircle, Edit2, Trash2, Save, Plus, Trash } from "lucide-react";

interface SalesViewProps {
  inventory: InventoryItem[];
  sales: SalesRecord[];
  onAddSale: (sale: Omit<SalesRecord, "id" | "invoiceNumber">) => SalesRecord;
  onDeleteSale?: (saleId: string) => void;
  onUpdateSale?: (sale: SalesRecord) => void;
  isReadOnly?: boolean;
}

interface DraftLineItem {
  id: string;
  plantName: string;
  selectedSize: string;
  quantity: string;
  sellingPrice: string;
  mrpAtSale: number;
}

export default function SalesView({
  inventory,
  sales,
  onAddSale,
  onDeleteSale,
  onUpdateSale,
  isReadOnly = false
}: SalesViewProps) {
  // Sales Metadata State
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");

  const createNewDraftItem = (): DraftLineItem => ({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    plantName: "",
    selectedSize: "",
    quantity: "1",
    sellingPrice: "",
    mrpAtSale: 0
  });

  // Sales items state (starts with 1 item row)
  const [saleItems, setSaleItems] = useState<DraftLineItem[]>([createNewDraftItem()]);

  // Invoice Popup Modal State
  const [latestSale, setLatestSale] = useState<SalesRecord | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Local Inline edit states inside Invoice popup
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editCustomer, setEditCustomer] = useState("");
  const [editQty, setEditQty] = useState(0);
  const [editPrice, setEditPrice] = useState(0);

  // Available plant names in inventory
  const uniquePlantNames = Array.from(new Set(inventory.map((item) => item.plantName))).sort();

  // Handlers for modifying multi-item lines in the draft sale
  const addItemRow = () => {
    setSaleItems([...saleItems, createNewDraftItem()]);
  };

  const removeItemRow = (id: string) => {
    if (saleItems.length === 1) {
      alert("At least one botanical item line is required to register a sale.");
      return;
    }
    setSaleItems(saleItems.filter((it) => it.id !== id));
  };

  const updateItemRow = (id: string, updatedFields: Partial<DraftLineItem>) => {
    setSaleItems(
      saleItems.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updatedFields };

        // If plantName changed, lookup available sizes and auto-select-first
        if (updatedFields.hasOwnProperty("plantName")) {
          const availableInvs = inventory.filter(
            (inv) => inv.plantName.toLowerCase() === next.plantName.toLowerCase()
          );
          if (availableInvs.length > 0) {
            next.selectedSize = availableInvs[0].plantSize;
            next.sellingPrice = String(availableInvs[0].sellingPrice);
            next.mrpAtSale = availableInvs[0].sellingPrice;
          } else {
            next.selectedSize = "";
            next.sellingPrice = "";
            next.mrpAtSale = 0;
          }
        }
        // If selectedSize changed, lookup standard MRP from inventory unit
        else if (updatedFields.hasOwnProperty("selectedSize")) {
          const matched = inventory.find(
            (inv) =>
              inv.plantName.toLowerCase() === next.plantName.toLowerCase() &&
              inv.plantSize.toLowerCase() === next.selectedSize.toLowerCase()
          );
          if (matched) {
            next.sellingPrice = String(matched.sellingPrice);
            next.mrpAtSale = matched.sellingPrice;
          }
        }

        return next;
      })
    );
  };

  // Grand total value for items currently compiled in active form
  const grandTotalDraft = saleItems.reduce((acc, it) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const price = parseFloat(it.sellingPrice) || 0;
    return acc + qty * price;
  }, 0);

  // Handle submissions
  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    const lineItems: SaleLineItem[] = [];
    let containsError = false;

    for (const item of saleItems) {
      if (!item.plantName) {
        alert("Please select a botanical species for all rows.");
        containsError = true;
        break;
      }
      if (!item.selectedSize) {
        alert(`Please specify a valid stock size for "${item.plantName}".`);
        containsError = true;
        break;
      }

      const qtyNum = parseInt(item.quantity, 10);
      const priceNum = parseFloat(item.sellingPrice);

      if (isNaN(qtyNum) || qtyNum <= 0) {
        alert(`Please specify a quantity of 1 or more for text row of "${item.plantName}".`);
        containsError = true;
        break;
      }

      if (isNaN(priceNum) || priceNum < 0) {
        alert(`Please specify a selling price for text row of "${item.plantName}".`);
        containsError = true;
        break;
      }

      // Live stock validations - only block if item is in stock and requested qty is greater than available
      const matchedInv = inventory.find(
        (inv) =>
          inv.plantName.toLowerCase() === item.plantName.toLowerCase() &&
          inv.plantSize.toLowerCase() === item.selectedSize.toLowerCase()
      );

      if (matchedInv) {
        const available = matchedInv.quantityAvailable;
        if (qtyNum > available) {
          alert(
            `⛔ Insufficient Stock! You requested to sell ${qtyNum} but we only have ${available} units of "${item.plantName} (${item.selectedSize})" in inventory.`
          );
          containsError = true;
          break;
        }
      }

      lineItems.push({
        plantName: item.plantName,
        size: item.selectedSize,
        quantity: qtyNum,
        sellingPrice: priceNum,
        mrpAtSale: item.mrpAtSale || priceNum,
      });
    }

    if (containsError) return;

    // Trigger parent transaction handler
    const newRecord = onAddSale({
      saleDate,
      customerName: customerName.trim(),
      items: lineItems,
      totalSaleValue: grandTotalDraft,
    });

    // Populate state for the generated PDF Invoice
    setLatestSale(newRecord);
    setShowInvoiceModal(true);

    // Reset Form to initial slate
    setCustomerName("");
    setSaleItems([createNewDraftItem()]);
  };

  // Generate jsPDF with dynamic editorial styling supporting multiple line items
  const handleDownloadPDF = (sale: SalesRecord) => {
    try {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      if (!jsPDF) {
        alert("The PDF generator library is still loading. Please try again in 2 seconds.");
        return;
      }
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const primaryGreen = [90, 90, 64]; 
      const darkColor = [61, 43, 31]; 

      // Outer border styling
      doc.setDrawColor(215, 215, 200);
      doc.setLineWidth(0.4);
      doc.rect(5, 5, 138, 200);

      // Title slip
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("DEVAKUSUMA NURSERY GARDENS", 12, 18);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text("Sustainably Raised Seedlings, Plants & Fruit Grafts.", 12, 23);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 95);
      doc.text("Loc: Devakusuma Farms & Nursery, Karnataka", 12, 27);

      // Horiz rule
      doc.setDrawColor(215, 215, 200);
      doc.line(12, 32, 136, 32);

      // Sales Receipt Summary Header
      doc.setFillColor(245, 245, 240);
      doc.rect(12, 36, 124, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text("SALES TAX INVOICE - CASH MEMO", 15, 41);

      // Meta Data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Receipt Code: ${sale.invoiceNumber}`, 15, 50);
      doc.text(`Date of Sale: ${sale.saleDate}`, 15, 55);
      doc.text(`Buyer Name: ${sale.customerName}`, 15, 60);

      doc.line(12, 65, 136, 65);

      // Grid titles
      doc.setFont("helvetica", "bold");
      doc.text("Description & Size", 15, 71);
      doc.text("Quantity", 80, 71, { align: "right" });
      doc.text("Rate (Rs)", 105, 71, { align: "right" });
      doc.text("Amount (Rs)", 135, 71, { align: "right" });

      doc.line(12, 75, 136, 75);

      // Grid Rows (Multi-item support)
      doc.setFont("helvetica", "normal");
      let currentY = 82;

      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const desc = `${item.plantName} (${item.size})`;
          doc.text(desc, 15, currentY);
          doc.text(item.quantity.toString(), 80, currentY, { align: "right" });
          doc.text(`${item.sellingPrice.toFixed(2)}`, 105, currentY, { align: "right" });
          doc.text(`${(item.quantity * item.sellingPrice).toFixed(2)}`, 135, currentY, { align: "right" });
          currentY += 7;
        });
      } else {
        // Fallback row for legacy single product sales
        const desc = `${sale.plantName || "Species"} (${sale.plantSize || "General"})`;
        doc.text(desc, 15, currentY);
        doc.text((sale.quantitySold || 1).toString(), 80, currentY, { align: "right" });
        doc.text(`${(sale.sellingPrice || 0).toFixed(2)}`, 105, currentY, { align: "right" });
        doc.text(`${sale.totalSaleValue.toFixed(2)}`, 135, currentY, { align: "right" });
        currentY += 7;
      }

      currentY += 2;
      doc.line(12, currentY, 136, currentY);

      currentY += 8;
      // Bottom sums table
      doc.setFont("helvetica", "bold");
      doc.text("Sub-total:", 95, currentY, { align: "right" });
      doc.text(`${sale.totalSaleValue.toFixed(2)}`, 135, currentY, { align: "right" });

      currentY += 6;
      doc.text("Total Paid:", 95, currentY, { align: "right" });
      doc.text(`Rs ${sale.totalSaleValue.toLocaleString("en-IN")}.00`, 135, currentY, { align: "right" });

      // Greeting
      currentY += 15;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text("🌱 Thank you for choosing green! Wish you a happy and prosperous plantation.", 74, currentY, { align: "center" });

      currentY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(140, 140, 130);
      doc.text("Devakusuma Farms & Nursery • Grow green, live clean!", 74, currentY, { align: "center" });

      doc.save(`Devakusuma_Invoice_${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error printing PDF: " + err);
    }
  };

  // Build WhatsApp share string with detailed line items
  const handleWhatsAppShare = (sale: SalesRecord) => {
    let itemsStr = "";
    if (sale.items && sale.items.length > 0) {
      sale.items.forEach((item, index) => {
        itemsStr += `\n${index + 1}. *🌱 ${item.plantName}* (${item.size})\n   🔢 Qty: ${item.quantity} | 💲 Rate: ₹${item.sellingPrice}\n`;
      });
    } else {
      itemsStr = `\n🌱 *${sale.plantName}* (${sale.plantSize})\n🔢 *Quantity:* ${sale.quantitySold} units\n💲 *Rate:* ₹${sale.sellingPrice}\n`;
    }

    const messageText = `*Devakusuma Nursery Gardens - Receipt Master*\n\n🌿 *Invoice:* ${sale.invoiceNumber}\n📅 *Date:* ${sale.saleDate}\n👤 *Buyer:* ${sale.customerName}\n\n*Item details:*${itemsStr}\n━━━━━━━━━━━━━━━\n💰 *Total Paid:* *₹${sale.totalSaleValue}*\n━━━━━━━━━━━━━━━\n _Thank you for buying from Devakusuma Nursery Gardens!_`;
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  // Local Inline Editing inside Invoice popup
  const handleSaveInlineEdit = () => {
    if (!latestSale) return;

    const updated: SalesRecord = {
      ...latestSale,
      saleDate: editDate,
      customerName: editCustomer,
    };

    if (!(latestSale.items && latestSale.items.length > 0)) {
      // Legacy single item sale limits validation
      const invItem = inventory.find(
        (item) => item.plantName.toLowerCase() === latestSale.plantName?.toLowerCase() && item.plantSize === latestSale.plantSize
      );
      const available = invItem ? invItem.quantityAvailable : 0;
      const originalQty = latestSale.quantitySold || 0;
      const maxAllowed = available + originalQty;

      if (editQty > maxAllowed) {
        alert(`⛔ Insufficient stock! Maximum sale limit for this transaction is ${maxAllowed} units.`);
        return;
      }

      updated.quantitySold = editQty;
      updated.sellingPrice = editPrice;
      updated.totalSaleValue = editQty * editPrice;
    }

    onUpdateSale?.(updated);
    setLatestSale(updated);
    setIsEditingInvoice(false);
    alert("Invoice modified successfully!");
  };

  const handleDeleteInline = () => {
    if (!latestSale) return;

    if (window.confirm(`⚠️ Cancel and delete invoice ${latestSale.invoiceNumber}?\n\nSold plants will be returned back into active available inventory.`)) {
      onDeleteSale?.(latestSale.id);
      setShowInvoiceModal(false);
      setIsEditingInvoice(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-editorial-dark" id="sales-module">
      {/* Sales input form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-editorial-primary/10 bg-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-editorial-primary">
                Outflow Accounts
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-primary/70">
                POS registers
              </span>
            </div>
            <h2 className="text-3xl font-serif font-semibold text-editorial-dark tracking-tight">
              Sell Plants to Customers
            </h2>
            <p className="text-sm text-editorial-primary/80 max-w-2xl font-serif italic">
              Record nursery sales. Dynamic MRP matching loads existing sizes with editable price offsets to grant loyalty discounts.
            </p>
          </div>
        </div>

        {isReadOnly ? (
          <div className="bg-stone-50 border border-stone-200 p-8 rounded-2xl shadow-xs text-center space-y-4 py-20">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              <h3 className="font-serif text-[15px] font-bold text-stone-800">Sales Checkout Disabled</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-serif italic">
                Your current active operator role is view-only. Only Owner accounts can register botanical sale checkouts.
              </p>
            </div>
          </div>
        ) : (
          <form
            id="form-record-sale"
            onSubmit={handleSaleSubmit}
            className="bg-white p-6 md:p-8 border border-editorial-primary/10 rounded-2xl shadow-sm space-y-6"
          >
            {/* Meta client fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Date of Sale</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-editorial-primary/40" />
                  <input
                    id="sale-date"
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Customer Name (Buyer)</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-editorial-primary/40" />
                  <input
                    id="customer-name"
                    type="text"
                    required
                    placeholder="e.g., Harish Gowda"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Items Multi-line list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <h3 className="text-xs uppercase tracking-wider font-bold text-editorial-primary font-sans">
                  Botanical Items List
                </h3>
                <span className="text-[10px] text-editorial-primary/60 font-mono">
                  {saleItems.length} {saleItems.length === 1 ? 'species line' : 'species lines'}
                </span>
              </div>

              <div className="space-y-4">
                {saleItems.map((row, index) => {
                  // Get available sizes in stock for the selected species name
                  const sizesInStock = inventory.filter(
                    (item) => item.plantName.toLowerCase() === row.plantName.toLowerCase()
                  );

                  // Find inventory card to view dynamic stock quantities
                  const currentlyMatchedInv = inventory.find(
                    (item) =>
                      item.plantName.toLowerCase() === row.plantName.toLowerCase() &&
                      item.plantSize.toLowerCase() === row.selectedSize.toLowerCase()
                  );

                  const maxStockAlert = currentlyMatchedInv ? currentlyMatchedInv.quantityAvailable : 0;

                  return (
                    <div
                      key={row.id}
                      className="border border-stone-250 p-4 rounded-xl bg-stone-50/40 relative space-y-4 shadow-xs"
                    >
                      {/* Delete index icon tag */}
                      {saleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(row.id)}
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white p-1 rounded-full border border-stone-150 transition cursor-pointer"
                          title="Remove item line"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="text-[10px] font-bold text-editorial-primary font-sans uppercase">
                        Specimen #{index + 1}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Select Plant Name */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                            Select Plant
                          </label>
                          <select
                            required
                            value={row.plantName}
                            onChange={(e) => updateItemRow(row.id, { plantName: e.target.value })}
                            className="w-full text-xs font-serif bg-white border border-stone-200 rounded-lg p-2.5 text-editorial-dark outline-none focus:border-editorial-accent"
                          >
                            <option value="">-- Choose Species --</option>
                            {uniquePlantNames.map((nm) => (
                              <option key={nm} value={nm}>
                                {nm}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Select Size matching dynamic inventory entries */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                            Available Sizes
                          </label>
                          <input
                            required
                            disabled={!row.plantName}
                            type="text"
                            placeholder={!row.plantName ? "-- Select Plant First --" : "Select or type a size..."}
                            value={row.selectedSize}
                            onChange={(e) => updateItemRow(row.id, { selectedSize: e.target.value })}
                            className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg p-2.5 text-editorial-dark outline-none focus:border-editorial-accent disabled:opacity-50"
                            list={`sizes-autocomplete-${row.id}`}
                          />
                          <datalist id={`sizes-autocomplete-${row.id}`}>
                            {sizesInStock.map((inv) => (
                              <option key={inv.id} value={inv.plantSize}>
                                {inv.plantSize} (Available: {inv.quantityAvailable})
                              </option>
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* Quantity & Editable Price */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                            Quantity to Sell
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            required
                            disabled={!row.selectedSize}
                            value={row.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                updateItemRow(row.id, { quantity: val });
                              }
                            }}
                            className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg p-2 text-editorial-dark focus:border-editorial-accent disabled:opacity-50"
                            placeholder="e.g. 1"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="flex justify-between items-center">
                            <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                              Selling Price per Unit (₹)
                            </label>
                            {row.mrpAtSale > 0 && (
                              <span className="text-[8px] font-mono text-stone-500 italic">MRP: ₹{row.mrpAtSale}</span>
                            )}
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            required
                            disabled={!row.selectedSize}
                            value={row.sellingPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                updateItemRow(row.id, { sellingPrice: val });
                              }
                            }}
                            className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg p-2 text-editorial-dark focus:border-editorial-accent disabled:opacity-50"
                            placeholder="₹"
                          />
                        </div>
                      </div>

                      {/* Inline stock alarm */}
                      {currentlyMatchedInv && parseInt(row.quantity, 10) > maxStockAlert && (
                        <div className="bg-red-50 text-red-800 text-[11px] p-2.5 rounded-lg flex items-center gap-2 border border-red-100">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>
                            <strong>Low stock error:</strong> Request exceeds current available limit of {maxStockAlert} plants in shelf files.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add plant row trigger */}
              <button
                type="button"
                onClick={addItemRow}
                className="w-full py-2 border-2 border-dashed border-stone-250 hover:bg-stone-50 transition text-editorial-primary text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Add another plant row
              </button>
            </div>

            {/* Overall Pricing indicators */}
            <div className="bg-editorial-bg border border-editorial-primary/10 rounded-2xl p-5 space-y-1.5 select-none font-bold">
              <div className="border-t border-editorial-primary/10 pt-1 flex justify-between items-center text-base font-bold text-editorial-dark">
                <span className="font-serif">Grand Billing Sum Total:</span>
                <span className="font-mono tracking-tight text-xl underline underline-offset-4 decoration-editorial-accent">
                  ₹{grandTotalDraft.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="confirm-sale-btn"
                disabled={saleItems.some(it => !it.plantName || !it.selectedSize || (parseInt(it.quantity, 10) || 0) === 0)}
                className={`w-full py-3.5 px-4 rounded-full font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  saleItems.some(it => !it.plantName || !it.selectedSize || (parseInt(it.quantity, 10) || 0) === 0)
                    ? "bg-stone-200 text-stone-400 border border-stone-300/40 cursor-not-allowed"
                    : "bg-editorial-primary hover:bg-editorial-dark text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                Register Sale & Print Bill
              </button>
            </div>
          </form>
        )}
      </div>

      {/* History of sales on right panel */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold">Recent Sold Receipts</h3>
        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs divide-y divide-editorial-primary/5 max-h-[500px] overflow-y-auto">
          {sales.length === 0 ? (
            <p className="text-xs text-editorial-primary/40 italic text-center py-10 font-serif">
              No botanical sales transactions recorded yet.
            </p>
          ) : (
            [...sales].reverse().slice(0, 15).map((sal) => {
              // Description strings based on multi vs single
              let headerDesc = "";
              let numItemsStr = "";
              if (sal.items && sal.items.length > 0) {
                headerDesc = sal.items.map(it => it.plantName).join(", ");
                numItemsStr = `${sal.items.length} items`;
              } else {
                headerDesc = sal.plantName || "Unknown species";
                numItemsStr = "1 species";
              }

              return (
                <div
                  key={sal.id}
                  className="py-4 first:pt-0 last:pb-0 space-y-2 hover:bg-editorial-primary/5 cursor-pointer rounded-lg px-2 -mx-2 transition"
                  onClick={() => {
                    setLatestSale(sal);
                    setShowInvoiceModal(true);
                    setIsEditingInvoice(false);
                    setEditCustomer(sal.customerName);
                    setEditDate(sal.saleDate);
                    setEditQty(sal.quantitySold || 0);
                    setEditPrice(sal.sellingPrice || 0);
                  }}
                  title="Review Invoice"
                >
                  <div className="flex justify-between items-start border-b border-editorial-primary/5 pb-1.5 gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-serif font-bold text-editorial-dark truncate leading-tight">
                        {headerDesc}
                      </h4>
                      <p className="text-[10px] text-editorial-primary/70 font-sans tracking-wide truncate mt-0.5">
                        Customer: {sal.customerName} &bull; {numItemsStr}
                      </p>
                    </div>
                    <span className="text-[9px] text-editorial-primary/50 font-mono whitespace-nowrap shrink-0">
                      {sal.invoiceNumber}
                    </span>
                  </div>

                  {/* Pricing grid summary */}
                  <div className="flex justify-between items-center text-[11px] bg-stone-50 border border-stone-200/40 p-2 rounded-lg font-mono text-editorial-dark">
                    <span className="text-stone-400 font-sans text-[10px] uppercase">Bill Total:</span>
                    <span className="font-bold text-editorial-dark">₹{sal.totalSaleValue}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* INVOICE MODAL POPUP */}
      {showInvoiceModal && latestSale && (
        <div className="fixed inset-0 bg-editorial-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" id="invoice-modal">
          <div className="bg-white w-full max-w-md rounded-2xl border border-editorial-primary/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fadeIn">
            {/* Header toolbar */}
            <div className="bg-editorial-primary text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-editorial-accent-light" />
                <span className="font-sans uppercase tracking-wider text-xs font-bold">
                  {isEditingInvoice ? "Editing Transaction" : "Transaction Confirmed"}
                </span>
              </div>
              <button
                id="btn-close-invoice"
                onClick={() => {
                  setShowInvoiceModal(false);
                  setIsEditingInvoice(false);
                }}
                className="hover:bg-editorial-dark/40 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Visual Paper Invoice Slip */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-4 text-editorial-dark bg-[#FAFAF8] font-sans border-b border-editorial-primary/5">
              {isEditingInvoice ? (
                <div className="space-y-4 text-xs">
                  <div className="text-center space-y-1 pb-2 border-b border-editorial-primary/10">
                    <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40]">EDIT POS SALES RECEIPT</h4>
                    <p className="text-[9px] text-editorial-primary/70 font-mono">CODE: {latestSale.invoiceNumber}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Sale Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2 text-editorial-dark outline-none focus:border-editorial-primary/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Buyer / Customer Name</label>
                      <input
                        type="text"
                        value={editCustomer}
                        onChange={(e) => setEditCustomer(e.target.value)}
                        className="w-full text-xs font-serif bg-white border border-editorial-primary/10 rounded-lg p-2 text-editorial-dark outline-none focus:border-editorial-primary/30"
                      />
                    </div>

                    {/* Only show legacy edits if single item sale */}
                    {!(latestSale.items && latestSale.items.length > 0) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Quantity Sold</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={editQty || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d+$/.test(val)) {
                                setEditQty(val === "" ? 0 : parseInt(val, 10));
                              }
                            }}
                            className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2 text-editorial-dark outline-none focus:border-editorial-primary/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Unit Selling Price (₹)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editPrice || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                setEditPrice(val === "" ? 0 : parseFloat(val));
                              }
                            }}
                            className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2 text-editorial-dark outline-none focus:border-editorial-primary/30"
                          />
                        </div>
                      </div>
                    )}

                    {latestSale.items && latestSale.items.length > 0 && (
                      <div className="text-[10px] text-stone-500 italic font-serif leading-relaxed text-center py-2 bg-stone-50 rounded-lg border border-stone-200">
                        Multi-line species items cannot have prices or quantities edited post-sale inside our checkout window. If adjustments are required, please Cancel this transaction.
                      </div>
                    )}

                    <div className="bg-editorial-bg p-3.5 rounded-xl border border-editorial-primary/15 flex justify-between items-center mt-2 select-none">
                      <span className="text-[11px] font-serif italic text-editorial-primary">Recomputed Bill Total:</span>
                      <span className="text-[15px] font-mono font-bold text-editorial-dark">
                        ₹{(!(latestSale.items && latestSale.items.length > 0) ? (editQty * editPrice) : latestSale.totalSaleValue).toLocaleString("en-IN")}.00
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingInvoice(false)}
                      className="flex-1 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 hover:bg-stone-200 text-stone-600 transition cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInlineEdit}
                      className="flex-1 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-editorial-primary hover:bg-editorial-dark text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-0.5">
                    <h3 className="text-lg font-serif font-bold text-editorial-dark tracking-tight">DEVAKUSUMA NURSERY GARDENS</h3>
                    <p className="text-[9px] font-sans uppercase tracking-[0.1em] text-editorial-primary/80">Live Botanical Greenhouse</p>
                    <p className="text-[9px] font-mono text-editorial-primary/50">Farms & Nursery, Karnataka</p>
                    <div className="border-b border-dashed border-editorial-primary/20 my-3"></div>
                    <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#5A5A40]">POS SALES MEMO</h4>
                  </div>

                  <div className="text-[11px] space-y-1.5 font-mono text-editorial-dark">
                    <div className="flex justify-between">
                      <span className="text-editorial-primary/70">Invoice Code:</span>
                      <span className="font-bold">{latestSale.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-editorial-primary/70">Sale Date:</span>
                      <span>{latestSale.saleDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-editorial-primary/70">Buyer Name:</span>
                      <span className="font-semibold">{latestSale.customerName}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-editorial-primary/20 my-3"></div>

                  {/* Dynamic Items list */}
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between font-sans font-bold text-editorial-primary/80 text-[9px] uppercase tracking-wider border-b border-dashed border-stone-200 pb-1">
                      <span>Botanical Species & Size</span>
                      <span className="text-right">Line Total</span>
                    </div>

                    {latestSale.items && latestSale.items.length > 0 ? (
                      latestSale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start font-mono text-editorial-dark py-1.5 border-b border-stone-100 last:border-b-0">
                          <div>
                            <p className="font-serif font-bold text-[13px]">{item.plantName}</p>
                            <p className="text-[10px] text-editorial-primary/70 mt-0.5">
                              Size: {item.size} &bull; {item.quantity} x ₹{item.sellingPrice}
                            </p>
                          </div>
                          <span className="font-bold text-[13px] text-editorial-dark">
                            ₹{(item.quantity * item.sellingPrice).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))
                    ) : (
                      // Legacy structure fallback
                      <div className="flex justify-between items-start font-mono text-editorial-dark">
                        <div>
                          <p className="font-serif font-bold text-[13px]">{latestSale.plantName}</p>
                          <p className="text-[10px] text-editorial-primary/70 mt-0.5">
                            Size: {latestSale.plantSize} &bull; {latestSale.quantitySold} x ₹{latestSale.sellingPrice}
                          </p>
                        </div>
                        <span className="font-bold text-[13px] text-editorial-dark">
                          ₹{(latestSale.totalSaleValue || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-b border-dashed border-editorial-primary/20 my-3"></div>

                  <div className="flex justify-between items-center bg-editorial-bg/60 border border-editorial-primary/10 p-4 rounded-xl text-editorial-dark">
                    <span className="text-xs font-sans uppercase tracking-wider font-bold text-editorial-primary">Total Paid:</span>
                    <span className="text-xl font-mono font-bold text-editorial-dark">
                      ₹{latestSale.totalSaleValue.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <p className="text-[10px] text-editorial-primary/70 text-center italic font-serif leading-relaxed pt-2">
                    🌱 Thank you for choosing green! Let earth blossom.
                  </p>
                </>
              )}
            </div>

            {/* Action buttons inside paper popup */}
            <div className="p-5 bg-white border-t border-editorial-primary/10 flex flex-col gap-3.5 shrink-0">
              {!isEditingInvoice && (
                <>
                  <button
                    id="btn-pdf-download"
                    onClick={() => handleDownloadPDF(latestSale)}
                    className="w-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-xs uppercase tracking-widest py-3 rounded-full transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF Invoice
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="btn-whatsapp-share"
                      onClick={() => handleWhatsAppShare(latestSale)}
                      className="bg-white hover:bg-editorial-bg text-editorial-dark border border-editorial-primary/15 font-bold text-[10px] font-sans uppercase tracking-[0.12em] py-2.5 rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-editorial-primary" />
                      WhatsApp
                    </button>
                    <button
                      id="btn-invoice-print"
                      onClick={handlePrint}
                      className="bg-white hover:bg-editorial-bg text-editorial-dark border border-editorial-primary/15 font-bold text-[10px] font-sans uppercase tracking-[0.12em] py-2.5 rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-editorial-primary" />
                      Print Memo
                    </button>
                  </div>

                  {!isReadOnly && (
                    <div className="grid grid-cols-2 gap-3 border-t border-editorial-primary/10 pt-3.5 mt-1">
                      <button
                        onClick={() => {
                          setIsEditingInvoice(true);
                          setEditDate(latestSale.saleDate);
                          setEditCustomer(latestSale.customerName);
                          setEditQty(latestSale.quantitySold || 0);
                          setEditPrice(latestSale.sellingPrice || 0);
                        }}
                        className="bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 font-bold text-[10px] font-sans uppercase tracking-[0.12em] py-2.5 rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                        Edit Memo
                      </button>
                      <button
                        onClick={handleDeleteInline}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] font-sans uppercase tracking-[0.12em] py-2.5 rounded-full transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        Cancel Rec
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
