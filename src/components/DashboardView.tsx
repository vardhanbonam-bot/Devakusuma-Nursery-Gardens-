import React, { useState } from "react";
import { InventoryItem, PurchaseRecord, SalesRecord } from "../types";
import { PLANT_PEAK_SEASONS } from "../sampleData";
import { TrendingUp, AlertTriangle, Activity, Award, Calendar, Trees, BarChart2, Lightbulb } from "lucide-react";

interface DashboardViewProps {
  inventory: InventoryItem[];
  purchases: PurchaseRecord[];
  sales: SalesRecord[];
}

export default function DashboardView({ inventory, purchases, sales }: DashboardViewProps) {
  // Simple simulation day control for demo preview consistency
  const [targetDateStr, setTargetDateStr] = useState("2026-06-11");

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

    return { revenueToday, revenueWeek, revenueMonth, revenueYear };
  };

  const { revenueToday, revenueWeek, revenueMonth, revenueYear } = getDashboardMetrics();

  // 1. Calculate Best Sellers by Qty & Revenue
  const plantSummaries: { [key: string]: { qty: number; rev: number } } = {};
  sales.forEach((s) => {
    const key = `${s.plantName} (${s.plantSize})`;
    if (!plantSummaries[key]) {
      plantSummaries[key] = { qty: 0, rev: 0 };
    }
    plantSummaries[key].qty += s.quantitySold;
    plantSummaries[key].rev += s.totalSaleValue;
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
    plantSalesQty[s.plantName] = (plantSalesQty[s.plantName] || 0) + s.quantitySold;
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
    const peakSeason = PLANT_PEAK_SEASONS[s.plantName];
    if (peakSeason) {
      if (peakSeason.includes("Summer")) seasonStats["Summer"] += s.totalSaleValue;
      if (peakSeason.includes("Monsoon")) seasonStats["Monsoon"] += s.totalSaleValue;
      if (peakSeason.includes("Winter")) seasonStats["Winter"] += s.totalSaleValue;
      if (peakSeason.includes("Spring")) seasonStats["Spring"] += s.totalSaleValue;
    }
  });

  const lowStockItems = inventory.filter((i) => i.quantityAvailable <= 5);

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
            Target Analytics Date
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
              Depleted / Low Stock Warnings (≤ 5)
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
    </div>
  );
}
