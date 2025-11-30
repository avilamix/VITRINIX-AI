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
  MicrophoneIcon,
  SpeakerWaveIcon
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
}

const NavItem: React.FC<NavItemProps> = ({ name, label, icon: Icon, activeModule, setActiveModule }) => {
  const isActive = activeModule === name;
  const activeClasses = 'bg-primary/10 text-primary border-r-4 border-primary font-semibold'; 
  const inactiveClasses = 'text-muted hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-title border-r-4 border-transparent font-medium';

  return (
    <li>
      <button
        onClick={() => setActiveModule(name)}
        className={`flex items-center px-4 py-2.5 w-full text-left transition-all duration-200 group ${isActive ? activeClasses : inactiveClasses}`}
        title={label}
      >
        <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-muted group-hover:text-title'}`} />
        <span className="text-sm tracking-tight">{label}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { t } = useLanguage();

  return (
    <aside className="w-64 bg-surface border-r border-gray-200 dark:border-gray-800 flex-none hidden md:block overflow-y-auto h-full z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-colors duration-200">
      <nav className="py-6">
        <ul className="space-y-0.5">
          <div className="px-5 pb-2 pt-1 text-[11px] font-bold text-muted uppercase tracking-wider">{t('sidebar.overview')}</div>
          <NavItem name="Dashboard" label={t('sidebar.dashboard')} icon={RocketLaunchIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AIManager" label={t('sidebar.ai_assistant')} icon={LightBulbIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">{t('sidebar.creation_suite')}</div>
          <NavItem name="ContentGenerator" label={t('sidebar.content_gen')} icon={DocumentTextIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AdStudio" label={t('sidebar.ad_creator')} icon={MegaphoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CreativeStudio" label={t('sidebar.media_studio')} icon={PencilSquareIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AudioTools" label={t('sidebar.voice_lab')} icon={SpeakerWaveIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">{t('sidebar.strategy')}</div>
          <NavItem name="CampaignBuilder" label={t('sidebar.campaigns')} icon={SparklesIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="TrendHunter" label={t('sidebar.trends')} icon={MagnifyingGlassCircleIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="SmartScheduler" label={t('sidebar.calendar')} icon={CalendarDaysIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">{t('sidebar.communication')}</div>
          <NavItem name="Chatbot" label={t('sidebar.ai_chat')} icon={ChatBubbleLeftRightIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="LiveConversation" label={t('sidebar.live_voice')} icon={MicrophoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">{t('sidebar.system')}</div>
          <NavItem name="ContentLibrary" label={t('sidebar.library')} icon={ArchiveBoxIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="Settings" label={t('sidebar.config')} icon={Cog6ToothIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;