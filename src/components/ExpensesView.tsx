import React, { useState, useMemo, useRef, useEffect } from "react";
import { ExpenseRecord, ExpenseCategory, ExpenseSubcategory } from "../types";
import * as XLSX from "xlsx";
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
  PiggyBank,
  Upload,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface ExpensesViewProps {
  expenses: ExpenseRecord[];
  categories: ExpenseCategory[];
  subcategories: ExpenseSubcategory[];
  onAddExpense: (expense: Omit<ExpenseRecord, "id" | "createdAt" | "updatedAt">) => void;
  onUpdateExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
  onAddCategory: (categoryName: string) => void;
  onAddSubcategory: (categoryName: string, name: string) => void;
  onDeleteSubcategory: (id: string) => void;
  isReadOnly?: boolean;
}

export default function ExpensesView({
  expenses,
  categories,
  subcategories = [],
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddCategory,
  onAddSubcategory,
  onDeleteSubcategory,
  isReadOnly = false,
}: ExpensesViewProps) {
  // Local form states
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Soil & growing medium");
  const [subcategory, setSubcategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidTo, setPaidTo] = useState("");

  // Subcategory management local states
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [manageSubcatCategory, setManageSubcatCategory] = useState("Home");
  const [showSubcategoryManager, setShowSubcategoryManager] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter subcategories matching selected Category
  const filteredSubcategories = useMemo(() => {
    return subcategories.filter(sub => sub.categoryName.toLowerCase() === category.toLowerCase());
  }, [subcategories, category]);

  // Sync subcategory on category change
  useEffect(() => {
    if (filteredSubcategories.length > 0) {
      setSubcategory(filteredSubcategories[0].name);
    } else {
      setSubcategory("");
    }
  }, [category, subcategories]);

  // Manage subcategory insertion handler
  const handleAddSub = () => {
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) return;
    const isDuplicate = subcategories.some(
      s => s.categoryName.toLowerCase() === manageSubcatCategory.toLowerCase() &&
           s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      alert("This subcategory already exists under this category.");
      return;
    }
    onAddSubcategory(manageSubcatCategory, trimmed);
    setNewSubcategoryName("");
  };

  const toggleCategoryExpand = (catName: string) => {
    const next = new Set(expandedCategories);
    if (next.has(catName)) {
      next.delete(catName);
    } else {
      next.add(catName);
    }
    setExpandedCategories(next);
  };

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

  // Bulk Import States
  const [entryMode, setEntryMode] = useState<"manual" | "bulk">("manual");
  const [rawPasteData, setRawPasteData] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<Omit<ExpenseRecord, "id" | "createdAt" | "updatedAt">[]>([]);
  const [importError, setImportError] = useState("");
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<any[][]>([]);
  const [columnMappings, setColumnMappings] = useState<{ [key: string]: number }>({
    date: -1,
    category: -1,
    description: -1,
    amount: -1,
    paymentMode: -1,
    paidTo: -1,
  });
  const [isImportingProgress, setIsImportingProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default hardcoded categories for backup, combined with Firestore-saved custom categories
  const defaultCategories = useMemo(() => [
    "Home",
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
      subcategory: filteredSubcategories.length > 0 ? subcategory : undefined,
      description: description.trim(),
      amount: parsedAmount,
      paymentMode,
      paidTo: paidTo.trim(),
    });

    // Reset fields
    setDescription("");
    setAmount("");
    setPaidTo("");
    setSubcategory("");
    alert("Expense added successfully!");
  };

  // ==========================================
  // BULK IMPORT SHEET PROCESSING SECTION (XLS, XLSX, CSV, TSV)
  // ==========================================

  // Process data from raw text string or ArrayBuffer
  const parseSpreadsheetData = (dataInput: ArrayBuffer | string) => {
    try {
      setImportError("");
      const workbook = typeof dataInput === "string" 
        ? XLSX.read(dataInput, { type: "string" })
        : XLSX.read(dataInput, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setImportError("The uploaded file contains no sheets.");
        setImportPreview([]);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      // Convert to 2D array of raw values
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
      if (rows.length === 0) {
        setImportError("The selected spreadsheet is empty.");
        setImportPreview([]);
        return;
      }

      let headerIndex = 0;
      let headers: string[] = [];

      // Scan first 10 rows for a heading row containing recognizable headers
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (row && row.length > 0) {
          const hasIdentifiableKeywords = row.some(cell => {
            const str = String(cell || "").toLowerCase();
            return (
              str.includes("date") || 
              str.includes("amount") || 
              str.includes("cost") || 
              str.includes("category") || 
              str.includes("description") || 
              str.includes("paid")
            );
          });
          if (hasIdentifiableKeywords) {
            headerIndex = i;
            headers = row.map(cell => String(cell || "").trim());
            break;
          }
        }
      }

      // Fallback: If no keywords identified, use the first row with at least 2 non-empty values
      if (headers.length === 0) {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (r && r.filter(c => String(c || "").trim() !== "").length >= 2) {
            headerIndex = i;
            headers = r.map(c => String(c || "").trim());
            break;
          }
        }
      }

      if (headers.length === 0) {
        setImportError("No readable columns or headers found in this file.");
        setImportPreview([]);
        return;
      }

      // Initial automatic header matcher configuration based on column labels
      const mappings: { [key: string]: number } = {
        date: -1,
        category: -1,
        description: -1,
        amount: -1,
        paymentMode: -1,
        paidTo: -1,
      };

      headers.forEach((header, colIndex) => {
        const lower = header.toLowerCase();
        if (lower.includes("date") || lower.includes("dt") || lower === "when" || lower === "day") {
          mappings.date = colIndex;
        } else if (lower.includes("cat") || lower === "classification" || lower === "type" || lower === "group") {
          mappings.category = colIndex;
        } else if (
          lower.includes("desc") || 
          lower.includes("detail") || 
          lower.includes("note") || 
          lower.includes("particular") || 
          lower.includes("item") ||
          lower.includes("purpose")
        ) {
          mappings.description = colIndex;
        } else if (
          lower.includes("amount") || 
          lower.includes("cost") || 
          lower.includes("rupee") || 
          lower === "rs" || 
          lower === "val" || 
          lower === "price" || 
          lower === "spent" || 
          lower === "inr" ||
          lower.includes("outflow")
        ) {
          mappings.amount = colIndex;
        } else if (lower.includes("mode") || lower.includes("payment") || lower === "pay" || lower === "mop" || lower === "instrument") {
          mappings.paymentMode = colIndex;
        } else if (
          lower.includes("paid") || 
          lower.includes("to") || 
          lower.includes("vendor") || 
          lower.includes("recipient") || 
          lower === "supplier" || 
          lower === "party" ||
          lower.includes("person")
        ) {
          mappings.paidTo = colIndex;
        }
      });

      // Quick fallback matching based on default order if crucial columns weren't matched
      if (mappings.amount === -1) {
        if (headers.length >= 4) {
          mappings.date = 0;
          mappings.category = 1;
          mappings.description = 2;
          mappings.amount = 3;
          if (headers.length >= 5) mappings.paymentMode = 4;
          if (headers.length >= 6) mappings.paidTo = 5;
        } else {
          setImportError("Could not identify an 'Amount' column. Please make sure column headers are present.");
          setImportPreview([]);
          return;
        }
      }

      setSheetHeaders(headers);
      setParsedRows(rows.slice(headerIndex + 1));
      setColumnMappings(mappings);
      
      // Calculate preview states
      generatePreview(rows.slice(headerIndex + 1), mappings);

    } catch (err) {
      console.error(err);
      setImportError("Error processing spreadsheet. Ensure columns are correctly structured.");
      setImportPreview([]);
    }
  };

  // Convert 2D cells representing spreadsheet lines into structured ExpenseRecords
  const generatePreview = (rows: any[][], currentMappings: typeof columnMappings) => {
    const list: Omit<ExpenseRecord, "id" | "createdAt" | "updatedAt">[] = [];

    for (const r of rows) {
      if (!r || r.length === 0) continue;

      // Filter out entirely empty blank spacer rows
      const isRowBlank = r.every(cell => cell === undefined || cell === null || String(cell).trim() === "");
      if (isRowBlank) continue;

      const rawDate = currentMappings.date >= 0 ? r[currentMappings.date] : undefined;
      const rawCategory = currentMappings.category >= 0 ? r[currentMappings.category] : undefined;
      const rawDesc = currentMappings.description >= 0 ? r[currentMappings.description] : undefined;
      const rawAmount = currentMappings.amount >= 0 ? r[currentMappings.amount] : undefined;
      const rawPaymentMode = currentMappings.paymentMode >= 0 ? r[currentMappings.paymentMode] : undefined;
      const rawPaidTo = currentMappings.paidTo >= 0 ? r[currentMappings.paidTo] : undefined;

      // 1. Process Date with multi-format and serial converters
      let finalDate = new Date().toISOString().split("T")[0];
      if (rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== "") {
        if (typeof rawDate === "number" && rawDate > 30000 && rawDate < 60000) {
          const utcDays = Math.floor(rawDate - 25569);
          const dateObj = new Date(utcDays * 86400 * 1000);
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const localDate = new Date(dateObj.getTime() + tzOffset);
          finalDate = localDate.toISOString().split("T")[0];
        } else {
          const dStr = String(rawDate).trim();
          const parsedD = new Date(dStr);
          if (!isNaN(parsedD.getTime())) {
            finalDate = parsedD.toISOString().split("T")[0];
          } else {
            // Check manual DMY formats e.g. 18-06-2026 or 18/06/2026
            const match = dStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
            if (match) {
              const day = parseInt(match[1], 10);
              const month = parseInt(match[2], 10) - 1;
              const year = parseInt(match[3], 10);
              const dObj = new Date(year, month, day);
              if (!isNaN(dObj.getTime())) {
                finalDate = dObj.toISOString().split("T")[0];
              }
            }
          }
        }
      }

      // 2. Process Category with fallback
      let finalCategory = "Miscellaneous";
      if (rawCategory !== undefined && rawCategory !== null && String(rawCategory).trim() !== "") {
        finalCategory = String(rawCategory).trim();
      }

      // 3. Process Amount (stripping characters)
      let finalAmount = 0;
      if (rawAmount !== undefined && rawAmount !== null) {
        const cleanedAmt = String(rawAmount).replace(/[^\d.-]/g, "");
        const parsedAmt = parseFloat(cleanedAmt);
        if (!isNaN(parsedAmt)) {
          finalAmount = parsedAmt;
        }
      }

      // 4. Process Payment Mode selection
      let finalMode = "Cash";
      if (rawPaymentMode !== undefined && rawPaymentMode !== null && String(rawPaymentMode).trim() !== "") {
        const modeStr = String(rawPaymentMode).trim();
        const modeLower = modeStr.toLowerCase();
        if (modeLower.includes("cash")) finalMode = "Cash";
        else if (modeLower.includes("upi") || modeLower.includes("phone") || modeLower.includes("paytm") || modeLower.includes("gpay")) finalMode = "UPI";
        else if (modeLower.includes("bank") || modeLower.includes("transfer") || modeLower.includes("neft") || modeLower.includes("imps")) finalMode = "Bank transfer";
        else finalMode = "Other";
      }

      const finalDesc = rawDesc !== undefined && rawDesc !== null ? String(rawDesc).trim() : "";
      const finalPaidTo = rawPaidTo !== undefined && rawPaidTo !== null ? String(rawPaidTo).trim() : "";

      list.push({
        date: finalDate,
        category: finalCategory,
        description: finalDesc,
        amount: finalAmount,
        paymentMode: finalMode,
        paidTo: finalPaidTo,
      });
    }

    setImportPreview(list);
  };

  const handleManualMappingChange = (field: string, columnIndex: number) => {
    const updated = {
      ...columnMappings,
      [field]: columnIndex
    };
    setColumnMappings(updated);
    generatePreview(parsedRows, updated);
  };

  // Drag handlers
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

    const extension = file.name.split(".").pop()?.toLowerCase();
    const isSupported = ["xlsx", "xls", "csv", "txt", "tsv"].includes(extension || "");
    if (!isSupported) {
      setImportError("Unsupported file format. Please drop a valid .xlsx, .xls, .csv, or .txt file.");
      return;
    }

    const reader = new FileReader();
    if (extension === "xlsx" || extension === "xls") {
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        parseSpreadsheetData(buffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawPasteData(text);
        parseSpreadsheetData(text);
      };
      reader.readAsText(file);
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

    const extension = file.name.split(".").pop()?.toLowerCase();
    const reader = new FileReader();

    if (extension === "xlsx" || extension === "xls") {
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        parseSpreadsheetData(buffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setRawPasteData(text);
        parseSpreadsheetData(text);
      };
      reader.readAsText(file);
    }
    e.target.value = ""; // let users re-upload same file
  };

  const handleDeletePreviewRow = (idx: number) => {
    const updated = [...importPreview];
    updated.splice(idx, 1);
    setImportPreview(updated);
  };

  const handleSetAllPaymentModes = (mode: string) => {
    const updated = importPreview.map(item => ({
      ...item,
      paymentMode: mode
    }));
    setImportPreview(updated);
  };

  const handleConfirmBulkImport = async () => {
    if (importPreview.length === 0) return;

    try {
      setIsImportingProgress(true);

      // Extract new categories dynamically from sheet and save first
      const newCatsFound: string[] = [];
      importPreview.forEach(item => {
        const catName = item.category.trim();
        if (catName && !allCategoriesList.some(c => c.toLowerCase() === catName.toLowerCase())) {
          if (!newCatsFound.some(c => c.toLowerCase() === catName.toLowerCase())) {
            newCatsFound.push(catName);
          }
        }
      });

      for (const cat of newCatsFound) {
        onAddCategory(cat);
      }

      // Save each expense in real-time
      // Items will sink and sync automatically in other logged-in tablets instantly!
      for (const item of importPreview) {
        onAddExpense(item);
      }

      alert(`Success! Imported ${importPreview.length} expense rows into the nursery ledger.`);
      
      // Reset Import view
      setImportPreview([]);
      setParsedRows([]);
      setSheetHeaders([]);
      setRawPasteData("");
      setEntryMode("manual");
    } catch (err) {
      console.error(err);
      alert("An error occurred during bulk importing. Please review file format.");
    } finally {
      setIsImportingProgress(false);
    }
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

  // Compute subcategories matching the editing expense category
  const editingCategorySubcategories = useMemo(() => {
    if (!editingExpense) return [];
    return subcategories.filter(sub => sub.categoryName.toLowerCase() === editingExpense.category.toLowerCase());
  }, [editingExpense, subcategories]);

  // Group and calculate detailed subcategory breakdowns for expanded category view
  const subcategoryBreakdowns = useMemo(() => {
    const breakdowns: { [category: string]: { name: string; value: number; percentage: number }[] } = {};
    
    // Group filteredExpenses of each category by subcategory
    filteredExpenses.forEach(item => {
      const cat = item.category;
      const sub = item.subcategory || "Other/General";
      const amt = Number(item.amount || 0);
      
      if (!breakdowns[cat]) {
        breakdowns[cat] = [];
      }
      
      const existing = breakdowns[cat].find(b => b.name === sub);
      if (existing) {
        existing.value += amt;
      } else {
        breakdowns[cat].push({ name: sub, value: amt, percentage: 0 });
      }
    });

    // Calculate percentage for each subcategory relative to the parent category total
    Object.keys(breakdowns).forEach(cat => {
      const catTotal = breakdowns[cat].reduce((sum, b) => sum + b.value, 0);
      breakdowns[cat] = breakdowns[cat]
        .map(b => ({
          ...b,
          percentage: catTotal > 0 ? (b.value / catTotal) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);
    });

    return breakdowns;
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
              {/* Double Tab Entry Selector */}
              <div className="flex border-b border-stone-100 pb-3 items-center justify-between">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryMode("manual");
                      setImportPreview([]);
                      setParsedRows([]);
                      setSheetHeaders([]);
                      setRawPasteData("");
                    }}
                    className={`font-serif text-[15px] font-bold transition-all relative pb-2 -mb-3.5 cursor-pointer ${
                      entryMode === "manual" 
                        ? "text-editorial-primary border-b-2 border-editorial-primary font-extrabold" 
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Record Expenditure
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryMode("bulk")}
                    className={`font-serif text-[15px] font-bold transition-all relative pb-2 -mb-3.5 cursor-pointer flex items-center gap-1.5 ${
                      entryMode === "bulk" 
                        ? "text-editorial-primary border-b-2 border-editorial-primary font-extrabold" 
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    Bulk Import (Excel / CSV)
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-sans uppercase font-extrabold tracking-wider">New</span>
                  </button>
                </div>
                <span className="text-[10px] font-mono text-stone-400 font-semibold">Ledger form v1.2</span>
              </div>

              {/* ----------------- MANUAL ENTRY MODE ----------------- */}
              {entryMode === "manual" && (
                <>
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

                  {showSubcategoryManager && !showCustomCategoryInput ? (
                    <div className="bg-stone-50 p-5 border border-editorial-primary/15 rounded-xl space-y-4 animate-fade-in text-editorial-dark mb-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs text-editorial-dark font-bold font-sans uppercase tracking-wider">
                          <Layers className="w-4 h-4 text-editorial-primary" />
                          <span>Manage Subcategories</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSubcategoryManager(false)}
                          className="text-stone-400 hover:text-stone-600 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-xs text-stone-500 font-serif italic">
                        Select a category and add/remove subcategories below. These will propagate to the ledger form and analysis breakdowns.
                      </p>

                      <div className="space-y-3">
                        {/* Parent Category selector within manager */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">Parent Category</label>
                          <select
                            value={manageSubcatCategory}
                            onChange={(e) => setManageSubcatCategory(e.target.value)}
                            className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-2.5 text-editorial-dark focus:outline-none"
                          >
                            {allCategoriesList.map((catName) => (
                              <option key={catName} value={catName}>
                                {catName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* List of current subcategories */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/70">
                            Subcategories of "{manageSubcatCategory}"
                          </label>
                          
                          {subcategories.filter(s => s.categoryName === manageSubcatCategory).length === 0 ? (
                            <p className="text-xs text-stone-400 italic">No subcategories defined yet.</p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-stone-200/60 rounded-lg p-2 bg-white/70">
                              {subcategories
                                .filter(s => s.categoryName === manageSubcatCategory)
                                .map((sub) => (
                                  <div key={sub.id} className="flex justify-between items-center bg-stone-100/50 hover:bg-stone-100 rounded-md py-1 px-2.5 text-xs font-mono">
                                    <span>{sub.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteSubcategory(sub.id)}
                                      className="text-red-500 hover:text-red-700 p-1 rounded-full transition cursor-pointer"
                                      title="Delete subcategory"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Add subcategory input */}
                        <div className="pt-2 border-t border-stone-200 flex gap-2">
                          <input
                            type="text"
                            placeholder="Add subcategory name..."
                            value={newSubcategoryName}
                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddSub();
                              }
                            }}
                            className="flex-1 text-xs font-mono bg-white border border-editorial-primary/15 rounded-lg p-2.5 text-editorial-dark focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddSub}
                            className="px-3 py-2 bg-editorial-primary hover:bg-editorial-dark text-white rounded-lg font-bold transition flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
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
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setManageSubcatCategory(category);
                                  setShowSubcategoryManager(!showSubcategoryManager);
                                  setShowCustomCategoryInput(false);
                                }}
                                className="text-[10px] font-sans font-extrabold text-stone-500 hover:underline hover:text-stone-700 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Layers className="w-3 h-3" />
                                <span>Manage Subs</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCustomCategoryInput(true);
                                  setShowSubcategoryManager(false);
                                }}
                                className="text-[10px] font-sans font-extrabold text-editorial-primary hover:underline hover:text-editorial-dark flex items-center gap-0.5 cursor-pointer"
                              >
                                <PlusCircle className="w-3 h-3" />
                                <span>Custom Category</span>
                              </button>
                            </div>
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

                      {filteredSubcategories.length > 0 && (
                        <div className="space-y-1.5 animate-fade-in bg-stone-50/40 p-3.5 border border-stone-200/50 rounded-xl">
                          <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Subcategory selection *</label>
                          <select
                            value={subcategory}
                            onChange={(e) => setSubcategory(e.target.value)}
                            className="w-full text-xs font-mono bg-editorial-bg border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:border-editorial-primary/30 focus:outline-none focus:bg-white"
                          >
                            {filteredSubcategories.map((sub) => (
                              <option key={sub.id} value={sub.name}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

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
                </>
              )}

              {/* ----------------- BULK IMPORT MODE ----------------- */}
              {entryMode === "bulk" && (
                <div className="space-y-6">
                  {/* Help guideline boxes */}
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs font-sans text-stone-605 leading-relaxed space-y-2">
                    <p className="font-extrabold text-stone-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-650" />
                      Spreadsheet Import Guidelines
                    </p>
                    <p>
                      Supports standard MS Excel files (<code>.xlsx</code>, <code>.xls</code>), <code>.csv</code>, and plain text tab-separated <code>.tsv</code> copied/pasted files. Your sheet columns will automatically adapt, but should ideally contain the following values:
                    </p>
                    <ul className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] pl-2 text-stone-550">
                      <li className="flex items-center gap-1">⏱️ <strong>Date</strong> (YYYY-MM-DD or DD-MM-YYYY)</li>
                      <li className="flex items-center gap-1">🏷️ <strong>Category</strong> (Wages, Electricity, Soil, etc.)</li>
                      <li className="flex items-center gap-1">💸 <strong>Amount</strong> (Expense value)</li>
                      <li className="flex items-center gap-1">📝 <strong>Description</strong> (Optional notes)</li>
                      <li className="flex items-center gap-1">💳 <strong>Payment Mode</strong> (Cash, UPI, Bank transfer)</li>
                      <li className="flex items-center gap-1">👤 <strong>Paid To</strong> (Vendor / person)</li>
                    </ul>
                  </div>

                  {/* Drag-and-upload plus Paste Split row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Drag & drop upload box */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                        isDragging
                          ? "border-emerald-600 bg-emerald-50/40"
                          : "border-stone-200 hover:border-editorial-primary hover:bg-stone-50/50"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".xlsx,.xls,.csv,.txt,.tsv"
                        onChange={handleFileUpload}
                      />
                      <Upload className="w-8 h-8 text-stone-400 mb-2" />
                      <p className="text-xs font-sans font-extrabold text-stone-800">
                        Drag & Drop Sheet File Here
                      </p>
                      <p className="text-[10px] text-stone-400 mt-1">
                        or click to browse (.xlsx, .xls, .csv, .txt)
                      </p>
                    </div>

                    {/* Copy and paste direct cells */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500">
                        Or Copy & Paste Spreadsheet Table Directly:
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Paste cells copied directly from Excel rows here..."
                        value={rawPasteData}
                        onChange={handlePasteChange}
                        className="w-full text-[11px] font-mono p-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Error display if is invalid */}
                  {importError && (
                    <div className="p-3 bg-rose-50 text-rose-800 border-2 border-rose-100 rounded-xl flex items-center gap-2 text-xs font-sans font-semibold">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Manual column indices overrides (Only if headers found) */}
                  {sheetHeaders.length > 0 && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#5C6E5C] font-sans">
                          ⚙️ Configure Column Mapping Overrides
                        </span>
                        <span className="text-[10px] text-stone-400 italic">
                          Change if column names did not auto-match
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {[
                          { key: "date", label: "Date *" },
                          { key: "category", label: "Category *" },
                          { key: "description", label: "Description" },
                          { key: "amount", label: "Amount *" },
                          { key: "paymentMode", label: "Pay Mode" },
                          { key: "paidTo", label: "Paid To" }
                        ].map(field => (
                          <div key={field.key} className="space-y-1">
                            <span className="block text-[9px] uppercase tracking-wider text-stone-500 font-bold font-sans">
                              {field.label}
                            </span>
                            <select
                              value={columnMappings[field.key]}
                              onChange={(e) => handleManualMappingChange(field.key, Number(e.target.value))}
                              className="w-full p-2 text-[10px] font-mono bg-white border border-stone-200 rounded-lg outline-none font-semibold text-editorial-dark"
                            >
                              <option value="-1">-- Unmapped --</option>
                              {sheetHeaders.map((header, idx) => (
                                <option key={idx} value={idx}>
                                  Col {idx + 1}: {header.length > 20 ? header.substring(0,18) + ".." : header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Import preview list of records */}
                  {importPreview.length > 0 && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-light pb-2">
                        <span className="text-xs uppercase font-serif tracking-widest font-extrabold text-editorial-primary">
                          🔍 Prepared Import Preview ({importPreview.length} items parsed)
                        </span>
                        
                        {/* Quick Action Payment Mode Batch Overrides */}
                        <div className="flex items-center gap-1.5 text-xs text-stone-600">
                          <label className="text-[10px] uppercase tracking-wider font-sans font-bold">Set all payments to:</label>
                          <select
                            onChange={(e) => {
                              if (e.target.value) handleSetAllPaymentModes(e.target.value);
                            }}
                            className="p-1 text-[11px] font-semibold bg-stone-100 border border-stone-200 rounded-md outline-none"
                            defaultValue=""
                          >
                            <option value="" disabled>-- Choose override --</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank transfer">Bank transfer</option>
                            <option value="Other">Other Mode</option>
                          </select>
                        </div>
                      </div>

                      {/* Preview Rows Table list */}
                      <div className="overflow-x-auto max-h-[280px] border border-stone-200 rounded-xl shadow-inner">
                        <table className="w-full text-left border-collapse text-[11px] font-sans">
                          <thead>
                            <tr className="bg-stone-50 text-stone-500 border-b border-stone-200 font-extrabold text-[9px] uppercase tracking-wider">
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Category classification</th>
                              <th className="py-2.5 px-3">Ledger Details</th>
                              <th className="py-2.5 px-3">Receipt Paid To</th>
                              <th className="py-2.5 px-3">Mode</th>
                              <th className="py-2.5 px-3 text-right">Amount Outflow</th>
                              <th className="py-2.5 px-3 text-center">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.map((item, idx) => {
                              const isUnidentifiedCategory = !allCategoriesList.some(
                                c => c.toLowerCase() === item.category.toLowerCase()
                              );
                              const isAmountInvalid = isNaN(item.amount) || item.amount <= 0;

                              return (
                                <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/55 transition-colors">
                                  <td className="py-2 px-3 text-stone-400 font-mono text-[9px]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-mono">
                                    {item.date}
                                  </td>
                                  <td className="py-2 px-3 font-medium">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{item.category}</span>
                                      {isUnidentifiedCategory && item.category.trim() !== "" && (
                                        <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[8px] font-extrabold uppercase px-1 py-0.5 rounded-sm shrink-0">
                                          New Cat
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-stone-605 max-w-[150px] truncate" title={item.description}>
                                    {item.description || <span className="text-stone-300 italic font-serif">No notes</span>}
                                  </td>
                                  <td className="py-2 px-3 text-stone-550 max-w-[110px] truncate" title={item.paidTo}>
                                    {item.paidTo || <span className="text-stone-300 italic font-serif">--</span>}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-mono bg-stone-100/70 border border-stone-200/50 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      {item.paymentMode}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold">
                                    <span className={isAmountInvalid ? "text-rose-600 bg-rose-50 px-1 py-0.5 rounded" : "text-editorial-dark"}>
                                      ₹{item.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePreviewRow(idx)}
                                      className="p-1 rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Cumulative visual indicators */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-stone-50 border border-stone-200 rounded-xl">
                        <div className="flex items-center gap-4 text-xs font-serif italic text-stone-600">
                          <p>
                            Summary: <strong>{importPreview.length} records</strong> prepared for importing.
                          </p>
                          <p>
                            Total outflow: <strong className="font-sans text-editorial-dark font-extrabold">
                              {formatRupees(importPreview.reduce((acc, current) => acc + (current.amount || 0), 0))}
                            </strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setImportPreview([]);
                              setParsedRows([]);
                              setSheetHeaders([]);
                              setRawPasteData("");
                              setEntryMode("manual");
                            }}
                            className="px-4 py-2 text-xs border border-stone-300 text-stone-600 font-extrabold hover:bg-stone-100 rounded-full transition cursor-pointer font-sans"
                          >
                            Reset Upload
                          </button>
                          
                          <button
                            type="button"
                            disabled={isImportingProgress || importPreview.length === 0}
                            onClick={handleConfirmBulkImport}
                            className="px-6 py-2 bg-editorial-primary text-white font-extrabold text-xs uppercase tracking-wider rounded-full transition hover:bg-editorial-dark cursor-pointer shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                          >
                            {isImportingProgress ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Import live to Ledger
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  <div key={idx} className="space-y-1.5 text-editorial-dark border-b border-stone-100/40 pb-2 last:border-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(cat.name)}
                      className="w-full text-left focus:outline-none"
                    >
                      <div className="flex justify-between items-center text-xs hover:opacity-80 transition-opacity">
                        <span className="font-sans font-bold text-[11px] text-stone-700 truncate max-w-[170px] flex items-center gap-1 cursor-pointer">
                          <span className="inline-block text-[8px] font-mono text-stone-400 font-extrabold w-3 text-center">
                            {expandedCategories.has(cat.name) ? "▼" : "▶"}
                          </span>
                          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(140, 15%, ${40 + (idx * 6)}%)` }} />
                          {cat.name}
                        </span>
                        <span className="font-mono text-stone-500 text-[10px] cursor-pointer">
                          <strong>{formatRupees(cat.value)}</strong> ({cat.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </button>
                    {/* Visual flat bar container */}
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden cursor-pointer" onClick={() => toggleCategoryExpand(cat.name)}>
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${cat.percentage}%`,
                          backgroundColor: `hsl(140, 15%, ${35 + (idx * 6)}%)`
                        }}
                      />
                    </div>

                    {/* Expandable subcategory breakdown list */}
                    {expandedCategories.has(cat.name) && (
                      <div className="pl-4 pr-1 py-1.5 mt-1 border-l-2 border-stone-200 bg-stone-50/50 rounded-r-lg space-y-2 text-[10px] animate-fade-in">
                        <span className="block font-sans text-[8px] uppercase tracking-wider text-stone-400">Subcategory Breakdown</span>
                        {(!subcategoryBreakdowns[cat.name] || subcategoryBreakdowns[cat.name].length === 0) ? (
                          <span className="text-stone-400 italic block">No subcategory records found for this category.</span>
                        ) : (
                          subcategoryBreakdowns[cat.name].map((subBreakdown, subIdx) => (
                            <div key={subIdx} className="space-y-1">
                              <div className="flex justify-between items-center font-mono">
                                <span className="text-stone-600 font-bold max-w-[140px] truncate">{subBreakdown.name}</span>
                                <span className="text-stone-500 font-medium">
                                  {formatRupees(subBreakdown.value)} ({subBreakdown.percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="h-1 w-full bg-stone-200/60 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-editorial-primary/70 rounded-full transition-all duration-500"
                                  style={{ width: `${subBreakdown.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider bg-editorial-accent/10 text-editorial-primary border border-editorial-accent/15">
                          {exp.category}
                        </span>
                        {exp.subcategory && (
                          <span className="inline-flex items-center text-[8px] font-sans font-bold text-stone-500 bg-stone-100 px-1 py-0.5 rounded uppercase border border-stone-200">
                            {exp.subcategory}
                          </span>
                        )}
                      </div>
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
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const subs = subcategories.filter(sub => sub.categoryName.toLowerCase() === newCat.toLowerCase());
                      setEditingExpense({
                        ...editingExpense,
                        category: newCat,
                        subcategory: subs.length > 0 ? subs[0].name : undefined
                      });
                    }}
                    className="w-full text-xs font-mono bg-stone-50 border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none"
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

              {editingCategorySubcategories.length > 0 && (
                <div className="space-y-1 bg-stone-50 p-3.5 border border-stone-200/50 rounded-xl">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-editorial-primary/80">Subcategory *</label>
                  <select
                    value={editingExpense.subcategory || ""}
                    onChange={(e) => setEditingExpense({ ...editingExpense, subcategory: e.target.value })}
                    className="w-full text-xs font-mono bg-white border border-editorial-primary/10 rounded-lg p-3 text-editorial-dark focus:outline-none"
                  >
                    {!editingExpense.subcategory && <option value="">-- Select Subcategory --</option>}
                    {editingCategorySubcategories.map((sub) => (
                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              )}

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
