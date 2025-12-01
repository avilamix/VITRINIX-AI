
import React from 'react';
import Logo from './Logo';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from '../hooks/useNavigate';
import { SunIcon, MoonIcon, GlobeAltIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { navigateTo, activeModule } = useNavigate();

  return (
    <nav className="bg-surface text-body px-4 md:px-6 py-3 shadow-sm border-b border-gray-200 z-20 transition-colors duration-200">
      <div className="flex justify-between items-center max-w-full">
        <div className="flex items-center gap-3">
            {activeModule !== 'Dashboard' && (
              <button 
                onClick={() => navigateTo('Dashboard')}
                className="md:hidden p-2 -ml-2 text-muted hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Voltar ao Dashboard"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            )}
            <Logo className="h-9 w-9" />
        </div>
        
        <div className="flex items-center gap-4">
           
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
             title={theme === 'light' ? 'Mudar para o Modo Escuro' : 'Mudar para o Modo Claro'}
           >
             {theme === 'light' ? (
                <MoonIcon className="w-5 h-5" />
             ) : (
                <SunIcon className="w-5 h-5" />
             )}
           </button>

           {/* User Profile Placeholder */}
           <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer">
              <span className="text-xs font-bold text-primary">US</span>
           </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
