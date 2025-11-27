
import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('vitrinex_language');
    return (savedLang as Language) || 'pt-BR';
  });

  useEffect(() => {
    localStorage.setItem('vitrinex_language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let current: any = translations[language];
    
    // Simple lookup for nested keys if we expand structure later, currently flat
    // but good practice for i18n
    if (current[key]) return current[key];

    // Fallback to EN if missing
    if (translations['en-US'][key as keyof typeof translations['en-US']]) {
        return translations['en-US'][key as keyof typeof translations['en-US']];
    }

    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
