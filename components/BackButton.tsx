import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigate } from '../hooks/useNavigate';
import { useLanguage } from '../contexts/LanguageContext';

interface BackButtonProps {
  currentModule: string;
}

const BackButton: React.FC<BackButtonProps> = ({ currentModule }) => {
  const { navigateTo } = useNavigate();
  const { t } = useLanguage();
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Only show button if not on Dashboard
    setShowButton(currentModule !== 'Dashboard');
  }, [currentModule]);


  const handleBack = useCallback(() => {
    // Check if there's enough history to go back within the browser's session.
    // If window.history.length is 1, it generally means there's no page to go back to
    // within the current tab's navigation stack, or the current page is the first one loaded.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo('Dashboard');
    }
  }, [navigateTo]);

  if (!showButton) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      className="fixed top-20 left-4 md:left-64 z-30 p-2 rounded-full bg-surface text-muted shadow-lg border border-gray-200 
                 hover:bg-primary/10 hover:text-primary transition-all duration-200 
                 flex items-center justify-center group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      aria-label={t('gen.back')} // 'gen.back' should be added to translations
      title={t('gen.back')}
    >
      <ArrowLeftIcon className="w-5 h-5" />
    </button>
  );
};

export default BackButton;