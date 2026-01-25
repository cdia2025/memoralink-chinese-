
import React, { useState, useEffect } from 'react';
import { TOPICS, VocabularyItem, AiProvider } from '../types';
import { generateVocabularyByTopic, generateVocabularyFromList } from '../services/geminiService';
import { Loader2, Eye, EyeOff, BrainCircuit, Bookmark, Check, Volume2, Upload, Zap, RefreshCw, AlertCircle } from 'lucide-react';

interface VocabularyBuilderProps {
  aiProvider: AiProvider;
}

type Mode = 'topic' | 'import';

// UPDATED KEYS: distinct from English app
const STORAGE_KEYS = {
  VOCAB_LIB: 'memoralink_chinese_sys_vocab',
  MODE: 'memoralink_chinese_sys_vocab_mode',
  CACHE: 'memoralink_chinese_sys_vocab_cached_words'
};

export const VocabularyBuilder: React.FC<VocabularyBuilderProps> = ({ aiProvider }) => {
  const [mode, setMode] = useState<Mode>(() => (sessionStorage.getItem(STORAGE_KEYS.MODE) as Mode) || 'topic');
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<string>('中級 (Intermediate)');
  const [count, setCount] = useState<number>(3);
  const [importText, setImportText] = useState('');
  const [words, setWords] = useState<VocabularyItem[]>(() => {
    const cached = sessionStorage.getItem(STORAGE_KEYS.CACHE);
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOCAB_LIB);
    if (saved) {
      const parsed = JSON.parse(saved) as VocabularyItem[];
      setSavedWords(new Set(parsed.map(i => i.word)));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(words));
    sessionStorage.setItem(STORAGE_KEYS.MODE, mode);
  }, [words, mode]);

  const handleGenerate = async () => {
    setLoading(true);
    setRevealedCards(new Set());
    
    try {
      let newWords: VocabularyItem[] = [];
      if (mode === 'topic') {
        const selectedTopic = customTopic.trim() || topic;
        newWords = await generateVocabularyByTopic(selectedTopic, count, difficulty, aiProvider);
      } else {
        const rawList = importText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
        if (rawList.length === 0) { alert("請先輸入詞彙"); setLoading(false); return; }
        newWords = await generateVocabularyFromList(rawList, aiProvider);
      }
      
      // Simple duplicate check on client side as a safety net
      const uniqueWords = newWords.filter((v, i, a) => a.findIndex(t => t.word === v.word) === i);
      setWords(uniqueWords);
      
      if (uniqueWords.length === 0) {
          alert("生成失敗，AI 未能回傳有效資料，請重試。");
      }
    } catch (error: any) {
      alert(`生成失敗 (${aiProvider}): ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm("確定清除所有卡片？")) {
      setWords([]);
      setRevealedCards(new Set());
      sessionStorage.removeItem(STORAGE_KEYS.CACHE);
    }
  };

  const toggleReveal = (index: number) => {
    const newRevealed = new Set(revealedCards);
    if (newRevealed.has(index)) newRevealed.delete(index); else newRevealed.add(index);
    setRevealedCards(newRevealed);
  };

  const handleSave = (item: VocabularyItem) => {
    const currentStorage = localStorage.getItem(STORAGE_KEYS.VOCAB_LIB);
    let library: VocabularyItem[] = currentStorage ? JSON.parse(currentStorage) : [];
    if (!library.some(i => i.word === item.word)) {
      library = [item, ...library];
      localStorage.setItem(STORAGE_KEYS.VOCAB_LIB, JSON.stringify(library));
      setSavedWords(prev => new Set(prev).add(item.word));
    }
  };

  const handleSpeak = (text: string, lang: 'zh-HK' | 'zh-CN', e: React.MouseEvent) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 pb-24 md:pb-8">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <h2 className="text-2xl font-bold text-slate-900">詞彙聯想記憶生成</h2>
             <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase font-medium">{aiProvider}</span>
          </div>
          <p className="text-slate-600">針對記憶力薄弱者，生成帶有「聯想故事」與「應用場景」的詞彙卡。</p>
        </div>
        <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><RefreshCw className="w-4 h-4" /><span className="text-sm font-medium">重置</span></button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setMode('topic')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'topic' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Zap className="w-4 h-4" /> 主題生成</button>
          <button onClick={() => setMode('import')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'import' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}><Upload className="w-4 h-4" /> 自訂詞彙</button>
        </div>

        {mode === 'topic' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">選擇主題</label>
                <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50">{TOPICS.map(t => <option key={t} value={t}>{t}</option>)}</select>
              </div>
              <input type="text" placeholder="或輸入自訂主題..." value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50" />
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">難度/類型</label>
              <div className="grid grid-cols-3 gap-2">
                {['基礎 (Basic)', '中級 (Intermediate)', '高階 (Advanced)'].map((level) => (
                  <button key={level} onClick={() => setDifficulty(level)} className={`p-2 text-xs rounded-lg border transition-all ${difficulty === level ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600'}`}>{level}</button>
                ))}
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between"><span>數量</span><span className="text-indigo-600 font-bold">{count}</span></label>
              <input type="range" min="1" max="10" value={count} onChange={(e) => setCount(parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg accent-indigo-600" />
            </div>
          </div>
        ) : (
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="輸入詞彙，用逗號分隔..." className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 h-40" />
        )}

        <button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
          {mode === 'topic' ? 'AI 智能生成' : '製作記憶卡'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {words.map((item, index) => {
          const isRevealed = revealedCards.has(index);
          const isSaved = savedWords.has(item.word);
          return (
            <div key={index} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-full transition-all hover:shadow-lg">
              <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{item.word}</h3>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                     <div className="flex gap-1">
                        <button onClick={(e) => handleSpeak(item.word, 'zh-HK', e)} className="text-[10px] px-1.5 py-0.5 bg-white border rounded hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors">粵</button>
                        <button onClick={(e) => handleSpeak(item.word, 'zh-CN', e)} className="text-[10px] px-1.5 py-0.5 bg-white border rounded hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors">普</button>
                     </div>
                  </div>
                  {item.phonetic && <span className="text-xs text-slate-500 font-mono bg-slate-200 px-1 rounded">粵: {item.phonetic}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(item)} disabled={isSaved} className={`p-1 rounded-full transition-colors ${isSaved ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
                    {isSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button onClick={() => toggleReveal(index)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1">
                    {isRevealed ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="p-5 flex-1 space-y-4">
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">🧠 記憶聯想</span>
                    {item.mnemonic ? (
                        <p className="text-sm text-amber-900 italic leading-relaxed">{item.mnemonic}</p>
                    ) : (
                        <p className="text-sm text-amber-900/50 italic flex items-center gap-2"><AlertCircle className="w-3 h-3" /> 暫無聯想內容</p>
                    )}
                 </div>
                {isRevealed ? (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <p className="text-slate-800 font-medium">{item.definition}</p>
                      {item.chineseTranslation && <p className="text-slate-400 text-xs mt-1">{item.chineseTranslation}</p>}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase">例句</span>
                      {item.exampleSentence ? (
                         <p className="text-indigo-900 bg-indigo-50 p-2 rounded text-sm border-l-4 border-indigo-400 mt-1">{item.exampleSentence}</p>
                      ) : (
                         <p className="text-slate-400 italic text-sm mt-1">暫無例句</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                       {item.tags?.map((tag,i) => <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded">{tag}</span>)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-8 opacity-40">
                    <p className="text-sm text-center">點擊眼睛圖示查看詳情</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
