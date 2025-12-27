import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData, Transaction, Member, Ledger, Budget, Category, CategoryType, TransactionType } from './types';

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
  activeLedgerId: 'ledger-1',
  ledgers: [
    { id: 'ledger-1', name: '家庭默认账本', currency: 'CNY' },
    { id: 'ledger-2', name: '装修专项', currency: 'CNY' },
  ],
  members: [
    { id: 'm-1', name: '爸爸', avatar: '👨' },
    { id: 'm-2', name: '妈妈', avatar: '👩' },
    { id: 'm-3', name: '宝宝', avatar: '👶' },
  ],
  categories: DEFAULT_CATEGORIES,
  transactions: [
    {
      id: 't-1',
      ledgerId: 'ledger-1',
      type: 'expense',
      amount: 45.50,
      date: new Date().toISOString(),
      categoryId: 'food',
      categoryName: '吃饭',
      memberId: 'm-1',
      note: '午餐',
      createdAt: Date.now(),
    },
    {
      id: 't-2',
      ledgerId: 'ledger-1',
      type: 'income',
      amount: 15000,
      date: new Date(new Date().setDate(1)).toISOString(), // 1st of this month
      categoryId: 'salary',
      categoryName: '工资',
      memberId: 'm-1',
      note: '一月工资',
      createdAt: Date.now(),
    }
  ],
  budgets: [
    {
      id: 'b-1',
      ledgerId: 'ledger-1',
      type: 'expense',
      categoryId: 'food',
      categoryName: '吃饭',
      amount: 3000,
      period: 'monthly',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    }
  ]
};

interface StoreContextType extends AppData {
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;
  addMember: (name: string) => void;
  setActiveLedger: (id: string) => void;
  addLedger: (name: string) => void;
  setBudget: (budget: Budget) => void;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => void;
  deleteCategory: (id: string) => void;
  importData: (data: AppData) => void;
  exportData: () => string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem('familyLedgerData');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migration: Ensure categories exist
        if (!parsed.categories) {
          parsed.categories = DEFAULT_CATEGORIES;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
    return defaultData;
  });

  useEffect(() => {
    localStorage.setItem('familyLedgerData', JSON.stringify(data));
  }, [data]);

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    setData(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
  };

  const updateTransaction = (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
    }));
  };

  const deleteTransaction = (id: string) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id)
    }));
  };

  const addMember = (name: string) => {
    const newMember: Member = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      avatar: '👤'
    };
    setData(prev => ({ ...prev, members: [...prev.members, newMember] }));
  };

  const setActiveLedger = (id: string) => {
    setData(prev => ({ ...prev, activeLedgerId: id }));
  };

  const addLedger = (name: string) => {
    const newLedger: Ledger = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      currency: 'CNY'
    };
    setData(prev => ({ ...prev, ledgers: [...prev.ledgers, newLedger], activeLedgerId: newLedger.id }));
  };

  const setBudget = (budget: Budget) => {
    setData(prev => {
      // Check if exists
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
  };

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

  const importData = (newData: AppData) => {
    // Ensure migrated structure
    if (!newData.categories) newData.categories = DEFAULT_CATEGORIES;
    setData(newData);
  };

  const exportData = () => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <StoreContext.Provider value={{ 
      ...data, 
      addTransaction,
      updateTransaction, 
      deleteTransaction, 
      addMember, 
      setActiveLedger, 
      addLedger, 
      setBudget, 
      addCategory,
      deleteCategory,
      importData, 
      exportData 
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
