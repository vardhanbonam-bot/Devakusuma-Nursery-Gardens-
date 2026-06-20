import React, { useState } from "react";
import { InventoryItem, PurchaseRecord, SalesRecord, ExpenseRecord } from "../types";
import { PLANT_PEAK_SEASONS } from "../sampleData";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Award,
  Calendar,
  Trees,
  BarChart2,
  Lightbulb,
  Search,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CheckCircle,
  Save,
  Banknote
} from "lucide-react";

interface DashboardViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  sales: SalesRecord[];
  expenses?: ExpenseRecord[];
  onDeleteSale?: (saleId: string) => void;
  onUpdateSale?: (sale: SalesRecord) => void;
  onDeletePurchase?: (purchaseId: string) => void;
  onUpdatePurchase?: (purchase: PurchaseRecord) => void;
  isReadOnly?: boolean;
}

export default function DashboardView({
  inventory,
  purchases,
  sales,
  expenses = [],
  onDeleteSale,
  onUpdateSale,
  onDeletePurchase,
  onUpdatePurchase,
  isReadOnly = false
}: DashboardViewProps) {
  // Fix Today's Revenue Glitch: default target date to the actual current system date dynamically!
  const [targetDateStr, setTargetDateStr] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Recent Transactions filtering and search states
  const [txFilter, setTxFilter] = useState<"all" | "sale" | "purchase" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editing state
  const [editingTx, setEditingTx] = useState<{
    id: string;
    type: "sale" | "purchase" | "expense";
    date: string;
    personName: string; // customerName or supplierName
    quantity: number;
    price: number;
    plantName: string;
    plantSize: string;
  } | null>(null);

  // Deleting state
  const [deletingTx, setDeletingTx] = useState<{
    id: string;
    type: "sale" | "purchase" | "expense";
    description: string;
  } | null>(null);

  // Helper date parsing
  const getDashboardMetrics = () => {
    const today = new Date(targetDateStr);
    const todayStr = targetDateStr;

    // Last 7 days boundary
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Current month/year
    const currMonth = today.getMonth();
    const currYear = today.getFullYear();

    let revenueToday = 0;
    let revenueWeek = 0;
    let revenueMonth = 0;
    let revenueYear = 0;

    sales.forEach((s) => {
      const saleDateObj = new Date(s.saleDate);
      const val = s.totalSaleValue;

      // Today
      if (s.saleDate === todayStr) {
        revenueToday += val;
      }

      // Week
      if (saleDateObj >= sevenDaysAgo && saleDateObj <= today) {
        revenueWeek += val;
      }

      // Month
      if (saleDateObj.getMonth() === currMonth && saleDateObj.getFullYear() === currYear) {
        revenueMonth += val;
      }

      // Year
      if (saleDateObj.getFullYear() === currYear) {
        revenueYear += val;
      }
    });

    let expensesToday = 0;
    let expensesWeek = 0;
    let expensesMonth = 0;
    let expensesYear = 0;

    expenses.forEach((e) => {
      const expDateObj = new Date(e.date);
      const val = Number(e.amount || 0);

      // Today
      if (e.date === todayStr) {
        expensesToday += val;
      }

      // Week
      if (expDateObj >= sevenDaysAgo && expDateObj <= today) {
        expensesWeek += val;
      }

      // Month
      if (expDateObj.getMonth() === currMonth && expDateObj.getFullYear() === currYear) {
        expensesMonth += val;
      }

      // Year
      if (expDateObj.getFullYear() === currYear) {
        expensesYear += val;
      }
    });

    return { 
      revenueToday, 
      revenueWeek, 
      revenueMonth, 
      revenueYear,
      expensesToday,
      expensesWeek,
      expensesMonth,
      expensesYear
    };
  };

  const { 
    revenueToday, 
    revenueWeek, 
    revenueMonth, 
    revenueYear,
    expensesToday,
    expensesWeek,
    expensesMonth,
    expensesYear
  } = getDashboardMetrics();

  // 1. Calculate Best Sellers by Qty & Revenue
  const plantSummaries: { [key: string]: { qty: number; rev: number } } = {};
  sales.forEach((s) => {
    if (s.items && s.items.length > 0) {
      s.items.forEach((item) => {
        const key = `${item.plantName} (${item.size})`;
        if (!plantSummaries[key]) {
          plantSummaries[key] = { qty: 0, rev: 0 };
        }
        plantSummaries[key].qty += item.quantity;
        plantSummaries[key].rev += item.quantity * item.sellingPrice;
      });
    } else if (s.plantName && s.plantSize && s.quantitySold) {
      const key = `${s.plantName} (${s.plantSize})`;
      if (!plantSummaries[key]) {
        plantSummaries[key] = { qty: 0, rev: 0 };
      }
      plantSummaries[key].qty += s.quantitySold;
      plantSummaries[key].rev += s.totalSaleValue;
    }
  });

  const bestSellersByQty = Object.entries(plantSummaries)
    .map(([key, data]) => {
      const idx = key.lastIndexOf(" (");
      const plantName = idx !== -1 ? key.substring(0, idx) : key;
      const plantSize = idx !== -1 ? key.substring(idx + 2, key.length - 1) : "1 ft";
      return {
        plantName,
        plantSize,
        qty: data.qty,
        rev: data.rev,
        price: data.qty > 0 ? Math.round(data.rev / data.qty) : 0,
      };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 2. Identify Fast-Movers & Slow-Movers
  const fastMovers = bestSellersByQty.slice(0, 3);

  const plantSalesQty: { [key: string]: number } = {};
  sales.forEach((s) => {
    if (s.items && s.items.length > 0) {
      s.items.forEach((item) => {
        plantSalesQty[item.plantName] = (plantSalesQty[item.plantName] || 0) + item.quantity;
      });
    } else if (s.plantName && s.quantitySold) {
      plantSalesQty[s.plantName] = (plantSalesQty[s.plantName] || 0) + s.quantitySold;
    }
  });

  const slowMovers = inventory
    .filter((inv) => inv.quantityAvailable > 0)
    .map((inv) => ({
      plantName: inv.plantName,
      plantSize: inv.plantSize,
      sold: plantSalesQty[inv.plantName] || 0,
      stock: inv.quantityAvailable,
      sellingPrice: inv.sellingPrice,
      totalValue: inv.quantityAvailable * inv.sellingPrice,
    }))
    .sort((a, b) => a.sold - b.sold) // lowest sales first
    .slice(0, 4);

  // 3. Monthly Sales trends (e.g. 2026 data grouped by month)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTotals = Array(12).fill(0);
  sales.forEach((s) => {
    const date = new Date(s.saleDate);
    if (date.getFullYear() === 2026) {
      monthlyTotals[date.getMonth()] += s.totalSaleValue;
    }
  });

  const maxMonthValue = Math.max(...monthlyTotals, 1000);

  // 4. Seasonal Performance Analysis
  const seasonStats: { [key: string]: number } = {
    "Summer": 0,
    "Monsoon": 0,
    "Winter": 0,
    "Spring": 0,
  };

  sales.forEach((s) => {
    if (s.items && s.items.length > 0) {
      s.items.forEach((item) => {
        const peakSeason = PLANT_PEAK_SEASONS[item.plantName];
        if (peakSeason) {
          const val = item.quantity * item.sellingPrice;
          if (peakSeason.includes("Summer")) seasonStats["Summer"] += val;
          if (peakSeason.includes("Monsoon")) seasonStats["Monsoon"] += val;
          if (peakSeason.includes("Winter")) seasonStats["Winter"] += val;
          if (peakSeason.includes("Spring")) seasonStats["Spring"] += val;
        }
      });
    } else if (s.plantName) {
      const peakSeason = PLANT_PEAK_SEASONS[s.plantName];
      if (peakSeason) {
        if (peakSeason.includes("Summer")) seasonStats["Summer"] += s.totalSaleValue;
        if (peakSeason.includes("Monsoon")) seasonStats["Monsoon"] += s.totalSaleValue;
        if (peakSeason.includes("Winter")) seasonStats["Winter"] += s.totalSaleValue;
        if (peakSeason.includes("Spring")) seasonStats["Spring"] += s.totalSaleValue;
      }
    }
  });

  const lowStockItems = inventory.filter((i) => i.quantityAvailable <= 100);

  // Assemble unified recent transactions listing
  const allTransactions = [
    ...sales.flatMap((s) => {
      if (s.items && s.items.length > 0) {
        return s.items.map((item, idx) => ({
          id: `${s.id}-${idx}`,
          saleId: s.id,
          type: "sale" as const,
          date: s.saleDate,
          plantName: item.plantName,
          plantSize: item.size,
          personName: s.customerName,
          quantity: item.quantity,
          price: item.sellingPrice,
          total: item.quantity * item.sellingPrice,
          invoiceOrCode: s.invoiceNumber,
          isMultiItem: true,
        }));
      } else {
        return [{
          id: s.id,
          saleId: s.id,
          type: "sale" as const,
          date: s.saleDate,
          plantName: s.plantName || "Unknown",
          plantSize: s.plantSize || "General",
          personName: s.customerName,
          quantity: s.quantitySold || 0,
          price: s.sellingPrice || 0,
          total: s.totalSaleValue,
          invoiceOrCode: s.invoiceNumber,
          isMultiItem: false,
        }];
      }
    }),
    ...purchases.map((p) => ({
      id: p.id,
      saleId: p.id,
      type: "purchase" as const,
      date: p.purchaseDate,
      plantName: p.plantName,
      plantSize: p.plantSize,
      personName: p.supplierName,
      quantity: p.quantityPurchased,
      price: p.costPerUnit,
      total: p.totalPurchaseCost,
      invoiceOrCode: "SUP-PURCHASE",
      isMultiItem: false,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      date: e.date,
      plantName: `EXPENSE: ${e.category}`,
      plantSize: e.paymentMode,
      personName: e.paidTo || "General",
      quantity: 1,
      price: e.amount,
      total: e.amount,
      invoiceOrCode: e.description || "No description",
    })),
  ].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Filter transactions based on type filter and text search query
  const filteredTransactions = allTransactions.filter((tx) => {
    const matchesFilter = txFilter === "all" || tx.type === txFilter;
    const matchesSearch =
      tx.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.plantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.invoiceOrCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Safe checks for item editing limit boundaries
  const getEditingSaleStockLimit = () => {
    if (!editingTx || editingTx.type !== "sale") return 9999;
    const invItem = inventory.find(
      (item) =>
        item.plantName.toLowerCase() === editingTx.plantName.toLowerCase() &&
        item.plantSize === editingTx.plantSize
    );
    const available = invItem ? invItem.quantityAvailable : 0;
    const originalSale = sales.find((s) => s.id === editingTx.id);
    const originalQty = originalSale ? originalSale.quantitySold : 0;
    return available + originalQty;
  };

  const handleEditSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    if (editingTx.type === "sale") {
      const limit = getEditingSaleStockLimit();
      if (editingTx.quantity > limit) {
        alert(`⛔ Insufficient stock! The maximum allowed sale quantity for this transaction is ${limit} units based on current live inventory.`);
        return;
      }
      onUpdateSale?.({
        id: editingTx.id,
        invoiceNumber: sales.find((s) => s.id === editingTx.id)?.invoiceNumber || "",
        saleDate: editingTx.date,
        customerName: editingTx.personName,
        plantName: editingTx.plantName,
        plantSize: editingTx.plantSize,
        quantitySold: editingTx.quantity,
        sellingPrice: editingTx.price,
        totalSaleValue: editingTx.quantity * editingTx.price
      });
    } else {
      onUpdatePurchase?.({
        id: editingTx.id,
        purchaseDate: editingTx.date,
        supplierName: editingTx.personName,
        plantName: editingTx.plantName,
        plantSize: editingTx.plantSize,
        quantityPurchased: editingTx.quantity,
        costPerUnit: editingTx.price,
        totalPurchaseCost: editingTx.quantity * editingTx.price
      });
    }
    setEditingTx(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingTx) return;
    if (deletingTx.type === "sale") {
      onDeleteSale?.(deletingTx.id);
    } else {
      onDeletePurchase?.(deletingTx.id);
    }
    setDeletingTx(null);
  };

  return (
    <div className="space-y-8" id="dashboard-module">
      {/* Editorial Title / Header Block */}
      <div className="border border-editorial-primary/10 bg-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-editorial-primary">
              Management Portal
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-primary/70">
              Live Stock Ledger
            </span>
          </div>
          <h2 className="text-3xl font-serif font-semibold text-editorial-dark tracking-tight">
            Owner Business Overview
          </h2>
          <p className="text-sm text-editorial-primary/80 max-w-2xl font-serif italic">
            This analytical dashboard aggregates nursery purchase ledgers, retail sale receipts, and crop metrics to monitor cashflow.
          </p>
        </div>

        {/* Target simulation day selector in Editorial Style */}
        <div className="flex flex-col gap-1.5 bg-editorial-bg p-4 rounded-xl border border-editorial-primary/10 select-none">
          <label className="text-[9px] font-sans uppercase tracking-[0.15em] font-bold text-editorial-primary">
            Target Analytics Date (Today)
          </label>
          <input
            type="date"
            value={targetDateStr}
            onChange={(e) => setTargetDateStr(e.target.value)}
            className="text-editorial-dark text-xs bg-white border border-editorial-primary/20 outline-none font-bold rounded-lg p-2 font-mono"
          />
        </div>
      </div>

      {/* Revenue Grid KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white border border-editorial-primary/10 p-6 rounded-2xl shadow-xs transition hover:border-editorial-primary/25">
          <div className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-2">Today's Revenue</div>
          <div className="text-3xl font-serif font-medium text-editorial-dark">₹{revenueToday.toLocaleString("en-IN")}</div>
          <div className="text-[9px] text-editorial-primary/80 font-semibold mt-2.5 flex items-center gap-1 font-sans">
            <TrendingUp className="w-3 h-3 text-editorial-accent" />
            <span>Updated instantly</span>
          </div>
        </div>

        <div className="bg-white border border-editorial-primary/10 p-6 rounded-2xl shadow-xs transition hover:border-editorial-primary/25">
          <div className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-2">Weekly Earnings</div>
          <div className="text-3xl font-serif font-medium text-editorial-dark">₹{revenueWeek.toLocaleString("en-IN")}</div>
          <div className="text-[9px] text-editorial-primary/60 font-mono mt-2.5">Last 7 days from target</div>
        </div>

        <div className="bg-white border border-editorial-primary/10 p-6 rounded-2xl shadow-xs transition hover:border-editorial-primary/25">
          <div className="text-[10px] font-sans uppercase tracking-widest text-editorial-primary/60 font-bold mb-2">Monthly Earnings</div>
          <div className="text-3xl font-serif font-medium text-editorial-dark">₹{revenueMonth.toLocaleString("en-IN")}</div>
          <div className="text-[9px] text-editorial-primary font-medium mt-2.5">
            <span className="bg-editorial-accent/20 text-editorial-dark px-2 py-0.5 rounded-full font-sans text-[9px] uppercase tracking-wider font-semibold">Active Cycle</span>
          </div>
        </div>

        <div className="bg-editorial-primary text-[#F5F5F0] p-6 rounded-2xl shadow-xs flex flex-col justify-between hover:bg-opacity-95 transition">
          <div>
            <div className="text-[10px] font-sans uppercase tracking-widest text-editorial-accent-light/80 font-bold mb-2">Annual Sales (2026)</div>
            <div className="text-3xl font-serif font-medium">₹{revenueYear.toLocaleString("en-IN")}</div>
          </div>
          <span className="text-[9px] text-editorial-accent-light/70 font-mono mt-4 uppercase tracking-[0.1em]">Ledger Totals</span>
        </div>
      </div>

      {/* Standalone Expenses Ledger Summary */}
      <div className="bg-[#FFF5F5] border border-rose-200/40 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-rose-800 text-[10px] font-sans uppercase tracking-[0.1em] font-extrabold">
            <Banknote className="w-4 h-4 text-rose-700" />
            Standalone Business Expenses Ledger
          </div>
          <p className="text-xs text-stone-600 font-serif italic">
            This module operates as a separate pocket purely for tracking costs. It does not affect your core retail revenue numbers.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
          <div className="bg-white border border-rose-200/20 px-4 py-2.5 rounded-xl min-w-[120px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
            <span className="text-[9px] font-sans uppercase tracking-wider text-stone-500 font-semibold block mb-0.5">Today</span>
            <span className="font-mono text-stone-800 text-sm font-bold">₹{expensesToday.toLocaleString("en-IN")}</span>
          </div>
          <div className="bg-white border border-rose-200/20 px-4 py-2.5 rounded-xl min-w-[120px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
            <span className="text-[9px] font-sans uppercase tracking-wider text-stone-500 font-semibold block mb-0.5">This Month</span>
            <span className="font-mono text-stone-800 text-sm font-bold">₹{expensesMonth.toLocaleString("en-IN")}</span>
          </div>
          <div className="bg-white border border-rose-200/20 px-4 py-2.5 rounded-xl min-w-[120px] text-center shadow-[0_1px_2px_rgba(0,0,0,0.025)]">
            <span className="text-[9px] font-sans uppercase tracking-wider text-stone-500 font-semibold block mb-0.5">Annual Cost</span>
            <span className="font-mono text-rose-800 text-sm font-bold">₹{expensesYear.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Middle charts portion (Monthly Trends and Seasonal Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Trends */}
        <div className="bg-white border border-editorial-primary/10 p-6 md:p-8 rounded-2xl shadow-xs lg:col-span-2">
          <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans mb-6 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-editorial-primary" />
            Monthly Sales Revenue Visualizer (2026)
          </h3>
          <div className="h-48 flex items-end justify-between gap-2 pt-4">
            {monthlyTotals.map((val, idx) => {
              const heightPercent = maxMonthValue > 0 ? (val / maxMonthValue) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full relative group">
                    {val > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-editorial-dark text-[#F5F5F0] text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 z-10">
                        ₹{val}
                      </div>
                    )}
                    <div
                      style={{ height: `${heightPercent || 4}%` }}
                      className={`w-full rounded-t-[1px] transition-all duration-300 ${
                        val > 0 ? "bg-editorial-primary hover:bg-editorial-dark" : "bg-stone-100"
                      }`}
                    ></div>
                  </div>
                  <span className="text-[9px] font-mono text-editorial-primary/60 uppercase tracking-widest">{monthNames[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crop Seasonal Performance */}
        <div className="bg-white border border-editorial-primary/10 p-6 md:p-8 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-editorial-primary" />
              Seasonal Crop Inflow
            </h3>
            <p className="text-xs text-editorial-primary/70 mb-5 font-serif italic leading-relaxed">
              Nursery customer demand split by peak harvest seasons.
            </p>
            <div className="space-y-4">
              {Object.entries(seasonStats).map(([season, rev]) => {
                const total = Object.values(seasonStats).reduce((acc, val) => acc + val, 0) || 1;
                const percentage = Math.round((rev / total) * 100);
                return (
                  <div key={season} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-serif font-medium text-editorial-dark">{season} Species</span>
                      <span className="text-editorial-primary/70 font-mono text-[10px]">₹{rev.toLocaleString("en-IN")} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-editorial-bg h-[3px] rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="bg-editorial-primary h-full transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-editorial-bg rounded-xl flex items-start gap-3 border border-editorial-primary/5 select-none">
            <Lightbulb className="w-4 h-4 text-editorial-accent shrink-0 mt-0.5" />
            <p className="text-[11px] text-editorial-primary/80 leading-relaxed font-serif italic">
              <strong>Seasonal Tip:</strong> Plan ahead to double seedlings for high-yield species with short bloom cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section: Low stock alerts & movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white border border-editorial-primary/10 p-6 md:p-8 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between border-b border-editorial-primary/10 pb-4 mb-4">
            <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-700/80" />
              Depleted / Low Stock Warnings (≤ 100)
            </h3>
            <span className="bg-red-50 text-red-700 border border-red-200/40 text-[10px] font-sans uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold">
              {lowStockItems.length} alerts
            </span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-editorial-primary/60 italic text-center py-12 font-serif">
                All plant storage shelves are adequately stocked!
              </p>
            ) : (
              lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-red-50/20 border border-red-150 transition hover:bg-red-50/40 gap-2">
                  <div className="space-y-0.5">
                    <span className="font-serif font-bold text-editorial-dark text-[13px]">{item.plantName}</span>
                    <span className="text-editorial-primary/70 font-mono block text-[10px]">
                      Size: {item.plantSize} &bull; ₹{item.sellingPrice}/ea &bull; Value: ₹{(item.sellingPrice * item.quantityAvailable).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <span className="font-bold text-red-700 bg-red-100/60 px-2 py-1 rounded text-[11px] whitespace-nowrap shrink-0">
                    {item.quantityAvailable} units
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fast & Slow Movers */}
        <div className="bg-white border border-editorial-primary/10 p-6 md:p-8 rounded-2xl shadow-xs space-y-6">
          {/* Fast Moving */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-editorial-primary/60 flex items-center gap-1.5 mb-3">
              <Award className="w-4 h-4 text-editorial-accent" />
              Fast Movers (Best Sellers)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {fastMovers.length === 0 ? (
                <p className="text-xs text-editorial-primary/50 italic font-serif">No sales tracked yet.</p>
              ) : (
                fastMovers.map((m, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-editorial-bg p-3 rounded-xl text-xs hover:bg-editorial-primary/5 transition gap-1.5">
                    <div>
                      <span className="font-serif font-semibold text-editorial-dark">{m.plantName}</span>
                      <span className="text-[10px] text-editorial-primary/70 font-mono block">Size: {m.plantSize} &bull; Avg Rate: ₹{m.price}/ea</span>
                    </div>
                    <span className="text-editorial-primary font-bold font-mono text-[11px] whitespace-nowrap">
                      {m.qty} sold &bull; Sum: ₹{m.rev.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Slow Moving */}
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-editorial-primary/60 flex items-center gap-1.5 mb-3">
              <Activity className="w-4 h-4 text-editorial-primary/50" />
              Slow Movers (Low Sales Activity)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {slowMovers.length === 0 ? (
                <p className="text-xs text-editorial-primary/50 italic font-serif">No catalog entries registered.</p>
              ) : (
                slowMovers.map((m, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-xl text-xs border border-editorial-primary/5 hover:border-editorial-primary/20 transition gap-1.5">
                    <div>
                      <span className="font-serif text-editorial-primary font-medium">{m.plantName}</span>
                      <span className="text-[10px] text-editorial-primary/60 font-mono block">
                        Size: {m.plantSize} &bull; Rate: ₹{m.sellingPrice}/ea &bull; Asset: ₹{m.totalValue.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <span className="text-editorial-primary/70 font-mono text-[10px] whitespace-nowrap font-medium">
                      {m.sold} sold &bull; stock: {m.stock}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Master Recent Transactions Ledger */}
      <div className="bg-white border border-editorial-primary/10 p-6 md:p-8 rounded-2xl shadow-xs" id="transactions-ledger">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-editorial-primary/10 pb-5 mb-6 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm uppercase tracking-wider font-bold text-editorial-dark font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-editorial-primary" />
              Recent Transactions Master Ledger
            </h3>
            <p className="text-xs text-editorial-primary/70 font-serif italic">
              Review, edit figures, or cancel (delete) mistaken receipts which recalculates inventory level automatically.
            </p>
          </div>

          {/* Filters and Search Bar combo */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter buttons */}
            <div className="inline-flex bg-editorial-bg p-1 rounded-xl border border-editorial-primary/10 text-xs font-sans">
              <button
                type="button"
                onClick={() => setTxFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-colors tracking-wider uppercase text-[9px] font-bold ${
                  txFilter === "all" ? "bg-white text-editorial-dark shadow-xs border border-editorial-primary/5" : "text-editorial-primary/70 hover:text-editorial-dark hover:bg-stone-50"
                }`}
              >
                All Receipts
              </button>
              <button
                type="button"
                onClick={() => setTxFilter("sale")}
                className={`px-3 py-1.5 rounded-lg transition-colors tracking-wider uppercase text-[9px] font-bold ${
                  txFilter === "sale" ? "bg-white text-editorial-dark shadow-xs border border-editorial-primary/5" : "text-editorial-primary/70 hover:text-editorial-dark hover:bg-stone-50"
                }`}
              >
                Sales (Out)
              </button>
              <button
                type="button"
                onClick={() => setTxFilter("purchase")}
                className={`px-3 py-1.5 rounded-lg transition-colors tracking-wider uppercase text-[9px] font-bold ${
                  txFilter === "purchase" ? "bg-white text-editorial-dark shadow-xs border border-editorial-primary/5" : "text-editorial-primary/70 hover:text-editorial-dark hover:bg-stone-50"
                }`}
              >
                Purchases (In)
              </button>
              <button
                type="button"
                onClick={() => setTxFilter("expense")}
                className={`px-3 py-1.5 rounded-lg transition-colors tracking-wider uppercase text-[9px] font-bold ${
                  txFilter === "expense" ? "bg-white text-editorial-dark shadow-xs border border-editorial-primary/5" : "text-editorial-primary/70 hover:text-editorial-dark hover:bg-stone-50"
                }`}
              >
                Expenses (Out)
              </button>
            </div>

            {/* Simple Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-editorial-primary/40" />
              <input
                type="text"
                placeholder="Search Buyer, Supplier, Plant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-editorial-bg border border-editorial-primary/10 rounded-xl text-xs outline-none focus:border-editorial-primary/30 w-44 md:w-56"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Ledger table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="border-b border-editorial-primary/5 text-[9px] uppercase tracking-wider text-editorial-primary/60 font-bold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Botanical Description & Size</th>
                <th className="py-3 px-4">Client / Supplier Name</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4 text-right">Unit Rate</th>
                <th className="py-3 px-4 text-right">Total Net</th>
                {!isReadOnly && <th className="py-3 px-4 text-center w-36">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-primary/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-editorial-primary/40 italic font-serif">
                    No matching botanical transactions found in active ledger records.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-editorial-primary/5 transition duration-150 rounded">
                    <td className="py-3.5 px-4 font-mono text-editorial-dark whitespace-nowrap">{tx.date}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {tx.type === "sale" ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-800 border border-green-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                          <ArrowUpRight className="w-3 h-3 text-green-700 font-bold" />
                          Sale Rec
                        </span>
                      ) : tx.type === "purchase" ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                          <ArrowDownLeft className="w-3 h-3 text-amber-800 font-bold" />
                          Purchase
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-900 border border-rose-200/40 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                          <Banknote className="w-3 h-3 text-rose-800 font-bold" />
                          Expense
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-serif font-bold text-editorial-dark text-[13px]">{tx.plantName}</div>
                      <div className="text-[10px] text-editorial-primary/60 font-mono mt-0.5">Size: {tx.plantSize} &bull; {tx.invoiceOrCode}</div>
                    </td>
                    <td className="py-3.5 px-4 font-serif italic text-editorial-dark">{tx.personName}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-editorial-dark">{tx.quantity}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-editorial-primary">₹{tx.price.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-editorial-dark text-[13px]">₹{tx.total.toLocaleString("en-IN")}</td>
                    {!isReadOnly && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {tx.type !== "expense" ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingTx({
                                    id: tx.id,
                                    type: tx.type,
                                    date: tx.date,
                                    personName: tx.personName,
                                    quantity: tx.quantity,
                                    price: tx.price,
                                    plantName: tx.plantName,
                                    plantSize: tx.plantSize,
                                  })
                                }
                                className="p-1 px-2.5 rounded-lg hover:bg-editorial-primary/10 text-editorial-primary transition cursor-pointer flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider bg-editorial-bg border border-editorial-primary/5 hover:border-editorial-primary/15"
                                title="Edit this entry"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeletingTx({
                                    id: tx.id,
                                    type: tx.type,
                                    description: `"${tx.plantName} (${tx.plantSize})" recorded on ${tx.date} for ₹${tx.total}`,
                                  })
                                }
                                className="p-1 px-2.5 rounded-lg hover:bg-red-50 text-red-700 transition cursor-pointer flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider bg-red-50/10 border border-red-200/20"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3 h-3" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-sans uppercase tracking-[0.1em] italic font-bold">
                              Go to Expenses Tab
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL POPUP */}
      {editingTx && (
        <div className="fixed inset-0 bg-editorial-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-editorial-primary/10 overflow-hidden shadow-2xl flex flex-col animate-fadeIn">
            <div className="bg-editorial-primary text-white px-6 py-4 flex items-center justify-between">
              <span className="font-sans uppercase tracking-wider text-xs font-bold flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-editorial-accent-light" />
                Edit {editingTx.type === "sale" ? "Retail Sales Invoice" : "Supplier Procurement"}
              </span>
              <button
                onClick={() => setEditingTx(null)}
                className="hover:bg-editorial-dark/40 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleEditSaveSubmit} className="p-6 md:p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Botanical Product (Type)</label>
                <div className="font-serif font-bold text-editorial-dark bg-editorial-bg p-3 rounded-lg border border-editorial-primary/5">
                  {editingTx.plantName} ({editingTx.plantSize})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">
                    {editingTx.type === "sale" ? "Buyer / Customer" : "Wholesale Supplier"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTx.personName}
                    onChange={(e) => setEditingTx({ ...editingTx, personName: e.target.value })}
                    className="w-full text-xs font-serif bg-editorial-bg border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="flex justify-between">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Quantity</label>
                    {editingTx.type === "sale" && (
                      <span className="text-[9px] text-editorial-accent font-semibold">Max Limit: {getEditingSaleStockLimit()}</span>
                    )}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={editingTx.quantity || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d+$/.test(val)) {
                        setEditingTx({ ...editingTx, quantity: val === "" ? 0 : parseInt(val, 10) });
                      }
                    }}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Price Per Unit (₹)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={editingTx.price || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setEditingTx({ ...editingTx, price: val === "" ? 0 : parseFloat(val) });
                      }
                    }}
                    className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark"
                  />
                </div>
              </div>

              <div className="bg-editorial-bg p-4 rounded-xl border border-editorial-primary/10 flex justify-between items-center">
                <span className="text-xs font-serif italic text-editorial-primary">Recomputed Bill Value:</span>
                <span className="text-lg font-mono font-bold text-editorial-dark">₹{(editingTx.quantity * editingTx.price).toLocaleString("en-IN")}</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-3 px-4 rounded-full font-serif font-bold text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 text-xs transition uppercase tracking-wider"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTx && (
        <div className="fixed inset-0 bg-editorial-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-editorial-primary/10 p-6 space-y-6 shadow-2xl animate-scaleIn">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-[17px] text-stone-800">Cancel & Delete transaction?</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-serif italic">
                You are deleting receipt context for <strong className="text-stone-700">{deletingTx.description}</strong>. Live catalog inventories will adjust to reverse this item automatically. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="flex-1 py-3 rounded-full hover:bg-stone-100 text-stone-500 font-bold font-sans text-xs uppercase tracking-wide border border-stone-200/60"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold font-sans text-xs uppercase tracking-wider"
              >
                Yes, Delete Rec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
