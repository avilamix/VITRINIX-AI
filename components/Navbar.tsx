import React from 'react';
import Logo from './Logo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SunIcon, MoonIcon, GlobeAltIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { UserProfile, OrganizationMembership } from '../types';
import { logout } from '../services/authService';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeOrganization: OrganizationMembership | undefined;
  onOrganizationChange: () => void; // Callback to refresh organization state in App.tsx
}

const Navbar: React.FC<NavbarProps> = ({ userProfile, activeOrganization, onOrganizationChange }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Mock logout for now, will integrate with real Firebase logout later
  const handleLogout = async () => {
    await logout();
    // Refresh page to reset app state (simple for demo)
    window.location.reload(); 
  };

  // For a real multi-org scenario, this would involve selecting from `currentUserOrganizations`
  // and persisting the choice. For this demo, we assume the first is always active.
  const handleOrganizationSelect = (orgId: string) => {
    // In a real app, this would involve:
    // 1. Updating a global state or local storage with the new active organization.
    // 2. Triggering a re-fetch of user-specific data relevant to the new organization.
    console.log(`Organization selected: ${orgId}`);
    // Since we only have one active organization for now, we just call the refresh.
    onOrganizationChange(); 
    alert('Organization selection is mocked. Please refresh the page to apply changes in a real scenario.');
  };


  return (
    <nav className="fixed top-0 left-0 right-0 bg-surface/80 backdrop-blur-sm text-body px-6 py-3 shadow-sm border-b border-gray-200 z-20 transition-colors duration-200 h-[72px]">
      <div className="flex justify-between items-center max-w-full">
        <div className="flex items-center">
            <Logo className="h-9 w-9" />
        </div>
        
        <div className="flex items-center gap-4">
          {/* Organization Selector (Placeholder for Multi-Org) */}
          {activeOrganization && (
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-title hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <span className="truncate max-w-[120px]">{activeOrganization.organization.name}</span>
                <ChevronDownIcon className="w-4 h-4 text-muted" />
              </button>
              {/* Dropdown for other organizations (mocked) */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  <span className="block px-4 py-2 text-xs text-muted uppercase">Select Organization</span>
                  <button 
                    onClick={() => handleOrganizationSelect(activeOrganization.organization.id)}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-primary font-bold"
                  >
                    {activeOrganization.organization.name} (Active)
                  </button>
                  {/* Add more organization options here if `currentUserOrganizations` had more */}
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  <button 
                    onClick={() => alert('Add new organization functionality not implemented.')}
                    className="block w-full text-left px-4 py-2 text-sm text-muted hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    + Add New Organization
                  </button>
                </div>
              </div>
            </div>
          )}
           
           {/* Language Selector */}
           <div className="relative group">
              <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium text-muted transition-colors">
                <GlobeAltIcon className="w-5 h-5" />
                <span className="uppercase">{language.split('-')[0]}</span>
              </button>
              
              <div className="absolute right-0 top-full mt-1 w-24 bg-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-1">
                  <button 
                    onClick={() => setLanguage('pt-BR')}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${language === 'pt-BR' ? 'text-primary font-bold' : 'text-body'}`}
                  >
                    PT-BR
                  </button>
                  <button 
                    onClick={() => setLanguage('en-US')}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${language === 'en-US' ? 'text-primary font-bold' : 'text-body'}`}
                  >
                    EN-US
                  </button>
                </div>
              </div>
           </div>

           {/* Theme Toggle */}
           <button 
             onClick={toggleTheme} 
             className="p-2 rounded-full text-muted hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
             title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
           >
             {theme === 'light' ? (
                <MoonIcon className="w-5 h-5" />
             ) : (
                <SunIcon className="w-5 h-5" />
             )}
           </button>

           {/* User Profile / Logout */}
           {userProfile ? (
              <div className="relative group">
                 <button className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer overflow-hidden">
                    <span className="text-xs font-bold text-primary">
                      {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : userProfile.email.charAt(0).toUpperCase()}
                    </span>
                 </button>
                 <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <div className="py-1">
                      <span className="block px-4 py-2 text-sm text-title font-semibold truncate">{userProfile.name || userProfile.email}</span>
                      <span className="block px-4 py-0.5 text-xs text-muted truncate">{userProfile.email}</span>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                      <button 
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-body hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                 </div>
              </div>
           ) : (
             <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-500">?</span>
             </div>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;