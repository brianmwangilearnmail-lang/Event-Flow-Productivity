import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import { BusinessSettings } from '../types';

interface SettingsContextType {
  settings: BusinessSettings | null;
  loading: boolean;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: settingsList = [], loading, refetch } = useSupabaseQuery<BusinessSettings>(
    'settings',
    (q) => q.select('*')
  );

  const settings = settingsList[0] || null;

  useEffect(() => {
    if (settings?.brandColors?.secondary) {
      document.documentElement.style.setProperty('--color-gold-deep', settings.brandColors.secondary);
    } else {
      document.documentElement.style.removeProperty('--color-gold-deep');
    }
  }, [settings?.brandColors?.secondary]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refetch }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
};
