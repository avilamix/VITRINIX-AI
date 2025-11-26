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
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <LoadingSpinner />
        <p className="ml-2 text-lg text-gray-700">Checking API key status...</p>
      </div>
    );
  }

  if (!hasApiKey && window.aistudio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">VitrineX AI</h1>
        <p className="text-lg text-gray-600 mb-8">
          To use VitrineX AI, please select your Google Gemini API key.
          Veo video generation models require a paid GCP project API key.
        </p>
        <button
          onClick={handleOpenApiKeySelection}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200"
        >
          Select Gemini API Key
        </button>
        <p className="mt-4 text-sm text-gray-500">
          Need help? <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Learn about billing</a>.
        </p>
      </div>
    );
  }

  return (
    <NavigationContext.Provider value={{ setActiveModule }}>
      <div className="flex flex-col min-h-screen bg-lightbg">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
          <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
            {renderModule()}
          </main>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

export default App;