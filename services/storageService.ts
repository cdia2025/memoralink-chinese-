
import { VocabularyItem, WritingEntry, ClassicalEntry } from '../types';

const STORAGE_KEYS = {
  VOCAB: 'memoralink_chinese_sys_vocab',
  WRITING: 'memoralink_chinese_sys_writing',
  CLASSICAL: 'memoralink_chinese_sys_classical',
  VOCAB_MODE: 'memoralink_chinese_sys_vocab_mode',
  VOCAB_CACHE: 'memoralink_chinese_sys_vocab_cached_words'
};

export interface BackupData {
  version: number;
  date: string;
  vocabulary: VocabularyItem[];
  writingLogs: WritingEntry[];
  classicalLogs: ClassicalEntry[];
}

export const storageService = {
  // --- Generic Helpers ---
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading key ${key}`, e);
      return defaultValue;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        throw new Error("儲存失敗：空間已滿。請刪除部分舊資料或圖片，或減少圖片解析度。");
      }
      throw e;
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(key);
  },

  // --- Domain Specific Methods ---

  // Vocabulary
  getVocabulary: (): VocabularyItem[] => {
    return storageService.get<VocabularyItem[]>(STORAGE_KEYS.VOCAB, []);
  },

  saveVocabulary: (items: VocabularyItem[]): void => {
    storageService.set(STORAGE_KEYS.VOCAB, items);
  },

  addVocabularyItem: (item: VocabularyItem): boolean => {
    const items = storageService.getVocabulary();
    if (items.some(i => i.word === item.word)) return false; // Duplicate
    storageService.saveVocabulary([item, ...items]);
    return true;
  },

  // Writing
  getWritingLogs: (): WritingEntry[] => {
    return storageService.get<WritingEntry[]>(STORAGE_KEYS.WRITING, []);
  },

  saveWritingLogs: (items: WritingEntry[]): void => {
    storageService.set(STORAGE_KEYS.WRITING, items);
  },

  addWritingEntry: (entry: WritingEntry): void => {
    const items = storageService.getWritingLogs();
    storageService.saveWritingLogs([entry, ...items]);
  },

  // Classical
  getClassicalLogs: (): ClassicalEntry[] => {
    return storageService.get<ClassicalEntry[]>(STORAGE_KEYS.CLASSICAL, []);
  },

  saveClassicalLogs: (items: ClassicalEntry[]): void => {
    storageService.set(STORAGE_KEYS.CLASSICAL, items);
  },

  addClassicalEntry: (entry: ClassicalEntry): void => {
    const items = storageService.getClassicalLogs();
    storageService.saveClassicalLogs([entry, ...items]);
  },

  // Session/Cache
  getVocabMode: (): 'topic' | 'import' => {
    return storageService.get(STORAGE_KEYS.VOCAB_MODE, 'topic');
  },
  
  setVocabMode: (mode: 'topic' | 'import') => {
    sessionStorage.setItem(STORAGE_KEYS.VOCAB_MODE, mode);
  },

  getVocabCache: (): VocabularyItem[] => {
    try {
       const item = sessionStorage.getItem(STORAGE_KEYS.VOCAB_CACHE);
       return item ? JSON.parse(item) : [];
    } catch { return []; }
  },

  setVocabCache: (items: VocabularyItem[]) => {
    try {
        sessionStorage.setItem(STORAGE_KEYS.VOCAB_CACHE, JSON.stringify(items));
    } catch (e) { console.warn("Session cache full"); }
  },
  
  clearVocabCache: () => {
    sessionStorage.removeItem(STORAGE_KEYS.VOCAB_CACHE);
  },

  // --- Backup & Restore ---

  createBackup: (): Blob => {
    const data: BackupData = {
      version: 1,
      date: new Date().toISOString(),
      vocabulary: storageService.getVocabulary(),
      writingLogs: storageService.getWritingLogs(),
      classicalLogs: storageService.getClassicalLogs()
    };
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: "application/json" });
  },

  restoreBackup: (jsonData: any): void => {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error("無效的備份檔案格式");
    }

    // Check size estimation before attempting to write (Prevent crashes)
    const payloadSize = JSON.stringify(jsonData).length;
    // localStorage usually has 5MB limit (~5.2 million chars)
    if (payloadSize > 5200000) {
       throw new Error("備份檔案過大 (>5MB)，超出瀏覽器儲存限制。無法還原。建議手動編輯 JSON 檔分批匯入。");
    }

    // Transaction-like attempt: try to save all, if fail, define behavior
    // Here we save individually to salvage what we can
    try {
      if (jsonData.vocabulary && Array.isArray(jsonData.vocabulary)) {
        storageService.saveVocabulary(jsonData.vocabulary);
      }
      if (jsonData.writingLogs && Array.isArray(jsonData.writingLogs)) {
        storageService.saveWritingLogs(jsonData.writingLogs);
      }
      if (jsonData.classicalLogs && Array.isArray(jsonData.classicalLogs)) {
        storageService.saveClassicalLogs(jsonData.classicalLogs);
      }
    } catch (e: any) {
      if (e.message.includes("空間已滿")) {
         throw e; // Re-throw our custom error
      }
      throw new Error("還原過程中發生未預期的錯誤");
    }
  },

  clearAllData: (): void => {
    storageService.remove(STORAGE_KEYS.VOCAB);
    storageService.remove(STORAGE_KEYS.WRITING);
    storageService.remove(STORAGE_KEYS.CLASSICAL);
  }
};
