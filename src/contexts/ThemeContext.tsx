
import React from 'react';
// This file is a duplicate and is no longer used. The correct context is in /contexts/ThemeContext.tsx
const ThemeContext = React.createContext(undefined);
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const useTheme = () => ({ theme: 'light', toggleTheme: () => {} });
