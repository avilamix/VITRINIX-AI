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
  ChatBubbleLeftRightIcon, // New icon for Chatbot
  MicrophoneIcon, // New icon for Live Conversation
  SpeakerWaveIcon // New icon for Audio Tools
} from '@heroicons/react/24/outline'; // Importing icons from heroicons

interface SidebarProps {
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

interface NavItemProps {
  name: ModuleName;
  icon: React.ElementType; // Type for Heroicon components
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

const NavItem: React.FC<NavItemProps> = ({ name, icon: Icon, activeModule, setActiveModule }) => {
  const isActive = activeModule === name;
  const activeClasses = 'bg-primary text-white';
  const inactiveClasses = 'text-gray-600 hover:bg-gray-200';

  return (
    <li>
      <button
        onClick={() => setActiveModule(name)}
        className={`flex items-center p-3 rounded-lg w-full text-left transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
      >
        <Icon className="h-5 w-5 mr-3" />
        <span className="text-sm font-medium">{name}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  return (
    <aside className="w-56 bg-white p-4 shadow-lg sticky top-0 h-screen overflow-y-auto hidden md:block">
      <nav>
        <ul className="space-y-2">
          <NavItem name="Dashboard" icon={RocketLaunchIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AIManager" icon={LightBulbIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="ContentGenerator" icon={DocumentTextIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AdStudio" icon={MegaphoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CampaignBuilder" icon={SparklesIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="TrendHunter" icon={MagnifyingGlassCircleIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="CreativeStudio" icon={PencilSquareIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="ContentLibrary" icon={ArchiveBoxIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="SmartScheduler" icon={CalendarDaysIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="Chatbot" icon={ChatBubbleLeftRightIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="LiveConversation" icon={MicrophoneIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="AudioTools" icon={SpeakerWaveIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
          <NavItem name="Settings" icon={Cog6ToothIcon} activeModule={activeModule} setActiveModule={setActiveModule} />
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;