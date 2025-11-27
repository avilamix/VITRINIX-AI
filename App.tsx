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
import LiveConversation from './pages/LiveConversation';
import AudioTools from './pages/AudioTools';
import Logo from './components/Logo'; // Import Logo
import { NavigationContext } from './hooks/useNavigate';

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
  | 'Chatbot'
  | 'LiveConversation'
  | 'AudioTools';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleName>('Dashboard');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [loadingApiKeyCheck, setLoadingApiKeyCheck] = useState<boolean>(true);

  // Function to check and select API key
  const checkAndSelectApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } catch (error) {
        console.error("Error checking API key:", error);
        setHasApiKey(false);
      } finally {
        setLoadingApiKeyCheck(false);
      }
    } else {
      console.warn("window.aistudio is not available. Proceeding without API key check.");
      setHasApiKey(true); // Assume API key is not required or handled differently outside this environment
      setLoadingApiKeyCheck(false);
    }
  }, []);

  useEffect(() => {
    checkAndSelectApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenApiKeySelection = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume success for now, the user has opened the dialog.
        // The actual key will be available via process.env.API_KEY on subsequent API calls.
        setHasApiKey(true);
      } catch (error) {
        console.error("Error opening API key selection:", error);
        setHasApiKey(false);
      }
    } else {
      console.warn("window.aistudio.openSelectKey is not available.");
    }
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case 'Dashboard':
        return <Dashboard />;
      case 'AIManager':
        return <AIManager />;
      case 'ContentGenerator':
        return <ContentGenerator />;
      case 'AdStudio':
        return <AdStudio />;
      case 'CampaignBuilder':
        return <CampaignBuilder />;
      case 'TrendHunter':
        return <TrendHunter />;
      case 'CreativeStudio':
        return <CreativeStudio />;
      case 'ContentLibrary':
        return <ContentLibrary />;
      case 'SmartScheduler':
        return <SmartScheduler />;
      case 'Chatbot':
        return <Chatbot />;
      case 'LiveConversation':
        return <LiveConversation />;
      case 'AudioTools':
        return <AudioTools />;
      case 'Settings':
        return <Settings onApiKeySelected={checkAndSelectApiKey} onOpenApiKeySelection={handleOpenApiKeySelection} />;
      default:
        return <Dashboard />;
    }
  };

  if (loadingApiKeyCheck) {
    return (
      <div className="flex items-center justify-center h-full bg-darkbg">
        <LoadingSpinner />
        <p className="ml-2 text-textlight">Checking API key status...</p>
      </div>
    );
  }

  if (!hasApiKey && window.aistudio) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-darkbg p-4 text-center">
        <div className="mb-8 transform scale-150">
           <Logo className="h-16 w-16" showText={true} />
        </div>
        <p className="text-lg text-textlight mb-8 max-w-md">
          Para usar a VitrineX AI, selecione sua chave API do Google Gemini.
          Modelos avançados como Veo requerem uma chave de projeto pago no GCP.
        </p>
        <button
          onClick={handleOpenApiKeySelection}
          className="px-6 py-3 bg-accent text-darkbg font-semibold rounded-lg shadow-lg shadow-accent/50 hover:bg-neonGreen/80 focus:outline-none focus:ring-2 focus:ring-neonGreen focus:ring-offset-2 focus:ring-offset-darkbg transition duration-200"
        >
          Selecionar Chave API Gemini
        </button>
        <p className="mt-4 text-sm text-textmuted">
          Precisa de ajuda? <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Saiba mais sobre faturamento</a>.
        </p>
      </div>
    );
  }

  const isFullWidthModule = activeModule === 'Chatbot' || activeModule === 'LiveConversation';

  return (
    <NavigationContext.Provider value={{ setActiveModule }}>
      <div className="flex flex-col h-full bg-darkbg text-textdark font-sans selection:bg-accent/30">
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          <main className={`flex-1 flex flex-col min-w-0 ${isFullWidthModule ? 'p-0 overflow-hidden' : 'p-6 md:p-8 lg:p-10 overflow-y-auto'}`}>
            {renderModule()}
          </main>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

export default App;