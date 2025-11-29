
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

    switch (activeModule) {
      case 'Dashboard':
        return <Dashboard organizationId={currentOrganizationId} />;
      case 'AIManager':
        return <AIManager organizationId={currentOrganizationId} userProfile={userProfile} />;
      case 'ContentGenerator':
        return <ContentGenerator organizationId={currentOrganizationId} userId={userProfile?.id} />;
      case 'AdStudio':
        return <AdStudio organizationId={currentOrganizationId} userId={userProfile?.id} />;
      case 'CampaignBuilder':
        return <CampaignBuilder organizationId={currentOrganizationId} userId={userProfile?.id} />;
      