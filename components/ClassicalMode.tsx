
import React, { useState, useEffect } from 'react';
import { analyzeClassicalChinese } from '../services/geminiService';
import { Loader2, ScrollText, BookOpen, Bookmark, Check, Save } from 'lucide-react';
import { AiProvider, VocabularyItem, ClassicalEntry } from '../types';

interface ClassicalModeProps {
  aiProvider: AiProvider;
}

// UPDATED KEYS
const STORAGE_KEYS = {
  VOCAB_LIB: 'memoralink_chinese_sys_vocab',
  CLASSICAL_LIB: 'memoralink_chinese_sys_classical'
};

export const ClassicalMode: React.FC<ClassicalModeProps> = ({ aiProvider }) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ 
    translation: string, 
    origin: string, 
    usage: string,
    vocabulary?: VocabularyItem[]
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [isEntrySaved, setIsEntrySaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOCAB_LIB);
    if (saved) {
      const parsed = JSON.parse(saved) as VocabularyItem[];
      setSavedWords(new Set(parsed.map(i => i.word)));
    }
  }, []);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setIsEntrySaved(false);
    try {
      const analysis = await analyzeClassicalChinese(text, aiProvider);
      setResult(analysis);
    } catch (e: any) {
      alert(`分析失敗: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = (item: VocabularyItem) => {
    const currentStorage = localStorage.getItem(STORAGE_KEYS.VOCAB_LIB);
    let library: VocabularyItem[] = currentStorage ? JSON.parse(currentStorage) : [];
    if (!library.some(i => i.word === item.word)) {
      library = [item, ...library];
      localStorage.setItem(STORAGE_KEYS.VOCAB_LIB, JSON.stringify(library));
      setSavedWords(prev => new Set(prev).add(item.word));
    }
  };

  const handleSaveEntry = () => {
    if (!result) return;
    const entry: ClassicalEntry = {
      id: Date.now().toString(),
      originalText: text,
      translation: result.translation,
      origin: result.origin,
      usage: result.usage,
      date: new Date().toLocaleDateString()
    };
    const currentStorage = localStorage.getItem(STORAGE_KEYS.CLASSICAL_LIB);
    let library: ClassicalEntry[] = currentStorage ? JSON.parse(currentStorage) : [];
    library = [entry, ...library];
    localStorage.setItem(STORAGE_KEYS.CLASSICAL_LIB, JSON.stringify(library));
    setIsEntrySaved(true);
  };

  const handleSpeak = (content: string, lang: 'zh-CN' | 'zh-HK' = 'zh-HK') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <h2 className="text-2xl font-bold text-slate-900">文言文解析器</h2>
           <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full uppercase font-medium">Classical Mode</span>
        </div>
        <p className="text-slate-600">貼上古文，AI 將為您翻譯、解釋背景，並生成重點詞彙卡（附粵拼）。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">文言文/古詩詞</label>
                <div className="flex gap-1">
                    <button onClick={() => handleSpeak(text, 'zh-HK')} disabled={!text} className="text-xs px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-colors">粵語朗讀</button>
                    <button onClick={() => handleSpeak(text, 'zh-CN')} disabled={!text} className="text-xs px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded transition-colors">普通話</button>
                </div>
            </div>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full flex-1 p-4 rounded-lg border border-slate-300 bg-stone-50 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-amber-600 outline-none resize-none min-h-[200px] font-serif"
              placeholder="例如：學而時習之，不亦說乎..."
            />
            <button 
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="mt-4 w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "開始解析"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {result ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800">解析結果</h3>
                 <button onClick={handleSaveEntry} disabled={isEntrySaved} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isEntrySaved ? 'bg-emerald-100 text-emerald-700' : 'bg-white border hover:bg-slate-50'}`}>
                   {isEntrySaved ? <><Check className="w-4 h-4" /> 已儲存</> : <><Save className="w-4 h-4" /> 儲存至資料庫</>}
                 </button>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-amber-600 border-slate-200">
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ScrollText className="w-4 h-4" /> 白話翻譯
                    <div className="flex gap-1 ml-2">
                        <button onClick={() => handleSpeak(result.translation, 'zh-HK')} className="text-[10px] px-1.5 border rounded hover:bg-amber-100 text-amber-800">粵</button>
                        <button onClick={() => handleSpeak(result.translation, 'zh-CN')} className="text-[10px] px-1.5 border rounded hover:bg-amber-100 text-amber-800">普</button>
                    </div>
                </h3>
                <p className="text-slate-800 leading-relaxed">{result.translation}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-stone-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-stone-600 uppercase mb-2">出處/背景</h4>
                      <p className="text-sm text-stone-800 whitespace-pre-wrap">{result.origin || "AI 未能提供詳細出處，請嘗試提供更多上下文。"}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2">現代應用</h4>
                      <p className="text-sm text-emerald-800">{result.usage}</p>
                  </div>
              </div>

              {result.vocabulary && result.vocabulary.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wide mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> 重點詞彙/字義</h3>
                  <div className="space-y-3">
                    {result.vocabulary.map((wordItem, idx) => {
                      const isSaved = savedWords.has(wordItem.word);
                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{wordItem.word}</span>
                                {wordItem.phonetic && <span className="text-xs text-slate-500 font-mono bg-slate-200 px-1 rounded">粵: {wordItem.phonetic}</span>}
                                <div className="flex gap-1 ml-1">
                                    <button onClick={() => handleSpeak(wordItem.word, 'zh-HK')} className="text-[10px] px-1.5 border rounded hover:bg-slate-200 text-slate-600">粵</button>
                                    <button onClick={() => handleSpeak(wordItem.word, 'zh-CN')} className="text-[10px] px-1.5 border rounded hover:bg-slate-200 text-slate-600">普</button>
                                </div>
                             </div>
                             <button onClick={() => handleSaveWord(wordItem)} disabled={isSaved} className={`p-1.5 rounded-full ${isSaved ? 'text-emerald-500 bg-emerald-50' : 'text-indigo-600 border border-slate-200'}`}>{isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}</button>
                          </div>
                          <p className="text-sm text-slate-600">{wordItem.definition}</p>
                          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">💡 {wordItem.mnemonic}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : !loading && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-8">
              <ScrollText className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-center">請在左側輸入古文，AI 將助您博古通今。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
