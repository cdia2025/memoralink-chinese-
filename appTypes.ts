
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  WRITING = 'WRITING',
  SPEAKING = 'SPEAKING',
  LIBRARY = 'LIBRARY',
  QUIZ = 'QUIZ',
  READING = 'READING'
}

export type AiProvider = 'gemini' | 'deepseek';

export interface VocabularyItem {
  word: string; 
  phonetic?: string; // IPA or KK
  definition: string; // Chinese Meaning (Traditional)
  chineseTranslation: string; // English Definition / Part of Speech
  exampleSentence: string; 
  mnemonic: string; // Memory aid (Chinese/English)
  context: string; 
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
  translation: string; // Chinese Translation
  origin: string; // Source / Style
  usage: string; // Key Takeaways
  date: string;
}

export const TOPICS = [
  "Daily Conversation (日常會話)",
  "Business English (商業英語)",
  "IELTS / TOEFL (學術考試)",
  "Travel & Tourism (旅遊英語)",
  "Job Interview (求職面試)",
  "News & Media (新聞媒體)",
  "Technology & AI (科技)",
  "Idioms & Phrasal Verbs (片語與諺語)"
];
