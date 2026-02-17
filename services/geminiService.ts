
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

// Data Sanitizer (Enhanced: Fixes missing definitions AND missing words)
const sanitizeVocabularyItems = (items: any[]): VocabularyItem[] => {
  return items.map(item => ({
    // Fix 'Unnamed': Check common alternative keys AI might return
    word: item.word || item.term || item.character || item.zi || item.text || "未命名",
    
    // Fix 'Missing Definition': Fallback to other keys or use placeholder
    definition: (item.definition && item.definition.trim() !== "") 
      ? item.definition 
      : (item.meaning || item.explanation || item.chineseTranslation || "AI 未提供解釋"),
    
    phonetic: item.phonetic || item.jyutping || item.pinyin || "",
    chineseTranslation: item.chineseTranslation || "",
    exampleSentence: item.exampleSentence || item.sentence || "暫無例句",
    mnemonic: (item.mnemonic && item.mnemonic.trim() !== "") ? item.mnemonic : "暫無聯想記憶",
    context: item.context || "",
    tags: Array.isArray(item.tags) ? item.tags : [],
    image: item.image 
  }));
};

// Parser for Array results (Vocabulary Lists)
const extractJsonArray = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Try to find the array start and end if there is chatter
    const arrayStart = cleanText.indexOf('[');
    const arrayEnd = cleanText.lastIndexOf(']');
    
    let jsonString = cleanText;
    if (arrayStart !== -1 && arrayEnd !== -1) {
        jsonString = cleanText.substring(arrayStart, arrayEnd + 1);
    }

    let parsed = JSON.parse(jsonString);

    // Handle case where AI returns an object wrapper { "items": [...] }
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        for (const key of keys) {
            if (Array.isArray(parsed[key])) {
                return parsed[key];
            }
        }
    }
    
    // If parsed is a single object but supposed to be a list, wrap it
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
       return [parsed];
    }

    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("JSON Array Parse Error:", e);
    // Fallback: regex extraction
    const matchObj = text.match(/\{\s*"items"\s*:\s*\[.*\]\s*\}/s);
    if (matchObj) {
        try { return JSON.parse(matchObj[0]).items; } catch (e3) {}
    }
    return [];
  }
};

// Parser for Object results (Analysis, Writing)
const extractJsonObject = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Locate the first '{' and last '}'
    const objStart = cleanText.indexOf('{');
    const objEnd = cleanText.lastIndexOf('}');
    
    let jsonString = cleanText;
    if (objStart !== -1 && objEnd !== -1) {
        jsonString = cleanText.substring(objStart, objEnd + 1);
    }

    let parsed = JSON.parse(jsonString);
    
    if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed[0] : {};
    }
    
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
      temperature: 0.7 
    })
  });
  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content;
}

// 1. Generate Vocabulary (Chinese Context)
export const generateVocabularyByTopic = async (
  topic: string, 
  count: number, 
  difficulty: string,
  provider: AiProvider
): Promise<VocabularyItem[]> => {
  const sys = `你是資深中文老師。目標：幫助記憶力差的初中/高中生及在職人士學習詞彙。
  任務：提供 ${count} 個與「${topic}」相關的${difficulty}中文詞彙或成語。
  
  嚴格規則：
  1. **所有解釋(definition)及例句(exampleSentence)必須使用「標準書面語」(Standard Written Chinese)**，嚴禁使用廣東話口語 (如：嘅、喺、咁、佢)。
  2. "phonetic" 必須是 **粵拼 (Jyutping)**。
  
  嚴格回傳 JSON 格式：
  {
    "items": [
      {
        "word": "詞彙",
        "phonetic": "粵拼 (例如: jyut6)",
        "definition": "詳細書面語解釋",
        "mnemonic": "聯想記憶故事",
        "exampleSentence": "完整書面語例句",
        "context": "適用語境",
        "tags": ["標籤"]
      }
    ]
  }
  
  注意：definition 和 mnemonic 絕不能留空。`;

  const prompt = `請生成關於「${topic}」的 ${count} 個詞彙卡。請確保例句是書面語。`;

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
  嚴格規則：
  1. phonetic 提供粵拼 (Jyutping)。
  2. definition (解釋) 和 exampleSentence (例句) 必須使用**標準書面語**，不可使用廣東話口語。
  3. mnemonic (記憶法) 必須填寫，不可留空。`;
  
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

// 2. Analyze Classical Chinese (Improved for DeepSeek stability)
export const analyzeClassicalChinese = async (
  text: string,
  provider: AiProvider
): Promise<any> => {
  // Enhanced System Prompt specifically to force JSON structure for Vocabulary
  const sys = `你是國學大師。用戶輸入文言文或詩詞。
  任務：
  1. 提供「白話文翻譯」(必須使用標準書面語)。
  2. 考證「出處」及「背景」。
  3. 提供「現代應用」(標準書面語)。
  4. 提取 3-5 個重點「實詞」(生僻字、通假字或古今異義詞)，製作詳細記憶卡。
  
  請嚴格按照以下 JSON 結構回覆 (鍵名必須完全一致)：
  {
    "translation": "完整白話文翻譯 (書面語)",
    "origin": "出處與作者",
    "usage": "現代應用或啟示 (書面語)",
    "vocabulary": [
      {
        "word": "這裡填寫單字或詞語 (例如: 說)",
        "phonetic": "粵拼 (例如: jyut6)",
        "definition": "這裡填寫詳細字義 (書面語)",
        "mnemonic": "助記法",
        "exampleSentence": "包含此字詞的書面語短句"
      }
    ]
  }
  `;

  const prompt = `請分析以下古文：\n${text}`;

  if (provider === 'deepseek') {
    // DeepSeek handles prompt-based JSON schemas better than implicit ones
    const resText = await callDeepSeek(prompt, sys, true);
    const result = extractJsonObject(resText);
    
    // Fallback: If vocabulary is missing or empty, ensure it's an array to prevent crashes
    if (!result.vocabulary) result.vocabulary = [];
    
    if (Array.isArray(result.vocabulary)) {
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
  1. 修正語法與錯別字 (Correction) - 使用標準書面語。
  2. 潤飾文章 (Improved Version) - 使用優美、專業的標準書面語。
  3. 提供解釋 (Explanation) - 分析修正原因。
  4. 建議 2-3 個高級詞彙 (Key Vocabulary)，附帶粵拼與記憶法。
  
  回傳 JSON 結構：
  {
    "correction": "...",
    "explanation": "...",
    "improvedVersion": "...",
    "keyVocabulary": [
       { "word": "...", "phonetic": "...", "definition": "書面語解釋", "mnemonic": "..." }
    ]
  }`;
  
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
            keyVocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: {type:Type.STRING}, definition: {type:Type.STRING}, mnemonic: {type:Type.STRING}, phonetic: {type:Type.STRING}, chineseTranslation: {type:Type.STRING}, exampleSentence: {type:Type.STRING}, tags: {type:Type.ARRAY, items: {type:Type.STRING}} } } }
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
  const instruction = systemInstruction + " 請使用標準書面語 (Standard Written Chinese) 進行主要回答。若涉及口語教學，可適量使用口語。";
  
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
