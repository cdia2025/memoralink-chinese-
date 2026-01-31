
import React, { useState, useEffect } from 'react';
import { VocabularyItem, AiProvider } from '../types';
import { analyzeWriting, createChatSession } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { BrainCircuit, Loader2, CheckCircle2, Bookmark, ArrowRight, RefreshCw, AlertCircle, BookOpen, Check, Mic, MicOff } from 'lucide-react';

interface QuizRoomProps {
  aiProvider: AiProvider;
}

export const QuizRoom: React.FC<QuizRoomProps> = ({ aiProvider }) => {
  const [library, setLibrary] = useState<VocabularyItem[]>([]);
  const [selectedWords, setSelectedWords] = useState<VocabularyItem[]>([]);
  const [scenario, setScenario] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  
  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const vocab = storageService.getVocabulary();
    setLibrary(vocab);
    setSavedWords(new Set(vocab.map(i => i.word)));
  }, []);

  const toggleWord = (word: VocabularyItem) => {
    if (selectedWords.find(w => w.word === word.word)) {
      setSelectedWords(selectedWords.filter(w => w.word !== word.word));
    } else if (selectedWords.length < 3) {
      setSelectedWords([...selectedWords, word]);
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

  const handleSpeak = (text: string, lang: 'zh-CN' | 'zh-HK' = 'zh-HK') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; 

      // Improved Voice Selection Logic
      const voices = window.speechSynthesis.getVoices();
      const targetVoice = voices.find(v => 
        v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase() || 
        (lang === 'zh-HK' && (v.name.includes('Cantonese') || v.name.includes('Hong Kong')))
      );

      if (targetVoice) {
        utterance.voice = targetVoice;
      }
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-HK'; // Cantonese input

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const startQuiz = async () => {
    if (selectedWords.length === 0) return;
    setLoading(true);
    setScenario(null);
    setFeedback(null);
    setUserInput('');

    try {
      const chat = createChatSession(aiProvider, "你是一位嚴格的中文老師。請設計一個簡短的情境題。");
      const wordsStr = selectedWords.map(w => w.word).join(', ');
      // Explicitly ask for a scenario requiring sentence construction
      const res = await chat.sendMessage(`請設計一個情境，強制要求學生必須使用以下詞彙造句回答：${wordsStr}。情境請在 50 字以內。`);
      setScenario(res);
    } catch (e: any) {
      alert(`Failed to start quiz: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) return;
    setLoading(true);
    try {
      // Pass the scenario in the context so AI knows what to check against
      const res = await analyzeWriting(userInput, `情境測驗檢討 (Quiz Review). 題目情境: ${scenario}`, aiProvider);
      setFeedback(res);
    } catch (e: any) {
      alert(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">情境詞彙測驗</h2>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold uppercase">{aiProvider}</span>
        </div>
        <p className="text-slate-600">選擇你想練習的詞彙，AI 會出題考你如何造句。</p>
      </div>

      {!scenario ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">選擇最多 3 個詞彙進行挑戰：</h3>
            <span className="text-xs text-indigo-600 font-bold">{selectedWords.length}/3 已選</span>
          </div>
          
          {library.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
               <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
               <p className="text-slate-500">資料庫是空的。請先去「詞彙生成」建立詞彙卡！</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded-xl bg-slate-50">
              {library.map((w, idx) => {
                const isSelected = selectedWords.find(sw => sw.word === w.word);
                return (
                  <button 
                    key={idx} 
                    onClick={() => toggleWord(w)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 hover:border-indigo-300'}`}
                  >
                    {w.word}
                  </button>
                );
              })}
            </div>
          )}

          <button 
            disabled={selectedWords.length === 0 || loading}
            onClick={startQuiz}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:bg-indigo-700"
          >
            {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
            生成情境題
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
           <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">挑戰任務</span>
                <p className="text-lg font-medium leading-relaxed">{scenario}</p>
                <div className="flex gap-2 pt-2">
                   <span className="text-xs text-indigo-300 mr-2">必須使用：</span>
                   {selectedWords.map(w => <span key={w.word} className="px-2 py-1 bg-white/10 rounded text-xs font-bold border border-white/20">{w.word}</span>)}
                </div>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10"><BrainCircuit className="w-24 h-24" /></div>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <div className="relative">
                <textarea 
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  placeholder="請在此輸入你的句子 (必須包含上述詞彙)..."
                  className="w-full p-4 pr-12 border rounded-xl bg-slate-50 min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                   onClick={toggleMic}
                   className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200 ${
                     isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                   }`}
                   title="語音輸入"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setScenario(null)} className="px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" /> 重置</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading || !userInput.trim()}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-indigo-700"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "檢查答案"}
                </button>
              </div>
           </div>

           {feedback && (
             <div className="space-y-4 animate-in fade-in">
                {/* Grammar Check */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 border-slate-200">
                  <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> 語法/詞彙檢查
                  </h3>
                  <p className="text-slate-800 text-lg leading-relaxed">{feedback.correction}</p>
                </div>

                {/* Native Version */}
                <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow-sm border border-l-4 border-l-indigo-500 border-slate-200">
                   <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> 完美範例
                  </h3>
                  <p className="text-slate-800 italic leading-relaxed">"{feedback.improvedVersion}"</p>
                </div>
                
                 {/* Feedback Notes */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h4 className="text-slate-500 font-bold text-xs uppercase mb-2">老師評語</h4>
                  <p className="text-sm text-slate-600">{feedback.explanation}</p>
                </div>

                {/* Suggested Vocabulary */}
                {feedback.keyVocabulary && feedback.keyVocabulary.length > 0 && (
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> 建議補充詞彙
                    </h3>
                    <div className="space-y-3">
                      {feedback.keyVocabulary.map((wordItem: any, idx: number) => {
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
                               <button 
                                  onClick={() => handleSaveWord(wordItem)}
                                  disabled={isSaved}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    isSaved 
                                    ? 'text-emerald-500 bg-emerald-50' 
                                    : 'text-indigo-600 hover:bg-indigo-50 bg-white border border-slate-200'
                                  }`}
                                  title="Save to Library"
                               >
                                 {isSaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                               </button>
                            </div>
                            <p className="text-sm text-slate-600">{wordItem.definition}</p>
                            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 italic">
                               💡 {wordItem.mnemonic}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
             </div>
           )}
        </div>
      )}
    </div>
  );
};
