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
import BackButton from './components/BackButton';
import { NavigationContext } from './hooks/useNavigate';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { getActiveOrganization, getCurrentUser, loginWithGoogle } from './services/authService';
import { UserProfile, OrganizationMembership } from './types';
import Button from './components/Button'; // Import Button for the login screen

// Make AIStudio globally available, as specified in `types.ts`
// FIX: Remove redundant global declaration here. It should be only in types.ts
// declare global {
//   interface Window {
//     aistudio?: AIStudio;
//   }
// }

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
  
  // NEW STATES for user/organization management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeOrganization, setActiveOrganizationState] = useState<OrganizationMembership | undefined>(undefined);
  const [loadingUserAndOrgs, setLoadingUserAndOrgs] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null); // For login screen errors

  // Helper to update active organization state in App.tsx
  const updateActiveOrganizationState = useCallback(() => {
    setActiveOrganizationState(getActiveOrganization());
  }, []);

  const loadUserAndOrganizations = useCallback(async () => {
    setLoadingUserAndOrgs(true);
    setLoginError(null);
    try {
      const user = await getCurrentUser(); // This now attempts to refresh from backend
      setUserProfile(user);
      updateActiveOrganizationState();
    } catch (error) {
      console.error("Error loading user and organizations:", error);
      setUserProfile(null);
      setActiveOrganizationState(undefined);
      setLoginError("Failed to load user session. Please try logging in again.");
    } finally {
      setLoadingUserAndOrgs(false);
    }
  }, [updateActiveOrganizationState]);

  const checkAndSelectApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
        if (selected) {
            await loadUserAndOrganizations();
        } else {
            setLoadingUserAndOrgs(false); // No API key, so no user/orgs to load yet
        }
      } catch (error) {
        console.error("Error checking API key:", error);
        setHasApiKey(false);
        setLoadingUserAndOrgs(false);
        setLoginError("Failed to verify API key status.");
      } finally {
        setLoadingApiKeyCheck(false);
      }
    } else {
      console.warn("window.aistudio is not available. Proceeding without API key check.");
      setHasApiKey(true); 
      await loadUserAndOrganizations(); 
      setLoadingApiKeyCheck(false);
    }
  }, [loadUserAndOrganizations]);

  useEffect(() => {
    checkAndSelectApiKey();
  }, [checkAndSelectApiKey]);

  const handleOpenApiKeySelection = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume key selection was successful and proceed to load user data
        setHasApiKey(true);
        await loadUserAndOrganizations(); 
      } catch (error) {
        console.error("Error opening API key selection:", error);
        setHasApiKey(false);
        setUserProfile(null);
        setActiveOrganizationState(undefined);
        setLoginError("Failed to connect API key.");
      }
    } else {
      console.warn("window.aistudio.openSelectKey is not available.");
      setLoginError("API Key selection not supported in this environment.");
    }
  }, [loadUserAndOrganizations]);

  const handleLogin = useCallback(async () => {
    setLoadingUserAndOrgs(true);
    setLoginError(null);
    try {
      await loginWithGoogle(); // This populates authService's internal state via backend
      await loadUserAndOrganizations(); // This refreshes App.tsx state from authService
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
      setUserProfile(null);
      setActiveOrganizationState(undefined);
    } finally {
      setLoadingUserAndOrgs(false);
    }
  }, [loadUserAndOrganizations]);


  const renderModule = () => {
    // Pass organizationId to all modules that need it for data fetching
    const currentOrganizationId = activeOrganization?.organization.id;
    const currentUserId = userProfile?.id; // Pass actual user ID

    if (!currentOrganizationId || !currentUserId) {
        // This state should ideally not be reached if the login screen is correctly displayed.
        // It's a safeguard, but the LoginScreen is the primary fallback.
        return (
            <div className="flex flex-col items-center justify-center min-h-screen-minus-navbar bg-background text-body p-4">
                <LoadingSpinner />
                <p className="mt-4 text-lg">Aguardando login e seleção de organização...</p>
            </div>
        );
    }

    switch (activeModule) {
      case 'Dashboard':
        return <Dashboard organizationId={currentOrganizationId} />;
      case 'AIManager':
        return <AIManager organizationId={currentOrganizationId} userProfile={userProfile} />;
      case 'ContentGenerator':
        return <ContentGenerator organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'AdStudio':
        return <AdStudio organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'CampaignBuilder':
        return <CampaignBuilder organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'TrendHunter':
        return <TrendHunter organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'CreativeStudio':
        return <CreativeStudio organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'ContentLibrary':
        return <ContentLibrary organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'SmartScheduler':
        return <SmartScheduler organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'Chatbot':
        return <Chatbot organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'LiveConversation':
        return <LiveConversation organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'AudioTools':
        return <AudioTools organizationId={currentOrganizationId} userId={currentUserId} />;
      case 'Settings':
        return <Settings onApiKeySelected={loadUserAndOrganizations} onOpenApiKeySelection={handleOpenApiKeySelection} organizationId={currentOrganizationId} userId={currentUserId} />;
      default:
        return <Dashboard organizationId={currentOrganizationId} />;
    }
  };

  // Render Loading state
  if (loadingApiKeyCheck || loadingUserAndOrgs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-body">
        <LoadingSpinner className="w-12 h-12" />
        <p className="mt-4 text-lg text-title">Carregando VitrineX AI...</p>
      </div>
    );
  }

  // Render API Key Selection screen if no key and aistudio is available
  if (!hasApiKey && window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-body p-4 text-center">
        <Logo className="h-16 w-16 mb-6" showText={false} />
        <h1 className="text-3xl font-bold text-title mb-3">Conecte sua Chave API Gemini</h1>
        <p className="text-lg text-muted max-w-md">Para utilizar o VitrineX AI, é necessário conectar uma chave de API Gemini.</p>
        <p className="text-sm text-muted mt-2 max-w-md">Certifique-se de que sua chave esteja vinculada a um projeto GCP faturável. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Saiba mais sobre faturamento.</a></p>
        {loginError && <p className="text-error mt-4">{loginError}</p>}
        <Button onClick={handleOpenApiKeySelection} variant="primary" size="lg" className="mt-6">
          Conectar Chave API
        </Button>
      </div>
    );
  }

  // Render Login screen if API Key is present but no user/organization
  if (!userProfile || !activeOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-body p-4 text-center">
        <Logo className="h-16 w-16 mb-6" showText={false} />
        <h1 className="text-3xl font-bold text-title mb-3">Login no VitrineX AI</h1>
        <p className="text-lg text-muted max-w-md">Faça login para acessar sua plataforma de automação de marketing.</p>
        {loginError && <p className="text-error mt-4">{loginError}</p>}
        <Button onClick={handleLogin} variant="primary" size="lg" className="mt-6">
          Login com Google
        </Button>
      </div>
    );
  }

  // Main application layout
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NavigationContext.Provider value={{ setActiveModule }}>
          <div className="min-h-screen bg-background flex flex-col">
            <Navbar userProfile={userProfile} activeOrganization={activeOrganization} onOrganizationChange={updateActiveOrganizationState} />
            <div className="flex flex-1 overflow-hidden pt-[72px]"> {/* Adjust pt to match navbar height */}
              <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
              <main className="flex-1 p-6 md:p-8 overflow-y-auto relative">
                <BackButton currentModule={activeModule} />
                {renderModule()}
              </main>
            </div>
          </div>
        </NavigationContext.Provider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

// Export as default for index.tsx
export default AppContent;