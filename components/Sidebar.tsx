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
  label?: string; // Optional label override
  icon: React.ElementType;
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

const NavItem: React.FC<NavItemProps> = ({ name, label, icon: Icon, activeModule, setActiveModule }) => {
  const isActive = activeModule === name;
  const activeClasses = 'bg-primary/10 text-primary border-r-4 border-primary font-semibold'; 
  const inactiveClasses = 'text-muted hover:bg-gray-100 hover:text-title border-r-4 border-transparent font-medium';

  return (
    <li>
      <button
        onClick={() => setActiveModule(name)}
        className={`flex items-center px-4 py-2.5 w-full text-left transition-all duration-200 group ${isActive ? activeClasses : inactiveClasses}`}
      >
        <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-muted group-hover:text-title'}`} />
        <span className="text-sm tracking-tight">{label || name}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  return (
    <aside className="w-64 bg-surface border-r border-gray-200 flex-none hidden md:block overflow-y-auto h-full z-10 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
      <nav className="py-6">
        <ul className="space-y-0.5">
          <div className="px-5 pb-2 pt-1 text-[11px] font-bold text-muted uppercase tracking-wider">Overview</div>
          <NavItem name="Dashboard" icon={RocketLaunchIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AIManager" label="AI Assistant" icon={LightBulbIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">Creation Suite</div>
          <NavItem name="ContentGenerator" label="Content Gen" icon={DocumentTextIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AdStudio" label="Ad Creator" icon={MegaphoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CreativeStudio" label="Media Studio" icon={PencilSquareIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AudioTools" label="Voice Lab" icon={SpeakerWaveIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">Strategy</div>
          <NavItem name="CampaignBuilder" label="Campaigns" icon={SparklesIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="TrendHunter" label="Trends" icon={MagnifyingGlassCircleIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="SmartScheduler" label="Calendar" icon={CalendarDaysIcon} activeModule={activeModule} setActiveModule={setActiveModule} />

          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">Communication</div>
          <NavItem name="Chatbot" label="AI Chat" icon={ChatBubbleLeftRightIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="LiveConversation" label="Live Voice" icon={MicrophoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          
          <div className="px-5 pb-2 pt-6 text-[11px] font-bold text-muted uppercase tracking-wider">System</div>
          <NavItem name="ContentLibrary" label="Library" icon={ArchiveBoxIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="Settings" label="Configuration" icon={Cog6ToothIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;