
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem, WritingEntry, ClassicalEntry } from '../types';
import { Trash2, Eye, Search, Volume2, Download, ChevronDown, ChevronUp, Upload, FileJson, Edit3, X, Check, Image, Maximize2 } from 'lucide-react';

type LibraryTab = 'vocabulary' | 'writing' | 'classical';

// Unique keys specific to CHINESE SYSTEM to prevent conflict with English App
const STORAGE_KEYS = {
  VOCAB: 'memoralink_chinese_sys_vocab',
  WRITING: 'memoralink_chinese_sys_writing',
  CLASSICAL: 'memoralink_chinese_sys_classical'
};

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('vocabulary');
  
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [writingItems, setWritingItems] = useState<WritingEntry[]>([]);
  const [classicalItems, setClassicalItems] = useState<ClassicalEntry[]>([]); 
  
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempTags, setTempTags] = useState('');
  const [expandedItem, setExpandedItem] = useState<Set<string>>(new Set());

  // Focus Mode State
  const [focusItem, setFocusItem] = useState<VocabularyItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    try {
      const savedVocab = localStorage.getItem(STORAGE_KEYS.VOCAB);
      if (savedVocab) setItems(JSON.parse(savedVocab));
      const savedWriting = localStorage.getItem(STORAGE_KEYS.WRITING);
      if (savedWriting) setWritingItems(JSON.parse(savedWriting));
      const savedClassical = localStorage.getItem(STORAGE_KEYS.CLASSICAL);
      if (savedClassical) setClassicalItems(JSON.parse(savedClassical));
    } catch(e) { console.error("Failed to load library", e); }
  };

  const handleBackupData = () => {
    const backupData = { version: 1, date: new Date().toISOString(), vocabulary: items, writingLogs: writingItems, classicalLogs: classicalItems };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = `memoralink_chinese_sys_backup.json`; a.click();
  };

  const handleRestoreClick = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.vocabulary) localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(data.vocabulary));
        if (data.writingLogs) localStorage.setItem(STORAGE_KEYS.WRITING, JSON.stringify(data.writingLogs));
        if (data.classicalLogs) localStorage.setItem(STORAGE_KEYS.CLASSICAL, JSON.stringify(data.classicalLogs));
        loadData(); alert("資料已還原！");
      } catch (error) { alert("無效的檔案"); }
    };
    reader.readAsText(file);
  };

  // Image Upload Logic for Vocabulary Cards
  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("圖片大小限制為 1MB 以下，以避免瀏覽器儲存空間不足。");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newItems = [...items];
      newItems[index].image = base64;
      setItems(newItems);
      localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(newItems));
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (index: number, type: LibraryTab) => {
    if (!confirm('確定刪除此項目？')) return;
    if (type === 'vocabulary') {
      const n = items.filter((_, i) => i !== index); setItems(n); localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(n));
      if (focusItem && items[index] === focusItem) setFocusItem(null);
    } else if (type === 'writing') {
       const n = writingItems.filter((_, i) => i !== index); setWritingItems(n); localStorage.setItem(STORAGE_KEYS.WRITING, JSON.stringify(n));
    } else {
       const n = classicalItems.filter((_, i) => i !== index); setClassicalItems(n); localStorage.setItem(STORAGE_KEYS.CLASSICAL, JSON.stringify(n));
    }
  };

  const startEditing = (index: number, tags: string[] = []) => { setEditingIndex(index); setTempTags(tags.join(', ')); };
  const saveTags = (index: number) => {
    const newItems = [...items];
    newItems[index].tags = tempTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    setItems(newItems); localStorage.setItem(STORAGE_KEYS.VOCAB, JSON.stringify(newItems)); setEditingIndex(null);
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    let csvContent = "\uFEFF詞彙;釋義;翻譯/備註;記憶法;例句\n";
    items.forEach(item => {
      const clean = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csvContent += `${clean(item.word)};${clean(item.definition)};${clean(item.chineseTranslation)};${clean(item.mnemonic)};${clean(item.exampleSentence)}\n`;
    });
    const link = document.createElement("a"); link.href = encodeURI("data:text/csv;charset=utf-8," + csvContent); link.download = "memoralink_chinese_vocab.csv"; link.click();
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-HK'; // Cantonese
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredVocab = items.filter(item => 
    item.word.includes(searchTerm) || 
    item.definition.includes(searchTerm) ||
    (item.tags && item.tags.some(tag => tag.includes(searchTerm)))
  );
  
  const toggleExpand = (id: string) => { const n = new Set(expandedItem); if(n.has(id)) n.delete(id); else n.add(id); setExpandedItem(n); };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">我的資料庫</h2>
        <div className="flex gap-2">
           <button onClick={handleBackupData} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200"><FileJson className="w-4 h-4 inline mr-1" /> 備份</button>
           <button onClick={handleRestoreClick} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200"><Upload className="w-4 h-4 inline mr-1" /> 還原</button>
           {activeTab === 'vocabulary' && <button onClick={handleExportCSV} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"><Download className="w-4 h-4 inline mr-1" /> CSV</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
         <button onClick={() => setActiveTab('vocabulary')} className={`px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'vocabulary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>詞彙卡</button>
         <button onClick={() => setActiveTab('classical')} className={`px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'classical' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>文言文解析</button>
         <button onClick={() => setActiveTab('writing')} className={`px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'writing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>寫作紀錄</button>
      </div>

      {/* Vocabulary Tab */}
      {activeTab === 'vocabulary' && (
        <>
          <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="text" placeholder="搜尋詞彙或標籤 (Tag)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVocab.map((item, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3 relative group flex flex-col h-full">
                
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                         <h3 className="text-lg font-bold">{item.word}</h3>
                         <button onClick={(e) => { e.stopPropagation(); handleSpeak(item.word); }} className="text-slate-400 hover:text-indigo-600 p-1" title="朗讀">
                            <Volume2 className="w-4 h-4" />
                         </button>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{item.phonetic}</span>
                  </div>
                  <div className="flex gap-1">
                     <button onClick={() => setFocusItem(item)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="專注模式"><Maximize2 className="w-4 h-4" /></button>
                     <button onClick={() => { const newS = new Set(revealedCards); if(newS.has(index)) newS.delete(index); else newS.add(index); setRevealedCards(newS); }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Eye className="w-4 h-4" /></button>
                     <button onClick={() => handleDelete(index, 'vocabulary')} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Image Thumbnail Area - UPDATED to 16:9 */}
                <div className="relative group/image">
                    {item.image ? (
                        <div onClick={() => setFocusItem(item)} className="w-full aspect-video rounded-lg bg-slate-100 overflow-hidden cursor-pointer border border-slate-100 relative">
                             <img src={item.image} alt={item.word} className="w-full h-full object-cover transition-transform hover:scale-105" />
                             <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                 <Maximize2 className="text-white opacity-0 hover:opacity-100 drop-shadow-md" />
                             </div>
                        </div>
                    ) : (
                        <label className="w-full h-12 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center gap-2 text-slate-400 text-xs cursor-pointer hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                            <Image className="w-4 h-4" /> 上傳助記圖片
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(index, e)} />
                        </label>
                    )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1 w-full"><input autoFocus value={tempTags} onChange={e => setTempTags(e.target.value)} className="flex-1 text-xs border p-1 rounded" /><button onClick={() => saveTags(index)} className="text-indigo-600"><Check className="w-4 h-4" /></button></div>
                  ) : (
                    <>{item.tags?.map((t, i) => <span key={i} className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">{t}</span>)}<button onClick={() => startEditing(index, item.tags)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100"><Edit3 className="w-3 h-3" /></button></>
                  )}
                </div>

                {/* Mnemonic - Always visible */}
                <div className="bg-amber-50 p-2 rounded text-xs italic text-amber-900 border border-amber-100">"{item.mnemonic}"</div>
                
                {/* Revealable Content */}
                {revealedCards.has(index) && (<div className="text-sm space-y-1 animate-in fade-in"><p>{item.definition}</p><p className="text-indigo-700 bg-indigo-50 p-1.5 rounded text-xs border-l-2 border-indigo-400">"{item.exampleSentence}"</p></div>)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Classical Tab */}
      {activeTab === 'classical' && (
        <div className="space-y-4">
           {classicalItems.length === 0 && <div className="text-center text-slate-500 py-10">暫無文言文紀錄</div>}
           {classicalItems.map((entry, idx) => (
             <div key={entry.id} className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                   <div className="flex-1 mr-4">
                     <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">文言文</span>
                     <p className="text-sm font-medium mt-1 truncate">{entry.originalText.substring(0, 50)}...</p>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); handleDelete(idx, 'classical'); }} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                   {expandedItem.has(entry.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
                {expandedItem.has(entry.id) && (
                  <div className="mt-4 pt-4 border-t space-y-3 bg-slate-50 p-3 rounded">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-bold text-slate-500">原文</p>
                            <button onClick={(e) => { e.stopPropagation(); handleSpeak(entry.originalText); }} className="text-slate-400 hover:text-indigo-600"><Volume2 className="w-3 h-3" /></button>
                        </div>
                        <p className="text-sm font-serif text-slate-800 leading-relaxed">{entry.originalText}</p>
                     </div>
                     <div><p className="text-xs font-bold text-indigo-600">白話翻譯</p><p className="text-sm">{entry.translation}</p></div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div><p className="text-xs font-bold text-amber-600">出處</p><p className="text-xs text-slate-600">{entry.origin}</p></div>
                        <div><p className="text-xs font-bold text-emerald-600">現代應用</p><p className="text-xs text-slate-600">{entry.usage}</p></div>
                     </div>
                  </div>
                )}
             </div>
           ))}
        </div>
      )}

      {/* Writing Tab */}
      {activeTab === 'writing' && (
        <div className="space-y-4">
           {writingItems.map((entry, idx) => (
             <div key={entry.id} className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                   <div className="flex-1 mr-4">
                     <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">{entry.context}</span>
                     <p className="text-sm font-medium mt-1 truncate">{entry.originalText.substring(0, 50)}...</p>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); handleDelete(idx, 'writing'); }} className="text-slate-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                   {expandedItem.has(entry.id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
                {expandedItem.has(entry.id) && (
                  <div className="mt-4 pt-4 border-t space-y-3 bg-slate-50 p-3 rounded">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div><p className="text-xs font-bold text-slate-500">原文</p><p className="text-sm">{entry.originalText}</p></div>
                        <div><p className="text-xs font-bold text-indigo-600">潤飾版本</p><p className="text-sm text-indigo-800 italic">{entry.improvedVersion}</p></div>
                     </div>
                     <div><p className="text-xs font-bold text-emerald-600">修正說明</p><p className="text-sm">{entry.explanation}</p></div>
                  </div>
                )}
             </div>
           ))}
        </div>
      )}

      {/* Focus Mode Modal */}
      {focusItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-w-6xl w-full h-[90vh] relative">
             <button 
                onClick={() => setFocusItem(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
             >
                <X className="w-6 h-6" />
             </button>

             {/* Left: Image (2/3) */}
             <div className="md:w-2/3 bg-black flex items-center justify-center p-4">
                {focusItem.image ? (
                    <img src={focusItem.image} alt={focusItem.word} className="w-full h-full object-contain" />
                ) : (
                    <div className="text-white/30 flex flex-col items-center">
                        <Image className="w-16 h-16 mb-2" />
                        <p>暫無圖片</p>
                    </div>
                )}
             </div>

             {/* Right: Info (1/3) */}
             <div className="md:w-1/3 p-8 overflow-y-auto bg-white flex flex-col gap-6 border-l border-slate-100">
                <div>
                   <h2 className="text-4xl font-bold text-slate-900 mb-2">{focusItem.word}</h2>
                   <div className="flex items-center gap-3">
                      <span className="text-lg text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">{focusItem.phonetic}</span>
                      <button onClick={() => handleSpeak(focusItem.word)} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors">
                         <Volume2 className="w-5 h-5" />
                      </button>
                   </div>
                </div>

                <div className="space-y-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">解釋</span>
                   <p className="text-lg text-slate-800 leading-relaxed">{focusItem.definition}</p>
                   {focusItem.chineseTranslation && <p className="text-slate-500">{focusItem.chineseTranslation}</p>}
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                   <span className="text-xs font-bold text-amber-700 uppercase tracking-widest block mb-2">記憶聯想</span>
                   <p className="text-amber-900 italic leading-relaxed text-lg">{focusItem.mnemonic}</p>
                </div>

                <div className="space-y-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">例句</span>
                   <p className="text-indigo-900 bg-indigo-50 p-4 rounded-xl border-l-4 border-indigo-400 italic">"{focusItem.exampleSentence}"</p>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-4 mt-auto border-t border-slate-100">
                    {focusItem.tags?.map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{tag}</span>
                    ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
