
import React, { useState, useEffect } from 'react';
import { analyzeWriting } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Loader2, CheckCircle2, ArrowRight, BookOpen, Bookmark, Check, Save, AlertCircle } from 'lucide-react';
import { AiProvider, VocabularyItem, WritingEntry } from '../types';

interface WritingLabProps {
  aiProvider: AiProvider;
}

export const WritingLab: React.FC<WritingLabProps> = ({ aiProvider }) => {
  const [text, setText] = useState('');
  const [context, setContext] = useState('議論文 (Argumentative Essay)');
  const [customContext, setCustomContext] = useState('');
  const [result, setResult] = useState<{ 
    correction: string, 
    explanation: string, 
    improvedVersion: string,
    keyVocabulary?: VocabularyItem[]
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [isAnalysisSaved, setIsAnalysisSaved] = useState(false);

  useEffect(() => {
    const library = storageService.getVocabulary();
    setSavedWords(new Set(library.map(i => i.word)));
  }, []);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setIsAnalysisSaved(false);
    
    const finalContext = context === '自訂 (Custom)' ? customContext : context;
    if (!finalContext.trim()) {
        alert("請輸入寫作情境");
        setLoading(false);
        return;
    }

    try {
      const analysis = await analyzeWriting(text, finalContext, aiProvider);
      setResult(analysis);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "分析失敗，請檢查網絡或 API 金鑰。");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = (item: VocabularyItem) => {
    try {
      const success = storageService.addVocabularyItem(item);
      if (success) {
        setSavedWords(prev => new Set(prev).add(item.word));
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSaveAnalysis = () => {
    if (!result) return;
    try {
      const entry: WritingEntry = {
        id: Date.now().toString(),
        originalText: text,
        correction: result.correction,
        improvedVersion: result.improvedVersion,
        explanation: result.explanation,
        context: context === '自訂 (Custom)' ? customContext : context,
        date: new Date().toLocaleDateString()
      };
      
      storageService.addWritingEntry(entry);
      setIsAnalysisSaved(true);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSpeak = (text: string, lang: 'zh-CN' | 'zh-HK' = 'zh-HK') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => 
        v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase() || 
        (lang === 'zh-HK' && (v.name.includes('Cantonese') || v.name.includes('Hong Kong')))
      );

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <h2 className="text-2xl font-bold text-slate-900">寫作修飾實驗室</h2>
           <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-medium">{aiProvider}</span>
        </div>
        <p className="text-slate-600">輸入你的文章草稿（議論文、記敍文、公文等），AI 將協助潤飾文筆並提供高級詞彙建議。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <div className="space-y-4 flex flex-col h-full">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
            <label className="block text-sm font-medium text-slate-700 mb-2">寫作情境</label>
            <select 
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full p-2 mb-2 rounded-lg border border-slate-300 bg-slate-50 text-sm"
            >
              <option>議論文 (Argumentative Essay)</option>
              <option>記敍文 (Narrative)</option>
              <option>實用文 (Practical Writing)</option>
              <option>商業書信/電郵 (Business Email)</option>
              <option>政府公文 (Official Document)</option>
              <option>求職信 (Cover Letter)</option>
              <option>演講辭 (Speech)</option>
              <option>自訂 (Custom)</option>
            </select>
            
            {context === '自訂 (Custom)' && (
                <input 
                    type="text"
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    placeholder="請輸入具體情境 (例如: 投訴信、道歉聲明...)"
                    className="w-full p-2 mb-4 rounded-lg border border-indigo-200 bg-indigo-50 text-sm animate-in fade-in"
                />
            )}
            
            <label className="block text-sm font-medium text-slate-700 mb-2 mt-2">文章草稿</label>
            <textarea 
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full flex-1 p-3 rounded-lg border border-slate-300 bg-slate-800 text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[200px]"
              placeholder="在此輸入..."
            />
            
            <button 
              onClick={handleAnalyze}
              disabled={loading || !text}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "分析與潤飾"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700"><p className="font-bold">錯誤</p><p>{error}</p></div>
            </div>
          )}

          {result ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800">分析結果</h3>
                 <button
                   onClick={handleSaveAnalysis}
                   disabled={isAnalysisSaved}
                   className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isAnalysisSaved ? 'bg-emerald-100 text-emerald-700' : 'bg-white border hover:bg-slate-50'}`}
                 >
                   {isAnalysisSaved ? <><Check className="w-4 h-4" /> 已儲存</> : <><Save className="w-4 h-4" /> 儲存紀錄</>}
                 </button>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 border-slate-200">
                <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> 語法修正</h3>
                <p className="text-slate-800 text-lg leading-relaxed">{result.correction}</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow-sm border border-l-4 border-l-indigo-500 border-slate-200">
                 <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> 專業/高階版本</h3>
                <p className="text-slate-800 italic leading-relaxed">"{result.improvedVersion}"</p>
              </div>

              {result.keyVocabulary && result.keyVocabulary.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> 建議高級詞彙</h3>
                  <div className="space-y-3">
                    {result.keyVocabulary.map((wordItem, idx) => {
                      const isSaved = savedWords.has(wordItem.word);
                      return (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{wordItem.word}</span>
                                {wordItem.phonetic && <span className="text-xs text-slate-500 font-mono bg-slate-200 px-1 rounded">粵: {wordItem.phonetic}</span>}
                                <div className="flex gap-1 ml-1">
                                    <button onClick={() => handleSpeak(wordItem.word, 'zh-HK')} className="text-[10px] px-1.5 border rounded hover:bg-slate-100">粵</button>
                                    <button onClick={() => handleSpeak(wordItem.word, 'zh-CN')} className="text-[10px] px-1.5 border rounded hover:bg-slate-100">普</button>
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
          ) : !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 p-8">
              <p className="text-center">請在左側輸入文字以獲得專業建議。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
