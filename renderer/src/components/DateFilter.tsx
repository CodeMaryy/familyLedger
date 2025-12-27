import React, { useState, useEffect } from 'react';
import { DateFilterState } from '../types';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '../lib/utils';
import { format, parse, getYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface DateFilterProps {
  value: DateFilterState;
  onChange: (value: DateFilterState) => void;
  availableYears?: number[];
}

export const DateFilter: React.FC<DateFilterProps> = ({ value, onChange, availableYears }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Local state for the filter being built
  const [activeTab, setActiveTab] = useState<string>(value.mode);
  
  // Year Mode State
  const [selectedYears, setSelectedYears] = useState<string[]>(
    value.mode === 'year' ? value.values : [new Date().getFullYear().toString()]
  );
  
  // Month Mode State
  const [currentMonthYear, setCurrentMonthYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonths, setSelectedMonths] = useState<string[]>(
    value.mode === 'month' ? value.values : [format(new Date(), 'yyyy-MM')]
  );

  // Custom Mode State
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date } | undefined>(
    value.mode === 'custom' ? { from: value.from, to: value.to } : undefined
  );

  // Sync when value prop changes
  useEffect(() => {
    setActiveTab(value.mode);
    if (value.mode === 'year') {
      setSelectedYears(value.values);
    } else if (value.mode === 'month') {
      setSelectedMonths(value.values);
      // Try to set the year viewer to the first selected month's year
      if (value.values.length > 0) {
        setCurrentMonthYear(value.values[0].split('-')[0]);
      }
    } else if (value.mode === 'custom') {
      setDateRange({ from: value.from, to: value.to });
    }
  }, [value, isOpen]);

  const years = availableYears || Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i + 1).sort((a, b) => b - a);

  const handleApply = () => {
    if (activeTab === 'year') {
      onChange({ mode: 'year', values: selectedYears });
    } else if (activeTab === 'month') {
      onChange({ mode: 'month', values: selectedMonths });
    } else if (activeTab === 'custom' && dateRange?.from) {
      onChange({ mode: 'custom', from: dateRange.from, to: dateRange.to });
    }
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (value.mode === 'year') {
      if (value.values.length === 0) return '选择年份';
      if (value.values.length <= 2) return value.values.join(', ') + '年';
      return `${value.values.length}个年份`;
    }
    if (value.mode === 'month') {
      if (value.values.length === 0) return '选择月份';
      if (value.values.length === 1) {
          const [y, m] = value.values[0].split('-');
          return `${y}年${m}月`;
      }
      return `${value.values.length}个月份`;
    }
    if (value.mode === 'custom') {
      if (!value.from) return '选择日期范围';
      const fromStr = format(value.from, 'yyyy/MM/dd');
      if (!value.to) return fromStr;
      return `${fromStr} - ${format(value.to, 'yyyy/MM/dd')}`;
    }
    return '日期筛选';
  };

  const toggleYear = (year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) return prev.filter(y => y !== year);
      return [...prev, year].sort().reverse();
    });
  };

  const toggleMonth = (monthStr: string) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthStr)) return prev.filter(m => m !== monthStr);
      return [...prev, monthStr].sort().reverse();
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[260px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4 py-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="year">按年</TabsTrigger>
              <TabsTrigger value="month">按月</TabsTrigger>
              <TabsTrigger value="custom">自定义</TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-4 space-y-4">
            {/* YEAR VIEW */}
            <TabsContent value="year" className="mt-0 space-y-4">
               <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                 {years.map(year => {
                   const yStr = year.toString();
                   return (
                     <div key={yStr} className="flex items-center space-x-2">
                       <Checkbox 
                         id={`year-${yStr}`} 
                         checked={selectedYears.includes(yStr)}
                         onCheckedChange={() => toggleYear(yStr)}
                       />
                       <Label htmlFor={`year-${yStr}`} className="cursor-pointer">{yStr}年</Label>
                     </div>
                   );
                 })}
               </div>
            </TabsContent>

            {/* MONTH VIEW */}
            <TabsContent value="month" className="mt-0 space-y-4">
               <div className="flex justify-between items-center mb-4">
                  <Select value={currentMonthYear} onValueChange={setCurrentMonthYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}年</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div className="grid grid-cols-4 gap-2">
                 {Array.from({ length: 12 }, (_, i) => {
                   const m = i + 1;
                   const mStr = m.toString().padStart(2, '0');
                   const fullStr = `${currentMonthYear}-${mStr}`;
                   const isSelected = selectedMonths.includes(fullStr);
                   return (
                     <Button
                       key={m}
                       variant={isSelected ? "default" : "outline"}
                       className={cn("h-8 text-xs", isSelected ? "" : "hover:bg-slate-100")}
                       onClick={() => toggleMonth(fullStr)}
                     >
                       {m}月
                     </Button>
                   );
                 })}
               </div>
            </TabsContent>

            {/* CUSTOM VIEW */}
            <TabsContent value="custom" className="mt-0">
               <Calendar
                 initialFocus
                 mode="range"
                 defaultMonth={dateRange?.from}
                 selected={dateRange}
                 onSelect={(range) => setDateRange(range ? { from: range.from!, to: range.to } : undefined)}
                 numberOfMonths={2}
               />
            </TabsContent>

            <div className="pt-2 border-t flex justify-end">
              <Button onClick={handleApply} className="w-full sm:w-auto">
                确定
              </Button>
            </div>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
