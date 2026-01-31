
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
  LIBRARY = 'LIBRARY',
  QUIZ = 'QUIZ',
  CLASSICAL = 'CLASSICAL'
}

export type AiProvider = 'gemini' | 'deepseek';

export interface VocabularyItem {
  word: string; // 詞彙/成語
  phonetic?: string; // 粵拼 (Jyutping)
  definition: string; // 解釋
  chineseTranslation?: string; // 英文意思 (English Meaning) - Optional
  exampleSentence: string; // 例句
  mnemonic: string; // 聯想記憶故事
  context: string; // 語境
  tags?: string[]; 
  image?: string;
}

export interface WritingEntry {
  id: string;
  originalText: string;
  correction: string;
  improvedVersion: string;
  explanation: string;
  context: string;
  date: string;
}

export interface ClassicalEntry {
  id: string;
  originalText: string;
  translation: string; // 白話文
  origin: string; // 出處
  usage: string; // 應用
  date: string;
}

export const TOPICS = [
  "DSE 指定文言範文 (HKDSE)",
  "議論文寫作 (Argumentative)",
  "成語與典故 (Idioms)",
  "商業公文與書信 (Business)",
  "求職面試 (Interview)",
  "日常演講與口才 (Speech)",
  "唐詩宋詞 (Poetry)",
  "公務員綜合招聘試 (CRE)"
];
