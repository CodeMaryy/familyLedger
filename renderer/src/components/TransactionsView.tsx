import React, { useState } from 'react';
import { useStore } from '../store';
import { TransactionList } from './TransactionList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format, parseISO, isWithinInterval, getYear, startOfDay, endOfDay } from 'date-fns';
import { DateFilter } from './DateFilter';
import { DateFilterState } from '../types';

export const TransactionsView: React.FC = () => {
  const { transactions, activeLedgerId, members } = useStore();
  
  // State for filters
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'month',
    values: [format(new Date(), 'yyyy-MM')]
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');

  // Filter Transactions
  const activeTransactions = transactions
    .filter(t => t.ledgerId === activeLedgerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate available years for the filter
  const availableYears = Array.from(new Set(activeTransactions.map(t => getYear(parseISO(t.date))))).sort((a, b) => b - a);
  // Ensure current year is always available
  if (!availableYears.includes(new Date().getFullYear())) {
    availableYears.unshift(new Date().getFullYear());
    availableYears.sort((a, b) => b - a);
  }

  const filteredTransactions = activeTransactions.filter(t => {
    // 1. Date Filter
    const tDate = parseISO(t.date);
    let dateMatch = false;

    if (dateFilter.mode === 'year') {
      const y = getYear(tDate).toString();
      dateMatch = dateFilter.values.includes(y);
    } else if (dateFilter.mode === 'month') {
      const ym = format(tDate, 'yyyy-MM');
      dateMatch = dateFilter.values.includes(ym);
    } else if (dateFilter.mode === 'custom') {
      if (dateFilter.from) {
        const start = startOfDay(dateFilter.from);
        const end = dateFilter.to ? endOfDay(dateFilter.to) : endOfDay(dateFilter.from);
        dateMatch = isWithinInterval(tDate, { start, end });
      } else {
        dateMatch = true; 
      }
    }
    
    if (!dateMatch) return false;

    // 2. Type Filter
    if (typeFilter !== 'all' && t.type !== typeFilter) {
      return false;
    }

    // 3. Member Filter
    if (memberFilter !== 'all' && t.memberId !== memberFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">记账明细</h1>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
           {/* Date Filter */}
           <DateFilter 
             value={dateFilter} 
             onChange={setDateFilter} 
             availableYears={availableYears}
           />

           {/* Type Filter */}
           <Select value={typeFilter} onValueChange={setTypeFilter}>
             <SelectTrigger className="w-[120px] h-9">
               <SelectValue placeholder="类型" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">全部类型</SelectItem>
               <SelectItem value="income">收入</SelectItem>
               <SelectItem value="expense">支出</SelectItem>
             </SelectContent>
           </Select>

           {/* Member Filter */}
           <Select value={memberFilter} onValueChange={setMemberFilter}>
             <SelectTrigger className="w-[120px] h-9">
               <SelectValue placeholder="成员" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">全部成员</SelectItem>
               {members.map(m => (
                 <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      <TransactionList transactions={filteredTransactions} />
    </div>
  );
};
