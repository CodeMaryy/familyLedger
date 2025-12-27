import React, { useState } from "react";
import { useStore } from "../store";
import { TransactionType, CategoryType } from "../types";
import {
  Calendar as CalendarIcon,
  User,
  Tag,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TransactionInputProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const TransactionInput: React.FC<
  TransactionInputProps
> = ({ onCancel, onSuccess }) => {
  const {
    addTransaction,
    activeLedgerId,
    members,
    categories: allCategories,
  } = useStore();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>(
    members[0]?.id || "",
  );
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState<string>("");

  const categories = allCategories.filter(
    (c) => c.type === type,
  );
  const currentCategory = categories.find(
    (c) => c.id === categoryId,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !memberId) return;

    addTransaction({
      ledgerId: activeLedgerId,
      type,
      amount: parseFloat(amount),
      date: date.toISOString(),
      categoryId,
      categoryName: currentCategory?.label || "未知",
      memberId,
      note,
    });

    onSuccess();
    // Reset form
    setAmount("");
    setNote("");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 w-full max-w-[492px] mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Area */}
        <div className="space-y-3 max-w-[442px]">
          <Input
            autoFocus
            type="text"
            inputMode="decimal"
            placeholder="金额 0.00"
            className="text-lg font-medium border-none shadow-none focus-visible:ring-0 px-[8px] h-auto placeholder:text-slate-400 text-[14px] py-[4px] mt-[0px] mr-[0px] mb-[12px] ml-[0px]"
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              // Allow only numbers and one decimal point
              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                setAmount(value);
              }
            }}
          />
          <Input
            type="text"
            placeholder="备注 (选填)"
            className="text-sm border-none shadow-none focus-visible:ring-0 px-2 h-auto placeholder:text-slate-400"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Chips / Selectors */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Type Toggle */}
          <div className="flex bg-slate-100 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => {
                setType("expense");
                setCategoryId("");
              }}
              className={cn(
                "px-3 py-1 text-xs rounded-sm transition-all",
                type === "expense"
                  ? "bg-white shadow text-red-600 font-medium"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setCategoryId("");
              }}
              className={cn(
                "px-3 py-1 text-xs rounded-sm transition-all",
                type === "income"
                  ? "bg-white shadow text-green-600 font-medium"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              收入
            </button>
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-dashed text-slate-500 font-normal"
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {format(date, "MM月dd日", { locale: zhCN })}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Member Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed font-normal",
                  memberId
                    ? "text-orange-600 bg-orange-50 border-orange-200"
                    : "text-slate-500",
                )}
              >
                <User className="mr-2 h-3 w-3" />
                {members.find((m) => m.id === memberId)?.name ||
                  "选择成员"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[200px] p-2"
              align="start"
            >
              <div className="grid grid-cols-1 gap-1">
                {members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setMemberId(member.id)}
                    className={cn(
                      "flex items-center w-full px-2 py-1.5 text-sm rounded-md hover:bg-slate-100",
                      memberId === member.id
                        ? "text-orange-600 bg-orange-50"
                        : "text-slate-700",
                    )}
                  >
                    <span className="mr-2">
                      {member.avatar}
                    </span>
                    {member.name}
                    {memberId === member.id && (
                      <Check className="ml-auto h-3 w-3" />
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Category Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-dashed font-normal",
                  categoryId
                    ? "text-blue-600 bg-blue-50 border-blue-200"
                    : "text-slate-500",
                )}
              >
                <Tag className="mr-2 h-3 w-3" />
                {currentCategory?.label || "选择分类"}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[280px] p-2"
              align="start"
            >
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-md hover:bg-slate-100 transition-colors",
                      categoryId === cat.id
                        ? "bg-slate-100 ring-1 ring-slate-300"
                        : "",
                    )}
                  >
                    <span className="text-xl mb-1">
                      {cat.icon}
                    </span>
                    <span className="text-xs text-slate-600">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
          <div className="flex-1"></div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!amount || !categoryId}
            >
              添加记录
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};