/**
 * Electron API 类型定义
 * 
 * 声明 preload.js 暴露的 window.api 对象
 */

// API 响应通用类型
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 后端数据模型
interface DbBook {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface DbMember {
  id: number;
  name: string;
  avatar: string;
  created_at: string;
}

interface DbRecord {
  id: number;
  book_id: number;
  member_id: number | null;
  direction: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note: string;
  created_at: string;
  member_name?: string;
}

interface DbBudget {
  id: number;
  book_id: number;
  member_id: number | null;
  direction: 'income' | 'expense';
  category: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  date: string;
  member_name?: string;
}

interface RecordSummary {
  income: number;
  expense: number;
  balance: number;
}

interface CategorySummaryItem {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

interface BudgetExecution extends DbBudget {
  actual: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

// API 接口定义
interface BooksApi {
  list: () => Promise<ApiResponse<DbBook[]>>;
  add: (data: { name: string; description?: string }) => Promise<ApiResponse<DbBook>>;
  update: (id: number, data: { name?: string; description?: string }) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  delete: (id: number) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
}

interface MembersApi {
  list: (bookId?: number) => Promise<ApiResponse<DbMember[]>>;
  add: (data: { name: string; avatar?: string }) => Promise<ApiResponse<DbMember>>;
  update: (id: number, data: { name?: string; avatar?: string }) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  delete: (id: number) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
}

interface RecordsApi {
  list: (bookId: number, options?: {
    startDate?: string;
    endDate?: string;
    direction?: 'income' | 'expense';
    category?: string;
    member_id?: number;
    limit?: number;
    offset?: number;
  }) => Promise<ApiResponse<DbRecord[]>>;
  add: (data: {
    book_id: number;
    member_id?: number;
    direction: 'income' | 'expense';
    category: string;
    amount: number;
    date: string;
    note?: string;
  }) => Promise<ApiResponse<DbRecord>>;
  update: (id: number, data: Partial<{
    member_id: number;
    direction: 'income' | 'expense';
    category: string;
    amount: number;
    date: string;
    note: string;
  }>) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  delete: (id: number) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  summary: (bookId: number, options?: {
    startDate?: string;
    endDate?: string;
    member_id?: number;
  }) => Promise<ApiResponse<RecordSummary>>;
  categorySummary: (bookId: number, options?: {
    direction?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
    member_id?: number;
  }) => Promise<ApiResponse<CategorySummaryItem[]>>;
}

interface BudgetsApi {
  list: (bookId: number, options?: {
    direction?: 'income' | 'expense';
    period?: 'monthly' | 'quarterly' | 'yearly';
    member_id?: number;
  }) => Promise<ApiResponse<DbBudget[]>>;
  add: (data: {
    book_id: number;
    member_id?: number;
    direction: 'income' | 'expense';
    category: string;
    amount: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    date: string;
  }) => Promise<ApiResponse<DbBudget>>;
  update: (id: number, data: Partial<{
    member_id: number;
    direction: 'income' | 'expense';
    category: string;
    amount: number;
    period: 'monthly' | 'quarterly' | 'yearly';
    date: string;
  }>) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  delete: (id: number) => Promise<ApiResponse<{ success: boolean; changes: number }>>;
  execution: (bookId: number, options?: {
    startDate?: string;
    endDate?: string;
  }) => Promise<ApiResponse<BudgetExecution[]>>;
}

interface ElectronApi {
  books: BooksApi;
  members: MembersApi;
  records: RecordsApi;
  budgets: BudgetsApi;
}

// 扩展 Window 接口
declare global {
  interface Window {
    api?: ElectronApi;
  }
}

export type {
  ApiResponse,
  DbBook,
  DbMember,
  DbRecord,
  DbBudget,
  RecordSummary,
  CategorySummaryItem,
  BudgetExecution,
  ElectronApi,
};

