
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
  CameraIcon, // Alterado de PencilSquareIcon
  ArchiveBoxIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
}

interface NavItemProps {
  name: ModuleName;
  label: string;
  icon: React.ElementType;
  activeModule: ModuleName;
  setActiveModule: (moduleName: ModuleName) => void;
  onNavigate: () => void;
  id?: string;
}

const NavItem: React.FC<NavItemProps> = ({ name, label, icon: Icon, activeModule, setActiveModule, onNavigate, id }) => {
  const isActive = activeModule === name;
  
  const handleClick = () => {
    setActiveModule(name);
    onNavigate();
  };

  return (
    <li id={id}>
      <button
        onClick={handleClick}
        className={`flex items-center px-4 py-2.5 w-full text-left transition-all duration-200 group relative
          ${isActive 
            ? 'text-primary font-semibold bg-primary/5' 
            : 'text-muted hover:text-title hover:bg-background'
          }`}
        title={label}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--color-primary),0.6)]"></span>
        )}
        <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-muted group-hover:text-title'}`} />
        <span className="text-sm tracking-tight">{label}</span>
      </button>
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeModule, setActiveModule }) => {
  const { t } = useLanguage();

  const handleNavigate = () => {
    if (window.innerWidth < 768) { // md breakpoint
      onClose();
    }
  };

  const navItems = [
    { section: 'sidebar.overview', items: [
      { id: "nav-dashboard", name: "Dashboard", label: t('sidebar.dashboard'), icon: RocketLaunchIcon },
      { id: "nav-ai-manager", name: "AIManager", label: t('sidebar.ai_assistant'), icon: LightBulbIcon }
    ]},
    { section: 'sidebar.creation_suite', items: [
      { id: "nav-content-gen", name: "ContentGenerator", label: t('sidebar.content_gen'), icon: DocumentTextIcon },
      { id: "nav-ad-studio", name: "AdStudio", label: t('sidebar.ad_creator'), icon: MegaphoneIcon },
      { name: "CreativeStudio", label: t('sidebar.media_studio'), icon: CameraIcon } // Ícone atualizado
    ]},
    { section: 'sidebar.strategy', items: [
      { name: "CampaignBuilder", label: t('sidebar.campaigns'), icon: SparklesIcon },
      { id: "nav-trend-hunter", name: "TrendHunter", label: t('sidebar.trends'), icon: MagnifyingGlassCircleIcon },
      { name: "SmartScheduler", label: t('sidebar.calendar'), icon: CalendarDaysIcon }
    ]},
    { section: 'sidebar.communication', items: [
      { name: "Chatbot", label: t('sidebar.ai_chat'), icon: ChatBubbleLeftRightIcon }
    ]},
    { section: 'sidebar.system', items: [
      { name: "ContentLibrary", label: t('sidebar.library'), icon: ArchiveBoxIcon },
      { id: "nav-settings", name: "Settings", label: t('sidebar.config'), icon: Cog6ToothIcon }
    ]}
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden" 
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <aside className={`fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-40
        transform transition-transform duration-300 ease-in-out md:relative md:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-end p-2 md:hidden">
            <button onClick={onClose} className="p-2 text-muted hover:text-title">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>
        <nav className="py-6 overflow-y-auto h-full">
          <ul className="space-y-1">
            {navItems.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                <div className="px-5 pb-2 pt-6 text-[10px] font-bold text-muted uppercase tracking-widest opacity-80">{t(section.section)}</div>
                {section.items.map(item => (
                  <NavItem 
                    key={item.name} 
                    id={item.id}
                    name={item.name as ModuleName} 
                    label={item.label} 
                    icon={item.icon} 
                    activeModule={activeModule} 
                    setActiveModule={setActiveModule}
                    onNavigate={handleNavigate}
                  />
                ))}
              </React.Fragment>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
