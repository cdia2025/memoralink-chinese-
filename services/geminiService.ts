
import { GoogleGenAI, Type } from "@google/genai";
import { VocabularyItem, AiProvider } from "../types";

const GEMINI_MODEL = 'gemini-3-flash-preview';
const DEEPSEEK_MODEL = 'deepseek-chat'; 

export interface ChatSession {
  sendMessage: (msg: string) => Promise<string>;
}

declare global {
  interface Window {
    API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
    webkitSpeechRecognition?: any;
  }
}

const getApiKey = (provider: AiProvider) => {
  if (provider === 'deepseek') {
    const key = window.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DeepSeek API Key is missing.");
    return key;
  }
  const key = window.API_KEY || process.env.API_KEY;
  return key;
};

// Data Sanitizer (修復 DeepSeek 偶爾漏填資料的問題)
const sanitizeVocabularyItems = (items: any[]): VocabularyItem[] => {
  return items.map(item => ({
    word: item.word || "未命名",
    definition: (item.definition && item.definition.trim() !== "") 
      ? item.definition 
      : (item.meaning || item.explanation || "AI 未提供解釋"),
    phonetic: item.phonetic || "",
    chineseTranslation: item.chineseTranslation || "",
    exampleSentence: item.exampleSentence || "暫無例句",
    mnemonic: (item.mnemonic && item.mnemonic.trim() !== "") ? item.mnemonic : "暫無聯想記憶",
    context: item.context || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    image: item.image 
  }));
};

const extractJsonArray = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleanText);
    
    // Handle wrapped objects like { items: [...] }
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        for (const key of keys) {
            if (Array.isArray(parsed[key])) return parsed[key];
        }
    }
    
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) return [parsed];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return [];
  }
};

const extractJsonObject = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed[0] : {};
    return typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.error("JSON Object Parse Error:", e);
    return {};
  }
};

async function callDeepSeek(prompt: string, systemInstruction: string, jsonMode: boolean = true) {
  const apiKey = getApiKey('deepseek');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
          { role: "system", content: systemInstruction }, 
          { role: "user", content: prompt }
      ],
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.8
    })
  });
  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

// 1. Generate Vocabulary (Chinese)
export const generateVocabularyByTopic = async (
  topic: string, 
  count: number, 
  difficulty: string,
  provider: AiProvider
): Promise<VocabularyItem[]> => {
  const sys = `你是資深中文老師。目標：幫助記憶力差的學生或職場人士學習詞彙。
  任務：提供 ${count} 個與「${topic}」相關的${difficulty}中文詞彙或成語。
  
  重要指令：
  1. 回傳 JSON: { "items": [ ... ] }。
  2. "items" 陣列必須包含 ${count} 個不重複詞彙。
  3. "mnemonic" (聯想記憶)、"exampleSentence" (例句) 和 "definition" (解釋) **絕不能留空**。
  4. "phonetic" 必須提供 **廣東話拼音 (粵拼 Jyutping)**。
  5. 即使詞彙簡單，也必須填寫 definition。

  JSON 欄位：
  - word: 詞彙
  - phonetic: 粵拼
  - definition: 白話解釋 (必填)
  - chineseTranslation: 英文意思 (English Meaning)
  - exampleSentence: 造句
  - mnemonic: 聯想記憶故事 (幫助記憶這個詞的故事)
  - context: 語境
  - tags: 標籤`;

  const prompt = `請生成關於「${topic}」的 ${count} 個詞彙卡。`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return sanitizeVocabularyItems(extractJsonArray(resText));
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: sys,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            items: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        word: { type: Type.STRING },
                        phonetic: { type: Type.STRING },
                        definition: { type: Type.STRING },
                        chineseTranslation: { type: Type.STRING },
                        exampleSentence: { type: Type.STRING },
                        mnemonic: { type: Type.STRING },
                        context: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        }
      }
    }
  });
  
  return sanitizeVocabularyItems(extractJsonArray(response.text || "[]"));
};

// 1.1 Generate from List (Chinese)
export const generateVocabularyFromList = async (words: string[], provider: AiProvider): Promise<VocabularyItem[]> => {
  const sys = `你是中文詞彙專家。請為以下詞彙製作記憶卡。
  回傳 JSON { "items": [...] }。
  重點：phonetic 提供粵拼，definition (解釋) 和 mnemonic (記憶法) 必須填寫，不可留空。`;
  
  const prompt = `詞彙列表：${words.join(', ')}`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return sanitizeVocabularyItems(extractJsonArray(resText));
  }
  
  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
        systemInstruction: sys,
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            phonetic: { type: Type.STRING },
                            definition: { type: Type.STRING },
                            chineseTranslation: { type: Type.STRING },
                            exampleSentence: { type: Type.STRING },
                            mnemonic: { type: Type.STRING },
                            context: { type: Type.STRING },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        }
    }
  });
  return sanitizeVocabularyItems(extractJsonArray(response.text || "[]"));
};

// 2. Analyze Classical Chinese
export const analyzeClassicalChinese = async (
  text: string,
  provider: AiProvider
): Promise<any> => {
  const sys = `你是國學大師。用戶輸入文言文或詩詞。
  任務：
  1. 提供「白話文翻譯」。
  2. 考證「出處」及「背景」。
  3. 提供「現代應用」。
  4. 提取 3-5 個重點「詞彙」，製作記憶卡 (包含粵拼)。
  
  回傳 JSON Object:
  {
    "translation": "翻譯...",
    "origin": "出處...",
    "usage": "應用...",
    "vocabulary": [ ... ]
  }`;

  const prompt = `分析：\n${text}`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    const result = extractJsonObject(resText);
    if (result.vocabulary && Array.isArray(result.vocabulary)) {
        result.vocabulary = sanitizeVocabularyItems(result.vocabulary);
    }
    return result;
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL, 
    contents: prompt,
    config: {
      systemInstruction: sys,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translation: { type: Type.STRING },
          origin: { type: Type.STRING },
          usage: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                definition: { type: Type.STRING },
                chineseTranslation: { type: Type.STRING },
                exampleSentence: { type: Type.STRING },
                mnemonic: { type: Type.STRING },
                context: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }
  });
  const result = extractJsonObject(response.text || "{}");
  if (result.vocabulary && Array.isArray(result.vocabulary)) {
      result.vocabulary = sanitizeVocabularyItems(result.vocabulary);
  }
  return result;
};

// 3. Analyze Writing (Chinese)
export const analyzeWriting = async (text: string, context: string, provider: AiProvider): Promise<any> => {
  const sys = `你是中文寫作教練。
  1. 修正語法與錯別字 (Correction)。
  2. 潤飾文章，使其更通順、專業 (Improved Version)。
  3. 提供解釋 (Explanation)。
  4. 建議 2-3 個高級詞彙 (Key Vocabulary)，附帶粵拼與記憶法。
  回傳 JSON Object。`;
  
  const prompt = `語境：${context}。文章：${text}`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    const result = extractJsonObject(resText);
    if (result.keyVocabulary && Array.isArray(result.keyVocabulary)) {
        result.keyVocabulary = sanitizeVocabularyItems(result.keyVocabulary);
    }
    return result;
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL, 
    contents: prompt,
    config: {
      systemInstruction: sys,
      responseMimeType: "application/json",
      responseSchema: {
         type: Type.OBJECT,
         properties: {
            correction: { type: Type.STRING },
            explanation: { type: Type.STRING },
            improvedVersion: { type: Type.STRING },
            keyVocabulary: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                    word: {type:Type.STRING}, 
                    definition: {type:Type.STRING}, 
                    mnemonic: {type:Type.STRING}, 
                    phonetic: {type:Type.STRING}, 
                    chineseTranslation: {type:Type.STRING}, 
                    exampleSentence: {type:Type.STRING}, 
                    tags: {type:Type.ARRAY, items: {type:Type.STRING}} 
                } 
              } 
            }
         }
      }
    }
  });
  const result = extractJsonObject(response.text || "{}");
  if (result.keyVocabulary && Array.isArray(result.keyVocabulary)) {
      result.keyVocabulary = sanitizeVocabularyItems(result.keyVocabulary);
  }
  return result;
};

// 4. Chat (Chinese Roleplay)
export const createChatSession = (provider: AiProvider, systemInstruction: string): ChatSession => {
  const instruction = systemInstruction + " 請使用繁體中文進行對話 (廣東話或書面語皆可)。";
  
  if (provider === 'deepseek') {
    let history: {role: string, content: string}[] = [];
    return {
      sendMessage: async (msg: string) => {
        history.push({ role: "user", content: msg });
        const apiKey = getApiKey('deepseek');
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [{ role: "system", content: instruction }, ...history],
            temperature: 0.9 
            })
        });
        if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
        const data = await response.json();
        const resText = data.choices[0].message.content;
        history.push({ role: "assistant", content: resText });
        return resText as string;
      }
    };
  }

  const ai = new GoogleGenAI({ apiKey: getApiKey('gemini') });
  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    config: { systemInstruction: instruction }
  });

  return {
    sendMessage: async (msg: string) => {
      const result = await chat.sendMessage({ message: msg });
      return result.text || "";
    }
  };
};
