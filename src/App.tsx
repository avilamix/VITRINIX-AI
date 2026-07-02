import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './components/Dashboard';
import ContentGenerator from './components/ContentGenerator';
import MarketingTrends from './components/MarketingTrends';
import { Sparkles, BarChart2, Shield, TrendingUp } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export default function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'generator' | 'trends'>('dashboard');
  const [prefilledPrompt, setPrefilledPrompt] = useState('');
  const [prefilledKeywords, setPrefilledKeywords] = useState('');

  const handleUseInGenerator = (prompt: string, keywords: string) => {
    setPrefilledPrompt(prompt);
    setPrefilledKeywords(keywords);
    setActiveView('generator');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-body font-sans flex flex-col">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-border shadow-soft">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="bg-primary p-2 rounded-xl text-white shadow-glow">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div className="hidden md:block">
                <span className="font-bold text-base text-title tracking-tight">VitrineX</span>
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-md ml-1.5 uppercase">AI</span>
              </div>
            </div>

            {/* Nav Switcher */}
            <div className="flex bg-background p-1 rounded-xl border border-border shadow-inner">
              <button
                id="tab-dashboard"
                onClick={() => setActiveView('dashboard')}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-title'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              <button
                id="tab-generator"
                onClick={() => setActiveView('generator')}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'generator'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-title'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generator</span>
              </button>
              <button
                id="tab-trends"
                onClick={() => setActiveView('trends')}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'trends'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-muted hover:text-title'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Trends</span>
              </button>
            </div>

            {/* Top Right Badges */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-background border border-border px-3 py-1 rounded-full text-xs text-muted font-medium">
                <Shield className="w-3.5 h-3.5 text-success" />
                <span>Enterprise Sandbox</span>
              </div>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 font-bold px-3 py-1 rounded-xl hidden sm:inline-block">
                Active Client
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Stage */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeView === 'dashboard' && <Dashboard />}
          {activeView === 'generator' && (
            <ContentGenerator 
              prefilledPrompt={prefilledPrompt}
              prefilledKeywords={prefilledKeywords}
              onClearPrefills={() => {
                setPrefilledPrompt('');
                setPrefilledKeywords('');
              }}
            />
          )}
          {activeView === 'trends' && (
            <MarketingTrends onUseInGenerator={handleUseInGenerator} />
          )}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-border bg-surface py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
            <p>© 2026 VitrineX AI. All rights reserved.</p>
            <div className="flex items-center gap-1">
              <span>Powered by</span>
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-title">Gemini & React Query</span>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}
