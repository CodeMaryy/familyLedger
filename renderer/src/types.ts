export type TransactionType = 'income' | 'expense';

export type CategoryType = 
  | 'salary' | 'bonus' | 'investment' | 'media' | 'custom' // Income
  | 'food' | 'transport' | 'health' | 'shopping' | 'housing' | 'entertainment' | 'other'; // Expense

export interface Member {
  id: string;
  name: string;
  avatar?: string;
}

export interface Transaction {
  id: string;
  ledgerId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO string
  categoryId: string;
  categoryName: string; // Store name for easier display, or look up by ID
  memberId: string;
  note?: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  ledgerId: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  amount: number;
  period: 'monthly' | 'yearly'; // Simplified for now
  year: number;
  month?: number; // 0-11
}

export interface Ledger {
  id: string;
  name: string;
  currency: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  type: TransactionType;
  isDefault?: boolean;
}

export interface AppData {
  ledgers: Ledger[];
  members: Member[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  activeLedgerId: string;
}

export type DateFilterState = 
  | { mode: 'year'; values: string[] }
  | { mode: 'month'; values: string[] } // Format: yyyy-MM
  | { mode: 'custom'; from: Date; to?: Date };
