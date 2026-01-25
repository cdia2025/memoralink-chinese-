
import React from 'react';
import { AppView } from '../types';
import { Brain, ArrowRight, ScrollText, Target, PenTool } from 'lucide-react';

interface DashboardProps {
  setView: (view: AppView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView }) => {
  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <ScrollText className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-6 font-serif">博古通今，妙筆生花</h1>
          <p className="text-stone-200 text-lg mb-8 leading-relaxed">
            專為記憶力薄弱者設計的中文 AI 系統。透過<span className="font-bold text-white border-b border-white/30">文言文解析</span>、<span className="font-bold text-white border-b border-white/30">聯想記憶法</span>及<span className="font-bold text-white border-b border-white/30">情境寫作</span>，助您在學業與職場上出口成章。
          </p>
          <button 
            onClick={() => setView(AppView.CLASSICAL)}
            className="bg-white text-stone-800 px-8 py-3 rounded-full font-bold hover:bg-stone-50 transition-colors inline-flex items-center gap-2 shadow-lg"
          >
            開始文言文解析 <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setView(AppView.CLASSICAL)}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ScrollText className="w-6 h-6 text-amber-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">文言文模式</h3>
          <p className="text-slate-600 text-sm">輸入古文，即時獲得白話翻譯、出處典故及現代應用建議。自動生成重點字詞卡。</p>
        </div>

        <div 
           onClick={() => setView(AppView.WRITING)}
           className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <PenTool className="w-6 h-6 text-indigo-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">寫作與公文</h3>
          <p className="text-slate-600 text-sm">提升議論文或商業書信的用詞精準度。AI 提供潤飾建議與範例。</p>
        </div>

        <div 
           onClick={() => setView(AppView.VOCABULARY)}
           className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Brain className="w-6 h-6 text-emerald-700" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">聯想記憶庫</h3>
          <p className="text-slate-600 text-sm">針對記憶力差的用戶，利用故事聯想 (Mnemonic) 記住成語與生僻字。</p>
        </div>
      </div>
    </div>
  );
};
