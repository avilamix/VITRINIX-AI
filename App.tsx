

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AIManager from './pages/AIManager';
import ContentGenerator from './pages/ContentGenerator';
import AdStudio from './pages/AdStudio';
import CampaignBuilder from './pages/CampaignBuilder';
import TrendHunter from './pages/TrendHunter';
import CreativeStudio from './pages/CreativeStudio';
import ContentLibrary from './pages/ContentLibrary';
import SmartScheduler from './pages/SmartScheduler';
import Settings from './pages/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import Chatbot from './pages/Chatbot';
import AudioTools from './pages/AudioTools';
import Logo from './components/Logo'; 
import TutorialOverlay from './components/TutorialOverlay'; 
import { NavigationContext } from './hooks/useNavigate';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { TutorialProvider } from './contexts/TutorialContext'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyIcon, CheckCircleIcon, PlayIcon } from '@heroicons/react/24/outline';
import { testGeminiConnection } from './services/geminiService';

export type ModuleName =
  | 'Dashboard'
  | 'AIManager'
  | 'ContentGenerator'
  | 'AdStudio'
  | 'CampaignBuilder'
  | 'TrendHunter'
  | 'CreativeStudio'
  | 'ContentLibrary'
  | 'SmartScheduler'
  | 'Settings'
  | 'Chatbot';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const [activeModule, setActiveModule] = useState<ModuleName>('Dashboard');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [loadingApiKeyCheck, setLoadingApiKeyCheck] = useState<boolean>(true);
  const [manualApiKey, setManualApiKey] = useState<string>('');
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const checkAndSelectApiKey = useCallback(async () => {
    // 1. Check Window (AI Studio) - Cast to any to avoid TS error
    if ((window as any).aistudio && typeof (window as any).aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        if (selected) {
          setHasApiKey(true);
          setLoadingApiKeyCheck(false);
          return;
        }
      } catch (error) {
        console.error("Error checking API key:", error);
      }
    }
    
    // 2. Check Environment Variables (Enhanced support per documentation)
    if (process.env.API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
      setHasApiKey(true);
      setLoadingApiKeyCheck(false);
      return;
    }

    // 3. Check Local Storage
    const localKey = localStorage.getItem('vitrinex_gemini_api_key');
    if (localKey) {
        setHasApiKey(true);
    }

    setLoadingApiKeyCheck(false);
  }, []);

  useEffect(() => {
    checkAndSelectApiKey();
  }, []);

  const handleManualKeySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const key = manualApiKey.trim();
      if (!key) return;

      setIsTestingKey(true);
      setTestResult(null);

      try {
          // Ativar API: Validar usando o código de teste "Explain how AI works"
          const result = await testGeminiConnection(key);
          setTestResult(result);
          
          setTimeout(() => {
              localStorage.setItem('vitrinex_gemini_api_key', key);
              setHasApiKey(true);
          }, 1500); // Delay to show the success message
      } catch (error: any) {
          alert(`Erro ao ativar API: ${error.message || 'Chave inválida'}`);
          setTestResult(null);
      } finally {
          setIsTestingKey(false);
      }
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard': return <Dashboard />;
      case 'AIManager': return <AIManager />;
      case 'ContentGenerator': return <ContentGenerator />;
      case 'AdStudio': return <AdStudio />;
      case 'CampaignBuilder': return <CampaignBuilder />;
      case 'TrendHunter': return <TrendHunter />;
      case 'CreativeStudio': return <CreativeStudio />;
      case 'ContentLibrary': return <ContentLibrary />;
      case 'SmartScheduler': return <SmartScheduler />;
      case 'Chatbot': return <Chatbot />;
      case 'Settings': return <Settings onApiKeySelected={checkAndSelectApiKey} onOpenApiKeySelection={() => {}} />;
      default: return <Dashboard />;
    }
  };

  if (loadingApiKeyCheck) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoadingSpinner className="w-8 h-8" />
        <p className="mt-4 text-body font-medium animate-pulse">Inicializando VitrineX AI...</p>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
        <div className="p-10 bg-surface rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 max-w-md w-full">
            <div className="flex justify-center mb-8">
                 <Logo className="h-20 w-20" showText={false} />
            </div>
            <h1 className="text-3xl font-bold text-title mb-4">Bem-vindo à VitrineX</h1>
            <p className="text-body mb-8 leading-relaxed">
              Para ativar a plataforma, insira sua chave de API do Google Gemini. Validaremos a conexão com um teste rápido.
            </p>
            
            <form onSubmit={handleManualKeySubmit} className="space-y-4">
                <div className="relative">
                    <KeyIcon className="absolute left-3 top-3.5 w-5 h-5 text-muted" />
                    <input 
                        type="password" 
                        value={manualApiKey}
                        onChange={(e) => setManualApiKey(e.target.value)}
                        placeholder="Cole sua API Key aqui..."
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-body transition-all"
                        disabled={isTestingKey}
                    />
                </div>
                
                {testResult && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-2 text-left animate-in fade-in slide-in-from-top-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-green-700 dark:text-green-300">Conexão Ativa!</p>
                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 line-clamp-2">"{testResult}"</p>
                        </div>
                    </div>
                )}

                <button
                  type="submit"
                  disabled={!manualApiKey || isTestingKey}
                  className="w-full px-6 py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTestingKey ? <LoadingSpinner className="w-5 h-5 text-white" /> : <PlayIcon className="w-5 h-5" />}
                  {isTestingKey ? 'Testando Conexão...' : 'Ativar API & Entrar'}
                </button>
            </form>

            <p className="mt-6 text-xs text-muted">
              A chave é testada com o prompt "Explain how AI works" e salva localmente.
            </p>
        </div>
      </div>
    );
  }

  // Modules that require full height without internal padding/scroll (handled internally)
  const isFullHeightModule = activeModule === 'Chatbot';

  return (
    <NavigationContext.Provider value={{ setActiveModule, activeModule }}>
      <div className="flex flex-col h-screen bg-background text-body font-sans overflow-hidden">
        <TutorialOverlay /> 
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          {/* Main Content Area */}
          <main className={`flex-1 flex flex-col min-w-0 relative ${
            isFullHeightModule 
              ? 'h-full' 
              : 'overflow-y-auto pb-48' // TAREFA 1: Padding Bottom Generoso para não cortar conteúdo
          }`}>
            <div className={`w-full ${isFullHeightModule ? 'h-full' : 'max-w-7xl mx-auto p-4 md:p-8'}`}>
                {renderModule()}
            </div>
          </main>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <TutorialProvider>
              <AppContent />
            </TutorialProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;