
import React, { useState } from 'react';
import { AppView, AiProvider } from './types';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { WritingLab } from './components/WritingLab';
import { OralCoach } from './components/OralCoach';
import { Library } from './components/Library';
import { QuizRoom } from './components/QuizRoom';
import { ClassicalMode } from './components/ClassicalMode';
import { Sparkles, Cpu, Lock, ArrowRight, BookOpen, HelpCircle } from 'lucide-react';

// Use environment variable or default to '8888'
const APP_PASSWORD = process.env.APP_PASSWORD || '8888';
const PASSWORD_HINT = process.env.APP_PASSWORD_HINT;
const AUTH_KEY = 'memoralink_auth_token_v2'; // Updated key version

export default function App() {
  // Authentication State
  // Logic: Check if the stored password matches the CURRENT environment password
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedAuth = localStorage.getItem(AUTH_KEY);
    return storedAuth === APP_PASSWORD;
  });
  
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // App State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [provider, setProvider] = useState<AiProvider>('deepseek');

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (passwordInput === APP_PASSWORD) {
      // Store the ACTUAL password value, not just 'true'
      // This ensures that if APP_PASSWORD changes in .env, the stored value won't match, forcing re-login
      localStorage.setItem(AUTH_KEY, APP_PASSWORD);
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD: return <Dashboard setView={setCurrentView} />;
      case AppView.VOCABULARY: return <VocabularyBuilder aiProvider={provider} />;
      case AppView.LIBRARY: return <Library />;
      case AppView.WRITING: return <WritingLab aiProvider={provider} />;
      case AppView.SPEAKING: return <OralCoach aiProvider={provider} />;
      case AppView.QUIZ: return <QuizRoom aiProvider={provider} />;
      case AppView.CLASSICAL: return <ClassicalMode aiProvider={provider} />;
      default: return <Dashboard setView={setCurrentView} />;
    }
  };

  // Login Screen Component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
               <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">文曲星 AI</h1>
            <p className="text-indigo-200 text-sm tracking-widest uppercase">MemoraLink Chinese</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  請輸入存取密碼
                </label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => { setAuthError(false); setPasswordInput(e.target.value); }}
                  placeholder="Password"
                  autoFocus
                  className={`w-full p-3 rounded-xl border ${authError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-slate-200 bg-slate-50 focus:ring-indigo-200'} outline-none focus:ring-4 transition-all`}
                />
                {authError && <p className="text-xs text-red-500 font-medium animate-pulse">密碼錯誤，請重試。</p>}
              </div>
              
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                進入系統 <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {PASSWORD_HINT && (
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                        <HelpCircle className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">
                            提示: <span className="font-medium text-indigo-600">{PASSWORD_HINT}</span>
                        </span>
                    </div>
                </div>
            )}
            
            <div className="mt-4 text-center">
               <p className="text-[10px] text-slate-300">Restricted Access</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Navigation currentView={currentView} setView={setCurrentView} />
      
      <main className="flex-1 overflow-y-auto h-screen relative flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-40">
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <h1 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
               {currentView === AppView.CLASSICAL ? '文言文模式' : currentView.replace('_', ' ')}
             </h1>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setProvider('deepseek')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${provider === 'deepseek' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>DEEPSEEK</button>
                <button onClick={() => setProvider('gemini')} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${provider === 'gemini' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>GEMINI</button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                {provider === 'gemini' ? <Sparkles className="w-4 h-4 text-indigo-600" /> : <Cpu className="w-4 h-4 text-indigo-600" />}
                <span className="text-xs font-semibold text-indigo-700">{provider === 'gemini' ? 'Gemini AI' : 'DeepSeek AI'}</span>
              </div>
           </div>
        </header>
        <div className="flex-1">{renderView()}</div>
      </main>
    </div>
  );
}
