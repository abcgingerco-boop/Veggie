// Core types for Ginger Trading System

export interface Grade {
  id: string;
  name: string;
  color: string; // For visual distinction
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  date: string;
  vehicleNumber: string;
  gradeWiseBags: GradeWiseBags; // Changed from totalBags to grade-wise
}

export interface GradeWiseBags {
  [gradeName: string]: number; // e.g., { "A": 50, "B": 30, "C": 20 }
}

export interface Buyer {
  id: string;
  name: string;
  phone?: string;
  isActive: boolean;
}

export interface BagWeight {
  id: string;
  date: string;
  buyerId: string;
  grade: string;
  bagNumber: number; // Bag number within that grade
  weight: number;
  timestamp: number;
}

// Grade-wise buyer transaction
export interface BuyerTransaction {
  buyerId: string;
  buyerName: string;
  grade: string;
  bags: BagWeight[];
  totalBags: number;
  grossWeight: number;
  netWeight: number;
}

// Inventory per grade
export interface GradeInventory {
  grade: string;
  totalBagsStart: number; // From vehicles at start of day
  soldBags: number; // Bags sold to buyers
  pendingBags: number; // Remaining bags
  color: string; // For UI
}

// Daily summary
export interface DailySummary {
  date: string;
  vehicles: Vehicle[];
  buyers: BuyerTransaction[];
  inventory: GradeInventory[];
}

// Shareable buyer summary
export interface ShareableBuyerSummary {
  buyerName: string;
  date: string;
  gradeWiseDetails: {
    grade: string;
    bags: number;
    grossWeight: number;
    netWeight: number;
  }[];
  totalBags: number;
  totalGrossWeight: number;
  totalNetWeight: number;
}

export interface WeightCalculation {
  totalBags: number;
  grossWeight: number;
  netWeight: number;
}

// PDF Report data types
export interface DailyReportData {
  date: string;
  vehicles: Vehicle[];
  buyerSummaries: {
    buyer: Buyer;
    grades: {
      grade: string;
      bags: BagWeight[];
      totalBags: number;
      grossWeight: number;
      netWeight: number;
    }[];
  }[];
  inventory: GradeInventory[];
}

export interface BuyerSummaryData {
  buyer: Buyer;
  date: string;
  grades: {
    grade: string;
    color: string;
    bags: BagWeight[];
    totalBags: number;
    grossWeight: number;
    netWeight: number;
  }[];
}
