import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Area
} from 'recharts';
import { Transaction, TransactionType, Budget } from '../types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ChartsProps {
  transactions: Transaction[];
  budgets?: Budget[];
  type: 'trend' | 'distribution' | 'comparison' | 'budget-analysis';
  dataType?: 'income' | 'expense';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export const Charts: React.FC<ChartsProps> = ({ transactions, budgets = [], type, dataType = 'expense' }) => {
  
  if (type === 'trend') {
    // Total Assets Trend (Cumulative Balance over time)
    // For simplicity, let's show daily balance changes for the current month
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const days = eachDayOfInterval({ start, end });

    let runningBalance = 0;
    const data = days.map(day => {
      const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), day));
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      runningBalance += (income - expense);
      return {
        date: format(day, 'MM-dd'),
        balance: runningBalance,
        income,
        expense
      };
    });

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{fontSize: 12}} />
          <YAxis tick={{fontSize: 12}} />
          <Tooltip />
          <Line type="monotone" dataKey="balance" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'distribution') {
    // Distribution by Category
    const filteredTransactions = transactions.filter(t => t.type === dataType);
    const categoryTotals = filteredTransactions.reduce((acc, t) => {
      acc[t.categoryName] = (acc[t.categoryName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'comparison') {
    // Monthly Income vs Expense
    // Let's do last 6 months
    const data = []; // To be implemented properly, but keeping it simple for now (Current Month)
    
    // Group by month
    const monthlyData: Record<string, { income: number, expense: number }> = {};
    
    transactions.forEach(t => {
        const monthKey = format(parseISO(t.date), 'yyyy-MM');
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyData[monthKey].income += t.amount;
        else monthlyData[monthKey].expense += t.amount;
    });

    const chartData = Object.entries(monthlyData)
        .map(([date, vals]) => ({ date, ...vals }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-6); // Last 6 months

    return (
       <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{fontSize: 12}} />
          <YAxis tick={{fontSize: 12}} />
          <Tooltip />
          <Legend />
          <Bar dataKey="income" fill="#22c55e" name="收入" />
          <Bar dataKey="expense" fill="#ef4444" name="支出" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'budget-analysis') {
    // Show Actual Expense vs Budget Limit per month
    // Also showing Income for context
    const monthlyData: Record<string, { month: string, expense: number, budget: number, income: number }> = {};
    
    // Initialize for all months in the dataset (or at least the ones with transactions)
    // Better to just show the months present in transactions for now
    
    transactions.forEach(t => {
      const monthKey = format(parseISO(t.date), 'yyyy-MM');
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { month: monthKey, expense: 0, budget: 0, income: 0 };
      if (t.type === 'expense') monthlyData[monthKey].expense += t.amount;
      else if (t.type === 'income') monthlyData[monthKey].income += t.amount;
    });

    // Calculate Budget for each month
    Object.keys(monthlyData).forEach(monthKey => {
      const [y, m] = monthKey.split('-').map(Number);
      // Sum up monthly budgets for this month
      // Note: yearly budgets should be divided by 12? Or handled separately? 
      // For simplicity, we only sum up 'monthly' budgets here as that's the primary tracking mechanism
      const monthBudgets = budgets.filter(b => b.period === 'monthly' && b.type === 'expense' && b.year === y && b.month === m);
      const totalBudget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
      monthlyData[monthKey].budget = totalBudget;
    });

    const chartData = Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{fontSize: 12}} />
          <YAxis tick={{fontSize: 12}} />
          <Tooltip />
          <Legend />
          <Bar dataKey="expense" name="实际支出" fill="#f97316" barSize={20} />
          <Line type="monotone" dataKey="budget" name="支出预算" stroke="#ef4444" strokeWidth={3} dot={{r: 4}} />
          <Area type="monotone" dataKey="income" name="实际收入" fill="#22c55e" stroke="#16a34a" fillOpacity={0.1} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return null;
};
