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
import Logo from './components/Logo'; 
import { NavigationContext } from './hooks/useNavigate';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';

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

function AppContent() {
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
      setHasApiKey(true); 
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
      <div className="flex items-center justify-center h-full bg-background transition-colors duration-200">
        <LoadingSpinner />
        <p className="ml-3 text-body font-medium">Initializing secure environment...</p>
      </div>
    );
  }

  if (!hasApiKey && window.aistudio) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background p-6 text-center transition-colors duration-200">
        <div className="mb-10 p-8 bg-surface rounded-2xl shadow-soft border border-gray-100 max-w-lg w-full">
            <div className="flex justify-center mb-6">
                 <Logo className="h-16 w-16" showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-title mb-3">Welcome to NexusAI</h1>
            <p className="text-body mb-8">
              Please connect your Google Gemini API key to access the enterprise suite.
              <br/><span className="text-sm text-muted">Paid keys required for advanced media generation.</span>
            </p>
            <button
              onClick={handleOpenApiKeySelection}
              className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90 transition duration-200"
            >
              Connect API Key
            </button>
            <p className="mt-6 text-xs text-muted">
              Secure connection managed by Google AI Studio.
            </p>
        </div>
      </div>
    );
  }

  const isFullWidthModule = activeModule === 'Chatbot' || activeModule === 'LiveConversation';

  return (
    <NavigationContext.Provider value={{ setActiveModule }}>
      <div className="flex flex-col h-full bg-background text-body font-sans transition-colors duration-200">
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          <main className={`flex-1 flex flex-col min-w-0 ${isFullWidthModule ? 'p-0 overflow-hidden' : 'p-6 md:p-8 overflow-y-auto'}`}>
            <div className={`mx-auto w-full ${isFullWidthModule ? 'h-full' : 'max-w-7xl'}`}>
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
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;