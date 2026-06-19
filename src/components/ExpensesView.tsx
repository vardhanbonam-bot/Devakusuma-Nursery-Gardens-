import React, { useState, useMemo } from "react";
import { ExpenseRecord, ExpenseCategory } from "../types";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Calendar, 
  User, 
  CreditCard, 
  PlusCircle, 
  Filter, 
  Tag, 
  Check, 
  X, 
  TrendingDown, 
  Layers,
  Banknote,
  PiggyBank
} from "lucide-react";

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  onAddExpense: (expense: Omit<ExpenseRecord, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (categoryName: string) => void;
  isReadOnly?: boolean;
}

export default function ExpensesView({
  expenses,
  categories,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  isReadOnly = false,
}: ExpensesViewProps) {
  // Local form states
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Soil & growing medium");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidTo, setPaidTo] = useState("");

  // Custom Category prompt state
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  // Main UI / Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterPaymentMode, setFilterPaymentMode] = useState("All");
  const [filterTimeframe, setFilterTimeframe] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Edit Expense modal state
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  // Default hardcoded categories for backup, combined with Firestore-saved custom categories
  const defaultCategories = useMemo(() => [
    "Soil & growing medium",
    "Labour wages",
    "Electricity",
    "Fertilizers & pesticides",
    "Pots & bags",
    "Plant maintenance",
    "Transportation",
    "Rent",
    "Miscellaneous"
  ], []);

  // Merge default categories with custom database categories, unique by name
  const allCategoriesList = useMemo(() => {
    const list = [...defaultCategories];
    categories.forEach(cat => {
      if (cat.name && !list.some(item => item.toLowerCase() === cat.name.toLowerCase())) {
        list.push(cat.name);
      }
    });
    return list;
  }, [categories, defaultCategories]);

  // Handle addition of custom category
  const handleAddNewCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCategoryName.trim();
    if (!trimmed) return;

    if (allCategoriesList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      alert("This category already exists.");
      return;
    }

    onAddCategory(trimmed);
    setCategory(trimmed);
    setCustomCategoryName("");
    setShowCustomCategoryInput(false);
  };

  // Main Submit handler (Add Expense Record)
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid expense amount greater than 0.");
      return;
    }

    onAddExpense({
      date,
      category,
      description: description.trim(),
      amount: parsedAmount,
      paymentMode,
      paidTo: paidTo.trim(),
    });

    // Reset fields
    setDescription("");
    setAmount("");
    setPaidTo("");
    alert("Expense added successfully!");
  };

  // Main Submit handler (Update Expense)
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const parsedAmount = parseFloat(String(editingExpense.amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Please enter a valid expense amount greater than 0.");
      return;
    }

    onUpdateExpense({
      ...editingExpense,
      amount: parsedAmount,
      updatedAt: new Date().toISOString(),
    });

    setEditingExpense(null);
    alert("Expense updated successfully!");
  };

  // Helper formatting currency
  const formatRupees = (val: number) => {
    return "₹" + val.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  // Calculate Metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date();
    
    // Last 7 days Boundary 
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const currMonth = today.getMonth();
    const currYear = today.getFullYear();

    let spentToday = 0;
    let spentWeek = 0;
    let spentMonth = 0;
    let spentYear = 0;

    expenses.forEach((item) => {
      const expAmt = Number(item.amount || 0);
      const expDateObj = new Date(item.date);

      // Today
      if (item.date === todayStr) {
        spentToday += expAmt;
      }

      // Week (Last 7 days relative to today)
      if (expDateObj >= sevenDaysAgo && expDateObj <= today) {
        spentWeek += expAmt;
      }

      // Month
      if (expDateObj.getMonth() === currMonth && expDateObj.getFullYear() === currYear) {
        spentMonth += expAmt;
      }

      // Year
      if (expDateObj.getFullYear() === currYear) {
        spentYear += expAmt;
      }
    });

    return { spentToday, spentWeek, spentMonth, spentYear };
  }, [expenses]);

  // Compute filtered expenses, sorted by date descending (and then createdAt secondary)
  const filteredExpenses = useMemo(() => {
    let list = [...expenses];

    // Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.paidTo && item.paidTo.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (filterCategory !== "All") {
      list = list.filter(item => item.category === filterCategory);
    }

    // Payment Mode Filter
    if (filterPaymentMode !== "All") {
      list = list.filter(item => item.paymentMode === filterPaymentMode);
    }

    // Timeframe Filter
    if (filterTimeframe !== "all") {
      const todayStr = new Date().toISOString().split("T")[0];
      const today = new Date();
      
      if (filterTimeframe === "today") {
        list = list.filter(item => item.date === todayStr);
      } else if (filterTimeframe === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        list = list.filter(item => {
          const expDateObj = new Date(item.date);
          return expDateObj >= sevenDaysAgo && expDateObj <= today;
        });
      } else if (filterTimeframe === "month") {
        const currMonth = today.getMonth();
        const currYear = today.getFullYear();
        list = list.filter(item => {
          const expDateObj = new Date(item.date);
          return expDateObj.getMonth() === currMonth && expDateObj.getFullYear() === currYear;
        });
      } else if (filterTimeframe === "year") {
        const currYear = today.getFullYear();
        list = list.filter(item => {
          const expDateObj = new Date(item.date);
          return expDateObj.getFullYear() === currYear;
        });
      } else if (filterTimeframe === "custom" && customStartDate) {
        list = list.filter(item => {
          if (customEndDate) {
            return item.date >= customStartDate && item.date <= customEndDate;
          }
          return item.date >= customStartDate;
        });
      }
    }

    // Return sorted descending
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, searchQuery, filterCategory, filterPaymentMode, filterTimeframe, customStartDate, customEndDate]);

  // Aggregate Category breakdown data for visual progress metrics chart
  const categoryChartData = useMemo(() => {
    const map: { [key: string]: number } = {};
    
    // Initialize map of filtered list
    filteredExpenses.forEach(item => {
      map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
    });

    const totalFiltered = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalFiltered > 0 ? (value / totalFiltered) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Total filtered expense summary
  const totalFilteredSum = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-8" id="expenses-module">
      {/* 1. Header Banner & Big Indicators */}
      <div className="border border-editorial-primary/10 bg-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans uppercase tracking-[0.2em] font-semibold text-editorial-primary">
              Financial ledger
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-editorial-accent"></span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-primary/70">
              Outflow Tracker
            </span>
          </div>
          <h2 className="text-3xl font-serif font-semibold text-editorial-dark tracking-tight">
            Nursery Business Expenses
          </h2>
          <p className="text-sm text-editorial-primary/80 max-w-2xl font-serif italic">
            A secure standalone ledger to record material, payroll, utility, and maintenance spending, separated from retail revenues.
          </p>
        </div>
      </div>

      {/* 2. Top Expenses Info Scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="expenses-scoreboard">
        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs hover:border-editorial-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500">Today's Cost</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl md:text-2xl font-sans font-extrabold mt-3 text-editorial-dark">
            {formatRupees(metrics.spentToday)}
          </p>
          <span className="text-[9px] font-sans uppercase tracking-widest text-stone-400 block mt-1">Live tracking</span>
        </div>

        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs hover:border-editorial-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500">This Week</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl md:text-2xl font-sans font-extrabold mt-3 text-editorial-dark">
            {formatRupees(metrics.spentWeek)}
          </p>
          <span className="text-[9px] font-sans uppercase tracking-widest text-stone-400 block mt-1">Last 7 days rolling</span>
        </div>

        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs hover:border-editorial-primary/20 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500">This Month</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl md:text-2xl font-sans font-extrabold mt-3 text-editorial-dark">
            {formatRupees(metrics.spentMonth)}
          </p>
          <span className="text-[9px] font-sans uppercase tracking-widest text-stone-400 block mt-1">Current calendar month</span>
        </div>

        <div className="bg-white border border-editorial-primary/10 rounded-2xl p-5 shadow-xs hover:border-editorial-primary/20 transition-all relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 pointer-events-none translate-x-5 translate-y-5 opacity-5">
            <PiggyBank className="w-24 h-24 text-editorial-primary" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-stone-500">Yearly Ledger</span>
            <TrendingDown className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-xl md:text-2xl font-sans font-extrabold mt-3 text-editorial-dark">
            {formatRupees(metrics.spentYear)}
          </p>
          <span className="text-[9px] font-sans uppercase tracking-widest text-[#D4AF37] block mt-1 font-bold">Annual Accumulate</span>
        </div>
      </div>

      {/* 3. Columns: Form & Custom Categories (Left) vs Category Breakdown Visuals (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Ledger Addition Form */}
        <div className="lg:col-span-2 space-y-6">
          {isReadOnly ? (
            <div className="bg-stone-50 border border-stone-200 p-8 rounded-2xl shadow-xs text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-[15px] font-bold text-stone-800">Expense Recording Disabled</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed font-serif italic">
                Your current active operator role is view-only. Only Owners, Stalwarts, and Head - Managers are authorized to post ledger expenses.
              </p>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 border border-editorial-primary/10 rounded-2xl shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif text-lg font-bold text-editorial-dark">Record New Expenditure</h3>
                <span className="text-[10px] font-mono text-stone-400 font-semibold">Ledger form v1.0</span>
              </div>

              {/* Toggle new category input or general expense form */}
              {showCustomCategoryInput ? (
                <form onSubmit={handleAddNewCategorySubmit} className="bg-stone-50 p-4 border border-editorial-primary/15 rounded-xl space-y-4">
                  <div className="flex items-center gap-1.5 text-xs text-editorial-dark font-bold font-sans uppercase tracking-wider">
                    <PlusCircle className="w-4 h-4 text-editorial-primary" />
                    <span>Create Custom Category</span>
                  </div>
                  <p className="text-xs text-stone-500 font-serif italic">
                    Type a new financial expense category. It will persist in Firestore for later reuse.
                  </p>
                  <div className="space-y-1.5">
                    <input
                      required
                      type="text"
                      placeholder="e.g. Nursery Nursery Bags, Greenhouse Nets"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full text-xs font-mono bg-white border border-editorial-primary/15 rounded-lg p-3 text-editorial-dark focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowCustomCategoryInput(false)}
                      className="px-3 py-2 rounded-lg border border-stone-200 text-stone-600 font-bold hover:bg-stone-100 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-editorial-primary hover:bg-editorial-dark text-white rounded-lg font-bold transition cursor-pointer"
                    >
                      Save Category
                    </button>
                  </div>
                </form>
              ) : null}

              {!showCustomCategoryInput && (
                <form onSubmit={handleSubmitExpense} className="space-y-5" id="add-expense-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Date picker */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Expense Date *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-editorial-primary/40" />
                        <input
                          type="date"
                          required
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Expense Category Dropdown */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Expense Category *</label>
                        <button
                          type="button"
                          onClick={() => setShowCustomCategoryInput(true)}
                          className="text-[10px] font-sans font-extrabold text-editorial-primary hover:underline hover:text-editorial-dark flex items-center gap-0.5 cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Custom Category</span>
                        </button>
                      </div>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                      >
                        {allCategoriesList.map((catName) => (
                          <option key={catName} value={catName}>
                            {catName}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Amount field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Amount Spent (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-xs text-editorial-primary/50 font-bold">₹</span>
                        <input
                          required
                          type="text"
                          inputMode="decimal"
                          placeholder="e.g. 5000"
                          value={amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^\d*\.?\d*$/.test(val)) {
                              setAmount(val);
                            }
                          }}
                          className="w-full text-xs font-mono font-bold bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-8 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Payment mode select dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Payment Mode *</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                        className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI (PhonePe, GPay, Paytm)</option>
                        <option value="Bank transfer">Bank transfer (NEFT, IMPS)</option>
                        <option value="Other">Other Mode</option>
                      </select>
                    </div>

                  </div>

                  {/* Optional Paid To & Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Paid To (vendor Name) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Paid To (Vendor / Person)</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-editorial-primary/40" />
                        <input
                          type="text"
                          placeholder="e.g. Gowthami Soils Wholesale"
                          value={paidTo}
                          onChange={(e) => setPaidTo(e.target.value)}
                          className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg pl-10 pr-3 py-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Description / Ledger Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Bought 15 cubic meters Red soil mix"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                      />
                    </div>

                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-editorial-primary hover:bg-editorial-dark text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-full transition flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md font-sans"
                    >
                      <Plus className="w-4 h-4" />
                      Add Expense Entry
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Budget Consumed Statistics & Visual Chart */}
        <div className="space-y-6">
          <div className="bg-white border border-editorial-primary/10 rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col h-full min-h-[380px]">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Banknote className="w-16 h-16 text-editorial-primary" />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-sans font-extrabold uppercase text-stone-500 tracking-wider">Budget Allocation</h3>
              <p className="text-xs text-stone-400 font-serif italic border-b border-light pb-2">Category spending of modern listings</p>
            </div>

            {/* Total Filtered summation display */}
            <div className="mt-4 bg-stone-50 border border-editorial-primary/5 p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-stone-400 font-serif">Filtered sum total</span>
                <span className="font-sans font-extrabold text-editorial-dark text-lg">{formatRupees(totalFilteredSum)}</span>
              </div>
              <span className="text-[9px] font-mono text-stone-400 uppercase tracking-widest font-semibold bg-white px-2 py-1 border border-stone-200 rounded-md shadow-xs">
                {filteredExpenses.length} Records
              </span>
            </div>

            {/* Simple Visual horizontal list progress bar charts */}
            <div className="mt-5 space-y-4 flex-1">
              {categoryChartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-stone-400 font-serif italic text-xs">
                  <p>No records fit current filters.</p>
                  <p className="text-[10px] text-stone-300 mt-1">Please adjust filter parameters or add records.</p>
                </div>
              ) : (
                categoryChartData.slice(0, 7).map((cat, idx) => (
                  <div key={idx} className="space-y-1.5 text-editorial-dark">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-sans font-bold text-[11px] text-stone-700 truncate max-w-[170px] flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(140, 15%, ${40 + (idx * 6)}%)` }} />
                        {cat.name}
                      </span>
                      <span className="font-mono text-stone-500 text-[10px]">
                        <strong>{formatRupees(cat.value)}</strong> ({cat.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Visual flat bar container */}
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: `hsl(140, 15%, ${35 + (idx * 6)}%)`
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {categoryChartData.length > 7 && (
              <p className="text-[9px] font-sans uppercase tracking-[0.12em] text-center text-stone-400 italic mt-3 pt-2 border-t border-stone-100">
                + {categoryChartData.length - 7} other spent types hidden above
              </p>
            )}
          </div>
        </div>

      </div>

      {/* 4. EXPENSE ENTRIES LIST & SEARCH + FILTER VIEW PANEL */}
      <div className="bg-white border border-editorial-primary/10 rounded-2xl shadow-sm overflow-hidden" id="expenses-ledger-list">
        
        {/* Top filter section */}
        <div className="p-5 md:p-6 bg-stone-50/60 border-b border-light flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search inputs */}
            <div className="relative min-w-[200px] md:min-w-[260px] flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-editorial-primary/40" />
              <input
                type="text"
                placeholder="Search description or recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none"
              />
            </div>

            {/* Category dropdown filters */}
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2.5 outline-none font-semibold text-editorial-dark"
              >
                <option value="All">All Categories</option>
                {allCategoriesList.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Mode dropdown filter */}
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                className="text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2.5 outline-none font-semibold text-editorial-dark"
              >
                <option value="All">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank transfer">Bank transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {/* Timeframe choices */}
            <div className="inline-flex rounded-lg border border-editorial-primary/10 bg-white p-1 gap-1">
              {[
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "week", label: "Weekly" },
                { id: "month", label: "Monthly" },
                { id: "year", label: "Yearly" },
                { id: "custom", label: "Custom" }
              ].map((time) => (
                <button
                  key={time.id}
                  onClick={() => setFilterTimeframe(time.id as any)}
                  className={`text-[10px] font-sans font-bold uppercase px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    filterTimeframe === time.id
                      ? "bg-editorial-primary text-white"
                      : "text-stone-500 hover:bg-stone-100"
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Custom date range selectors if Custom selected */}
        {filterTimeframe === "custom" && (
          <div className="p-4 bg-stone-100 border-b border-light flex flex-wrap items-center gap-4 text-xs font-sans text-stone-600 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span>Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-stone-200 rounded p-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-stone-200 rounded p-1.5 text-xs font-mono focus:outline-none"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }}
                className="text-[10px] uppercase font-bold text-red-600 hover:underline hover:text-red-800 flex items-center gap-0.5 cursor-pointer ml-auto"
              >
                Clear Range
              </button>
            )}
          </div>
        )}

        {/* Grid-based list or spreadsheet view of the database ledger lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-editorial-dark" id="expenses-table">
            <thead>
              <tr className="border-b border-editorial-primary/10 bg-stone-50/40 text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                <th className="py-4 px-6">Expense Date</th>
                <th className="py-4 px-6">Category Classification</th>
                <th className="py-4 px-6">Ledger Details</th>
                <th className="py-4 px-6">Paid To</th>
                <th className="py-4 px-6">Mode</th>
                <th className="py-4 px-6 text-right">Amount Outflow</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editorial-primary/5 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-stone-400 italic font-serif">
                    No expense items registered yet matching current parameters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr 
                    key={exp.id} 
                    className="hover:bg-editorial-primary/[0.01] transition-all"
                  >
                    {/* Date */}
                    <td className="py-4 px-6 font-mono text-[11px] shrink-0 whitespace-nowrap">
                      {exp.date}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-6 shrink-0 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider bg-editorial-accent/10 text-editorial-primary border border-editorial-accent/15">
                        {exp.category}
                      </span>
                    </td>

                    {/* Details Description */}
                    <td className="py-4 px-6 font-serif italic text-stone-600">
                      {exp.description || <span className="text-stone-300 font-sans not-italic text-[10px] uppercase">No notes added</span>}
                    </td>

                    {/* Recipient */}
                    <td className="py-4 px-6 font-sans font-semibold text-stone-700">
                      {exp.paidTo || <span className="text-stone-300 font-sans font-normal text-[10px] uppercase">&bull;&bull;&bull;</span>}
                    </td>

                    {/* Mode tag */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider ${
                        exp.paymentMode === "Cash" ? "text-emerald-700 font-extrabold" :
                        exp.paymentMode === "UPI" ? "text-violet-700" :
                        exp.paymentMode === "Bank transfer" ? "text-blue-700" : "text-stone-600"
                      }`}>
                        {exp.paymentMode}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 text-right font-sans font-extrabold text-[13px] text-editorial-dark whitespace-nowrap">
                      {formatRupees(exp.amount)}
                    </td>

                    {/* Edit Delete trigger buttons */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingExpense(exp)}
                          disabled={isReadOnly}
                          className="p-1 px-1.5 rounded border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-editorial-primary text-stone-600 hover:text-editorial-primary transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                          title="Modify Ledger Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the expense of ${formatRupees(exp.amount)} from ${exp.date}?`)) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          disabled={isReadOnly}
                          className="p-1 px-1.5 rounded border border-stone-200 bg-stone-50 hover:bg-red-50 hover:border-red-500 text-stone-600 hover:text-red-700 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                          title="Erase Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Foot table details count */}
        <div className="p-4 bg-stone-50 border-t border-light text-[10px] font-mono text-stone-400 font-semibold uppercase flex justify-between">
          <span>Active Session Data stream</span>
          <span>Filtered Count: {filteredExpenses.length} entries</span>
        </div>

      </div>

      {/* 5. MODAL WINDOW: EDIT RECORD FORM */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-dark/60 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg bg-white border border-editorial-primary/15 rounded-3xl p-6 md:p-8 shadow-xl text-editorial-dark">
            
            <div className="flex justify-between items-center border-b border-stone-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-editorial-primary animate-pulse" />
                <h3 className="text-lg font-serif font-bold">
                  Edit Expense Line
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Category *</label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none focus:bg-white"
                  >
                    {allCategoriesList.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Amount (₹) *</label>
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    value={editingExpense.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*\.?\d*$/.test(val)) {
                        setEditingExpense({ ...editingExpense, amount: val as any });
                      }
                    }}
                    className="w-full text-xs font-mono font-bold bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Payment Mode */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Payment Mode *</label>
                  <select
                    value={editingExpense.paymentMode}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMode: e.target.value })}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none focus:bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank transfer">Bank transfer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* Paid To */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Paid To</label>
                  <input
                    type="text"
                    value={editingExpense.paidTo}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paidTo: e.target.value })}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Description Details</label>
                  <input
                    type="text"
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none"
                  />
                </div>

              </div>

              <div className="mt-6 flex gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl border border-stone-200 bg-stone-150 hover:bg-stone-200 text-stone-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-[10px] uppercase tracking-wider font-sans font-bold rounded-xl bg-editorial-primary hover:bg-editorial-dark text-white transition cursor-pointer shadow-xs"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
