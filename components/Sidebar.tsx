

import React from 'react';
import { ModuleName } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import {
  RocketLaunchIcon,
  LightBulbIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  SparklesIcon,
  MagnifyingGlassCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

interface NavItemProps {
  name: ModuleName;
  label: string;
  icon: React.ElementType;
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
  id?: string; // Added ID prop
}

const NavItem: React.FC<NavItemProps> = ({ name, label, icon: Icon, activeModule, setActiveModule, id }) => {
  const isActive = activeModule === name;
  
  return (
    <li id={id}>
      <button
        onClick={() => setActiveModule(name)}
        className={`flex items-center px-4 py-2.5 w-full text-left transition-all duration-200 group relative
          ${isActive 
            ? 'text-primary font-semibold bg-primary/5' 
            : 'text-muted hover:text-title hover:bg-background'
          }`}
        title={label}
      >
        {/* Active Indicator Bar */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--color-primary),0.6)]"></span>
        )}
        
        <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-muted group-hover:text-title'}`} />
        <span className="text-sm tracking-tight">{label}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { t } = useLanguage();

  return (
    <aside className="w-64 bg-surface border-r border-border flex-none hidden md:block overflow-y-auto h-full z-10 shadow-lg shadow-black/5 transition-colors duration-300">
      <nav className="py-6">
        <ul className="space-y-1">
          <div className="px-5 pb-2 pt-1 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t('sidebar.overview')}</div>
          <NavItem id="nav-dashboard" name="Dashboard" label={t('sidebar.dashboard')} icon={RocketLaunchIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem id="nav-ai-manager" name="AIManager" label={t('sidebar.ai_assistant')} icon={LightBulbIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t('sidebar.creation_suite')}</div>
          <NavItem id="nav-content-gen" name="ContentGenerator" label={t('sidebar.content_gen')} icon={DocumentTextIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem id="nav-ad-studio" name="AdStudio" label={t('sidebar.ad_creator')} icon={MegaphoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CreativeStudio" label={t('sidebar.media_studio')} icon={PencilSquareIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t('sidebar.strategy')}</div>
          <NavItem name="CampaignBuilder" label={t('sidebar.campaigns')} icon={SparklesIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem id="nav-trend-hunter" name="TrendHunter" label={t('sidebar.trends')} icon={MagnifyingGlassCircleIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="SmartScheduler" label={t('sidebar.calendar')} icon={CalendarDaysIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t('sidebar.communication')}</div>
          <NavItem name="Chatbot" label={t('sidebar.ai_chat')} icon={ChatBubbleLeftRightIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t('sidebar.system')}</div>
          <NavItem name="ContentLibrary" label={t('sidebar.library')} icon={ArchiveBoxIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem id="nav-settings" name="Settings" label={t('sidebar.config')} icon={Cog6ToothIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;