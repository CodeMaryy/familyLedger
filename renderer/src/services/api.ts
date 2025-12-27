/**
 * API 服务层
 * 
 * 封装对 window.api 的调用，处理前后端类型转换
 * 如果不在 Electron 环境中，fallback 到 localStorage（开发模式）
 */

import type { 
  DbBook, DbMember, DbRecord, DbBudget, 
  RecordSummary, CategorySummaryItem, BudgetExecution 
} from '../api.d';
import type { Transaction, Member, Ledger, Budget, Category } from '../types';

// 检查是否在 Electron 环境中
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.api !== undefined;
};

// ==================== 类型转换工具 ====================

/**
 * 后端账本 → 前端账本
 */
export const dbBookToLedger = (book: DbBook): Ledger => ({
  id: String(book.id),
  name: book.name,
  currency: 'CNY', // 默认货币
});

/**
 * 后端成员 → 前端成员
 */
export const dbMemberToMember = (member: DbMember): Member => ({
  id: String(member.id),
  name: member.name,
  avatar: member.avatar || '👤',
});

/**
 * 后端账目 → 前端交易
 */
export const dbRecordToTransaction = (record: DbRecord, ledgerId: string, categoryName: string): Transaction => ({
  id: String(record.id),
  ledgerId,
  type: record.direction,
  amount: record.amount,
  date: record.date,
  categoryId: record.category,
  categoryName: categoryName,
  memberId: record.member_id ? String(record.member_id) : '',
  note: record.note || '',
  createdAt: new Date(record.created_at).getTime(),
});

/**
 * 前端交易 → 后端账目数据
 */
export const transactionToDbRecord = (
  t: Omit<Transaction, 'id' | 'createdAt'>,
  bookId: number
): {
  book_id: number;
  member_id?: number;
  direction: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note?: string;
} => ({
  book_id: bookId,
  member_id: t.memberId ? Number(t.memberId) : undefined,
  direction: t.type,
  category: t.categoryId,
  amount: t.amount,
  date: t.date.split('T')[0], // 确保是 YYYY-MM-DD 格式
  note: t.note,
});

/**
 * 后端预算 → 前端预算
 */
export const dbBudgetToBudget = (budget: DbBudget, ledgerId: string): Budget => {
  const dateObj = new Date(budget.date);
  return {
    id: String(budget.id),
    ledgerId,
    type: budget.direction,
    categoryId: budget.category,
    categoryName: budget.category, // 需要从分类列表查找
    amount: budget.amount,
    period: budget.period === 'quarterly' ? 'monthly' : budget.period, // 简化处理
    year: dateObj.getFullYear(),
    month: dateObj.getMonth() + 1,
  };
};

// ==================== API 服务 ====================

export const apiService = {
  // ==================== 账本 ====================
  books: {
    async list(): Promise<Ledger[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.books.list();
      if (res.success && res.data) {
        return res.data.map(dbBookToLedger);
      }
      console.error('Failed to list books:', res.error);
      return [];
    },

    async add(name: string, description = ''): Promise<Ledger | null> {
      if (!isElectron()) return null;
      
      const res = await window.api!.books.add({ name, description });
      if (res.success && res.data) {
        return dbBookToLedger(res.data);
      }
      console.error('Failed to add book:', res.error);
      return null;
    },

    async update(id: string, data: { name?: string; description?: string }): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.books.update(Number(id), data);
      return res.success && res.data?.success === true;
    },

    async delete(id: string): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.books.delete(Number(id));
      return res.success && res.data?.success === true;
    },
  },

  // ==================== 成员 ====================
  members: {
    async list(): Promise<Member[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.members.list();
      if (res.success && res.data) {
        return res.data.map(dbMemberToMember);
      }
      console.error('Failed to list members:', res.error);
      return [];
    },

    async add(name: string, avatar = '👤'): Promise<Member | null> {
      if (!isElectron()) return null;
      
      const res = await window.api!.members.add({ name, avatar });
      if (res.success && res.data) {
        return dbMemberToMember(res.data);
      }
      console.error('Failed to add member:', res.error);
      return null;
    },

    async update(id: string, data: { name?: string; avatar?: string }): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.members.update(Number(id), data);
      return res.success && res.data?.success === true;
    },

    async delete(id: string): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.members.delete(Number(id));
      return res.success && res.data?.success === true;
    },
  },

  // ==================== 账目 ====================
  records: {
    async list(
      bookId: string,
      options?: {
        startDate?: string;
        endDate?: string;
        direction?: 'income' | 'expense';
        category?: string;
        memberId?: string;
      },
      categories?: Category[]
    ): Promise<Transaction[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.records.list(Number(bookId), {
        startDate: options?.startDate,
        endDate: options?.endDate,
        direction: options?.direction,
        category: options?.category,
        member_id: options?.memberId ? Number(options.memberId) : undefined,
      });
      
      if (res.success && res.data) {
        return res.data.map(record => {
          const category = categories?.find(c => c.id === record.category);
          return dbRecordToTransaction(record, bookId, category?.label || record.category);
        });
      }
      console.error('Failed to list records:', res.error);
      return [];
    },

    async add(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction | null> {
      if (!isElectron()) return null;
      
      const dbData = transactionToDbRecord(data, Number(data.ledgerId));
      const res = await window.api!.records.add(dbData);
      
      if (res.success && res.data) {
        return {
          id: String(res.data.id),
          ledgerId: data.ledgerId,
          type: data.type,
          amount: data.amount,
          date: data.date,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          memberId: data.memberId,
          note: data.note,
          createdAt: Date.now(),
        };
      }
      console.error('Failed to add record:', res.error);
      return null;
    },

    async update(id: string, data: Partial<Transaction>): Promise<boolean> {
      if (!isElectron()) return false;
      
      const updateData: Record<string, unknown> = {};
      if (data.memberId !== undefined) updateData.member_id = data.memberId ? Number(data.memberId) : null;
      if (data.type !== undefined) updateData.direction = data.type;
      if (data.categoryId !== undefined) updateData.category = data.categoryId;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.date !== undefined) updateData.date = data.date.split('T')[0];
      if (data.note !== undefined) updateData.note = data.note;
      
      const res = await window.api!.records.update(Number(id), updateData);
      return res.success && res.data?.success === true;
    },

    async delete(id: string): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.records.delete(Number(id));
      return res.success && res.data?.success === true;
    },

    async summary(
      bookId: string,
      options?: { startDate?: string; endDate?: string; memberId?: string }
    ): Promise<RecordSummary> {
      if (!isElectron()) return { income: 0, expense: 0, balance: 0 };
      
      const res = await window.api!.records.summary(Number(bookId), {
        startDate: options?.startDate,
        endDate: options?.endDate,
        member_id: options?.memberId ? Number(options.memberId) : undefined,
      });
      
      if (res.success && res.data) {
        return res.data;
      }
      return { income: 0, expense: 0, balance: 0 };
    },

    async categorySummary(
      bookId: string,
      options?: {
        direction?: 'income' | 'expense';
        startDate?: string;
        endDate?: string;
      }
    ): Promise<CategorySummaryItem[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.records.categorySummary(Number(bookId), options);
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },
  },

  // ==================== 预算 ====================
  budgets: {
    async list(bookId: string, options?: { direction?: 'income' | 'expense'; period?: string }): Promise<Budget[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.budgets.list(Number(bookId), {
        direction: options?.direction,
        period: options?.period as 'monthly' | 'quarterly' | 'yearly' | undefined,
      });
      
      if (res.success && res.data) {
        return res.data.map(b => dbBudgetToBudget(b, bookId));
      }
      return [];
    },

    async add(budget: Omit<Budget, 'id'>): Promise<Budget | null> {
      if (!isElectron()) return null;
      
      const date = new Date(budget.year, (budget.month || 1) - 1, 1);
      const res = await window.api!.budgets.add({
        book_id: Number(budget.ledgerId),
        direction: budget.type,
        category: budget.categoryId,
        amount: budget.amount,
        period: budget.period as 'monthly' | 'quarterly' | 'yearly',
        date: date.toISOString().split('T')[0],
      });
      
      if (res.success && res.data) {
        return dbBudgetToBudget(res.data, budget.ledgerId);
      }
      return null;
    },

    async update(id: string, data: Partial<Budget>): Promise<boolean> {
      if (!isElectron()) return false;
      
      const updateData: Record<string, unknown> = {};
      if (data.type !== undefined) updateData.direction = data.type;
      if (data.categoryId !== undefined) updateData.category = data.categoryId;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.period !== undefined) updateData.period = data.period;
      if (data.year !== undefined && data.month !== undefined) {
        const date = new Date(data.year, data.month - 1, 1);
        updateData.date = date.toISOString().split('T')[0];
      }
      
      const res = await window.api!.budgets.update(Number(id), updateData);
      return res.success && res.data?.success === true;
    },

    async delete(id: string): Promise<boolean> {
      if (!isElectron()) return false;
      
      const res = await window.api!.budgets.delete(Number(id));
      return res.success && res.data?.success === true;
    },

    async execution(
      bookId: string,
      options?: { startDate?: string; endDate?: string }
    ): Promise<BudgetExecution[]> {
      if (!isElectron()) return [];
      
      const res = await window.api!.budgets.execution(Number(bookId), options);
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    },
  },
};

export default apiService;

