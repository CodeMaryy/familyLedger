import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Inbox, 
  Calendar, 
  PieChart, 
  Users, 
  Settings, 
  BookOpen, 
  Menu,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';

// Navigation Items
const NAV_ITEMS = [
  { id: 'transactions', label: '记账明细', icon: Inbox, count: 'live' },
  { id: 'reports', label: '报表分析', icon: PieChart, count: null },
  { id: 'budget', label: '预算管理', icon: Calendar, count: null },
];

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onAddTransaction: () => void;
}

export const AppLayout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onViewChange,
  onAddTransaction 
}) => {
  const { ledgers, activeLedgerId, setActiveLedger, transactions, loading } = useStore();
  
  const activeLedger = ledgers.find(l => l.id === activeLedgerId) || ledgers[0];
  const transactionCount = transactions.filter(t => t.ledgerId === activeLedgerId).length;

  // 加载中或没有账本时显示提示
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      {/* Header / User Profile */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-200 p-2 rounded-lg transition-colors w-full">
          <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
            {activeLedger?.name?.[0] || '📚'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activeLedger?.name || '请创建账本'}</p>
            <p className="text-xs text-slate-500">家庭账本</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Add Button */}
      <div className="px-4 mb-4">
        <Button 
          onClick={onAddTransaction}
          className="w-full justify-start gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
        >
          <div className="bg-orange-500 rounded-full p-0.5">
            <Plus className="w-4 h-4" />
          </div>
          记一笔
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              currentView === item.id 
                ? "bg-orange-100 text-orange-900" 
                : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5",
              currentView === item.id ? "text-orange-600" : "text-slate-500"
            )} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count === 'live' && transactionCount > 0 && (
              <span className="text-xs text-slate-400 font-normal">{transactionCount}</span>
            )}
          </button>
        ))}

        <div className="mt-8 px-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            账本列表
          </h3>
          <div className="space-y-1">
            {ledgers.map(ledger => (
              <button
                key={ledger.id}
                onClick={() => setActiveLedger(ledger.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                  activeLedgerId === ledger.id
                    ? "bg-slate-200 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span className="truncate">{ledger.name}</span>
              </button>
            ))}
            <button
               onClick={() => onViewChange('settings')} // Placeholder for adding ledger
               className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加账本
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-200 space-y-1">
        <button 
           onClick={() => onViewChange('members')}
           className={cn(
             "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
             currentView === 'members' ? "bg-orange-100 text-orange-900" : "text-slate-700 hover:bg-slate-100"
           )}
        >
          <Users className="w-5 h-5 text-slate-500" />
          <span>家庭成员</span>
        </button>
        <button 
           onClick={() => onViewChange('settings')}
           className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            currentView === 'settings' ? "bg-orange-100 text-orange-900" : "text-slate-700 hover:bg-slate-100"
          )}
        >
          <Settings className="w-5 h-5 text-slate-500" />
          <span>设置 & 备份</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[280px] flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        <div className="max-w-5xl mx-auto min-h-full">
            {children}
        </div>
      </main>
    </div>
  );
};
