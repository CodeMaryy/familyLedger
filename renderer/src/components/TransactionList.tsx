import React, { useState } from 'react';
import { Transaction } from '../types';
import { useStore } from '../store';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions }) => {
  const { deleteTransaction, updateTransaction, members, categories } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p>暂无记录</p>
      </div>
    );
  }

  // Group by Date
  const grouped = transactions.reduce((acc, t) => {
    const dateKey = format(parseISO(t.date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const startEditing = (t: Transaction) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const saveEditing = (id: string) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount > 0) {
      updateTransaction(id, { amount });
    }
    setEditingId(null);
    setEditAmount('');
  };

  return (
    <div className="space-y-6">
      {sortedDates.map(dateKey => {
        const dayTransactions = grouped[dateKey];
        const dateObj = parseISO(dateKey);
        
        let dateLabel = format(dateObj, 'M月d日 EEEE', { locale: zhCN });
        if (isToday(dateObj)) dateLabel = '今天 · ' + dateLabel;
        if (isYesterday(dateObj)) dateLabel = '昨天 · ' + dateLabel;

        const dayIncome = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const dayExpense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        return (
          <div key={dateKey}>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 mb-2">
              <h3 className="text-sm font-semibold text-slate-700">{dateLabel}</h3>
              <div className="text-xs text-slate-400">
                {dayIncome > 0 && <span className="mr-2 text-green-600">收: +{dayIncome.toFixed(2)}</span>}
                {dayExpense > 0 && <span className="text-red-600">支: -{dayExpense.toFixed(2)}</span>}
              </div>
            </div>
            <div className="space-y-1">
              {dayTransactions.map(t => {
                const member = members.find(m => m.id === t.memberId);
                const category = categories.find(c => c.id === t.categoryId);
                // Fallback icon if category deleted or custom
                const icon = category?.icon || (t.type === 'income' ? '💰' : '💸');
                
                return (
                  <div key={t.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className={cn(
                         "w-8 h-8 rounded-full flex items-center justify-center text-lg bg-slate-100",
                         t.type === 'income' ? "bg-green-50" : "bg-red-50"
                       )}>
                         {icon}
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{t.categoryName}</span>
                            {t.note && <span className="text-xs text-slate-500 truncate max-w-[150px]">- {t.note}</span>}
                         </div>
                         <div className="text-xs text-slate-400 flex items-center gap-1">
                           <span>{format(parseISO(t.date), 'HH:mm')}</span>
                           <span>·</span>
                           <span>{member?.avatar} {member?.name}</span>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                       {editingId === t.id ? (
                         <div className="flex items-center gap-1">
                           <Input 
                             type="number" 
                             value={editAmount}
                             onChange={(e) => setEditAmount(e.target.value)}
                             className="h-7 w-20 text-right text-sm px-1 py-0"
                             autoFocus
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') saveEditing(t.id);
                               if (e.key === 'Escape') cancelEditing();
                             }}
                           />
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => saveEditing(t.id)}>
                             <Check className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={cancelEditing}>
                             <X className="h-4 w-4" />
                           </Button>
                         </div>
                       ) : (
                         <>
                           <span 
                             className={cn(
                               "text-sm font-semibold cursor-pointer border-b border-transparent hover:border-slate-300 transition-colors",
                               t.type === 'income' ? "text-green-600" : "text-red-600"
                             )}
                             onClick={() => startEditing(t)}
                             title="点击修改金额"
                           >
                             {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}
                           </span>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                             onClick={() => deleteTransaction(t.id)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </>
                       )}
                     </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
