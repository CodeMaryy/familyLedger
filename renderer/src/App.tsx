import React, { useState } from 'react';
import { StoreProvider } from './store';
import { AppLayout } from './components/Layout';
import { TransactionsView } from './components/TransactionsView';
import { ReportsView } from './components/ReportsView';
import { BudgetView } from './components/BudgetView';
import { SettingsView } from './components/SettingsView';
import { useStore } from './store';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './components/ui/dialog';
import { TransactionInput } from './components/TransactionInput';
import { Toaster } from './components/ui/sonner';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('transactions');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { transactions, activeLedgerId } = useStore();

  const renderView = () => {
    switch (currentView) {
      case 'transactions':
        return <TransactionsView />;
      case 'reports':
        return <ReportsView />;
      case 'budget':
        return <BudgetView />;
      case 'members':
      case 'settings':
        return <SettingsView />;
      default:
        return <TransactionsView />;
    }
  };

  return (
    <AppLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      onAddTransaction={() => setIsAddModalOpen(true)}
    >
      {renderView()}

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-2xl">
          <DialogTitle className="sr-only">记一笔</DialogTitle>
          <DialogDescription className="sr-only">添加新的记账记录</DialogDescription>
          <TransactionInput 
            onCancel={() => setIsAddModalOpen(false)} 
            onSuccess={() => setIsAddModalOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
      <Toaster />
    </StoreProvider>
  );
}
