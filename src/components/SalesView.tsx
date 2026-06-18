import React, { useState } from "react";
import { SalesRecord, InventoryItem } from "../types";
import { FileText, Calendar, User, ShoppingBag, AlertTriangle, Download, Share2, Printer, X, CheckCircle } from "lucide-react";

interface SalesViewProps {
  inventory: InventoryItem[];
  sales: SalesRecord[];
  onAddSale: (sale: Omit<SalesRecord, "id" | "invoiceNumber">) => SalesRecord;
  isReadOnly?: boolean;
}

export default function SalesView({ inventory, sales, onAddSale, isReadOnly = false }: SalesViewProps) {
  // Sales State
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [quantitySold, setQuantitySold] = useState("");

  // Invoice Popup Modal State
  const [latestSale, setLatestSale] = useState<SalesRecord | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Available plant choices in inventory (excluding out-of-stock items)
  const availableItems = inventory.filter((item) => item.quantityAvailable > 0);

  // Currently elected plant for price autofilling
  const activeItem = inventory.find((item) => item.id === selectedPlantId);

  // Safe checks for form input
  const maxStock = activeItem ? activeItem.quantityAvailable : 0;
  const unitPrice = activeItem ? activeItem.sellingPrice : 0;
  const computedTotal = Number(quantitySold || 0) * unitPrice;

  // Handle submissions
  const handleSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedPlantId || !activeItem) {
      alert("Please complete the selling form fields.");
      return;
    }

    const qtyNum = parseInt(quantitySold, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Please enter a valid Quantity to Sell of 1 or more.");
      return;
    }

    if (qtyNum > maxStock) {
      alert(
        `⛔ Insufficient Stock! You requested to sell ${qtyNum} but we only have ${maxStock} units of "${activeItem.plantName} (${activeItem.plantSize})" available.`
      );
      return;
    }

    // Trigger the parent transaction (reduces inventory and appends to state)
    const newRecord = onAddSale({
      saleDate,
      customerName: customerName.trim(),
      plantName: activeItem.plantName,
      plantSize: activeItem.plantSize,
      quantitySold: qtyNum,
      sellingPrice: unitPrice,
      totalSaleValue: qtyNum * unitPrice,
    });

    // Populate state for the generated PDF Invoice popover
    setLatestSale(newRecord);
    setShowInvoiceModal(true);

    // Reset Form
    setSelectedPlantId("");
    setQuantitySold("");
    setCustomerName("");
  };

  // Generate jsPDF and download clientside with elegant editorial styling
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

      // Editorial Aesthetic color palette
      const primaryGreen = [90, 90, 64]; // #5A5A40
      const accentGreen = [163, 177, 138]; // #A3B18A
      const darkColor = [61, 43, 31]; // #3D2B1F

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
      doc.text("GSTIN: 29DEFDK1010N1ZS (Example)", 12, 31);

      // Horiz rule
      doc.setDrawColor(215, 215, 200);
      doc.line(12, 35, 136, 35);

      // Sales Receipt Summary Header
      doc.setFillColor(245, 245, 240);
      doc.rect(12, 39, 124, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text("SALES TAX INVOICE - CASH MEMO", 15, 44);

      // Meta Data
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(`Receipt Code: ${sale.invoiceNumber}`, 15, 53);
      doc.text(`Date of Sale: ${sale.saleDate}`, 15, 58);
      doc.text(`Buyer Name: ${sale.customerName}`, 15, 63);

      doc.line(12, 68, 136, 68);

      // Grid titles
      doc.setFont("helvetica", "bold");
      doc.text("Description & Size", 15, 74);
      doc.text("Quantity", 80, 74, { align: "right" });
      doc.text("Rate (Rs)", 105, 74, { align: "right" });
      doc.text("Amount (Rs)", 135, 74, { align: "right" });

      doc.line(12, 78, 136, 78);

      // Grid Rows
      doc.setFont("helvetica", "normal");
      const desc = `${sale.plantName} (${sale.plantSize})`;
      doc.text(desc, 15, 85);
      doc.text(sale.quantitySold.toString(), 80, 85, { align: "right" });
      doc.text(`${sale.sellingPrice.toFixed(2)}`, 105, 85, { align: "right" });
      doc.text(`${sale.totalSaleValue.toFixed(2)}`, 135, 85, { align: "right" });

      doc.line(12, 92, 136, 92);

      // Bottom sums table
      doc.setFont("helvetica", "bold");
      doc.text("Sub-total:", 95, 100, { align: "right" });
      doc.text(`${sale.totalSaleValue.toFixed(2)}`, 135, 100, { align: "right" });

      doc.text("Total Paid:", 95, 106, { align: "right" });
      doc.text(`Rs ${sale.totalSaleValue.toLocaleString("en-IN")}.00`, 135, 106, { align: "right" });

      // Greeting
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.text("🌱 Thank you for choosing green! Let earth blossom.", 74, 135, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 130);
      doc.text("Disclaimer: No manual stock changes needed. System records auto-reconcile stock.", 74, 141, { align: "center" });

      doc.save(`Devakusuma_Invoice_${sale.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Error printing PDF: " + err);
    }
  };

  // Build WhatsApp share string
  const handleWhatsAppShare = (sale: SalesRecord) => {
    const messageText = `*Devakusuma Nursery Gardens - Receipt Master*\n\n🌿 *Invoice:* ${sale.invoiceNumber}\n📅 *Date:* ${sale.saleDate}\n👤 *Buyer:* ${sale.customerName}\n\n*Item details:*\n🌱 ${sale.plantName} (${sale.plantSize})\n🔢 *Quantity:* ${sale.quantitySold} units\n💲 *Rate per Unit:* ₹${sale.sellingPrice}\n\n━━━━━━━━━━━━━━━\n💰 *Total Paid:* *₹${sale.totalSaleValue}*\n━━━━━━━━━━━━━━━\n _Thank you for buying from Devakusuma Nursery Gardens!_`;
    const encoded = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
  };

  const handlePrint = () => {
    window.print();
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
              Record nursery retail sales. The system will auto-reduce counts and block orders if stock is depleted.
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
                Your current active operator role is view-only. Only Owners, Stalwarts, and Head - Managers can create active sales checkouts and print customer bills.
              </p>
            </div>
          </div>
        ) : (
          <form
            id="form-record-sale"
            onSubmit={handleSaleSubmit}
            className="bg-white p-6 md:p-8 border border-editorial-primary/10 rounded-2xl shadow-sm space-y-6"
          >
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Select Plant Item</label>
                <select
                  id="sale-plant-select"
                  required
                  value={selectedPlantId}
                  onChange={(e) => {
                    setSelectedPlantId(e.target.value);
                    setQuantitySold(""); // Clear to empty when a plant is selected
                  }}
                  className="w-full text-xs font-serif bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                >
                  <option value="">-- Choose from Available In-Stock Plants --</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.plantName} ({item.plantSize}) - ₹{item.sellingPrice}/ea [Stock: {item.quantityAvailable}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Quantity to Sell</label>
                <input
                  id="sale-qty"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="e.g., 1"
                  value={quantitySold}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d+$/.test(val)) {
                      setQuantitySold(val);
                    }
                  }}
                  className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                  disabled={!selectedPlantId}
                />
              </div>
            </div>

            {/* Pricing indicators */}
            {activeItem && (
              <div className="bg-editorial-bg border border-editorial-primary/10 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-editorial-primary font-serif italic">Unit Selling Price:</span>
                  <span className="font-mono text-editorial-dark font-semibold">₹{unitPrice} per plant</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-editorial-primary font-serif italic">Quantity Checking:</span>
                  <span className="font-mono text-editorial-dark font-semibold">
                    {maxStock} plants available
                  </span>
                </div>
                <div className="border-t border-editorial-primary/10 pt-3 flex justify-between items-center text-base font-bold text-editorial-dark">
                  <span className="font-serif">Total Sale Bill Amount:</span>
                  <span className="font-mono tracking-tight text-lg underline underline-offset-4 decoration-editorial-accent">₹{computedTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            {/* Invalid high quantity notification */}
            {activeItem && Number(quantitySold || 0) > maxStock && (
              <div className="bg-red-50 border border-red-200/40 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700" />
                <div className="text-xs font-medium space-y-1">
                  <p className="font-sans font-bold uppercase tracking-wider text-[10px]">Blocked: Low Stock Warning</p>
                  <p className="font-serif italic leading-relaxed">
                    You cannot checkout. Client requests <strong>{quantitySold}</strong> but only <strong>{maxStock}</strong> units of <strong>{activeItem.plantName} ({activeItem.plantSize})</strong> exist in our stock records.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                id="confirm-sale-btn"
                disabled={!selectedPlantId || Number(quantitySold || 0) > maxStock || Number(quantitySold || 0) === 0}
                className={`w-full py-3.5 px-4 rounded-full font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  !selectedPlantId || Number(quantitySold || 0) > maxStock || Number(quantitySold || 0) === 0
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
              No sales logged yet. Complete botanical transactions first.
            </p>
          ) : (
            [...sales].reverse().slice(0, 15).map((sal) => (
              <div
                key={sal.id}
                className="py-4 first:pt-0 last:pb-0 space-y-2 hover:bg-editorial-primary/5 cursor-pointer rounded-lg px-2 -mx-2 transition"
                onClick={() => {
                  setLatestSale(sal);
                  setShowInvoiceModal(true);
                }}
                title="Review Invoice"
              >
                <div className="flex justify-between items-start border-b border-editorial-primary/5 pb-1.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[13px] font-serif font-bold text-editorial-dark truncate">{sal.plantName}</h4>
                    <p className="text-[10px] text-editorial-primary/70 font-sans tracking-wide truncate">Customer: {sal.customerName}</p>
                  </div>
                  <span className="text-[9px] text-editorial-primary/50 font-mono whitespace-nowrap shrink-0">{sal.invoiceNumber}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-editorial-primary bg-editorial-bg border border-editorial-primary/5 p-2 rounded-lg">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Size</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">{sal.plantSize}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Qty</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">{sal.quantitySold}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Rate</span>
                    <span className="font-semibold text-editorial-dark text-[11px]">₹{sal.sellingPrice}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] uppercase tracking-wider text-editorial-primary/60">Total Bill</span>
                    <span className="font-bold text-editorial-dark text-[11px]">₹{sal.totalSaleValue}</span>
                  </div>
                </div>
              </div>
            ))
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
                <span className="font-sans uppercase tracking-wider text-xs font-bold">Transaction Confirmed</span>
              </div>
              <button
                id="btn-close-invoice"
                onClick={() => setShowInvoiceModal(false)}
                className="hover:bg-editorial-dark/40 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Visual Paper Invoice Slip */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-4 text-editorial-dark bg-[#FAFAF8] font-sans border-b border-editorial-primary/5">
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

              {/* Items grid */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between font-sans font-bold text-editorial-primary/80 text-[9px] uppercase tracking-wider">
                  <span>Botanical Species & Size</span>
                  <span className="text-right">Line Total</span>
                </div>
                <div className="flex justify-between items-start font-mono text-editorial-dark">
                  <div>
                    <p className="font-serif font-bold text-[13px]">{latestSale.plantName}</p>
                    <p className="text-[10px] text-editorial-primary/70 mt-0.5">Size: {latestSale.plantSize} &bull; {latestSale.quantitySold} x ₹{latestSale.sellingPrice}</p>
                  </div>
                  <span className="font-bold text-[13px] text-editorial-dark">₹{latestSale.totalSaleValue}</span>
                </div>
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
            </div>

            {/* Action buttons inside paper popup */}
            <div className="p-5 bg-white border-t border-editorial-primary/10 flex flex-col gap-3.5 shrink-0">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
