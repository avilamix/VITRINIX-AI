
import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { testGeminiConnection } from '../services/geminiService';
import { UserProfile } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';
import { KeyIcon, ServerStackIcon, InformationCircleIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';

const Settings: React.FC<{ onApiKeySelected: () => void; onOpenApiKeySelection: () => void; }> = ({ onApiKeySelected }) => {
  // Profile State
  const [businessProfileForm, setBusinessProfileForm] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const { addToast } = useToast();
  const userId = 'mock-user-123';

  useEffect(() => {
    const fetchInitialData = async () => {
      setProfileLoading(true);
      try {
        const profile = await getUserProfile(userId);
        if (profile) {
          setBusinessProfileForm(profile.businessProfile);
        }
        const savedKey = localStorage.getItem('vitrinex_gemini_api_key');
        if (savedKey) {
          setApiKey(savedKey);
          setIsKeySaved(true);
        }
      } catch (err) {
        addToast({ type: 'error', message: 'Falha ao carregar dados iniciais.' });
      } finally {
        setProfileLoading(false);
      }
    };
    fetchInitialData();
  }, [userId, addToast]);
  
  const validateAndSetKey = (key: string) => {
      setApiKey(key);
      if (!key.trim()) {
          setKeyError(null);
          return;
      }
      if (!key.startsWith('AIzaSy')) {
          setKeyError('Formato inválido. A chave deve começar com "AIzaSy".');
      } else if (key.length < 38) {
          setKeyError('Chave muito curta.');
      } else if (/\s/.test(key)) {
          setKeyError('A chave não pode conter espaços.');
      } else {
          setKeyError(null);
      }
  };

  const handleSaveKey = async () => {
    if (keyError || !apiKey.trim()) {
      addToast({ type: 'warning', message: 'Por favor, insira uma chave de API válida.' });
      return;
    }
    setIsTesting(true);
    try {
      await testGeminiConnection(apiKey.trim());
      localStorage.setItem('vitrinex_gemini_api_key', apiKey.trim());
      setIsKeySaved(true);
      onApiKeySelected(); // Notify App.tsx to re-check
      addToast({ type: 'success', title: 'Chave Salva!', message: 'O motor de IA foi ativado com sucesso.' });
    } catch (e: any) {
      addToast({ type: 'error', title: 'Chave Inválida', message: `A conexão falhou: ${e.message}` });
      setIsKeySaved(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const profileData = { businessProfile: businessProfileForm };
      // Assuming updateUserProfile can take a partial UserProfile
      await updateUserProfile(userId, profileData);
      addToast({ type: 'success', message: 'Perfil do negócio salvo com sucesso!' });
    } catch (err) {
      addToast({ type: 'error', message: `Falha ao salvar perfil: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSavingProfile(false);
    }
  };
  
  const handleExportKey = () => {
      const savedKey = localStorage.getItem('vitrinex_gemini_api_key');
      if (!savedKey) {
          addToast({ type: 'warning', message: 'Nenhuma chave salva para exportar.' });
          return;
      }
      const blob = new Blob([savedKey], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vitrinex_gemini_api_key.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast({ type: 'info', message: 'Backup da chave iniciado.' });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-10 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-title">Configurações</h2>
      
      {/* API Key Section */}
      <div className="bg-surface p-8 rounded-xl shadow-card border border-border">
          <h3 className="text-xl font-semibold text-title mb-6 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-primary" /> Motor de Inteligência (Gemini)
          </h3>
          <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-title mb-1.5">
                  Chave API
                </label>
                <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => validateAndSetKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className={`block w-full px-3 py-2.5 bg-surface border rounded-lg shadow-sm text-body placeholder-muted transition-colors sm:text-sm focus:outline-none ${
                        keyError ? 'border-error ring-1 ring-error' : 'border-border focus:border-primary focus:ring-1 focus:ring-primary'
                    }`}
                />
                {keyError && <p className="mt-2 text-xs text-error">{keyError}</p>}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Recursos avançados como <strong>Geração de Vídeo (Veo)</strong> e <strong>Imagens de Alta Qualidade</strong> exigem uma chave de API de um projeto Google Cloud com o faturamento ativo.
                  </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={handleSaveKey} isLoading={isTesting} disabled={!!keyError || !apiKey.trim()} variant="primary" className="w-full sm:w-auto">
                      {isTesting ? 'Validando...' : 'Salvar & Ativar'}
                  </Button>
                  <Button onClick={handleExportKey} variant="outline" className="w-full sm:w-auto" disabled={!isKeySaved}>
                      <ArrowDownOnSquareIcon className="w-4 h-4 mr-2" />
                      Exportar Chave
                  </Button>
              </div>
          </div>
      </div>

      {/* Business Profile Section */}
      <div className="bg-surface p-8 rounded-xl shadow-card border border-border">
          <h3 className="text-xl font-semibold text-title mb-6 flex items-center gap-2">
            <ServerStackIcon className="w-5 h-5 text-primary" /> Perfil do Negócio
          </h3>
          {profileLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : (
            <div className="space-y-5">
              <Input id="name" label="Nome da Empresa" value={businessProfileForm.name} onChange={(e) => setBusinessProfileForm(prev => ({...prev, name: e.target.value}))} />
              <Input id="industry" label="Indústria" value={businessProfileForm.industry} onChange={(e) => setBusinessProfileForm(prev => ({...prev, industry: e.target.value}))} />
              <Textarea id="targetAudience" label="Público-alvo" value={businessProfileForm.targetAudience} onChange={(e) => setBusinessProfileForm(prev => ({...prev, targetAudience: e.target.value}))} rows={3} />
              <Input id="visualStyle" label="Estilo Visual" value={businessProfileForm.visualStyle} onChange={(e) => setBusinessProfileForm(prev => ({...prev, visualStyle: e.target.value}))} />
              <div className="pt-4">
                <Button onClick={handleSaveProfile} isLoading={savingProfile} variant="primary" className="w-full sm:w-auto">Salvar Perfil</Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Settings;
