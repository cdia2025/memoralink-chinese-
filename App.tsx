
import { useState } from 'react';
import { AppView, AiProvider } from './types';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VocabularyBuilder } from './components/VocabularyBuilder';
import { WritingLab } from './components/WritingLab';
import { OralCoach } from './components/OralCoach';
import { Library } from './components/Library';
import { QuizRoom } from './components/QuizRoom';
import { ClassicalMode } from './components/ClassicalMode';
import { Sparkles, Cpu } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [provider, setProvider] = useState<AiProvider>('deepseek');

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
