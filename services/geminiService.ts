
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

// Parser for Array results (Vocabulary Lists)
const extractJsonArray = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleanText);

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
    console.error("JSON Array Parse Error:", e, text);
    const match = text.match(/\[\s*\{.*\}\s*\]/s);
    if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
    }
    // Try to find object items wrapper
    const matchObj = text.match(/\{\s*"items"\s*:\s*\[.*\]\s*\}/s);
    if (matchObj) {
        try { return JSON.parse(matchObj[0]).items; } catch (e3) {}
    }
    throw new Error("AI 回傳列表格式有誤，請重試。");
  }
};

// Parser for Object results (Analysis, Writing)
const extractJsonObject = (text: string) => {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleanText);
    
    if (Array.isArray(parsed)) {
        // If AI returned an array [{}], take the first item
        return parsed.length > 0 ? parsed[0] : {};
    }
    
    return typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.error("JSON Object Parse Error:", e, text);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
        try { return JSON.parse(match[0]); } catch (e2) {}
    }
    throw new Error("AI 回傳物件格式有誤，請重試。");
  }
};

// Updated callDeepSeek to support jsonMode toggling
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
      temperature: 0.8 // Reduced for better stability
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
  
  重要指令：
  1. **必須回傳 JSON 物件**，結構為 { "items": [ ... ] }。
  2. "items" 陣列必須包含 **${count} 個完全不同** 的詞彙，**絕不能重複**。
  3. "mnemonic" (聯想記憶法) 和 "exampleSentence" (應用例句) **絕不能留空**。如果沒有標準記憶法，請發揮創意編寫一個有趣的故事或諧音記憶法。
  4. "phonetic" 必須提供 **廣東話拼音 (粵拼 Jyutping)**。

  每個物件欄位：
  - "word": 詞彙/成語
  - "phonetic": 粵語拼音
  - "definition": 白話文解釋
  - "chineseTranslation": 英文意思或補充
  - "exampleSentence": 完整的應用例句 (不能留空)
  - "mnemonic": 具體的聯想記憶故事 (不能留空，需詳細)
  - "context": 適用語境
  - "tags": 標籤陣列`;

  const prompt = `請生成關於「${topic}」的 ${count} 個詞彙卡。請確保內容豐富，不要留白。`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return extractJsonArray(resText);
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
  
  return extractJsonArray(response.text || "[]");
};

// 1.1 Generate from List (Chinese)
export const generateVocabularyFromList = async (words: string[], provider: AiProvider): Promise<VocabularyItem[]> => {
  const sys = `你是中文詞彙專家。請為以下詞彙製作記憶卡。
  回傳格式：JSON 物件 { "items": [ ... ] }。
  
  重要：
  1. phonetic 必須提供 **廣東話拼音 (粵拼 Jyutping)**。
  2. mnemonic (記憶法) 和 exampleSentence (例句) **必須填寫內容，不能留空**。
  3. 為每個詞彙提供生動的聯想記憶故事。`;
  
  const prompt = `詞彙列表：${words.join(', ')}`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return extractJsonArray(resText);
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
  return extractJsonArray(response.text || "[]");
};

// 2. Analyze Classical Chinese (New Feature)
export const analyzeClassicalChinese = async (
  text: string,
  provider: AiProvider
): Promise<any> => {
  const sys = `你是國學大師。用戶會輸入一段文言文或詩詞。
  任務：
  1. 提供「白話文翻譯」。
  2. **嚴格考證「出處」及「背景」**：
     - **必須**查核並列出句子出處（書名、篇名、作者）。
     - **必須**詳細闡述歷史背景、創作動機。
     - **警告：此欄位絕不能留空。**
  3. 提供「現代應用方式」(如何在寫作、職場或演講中使用)。
  4. 提取 3-5 個重點「詞彙/字詞」，並製作記憶卡(vocabulary items)。
     - vocabulary 中的 "phonetic" 欄位必須標註 **廣東話拼音 (粵拼 Jyutping)**。
     - **重要**：vocabulary 陣列必須包含資料，絕不能回傳空陣列。
  
  輸出格式 JSON 範例 (Object)：
  {
    "translation": "白話文翻譯...",
    "origin": "《論語·學而》...",
    "usage": "這句話可以用於...",
    "vocabulary": [
      {
        "word": "詞彙",
        "phonetic": "ci4 wui6",
        "definition": "解釋...",
        "mnemonic": "記憶法...",
        "exampleSentence": "例句..."
      }
    ]
  }`;

  const prompt = `分析這段文言文：\n${text}\n請確保 vocabulary 欄位至少包含 3 個重點詞彙。`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return extractJsonObject(resText);
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
  return extractJsonObject(response.text || "{}");
};

// 3. Analyze Writing (Chinese)
export const analyzeWriting = async (text: string, context: string, provider: AiProvider): Promise<any> => {
  const sys = `你是中文寫作教練。
  1. 修正語法與錯別字 (Correction)。
  2. 潤飾文章 (Improved Version)，使其更通順、優美、專業。
  3. 提供解釋 (Explanation)。
  4. 建議 2-3 個可替換的高級詞彙 (Key Vocabulary)。
     - keyVocabulary 中的 "phonetic" 欄位必須標註 **廣東話拼音 (粵拼 Jyutping)**。
     - **重要**：keyVocabulary 陣列中的每個物件都必須包含 definition (定義) 和 mnemonic (記憶法)。**絕不能回傳空物件或空字串**。
  回傳 JSON (Object)。`;
  
  const prompt = `語境：${context}。文章：${text}。
  
  重要：請確保 keyVocabulary 包含完整的資料，包括 word, definition, mnemonic, phonetic。不要留空。`;

  if (provider === 'deepseek') {
    const resText = await callDeepSeek(prompt, sys, true);
    return extractJsonObject(resText);
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
  return extractJsonObject(response.text || "{}");
};

// 4. Chat (Chinese Roleplay)
export const createChatSession = (provider: AiProvider, systemInstruction: string): ChatSession => {
  const instruction = systemInstruction + " 請使用繁體中文進行對話。";
  
  if (provider === 'deepseek') {
    // For Chat, we must maintain history manually and disable JSON mode
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
            messages: [
                { role: "system", content: instruction }, 
                ...history
            ],
            // Important: No response_format: "json_object" for chat/quiz scenario generation
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
