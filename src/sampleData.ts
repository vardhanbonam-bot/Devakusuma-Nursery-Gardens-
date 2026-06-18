import { InventoryItem, PurchaseRecord, SalesRecord } from "./types";

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_PURCHASES: PurchaseRecord[] = [];

export const INITIAL_SALES: SalesRecord[] = [];

// Seasonal peak guidelines for plants
export const PLANT_PEAK_SEASONS: { [key: string]: string } = {
  "Rose Plant (Red)": "Winter & Spring",
  "Mango Graft (Alphonso)": "Summer",
  "Jasmine Creeper": "Summer",
  "Coconut Sapling (TxD)": "Monsoon",
  "Hibiscus (Chinese Red)": "Summer & Monsoon",
  "Holy Basil (Tulsi)": "Winter & Monsoon",
  "Bamboo Palm": "Spring",
  "Fern (Nephrolepis)": "Monsoon & Winter",
};
