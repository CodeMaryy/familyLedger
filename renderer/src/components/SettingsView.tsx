import React, { useRef, useState } from 'react';
import { useStore } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Download, Upload, Plus, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

export const SettingsView: React.FC = () => {
  const { members, addMember, exportData, importData, ledgers, addLedger, setActiveLedger, activeLedgerId } = useStore();
  const [newMemberName, setNewMemberName] = useState('');
  const [newLedgerName, setNewLedgerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('备份已下载');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        importData(json);
        toast.success('数据导入成功');
      } catch (err) {
        toast.error('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addMember(newMemberName.trim());
      setNewMemberName('');
      toast.success('成员已添加');
    }
  };

  const handleAddLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLedgerName.trim()) {
      addLedger(newLedgerName.trim());
      setNewLedgerName('');
      toast.success('账本已创建');
    }
  };

  return (
    <div className="py-6 space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-slate-900">设置 & 管理</h1>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>家庭成员</CardTitle>
          <CardDescription>管理记账的家庭成员</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                <span className="text-xl bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">{member.avatar}</span>
                <span className="font-medium text-slate-700">{member.name}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddMember} className="flex gap-2 max-w-sm mt-4">
            <Input 
              placeholder="新成员昵称" 
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              添加
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Ledgers */}
      <Card>
        <CardHeader>
          <CardTitle>账本管理</CardTitle>
          <CardDescription>切换或添加新的家庭账本</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
             {ledgers.map(ledger => (
               <div key={ledger.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      {ledger.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{ledger.name}</p>
                      <p className="text-xs text-slate-500">ID: {ledger.id}</p>
                    </div>
                 </div>
                 {activeLedgerId !== ledger.id && (
                   <Button variant="outline" size="sm" onClick={() => setActiveLedger(ledger.id)}>切换至此</Button>
                 )}
                 {activeLedgerId === ledger.id && (
                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">当前使用</span>
                 )}
               </div>
             ))}
           </div>
           <form onSubmit={handleAddLedger} className="flex gap-2 max-w-sm mt-4">
            <Input 
              placeholder="新账本名称" 
              value={newLedgerName}
              onChange={(e) => setNewLedgerName(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Plus className="w-4 h-4 mr-2" />
              创建
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle>数据备份</CardTitle>
          <CardDescription>将数据导出为JSON文件，或从备份文件恢复</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            导出数据
          </Button>
          <div className="relative">
             <input 
               type="file" 
               ref={fileInputRef}
               onChange={handleImport}
               accept=".json"
               className="hidden"
             />
             <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
               <Upload className="w-4 h-4" />
               导入恢复
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
