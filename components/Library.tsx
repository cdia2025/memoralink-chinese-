
import React, { useState, useEffect, useRef } from 'react';
import { VocabularyItem, WritingEntry, ClassicalEntry } from '../types';
import { storageService } from '../services/storageService';
import { Trash2, Eye, Search, Download, ChevronDown, ChevronUp, Upload, FileJson, Edit3, X, Check, Image, Maximize2, AlertTriangle } from 'lucide-react';

type LibraryTab = 'vocabulary' | 'writing' | 'classical';

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
  const [focusItem, setFocusItem] = useState<VocabularyItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setItems(storageService.getVocabulary());
    setWritingItems(storageService.getWritingLogs());
    setClassicalItems(storageService.getClassicalLogs());
  };

  const handleBackupData = () => {
    try {
      const blob = storageService.createBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = `memoralink_chinese_sys_backup_${new Date().toISOString().slice(0,10)}.json`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("備份失敗：資料量可能過大，導致瀏覽器無法生成檔案。");
    }
  };

  const handleRestoreClick = () => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("檔案過大 (>5MB)，無法還原。"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);
        storageService.restoreBackup(data);
        loadData();
        alert("資料已成功還原！");
      } catch (error: any) { alert(error.message || "無效的備份檔案或檔案格式錯誤。"); }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (confirm('警告：此動作將「永久刪除」所有資料。\n\n您確定要清空所有資料嗎？')) {
        if (confirm('再次確認：刪除後無法復原。真的要全部刪除嗎？')) {
            storageService.clearAllData();
            loadData();
            alert('所有資料已清除。');
        }
    }
  };

  const handleImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 500 * 1024) { alert("圖片大小限制為 500KB 以下。"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
          const base64 = reader.result as string;
          const newItems = [...items];
          newItems[index].image = base64;
          storageService.saveVocabulary(newItems);
          setItems(newItems);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (index: number, type: LibraryTab) => {
    if (!confirm('確定刪除此項目？')) return;
    if (type === 'vocabulary') {
      const n = items.filter((_, i) => i !== index); 
      storageService.saveVocabulary(n);
      setItems(n);
      if (focusItem && items[index] === focusItem) setFocusItem(null);
    } else if (type === 'writing') {
       const n = writingItems.filter((_, i) => i !== index); 
       storageService.saveWritingLogs(n);
       setWritingItems(n);
    } else {
       const n = classicalItems.filter((_, i) => i !== index); 
       storageService.saveClassicalLogs(n);
       setClassicalItems(n);
    }
  };

  const startEditing = (index: number, tags: string[] = []) => { setEditingIndex(index); setTempTags(tags.join(', ')); };
  const saveTags = (index: number) => {
    const newItems = [...items];
    newItems[index].tags = tempTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    storageService.saveVocabulary(newItems);
    setItems(newItems);
    setEditingIndex(null);
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

  const handleSpeak = (text: string, lang: 'zh-CN' | 'zh-HK' = 'zh-HK') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; 
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredVocab = items.filter(item => {
    if (!item) return false;
    const s = searchTerm.toLowerCase();
    const w = (item.word || '').toLowerCase();
    const d = (item.definition || '').toLowerCase();
    const t = item.tags && Array.isArray(item.tags) ? item.tags : [];
    return w.includes(s) || d.includes(s) || t.some(tag => (tag || '').toLowerCase().includes(s));
  });
  
  const toggleExpand = (id: string) => { const n = new Set(expandedItem); if(n.has(id)) n.delete(id); else n.add(id); setExpandedItem(n); };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">我的資料庫</h2>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleBackupData} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors"><FileJson className="w-4 h-4 inline mr-1" /> 備份</button>
           <button onClick={handleRestoreClick} className="px-3 py