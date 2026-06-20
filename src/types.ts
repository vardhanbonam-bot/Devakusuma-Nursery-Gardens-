export interface InventoryItem {
  id: string;
  plantName: string;
  plantSize: string; // e.g., "1 ft", "2 ft", "3 ft"
  quantityAvailable: number;
  sellingPrice: number;
}

export interface PurchaseRecord {
  id: string;
  purchaseDate: string; // YYYY-MM-DD
  supplierName: string;
  plantName: string;
  plantSize: string;
  quantityPurchased: number;
  costPerUnit: number;
  totalPurchaseCost: number;
}

export interface SaleLineItem {
  plantName: string;
  size: string;
  quantity: number;
  sellingPrice: number;
  mrpAtSale: number;
}

export interface SalesRecord {
  id: string;
  invoiceNumber: string; // e.g., "INV-2026-0001"
  saleDate: string; // YYYY-MM-DD
  customerName: string;
  totalSaleValue: number;

  // Multiple items field
  items?: SaleLineItem[];

  // Legacy fields for backward compatibility
  plantName?: string;
  plantSize?: string;
  quantitySold?: number;
  sellingPrice?: number;

  // New fields from prompt
  sellerName?: string;
  createdAt?: string; // ISO string
}

export interface SeasonalInfo {
  plantName: string;
  bestSeason: string; // e.g., "Monsoon", "Winter", "Summer", "Spring"
}

export interface NurseryUser {
  id: string;
  username: string;
  role: string; // e.g. "Owner", "Manager", "Sales Staff"
  pin: string; // 4-8 character PIN / password
  avatarColor: string; // e.g., #5A5A40 for brand-aligned options
  avatarImage?: string; // base64 or custom image URL
}

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
  paymentMode: string; // Cash / UPI / Bank transfer / Other
  paidTo: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ExpenseCategory {
  id: string;
  name: string;
}
