
import React from 'react';
// This file is a duplicate and is no longer used. The correct context is in /contexts/LanguageContext.tsx
const LanguageContext = React.createContext(undefined);
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const useLanguage = () => ({ language: 'pt-BR', setLanguage: () => {}, t: (key: string) => key });
