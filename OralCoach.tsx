
import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, ChatSession } from '../services/geminiService';
import { Mic, MicOff, Send, Sparkles, ArrowRight } from 'lucide-react';
import { AiProvider } from '../types';

const SCENARIOS = [
  { id: 'interview', title: '求職面試 (Interview)', prompt: "你是一位嚴格但專業的面試官。請針對用戶的應徵職位（假設為行政人員）進行提問。一次問一題。" },
  { id: 'exam', title: '口語考試 (Oral Exam)', prompt: "你是一位口語考試的主考官。請提出一個社會議題（如：環保、科技發展），引導考生發表意見，並進行追問。" },
  { id: 'business', title: '商業談判 (Business)', prompt: "你是合作夥伴公司的代表。用戶需要向你推銷一個新方案。請提出質疑並要求對方解釋細節。" },
  { id: 'custom', title: '自訂場景', prompt: "" },
];

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface OralCoachProps {
  aiProvider: AiProvider;
}

export const OralCoach: React.FC<OralCoachProps> = ({ aiProvider }) => {
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [customSessionStarted, setCustomSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);

  useEffect(() => {
    if (activeScenario.id === 'custom' && !customSessionStarted) return;

    let prompt = activeScenario.prompt;
    let title = activeScenario.title;

    if (activeScenario.id === 'custom') {
       prompt = `你是對話夥伴。用戶想練習：「${customTopic}」。請以此背景進行自然對話。`;
       title = customTopic;
    }

    const systemPrompt = prompt + " 重要：如果用戶的語法不通順或用詞不當，請在回應最後用括號 (建議：...) 輕微修正。保持對話簡短。";
    chatSessionRef.current = createChatSession(aiProvider, systemPrompt);
    setMessages([{ id: 'init', role: 'model', text: `(場景: ${title}) 你好，我們開始吧！` }]);
  }, [activeScenario, aiProvider, customSessionStarted]); 

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const responseText = await chatSessionRef.current.sendMessage(userMsg.text);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
    } catch (error) { alert("發送失敗，請檢查網絡。"); } finally { setIsLoading(false); }
  };

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window)) { alert("請使用 Chrome 瀏覽器以支援語音功能。"); return; }
    if (isListening) { setIsListening(false); return; }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'zh-HK'; // Default Cantonese
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => { setInput(prev => prev + (prev ? ' ' : '') + event.results[0][0].transcript); };
    recognition.start();
  };

  const handleStartCustom = () => { if (!customTopic.trim()) return; setMessages([]); setCustomSessionStarted(true); };
  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = SCENARIOS.find(s => s.id === e.target.value);
    if (selected) { setActiveScenario(selected); setMessages([]); setCustomSessionStarted(false); }
  };

  return (
    <div className="max-w-4xl mx-auto md:p-8 h-[calc(100vh-80px)] md:h-screen flex flex-col space-y-4 bg-slate-900 rounded-none md:rounded-3xl">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 md:p-0">
        <div><h2 className="text-2xl font-bold text-white">口語教練</h2><p className="text-slate-300 text-sm">模擬面試與職場對話。</p></div>
        <select value={activeScenario.id} onChange={handleScenarioChange} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
       </div>

       <div className="flex-1 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden flex flex-col">
          {activeScenario.id === 'custom' && !customSessionStarted ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 bg-slate-800">
               <div className="w-16 h-16 bg-indigo-900 rounded-full flex items-center justify-center mb-2"><Sparkles className="w-8 h-8 text-indigo-300" /></div>
               <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="例如：我要練習向老闆請假..." className="w-full max-w-md p-4 rounded-xl border border-slate-600 bg-slate-900 text-white" />
               <button onClick={handleStartCustom} disabled={!customTopic.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2">開始對話 <ArrowRight className="w-5 h-5" /></button>
             </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/40">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm md:text-base leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-700 text-white rounded-tl-none'}`}>{msg.text}</div>
                  </div>
                ))}
                {isLoading && <div className="text-slate-500 text-xs p-4">思考中...</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
                 <button onClick={toggleMic} className={`p-3 rounded-full ${isListening ? 'bg-red-900 text-red-100 animate-pulse' : 'bg-slate-700 text-slate-100'}`}>{isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button>
                 <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="輸入回應..." className="w-full p-3 rounded-full border border-slate-600 bg-slate-900 text-white" />
                 <button onClick={handleSend} disabled={!input.trim() || isLoading} className="p-3 bg-indigo-600 text-white rounded-full"><Send className="w-5 h-5" /></button>
              </div>
            </>
          )}
       </div>
    </div>
  );
};
