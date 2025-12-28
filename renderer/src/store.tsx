import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppData, Transaction, Member, Ledger, Budget, Category, TransactionType } from './types';
import { apiService, isElectron } from './services/api';

// Initial Categories
const DEFAULT_CATEGORIES: Category[] = [
  // Expense
  { id: 'food', label: '餐饮美食', icon: '🍚', type: 'expense', isDefault: true },
  { id: 'transport', label: '交通出行', icon: '🚗', type: 'expense', isDefault: true },
  { id: 'shopping', label: '购物消费', icon: '🛍️', type: 'expense', isDefault: true },
  { id: 'housing', label: '居住物业', icon: '🏠', type: 'expense', isDefault: true },
  { id: 'entertainment', label: '休闲娱乐', icon: '🎮', type: 'expense', isDefault: true },
  { id: 'health', label: '医疗健康', icon: '💊', type: 'expense', isDefault: true },
  { id: 'other', label: '其他支出', icon: '📝', type: 'expense', isDefault: true },
  // Income
  { id: 'salary', label: '工资薪水', icon: '💰', type: 'income', isDefault: true },
  { id: 'bonus', label: '奖金福利', icon: '🧧', type: 'income', isDefault: true },
  { id: 'investment', label: '投资理财', icon: '📈', type: 'income', isDefault: true },
  { id: 'media', label: '自媒体', icon: '📹', type: 'income', isDefault: true },
  { id: 'custom', label: '其他收入', icon: '➕', type: 'income', isDefault: true },
];

const defaultData: AppData = {
  activeLedgerId: '',
  ledgers: [],
  members: [],
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  budgets: []
};

interface StoreContextType extends AppData {
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addMember: (name: string) => Promise<void>;
  updateMember: (id: string, data: { name?: string; avatar?: string }) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setActiveLedger: (id: string) => void;
  addLedger: (name: string) => Promise<void>;
  updateLedger: (id: string, data: { name?: string }) => Promise<void>;
  deleteLedger: (id: string) => Promise<void>;
  setBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => void;
  deleteCategory: (id: string) => void;
  importData: (data: AppData) => void;
  exportData: () => string;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);

  // 从后端加载所有数据
  const loadData = useCallback(async () => {
    if (!isElectron()) {
      // 非 Electron 环境，从 localStorage 加载
      try {
        const saved = localStorage.getItem('familyLedgerData');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!parsed.categories) {
            parsed.categories = DEFAULT_CATEGORIES;
          }
          setData(parsed);
        }
      } catch (e) {
        console.error('Failed to load data from localStorage', e);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 并行加载账本和成员
      const [ledgers, members] = await Promise.all([
        apiService.books.list(),
        apiService.members.list(),
      ]);

      // 确定活跃账本
      let activeLedgerId = data.activeLedgerId;
      if (!activeLedgerId && ledgers.length > 0) {
        activeLedgerId = ledgers[0].id;
      }

      // 如果有活跃账本，加载该账本的交易和预算
      let transactions: Transaction[] = [];
      let budgets: Budget[] = [];

      if (activeLedgerId) {
        const [recordsList, budgetsList] = await Promise.all([
          apiService.records.list(activeLedgerId, {}, DEFAULT_CATEGORIES),
          apiService.budgets.list(activeLedgerId),
        ]);
        transactions = recordsList;
        budgets = budgetsList;
      }

      // 从 localStorage 加载分类（分类暂时保存在本地）
      let categories = DEFAULT_CATEGORIES;
      try {
        const savedCategories = localStorage.getItem('familyLedgerCategories');
        if (savedCategories) {
          categories = JSON.parse(savedCategories);
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      }

      setData({
        activeLedgerId,
        ledgers,
        members,
        categories,
        transactions,
        budgets,
      });
    } catch (error) {
      console.error('Failed to load data from backend:', error);
    } finally {
      setLoading(false);
    }
  }, [data.activeLedgerId]);

  // 初始化加载
  useEffect(() => {
    loadData();
  }, []);

  // 切换账本时重新加载交易和预算
  const loadLedgerData = useCallback(async (ledgerId: string) => {
    if (!isElectron() || !ledgerId) return;

    try {
      const [transactions, budgets] = await Promise.all([
        apiService.records.list(ledgerId, {}, data.categories),
        apiService.budgets.list(ledgerId),
      ]);

      setData(prev => ({
        ...prev,
        activeLedgerId: ledgerId,
        transactions,
        budgets,
      }));
    } catch (error) {
      console.error('Failed to load ledger data:', error);
    }
  }, [data.categories]);

  // 保存分类到 localStorage
  useEffect(() => {
    localStorage.setItem('familyLedgerCategories', JSON.stringify(data.categories));
  }, [data.categories]);

  // 非 Electron 环境下保存到 localStorage
  useEffect(() => {
    if (!isElectron()) {
      localStorage.setItem('familyLedgerData', JSON.stringify(data));
    }
  }, [data]);

  // ==================== 交易操作 ====================
  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!isElectron()) {
      // localStorage fallback
      const newTransaction: Transaction = {
        ...t,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      };
      setData(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
      return;
    }

    const result = await apiService.records.add(t);
    if (result) {
      setData(prev => ({ ...prev, transactions: [result, ...prev.transactions] }));
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
      return;
    }

    const success = await apiService.records.update(id, updates);
    if (success) {
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
      return;
    }

    const success = await apiService.records.delete(id);
    if (success) {
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      }));
    }
  };

  // ==================== 成员操作 ====================
  const addMember = async (name: string) => {
    if (!isElectron()) {
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        avatar: '👤'
      };
      setData(prev => ({ ...prev, members: [...prev.members, newMember] }));
      return;
    }

    const result = await apiService.members.add(name);
    if (result) {
      setData(prev => ({ ...prev, members: [...prev.members, result] }));
    }
  };

  const updateMember = async (id: string, memberData: { name?: string; avatar?: string }) => {
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        members: prev.members.map(m => m.id === id ? { ...m, ...memberData } : m)
      }));
      return;
    }

    const success = await apiService.members.update(id, memberData);
    if (success) {
      setData(prev => ({
        ...prev,
        members: prev.members.map(m => m.id === id ? { ...m, ...memberData } : m)
      }));
    }
  };

  const deleteMember = async (id: string) => {
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== id)
      }));
      return;
    }

    const success = await apiService.members.delete(id);
    if (success) {
      setData(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== id)
      }));
    }
  };

  // ==================== 账本操作 ====================
  const setActiveLedger = (id: string) => {
    if (id !== data.activeLedgerId) {
      loadLedgerData(id);
    }
  };

  const addLedger = async (name: string) => {
    if (!isElectron()) {
      const newLedger: Ledger = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        currency: 'CNY'
      };
      setData(prev => ({ 
        ...prev, 
        ledgers: [...prev.ledgers, newLedger], 
        activeLedgerId: newLedger.id,
        transactions: [],
        budgets: [],
      }));
      return;
    }

    const result = await apiService.books.add(name);
    if (result) {
      setData(prev => ({ 
        ...prev, 
        ledgers: [...prev.ledgers, result], 
        activeLedgerId: result.id,
        transactions: [],
        budgets: [],
      }));
    }
  };

  const updateLedger = async (id: string, ledgerData: { name?: string }) => {
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        ledgers: prev.ledgers.map(l => l.id === id ? { ...l, ...ledgerData } : l)
      }));
      return;
    }

    const success = await apiService.books.update(id, ledgerData);
    if (success) {
      setData(prev => ({
        ...prev,
        ledgers: prev.ledgers.map(l => l.id === id ? { ...l, ...ledgerData } : l)
      }));
    }
  };

  const deleteLedger = async (id: string) => {
    if (!isElectron()) {
      setData(prev => {
        const newLedgers = prev.ledgers.filter(l => l.id !== id);
        return {
          ...prev,
          ledgers: newLedgers,
          activeLedgerId: newLedgers.length > 0 ? newLedgers[0].id : '',
        };
      });
      return;
    }

    const success = await apiService.books.delete(id);
    if (success) {
      setData(prev => {
        const newLedgers = prev.ledgers.filter(l => l.id !== id);
        const newActiveLedgerId = newLedgers.length > 0 ? newLedgers[0].id : '';
        return {
          ...prev,
          ledgers: newLedgers,
          activeLedgerId: newActiveLedgerId,
        };
      });
      // 如果有新的活跃账本，加载其数据
      const remainingLedgers = data.ledgers.filter(l => l.id !== id);
      if (remainingLedgers.length > 0) {
        loadLedgerData(remainingLedgers[0].id);
      }
    }
  };

  // ==================== 预算操作 ====================
  const setBudget = async (budget: Budget) => {
    if (!isElectron()) {
      setData(prev => {
        const exists = prev.budgets.find(b => 
          b.ledgerId === budget.ledgerId && 
          b.categoryId === budget.categoryId && 
          b.year === budget.year && 
          b.period === budget.period &&
          (budget.period === 'monthly' ? b.month === budget.month : true)
        );
        
        let newBudgets = [...prev.budgets];
        if (exists) {
          newBudgets = newBudgets.map(b => b.id === exists.id ? { ...budget, id: exists.id } : b);
        } else {
          newBudgets.push({ ...budget, id: Math.random().toString(36).substr(2, 9) });
        }
        return { ...prev, budgets: newBudgets };
      });
      return;
    }

    // 检查是否存在
    const exists = data.budgets.find(b => 
      b.ledgerId === budget.ledgerId && 
      b.categoryId === budget.categoryId && 
      b.year === budget.year && 
      b.period === budget.period &&
      (budget.period === 'monthly' ? b.month === budget.month : true)
    );

    if (exists) {
      // 更新现有预算
      const success = await apiService.budgets.update(exists.id, budget);
      if (success) {
        setData(prev => ({
          ...prev,
          budgets: prev.budgets.map(b => b.id === exists.id ? { ...budget, id: exists.id } : b)
        }));
      }
    } else {
      // 创建新预算
      const result = await apiService.budgets.add(budget);
      if (result) {
        setData(prev => ({ ...prev, budgets: [...prev.budgets, result] }));
      }
    }
  };

  const deleteBudget = async (id: string) => {
    console.log('[Store] deleteBudget called with id:', id);
    if (!isElectron()) {
      setData(prev => ({
        ...prev,
        budgets: prev.budgets.filter(b => b.id !== id)
      }));
      return;
    }

    const success = await apiService.budgets.delete(id);
    console.log('[Store] deleteBudget result:', success);
    if (success) {
      // 删除成功后刷新数据，确保从数据库重新加载
      console.log('[Store] Refreshing data after delete...');
      await refreshData();
    } else {
      console.error('[Store] Failed to delete budget');
    }
  };

  // ==================== 分类操作（本地存储） ====================
  const addCategory = (category: Omit<Category, 'id' | 'isDefault'>) => {
    const newCategory: Category = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      isDefault: false
    };
    setData(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
  };

  const deleteCategory = (id: string) => {
    setData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id)
    }));
  };

  // ==================== 导入导出 ====================
  const importData = (newData: AppData) => {
    if (!newData.categories) newData.categories = DEFAULT_CATEGORIES;
    setData(newData);
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  const refreshData = useCallback(async () => {
    console.log('[Store] refreshData called');
    await loadData();
  }, [loadData]);

  return (
    <StoreContext.Provider value={{ 
      ...data,
      loading,
      addTransaction,
      updateTransaction, 
      deleteTransaction, 
      addMember,
      updateMember,
      deleteMember,
      setActiveLedger, 
      addLedger,
      updateLedger,
      deleteLedger,
      setBudget,
      deleteBudget,
      addCategory,
      deleteCategory,
      importData, 
      exportData,
      refreshData,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
