import React from 'react';
import { ModuleName } from '../App';
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
  icon: React.ElementType;
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

const NavItem: React.FC<NavItemProps> = ({ name, icon: Icon, activeModule, setActiveModule }) => {
  const isActive = activeModule === name;
  const activeClasses = 'bg-primary text-white shadow-lg shadow-primary/30'; 
  const inactiveClasses = 'text-textlight hover:bg-white/5 hover:text-white';

  return (
    <li>
      <button
        onClick={() => setActiveModule(name)}
        className={`flex items-center p-3 rounded-lg w-full text-left transition-all duration-200 group ${isActive ? activeClasses : inactiveClasses}`}
      >
        <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-textmuted group-hover:text-accent'}`} />
        <span className="text-sm font-medium">{name}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  return (
    <aside className="w-64 bg-lightbg border-r border-gray-800 flex-none hidden md:block overflow-y-auto h-full custom-scrollbar">
      <nav className="p-4">
        <ul className="space-y-1">
          <div className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-2 mt-2 px-3">Geral</div>
          <NavItem name="Dashboard" icon={RocketLaunchIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AIManager" icon={LightBulbIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-2 mt-6 px-3">Criação</div>
          <NavItem name="ContentGenerator" icon={DocumentTextIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AdStudio" icon={MegaphoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CreativeStudio" icon={PencilSquareIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AudioTools" icon={SpeakerWaveIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-2 mt-6 px-3">Estratégia</div>
          <NavItem name="CampaignBuilder" icon={SparklesIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="TrendHunter" icon={MagnifyingGlassCircleIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="SmartScheduler" icon={CalendarDaysIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-2 mt-6 px-3">Interação</div>
          <NavItem name="Chatbot" icon={ChatBubbleLeftRightIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="LiveConversation" icon={MicrophoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="text-xs font-semibold text-textmuted uppercase tracking-wider mb-2 mt-6 px-3">Sistema</div>
          <NavItem name="ContentLibrary" icon={ArchiveBoxIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="Settings" icon={Cog6ToothIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;