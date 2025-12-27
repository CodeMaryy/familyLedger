import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Charts } from './Charts';
import { parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export const ReportsView: React.FC = () => {
  const { transactions, activeLedgerId, budgets } = useStore();
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const activeTransactions = transactions.filter(t => t.ledgerId === activeLedgerId);
  const activeBudgets = budgets.filter(b => b.ledgerId === activeLedgerId);
  
  // Filter by year
  const yearTransactions = activeTransactions.filter(t => parseISO(t.date).getFullYear().toString() === year);
  
  // Stats
  const income = yearTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = yearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const lastYear = (parseInt(year) - 1).toString();
  const lastYearTransactions = activeTransactions.filter(t => parseISO(t.date).getFullYear().toString() === lastYear);
  const lastYearIncome = lastYearTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastYearExpense = lastYearTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastYearBalance = lastYearIncome - lastYearExpense;

  // Prepare Chart Data for 3-Pillar View
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // Filter transactions for this month
    const monthTrans = yearTransactions.filter(t => {
      const d = parseISO(t.date);
      return d.getMonth() + 1 === month;
    });
    
    const mIncome = monthTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const mExpense = monthTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    // Calculate Budget (Expense Budget)
    const monthBudgets = activeBudgets.filter(b => 
      b.period === 'monthly' && 
      b.type === 'expense' && 
      b.year === parseInt(year) && 
      b.month === month
    );
    const mBudget = monthBudgets.reduce((s, b) => s + b.amount, 0);
    
    return {
      name: `${month}月`,
      income: mIncome,
      expense: mExpense,
      budget: mBudget
    };
  });

  // Calculate Cumulative Trend
  let runningBalance = 0;
  const trendData = chartData.map(item => {
    const net = item.income - item.expense;
    runningBalance += net;
    return {
      name: item.name,
      balance: runningBalance,
      net: net
    };
  });

  return (
    <div className="py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">年度报表</h1>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="年份" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2023">2023年</SelectItem>
            <SelectItem value="2024">2024年</SelectItem>
            <SelectItem value="2025">2025年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-sm text-green-600 mb-1">年度总收入</p>
          <p className="text-2xl font-bold text-green-700">+{income.toFixed(2)}</p>
          <p className="text-xs text-green-500 mt-1">去年: +{lastYearIncome.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
          <p className="text-sm text-red-600 mb-1">年度总支出</p>
          <p className="text-2xl font-bold text-red-700">-{expense.toFixed(2)}</p>
          <p className="text-xs text-red-500 mt-1">去年: -{lastYearExpense.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600 mb-1">年度结余</p>
          <p className="text-2xl font-bold text-blue-700">{balance > 0 ? '+' : ''}{balance.toFixed(2)}</p>
          <p className="text-xs text-blue-500 mt-1">去年: {lastYearBalance > 0 ? '+' : ''}{lastYearBalance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle>预算执行趋势 (收支与预算)</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="w-full">
               <ResponsiveContainer width="100%" height={350}>
                 <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                   <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                   />
                   <Legend iconType="circle" />
                   <Bar dataKey="income" name="实际收入" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="budget" name="支出预算" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                   <Bar dataKey="expense" name="实际支出" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
             <CardTitle>年度资产累计趋势</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="w-full">
               <ResponsiveContainer width="100%" height={300}>
                 <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                   <Tooltip 
                     cursor={{ stroke: '#cbd5e1' }}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                   />
                   <Legend iconType="circle" />
                   <Line type="monotone" dataKey="balance" name="累计结余" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                   <Line type="monotone" dataKey="net" name="月度净值" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>收入构成 (年度)</CardTitle>
          </CardHeader>
          <CardContent>
            <Charts type="distribution" dataType="income" transactions={yearTransactions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
             <CardTitle>支出构成 (年度)</CardTitle>
          </CardHeader>
          <CardContent>
             <Charts type="distribution" dataType="expense" transactions={yearTransactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
