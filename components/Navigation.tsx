
import React from 'react';
import { AppView } from '../types';
import { BookOpen, PenTool, MessageCircle, LayoutDashboard, Library, BrainCircuit, ScrollText } from 'lucide-react';

interface NavigationProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: '學習主頁', icon: LayoutDashboard },
    { id: AppView.CLASSICAL, label: '文言文解析', icon: ScrollText },
    { id: AppView.VOCABULARY, label: '詞彙生成', icon: BookOpen },
    { id: AppView.LIBRARY, label: '我的資料庫', icon: Library },
    { id: AppView.WRITING, label: '寫作修飾', icon: PenTool },
    { id: AppView.SPEAKING, label: '口語教練', icon: MessageCircle },
    { id: AppView.QUIZ, label: '情境測驗', icon: BrainCircuit },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 md:relative md:w-64 md:h-screen md:border-r md:border-t-0 z-50">
      <div className="flex flex-row md:flex-col h-full justify-around md:justify-start md:p-4">
        <div className="hidden md:flex items-center gap-2 mb-8 px-4 text-indigo-900">
          <BookOpen className="w-8 h-8" />
          <div>
            <span className="font-bold text-xl tracking-tight block">文曲星 AI</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">MemoraLink</span>
          </div>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col md:flex-row items-center md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'text-indigo-800 bg-indigo-50 font-medium' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
              <span className="text-xs md:text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
