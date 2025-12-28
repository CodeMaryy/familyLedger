import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, subMonths, addMonths, subYears, addYears, format, isSameMonth, isSameYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CategoryType, TransactionType, Category } from '../types';
import { cn } from '../lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Wallet, PiggyBank, Plus, Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const BudgetView: React.FC = () => {
  const { transactions, activeLedgerId, budgets, setBudget, deleteBudget, categories, addCategory, deleteCategory } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('yearly');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [deleteTarget, setDeleteTarget] = useState<{ categoryId: string; type: TransactionType; open: boolean } | null>(null);
  
  // Popover state for date picker
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Scroll to active year when date picker opens
  useEffect(() => {
    if (isDateOpen) {
      // Use setTimeout to wait for the popover content to be rendered in the DOM
      const timer = setTimeout(() => {
        const activeYearEl = document.getElementById(`year-option-${currentDate.getFullYear()}`);
        if (activeYearEl) {
          activeYearEl.scrollIntoView({ block: 'center' });
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isDateOpen]);

  // New Category Form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📝');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');

  // Helpers
  const getCurrentInterval = () => {
    return viewMode === 'monthly' 
      ? { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
      : { start: startOfYear(currentDate), end: endOfYear(currentDate) };
  };

  const currentTransactions = transactions.filter(t => {
    if (t.ledgerId !== activeLedgerId) return false;
    const date = parseISO(t.date);
    return isWithinInterval(date, getCurrentInterval());
  });

  const getActualAmount = (categoryId: string) => {
    return currentTransactions
      .filter(t => t.categoryId === categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getBudgetObj = (categoryId: string, type: TransactionType) => {
    // 1. Precise lookup for current view mode and date
    const preciseBudget = budgets.find(b => 
      b.ledgerId === activeLedgerId && 
      b.categoryId === categoryId &&
      b.type === type &&
      b.period === viewMode &&
      b.year === currentDate.getFullYear() &&
      (viewMode === 'monthly' ? b.month === currentDate.getMonth() + 1 : true)
    );

    if (preciseBudget) return preciseBudget;

    // 2. "Automatic Association" for Yearly View
    // If in Yearly mode, and no explicit yearly budget set, sum up all monthly budgets for this year
    if (viewMode === 'yearly') {
      const yearMonthlyBudgets = budgets.filter(b => 
        b.ledgerId === activeLedgerId &&
        b.categoryId === categoryId &&
        b.type === type &&
        b.period === 'monthly' &&
        b.year === currentDate.getFullYear()
      );
      
      const sumAmount = yearMonthlyBudgets.reduce((sum, b) => sum + b.amount, 0);
      if (sumAmount > 0) {
        return { amount: sumAmount }; // Return a mock object with just amount
      }
    }

    return undefined;
  };

  const handleSaveBudget = (categoryId: string, categoryName: string, type: TransactionType) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount > 0) {
      setBudget({
        id: '', // Will be handled by store
        ledgerId: activeLedgerId,
        type,
        categoryId,
        categoryName,
        amount,
        period: viewMode,
        year: currentDate.getFullYear(),
        month: viewMode === 'monthly' ? currentDate.getMonth() + 1 : undefined
      });
    } else if (amount === 0) {
      // 如果输入为 0，删除预算
      const budgetToDelete = getBudgetObj(categoryId, type);
      if (budgetToDelete?.id) {
        deleteBudget(budgetToDelete.id);
      }
    }
    setEditingId(null);
    setEditAmount('');
  };

  const handleDeleteBudget = async (categoryId: string, type: TransactionType) => {
    console.log('[BudgetView] handleDeleteBudget called:', { categoryId, type });
    const budget = getBudgetObj(categoryId, type);
    console.log('[BudgetView] Found budget:', budget);
    if (budget?.id) {
      console.log('[BudgetView] Deleting budget with id:', budget.id);
      await deleteBudget(budget.id);
      setDeleteTarget(null);
      console.log('[BudgetView] Budget deleted successfully');
    } else {
      console.warn('[BudgetView] No budget found to delete');
    }
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    addCategory({
      label: newCatName,
      icon: newCatIcon,
      type: newCatType
    });
    setNewCatName('');
    setIsAddOpen(false);
  };

  // Navigation
  const handlePrev = () => {
    setCurrentDate(prev => viewMode === 'monthly' ? subMonths(prev, 1) : subYears(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === 'monthly' ? addMonths(prev, 1) : addYears(prev, 1));
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Calculations for Overview
  const calculateTotalBudget = (type: TransactionType) => {
    const cats = type === 'income' ? incomeCategories : expenseCategories;
    return cats.reduce((sum, cat) => {
      const b = getBudgetObj(cat.id, type);
      return sum + (b?.amount || 0);
    }, 0);
  };

  const totalIncomeBudget = calculateTotalBudget('income');
  const totalExpenseBudget = calculateTotalBudget('expense');
  const projectedBalance = totalIncomeBudget - totalExpenseBudget;
  const savingsRate = totalIncomeBudget > 0 ? (projectedBalance / totalIncomeBudget) * 100 : 0;

  const renderCategoryRow = (cat: Category) => {
    const budget = getBudgetObj(cat.id, cat.type);
    const actual = getActualAmount(cat.id);
    const budgetAmount = budget?.amount || 0;
    
    let percentage = 0;
    if (budgetAmount > 0) {
      percentage = (actual / budgetAmount) * 100;
    }

    const isOverBudget = cat.type === 'expense' && actual > budgetAmount && budgetAmount > 0;
    
    // Calculate share of total budget
    const totalBudget = cat.type === 'income' ? totalIncomeBudget : totalExpenseBudget;
    const budgetShare = totalBudget > 0 ? (budgetAmount / totalBudget) * 100 : 0;

    return (
      <div key={cat.id} className="group flex items-center justify-between p-4 bg-white rounded-lg border border-slate-100 hover:border-slate-300 transition-all shadow-sm">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl bg-slate-50 p-1.5 rounded-md">{cat.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{cat.label}</span>
                {budgetAmount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                    占{cat.type === 'income' ? '总收' : '总支'} {budgetShare.toFixed(0)}%
                  </span>
                )}
                {!cat.isDefault && (
                  <button onClick={() => deleteCategory(cat.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                实际: <span className={cn("font-medium", cat.type === 'income' ? "text-green-600" : "text-slate-600")}>¥{actual.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
             <div className="flex justify-between text-xs text-slate-500">
               <span>进度 {percentage.toFixed(0)}%</span>
               {isOverBudget && <span className="text-red-500 font-bold">超支</span>}
             </div>
             <Progress 
               value={Math.min(percentage, 100)} 
               className={cn("h-1.5")} 
               indicatorClassName={
                 cat.type === 'income' 
                   ? (percentage >= 100 ? "bg-green-500" : "bg-blue-500")
                   : (isOverBudget ? "bg-red-500" : (percentage > 80 ? "bg-yellow-500" : "bg-green-500"))
               } 
             />
          </div>
        </div>

        <div className="ml-6 flex flex-col items-end min-w-[120px]">
           <span className="text-xs text-slate-400 mb-1">预算目标</span>
           {editingId === cat.id ? (
              <div className="flex items-center gap-1">
                <Input 
                  type="number" 
                  className="h-8 w-24 text-right pr-2" 
                  value={editAmount}
                  autoFocus
                  onChange={(e) => setEditAmount(e.target.value)}
                  onBlur={() => handleSaveBudget(cat.id, cat.label, cat.type)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveBudget(cat.id, cat.label, cat.type);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditAmount('');
                    }
                  }}
                  placeholder="0"
                />
                {budgetAmount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ categoryId: cat.id, type: cat.type, open: true });
                    }}
                    className="opacity-70 hover:opacity-100 text-red-500 transition-opacity p-1"
                    title="删除预算"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div 
                  className="group-hover:bg-slate-50 px-2 py-1 rounded cursor-pointer transition-colors text-right"
                  onClick={() => { setEditingId(cat.id); setEditAmount(budgetAmount > 0 ? budgetAmount.toString() : ''); }}
                >
                   <span className={cn("text-lg font-bold font-mono border-b border-dashed border-slate-300", budgetAmount === 0 ? "text-slate-300" : "text-slate-700")}>
                     {budgetAmount > 0 ? `¥${budgetAmount.toLocaleString()}` : '未设置'}
                   </span>
                </div>
                {budgetAmount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ categoryId: cat.id, type: cat.type, open: true });
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1"
                    title="删除预算"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="py-6 space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">家庭规划与预算</h1>
           <p className="text-slate-500 text-sm mt-1">
             设定与监控家庭收支目标
           </p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Date Navigation with Popover */}
           <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
              <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                   <button className="px-3 py-1 font-medium text-slate-700 min-w-[100px] text-center text-sm hover:bg-slate-100 rounded transition-colors select-none">
                     {viewMode === 'monthly' ? format(currentDate, 'yyyy年MM月', { locale: zhCN }) : format(currentDate, 'yyyy年', { locale: zhCN })}
                   </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                   <div className="flex h-[300px]">
                      {/* Year Column */}
                      <div className="w-[120px] border-r border-slate-100 overflow-y-auto p-1">
                         {Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - 20 + i).map(year => (
                            <button
                              key={year}
                              id={`year-option-${year}`}
                              onClick={() => {
                                 const newDate = new Date(currentDate);
                                 newDate.setFullYear(year);
                                 setCurrentDate(newDate);
                                 if (viewMode === 'yearly') setIsDateOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                currentDate.getFullYear() === year ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              )}
                            >
                              {year}年
                            </button>
                         ))}
                      </div>

                      {/* Month Column (Only for Monthly view) */}
                      {viewMode === 'monthly' && (
                        <div className="w-[180px] p-2 overflow-y-auto">
                           <div className="text-xs font-medium text-slate-400 mb-2 px-1">选择月份</div>
                           <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: 12 }, (_, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                     const newDate = new Date(currentDate);
                                     newDate.setMonth(i);
                                     setCurrentDate(newDate);
                                     setIsDateOpen(false);
                                  }}
                                  className={cn(
                                    "text-sm py-2 rounded-md transition-colors border border-transparent",
                                    currentDate.getMonth() === i ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 border-slate-100"
                                  )}
                                >
                                  {i + 1}月
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>
                </PopoverContent>
              </Popover>

              <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
           </div>

           {/* Mode Switch */}
           <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <button 
                onClick={() => setViewMode('monthly')}
                className={cn("px-4 py-1.5 text-sm rounded-md transition-all font-medium", viewMode === 'monthly' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
              >
                月度
              </button>
              <div className="w-px h-4 bg-slate-200"></div>
              <button 
                onClick={() => setViewMode('yearly')}
                className={cn("px-4 py-1.5 text-sm rounded-md transition-all font-medium", viewMode === 'yearly' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
              >
                年度
              </button>
          </div>
        </div>
      </div>

      {/* Planning Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">预计总收入</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">¥{totalIncomeBudget.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">基于下方设定目标</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-slate-600">预算总支出</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">¥{totalExpenseBudget.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">基于下方设定限额</p>
          </CardContent>
        </Card>

        <Card className={cn("border-l-4", projectedBalance >= 0 ? "border-l-green-500 bg-green-50/50" : "border-l-red-500 bg-red-50/50")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className={cn("h-5 w-5", projectedBalance >= 0 ? "text-green-600" : "text-red-600")} />
              <span className="text-sm font-medium text-slate-600">预计结余</span>
            </div>
            <div className={cn("text-2xl font-bold", projectedBalance >= 0 ? "text-green-700" : "text-red-700")}>
              {projectedBalance >= 0 ? '+' : ''}¥{projectedBalance.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">收入 - 支出</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">计划储蓄率</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{savingsRate.toFixed(1)}%</div>
            <Progress value={savingsRate} className="h-1.5 mt-2 bg-slate-200" indicatorClassName="bg-purple-600" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between pb-2 border-b border-slate-100">
             <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
               <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
               收入规划
             </h2>
             <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
               <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600">
                    <Plus className="h-4 w-4 mr-1" />
                    添加项目
                  </Button>
               </DialogTrigger>
               <DialogContent>
                 <DialogHeader>
                   <DialogTitle>添加新分类</DialogTitle>
                   <DialogDescription>
                     创建一个新的收入或支出分类，以便更好地管理家庭预算。
                   </DialogDescription>
                 </DialogHeader>
                 <div className="space-y-4 py-4">
                   <div className="space-y-2">
                     <Label>分类名称</Label>
                     <Input placeholder="例如: 股票分红" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <Label>类型</Label>
                     <Select value={newCatType} onValueChange={(v) => setNewCatType(v as TransactionType)}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="income">收入</SelectItem>
                         <SelectItem value="expense">支出</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>图标 (Emoji)</Label>
                     <Input placeholder="例如: 💰" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button onClick={handleAddCategory}>添加</Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           </div>
           <div className="space-y-3">
             {incomeCategories.map(cat => renderCategoryRow(cat))}
             {incomeCategories.length === 0 && (
               <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-lg">
                 暂无收入项目
               </div>
             )}
           </div>
        </section>

        {/* Expense Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between pb-2 border-b border-slate-100">
             <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
               <span className="w-1 h-5 bg-orange-500 rounded-full"></span>
               支出预算
             </h2>
             <Button variant="ghost" size="sm" className="text-slate-500 hover:text-orange-600" onClick={() => setIsAddOpen(true)}>
               <Plus className="h-4 w-4 mr-1" />
               添加项目
             </Button>
           </div>
           <div className="space-y-3">
             {expenseCategories.map(cat => renderCategoryRow(cat))}
           </div>
        </section>
      </div>

      {/* 删除确认对话框 */}
      {deleteTarget && (() => {
        const cat = categories.find(c => c.id === deleteTarget.categoryId && c.type === deleteTarget.type);
        const budget = getBudgetObj(deleteTarget.categoryId, deleteTarget.type);
        console.log('[BudgetView] Rendering delete dialog:', { deleteTarget, cat, budget });
        return (
          <AlertDialog 
            open={deleteTarget.open}
            onOpenChange={(open) => {
              console.log('[BudgetView] Dialog open changed:', open);
              if (!open) {
                setDeleteTarget(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除预算</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除 <strong>{cat?.label || ''}</strong> 的预算（¥{budget?.amount.toLocaleString() || 0}）吗？此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-end' }}>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('[BudgetView] Delete button clicked');
                    if (deleteTarget) {
                      handleDeleteBudget(deleteTarget.categoryId, deleteTarget.type);
                    }
                  }} 
                  style={{ backgroundColor: '#dc2626', color: 'white' }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

    </div>
  );
};
