

import React, { useState, useEffect, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import InteractiveActionCenter from '../components/InteractiveActionCenter';
import { aiManagerStrategy } from '../services/geminiService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';
import { CommandLineIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface AIManagerProps {
  organizationId: string | undefined;
  userProfile: UserProfile | null; // Pass userProfile directly
}

const AIManager: React.FC<AIManagerProps> = ({ organizationId, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'command'>('command');
  
  // Strategy State
  const [prompt, setPrompt] = useState<string>('');
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Profile State
  const [businessProfileForm, setBusinessProfileForm] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true); // Changed to false initially if userProfile is passed

  // Effect to set business profile form when userProfile prop changes
  useEffect(() => {
    if (userProfile && userProfile.businessProfile) {
      setBusinessProfileForm(userProfile.businessProfile);
      setIsProfileLoading(false); // User profile is available via props
    } else {
      setBusinessProfileForm(DEFAULT_BUSINESS_PROFILE);
      setIsProfileLoading(false); // No user profile, use default
    }
  }, [userProfile]);


  const handleGenerateStrategy = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a strategy.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login and select an organization.');
      return;
    }

    setLoading(true);
    setError(null);
    setStrategyText(null);
    setSuggestions([]);

    try {
      // aiManagerStrategy now takes the current businessProfileForm (from local state)
      const result = await aiManagerStrategy(prompt, businessProfileForm);
      setStrategyText(result.strategyText);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('Error generating strategy:', err);
      setError(`Failed to generate strategy: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, businessProfileForm, organizationId]); // Add organizationId to deps

  const handleUpdateProfile = useCallback(async (field: keyof UserProfile['businessProfile'], value: string) => {
    if (!organizationId || !userProfile?.id) {
      setError("No active organization or user found to update profile.");
      return;
    }
    const updatedProfile = { ...businessProfileForm, [field]: value };
    setBusinessProfileForm(updatedProfile);
    try {
      // updateUserProfile now receives organizationId and userId
      // FIX: updateUserProfile now accepts a single object for businessProfile
      await updateUserProfile(userProfile.id, updatedProfile); 
    } catch (err) {
      console.error('Failed to update business profile for AI Manager:', err);
      setError('Failed to save profile changes for AI Manager. This might affect future generations.');
    }
  }, [businessProfileForm, organizationId, userProfile?.id]);


  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner />
        <p className="ml-2 text-textlight">Loading business profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-textdark">AI Manager</h2>
        
        <div className="flex bg-lightbg rounded-lg p-1 border border-gray-800">
           <button 
             onClick={() => setActiveTab('command')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'command' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white'}`}
           >
             <CommandLineIcon className="w-4 h-4" />
             Central de Comando
           </button>
           <button 
             onClick={() => setActiveTab('strategy')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'strategy' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white'}`}
           >
             <ChartBarIcon className="w-4 h-4" />
             Estratégia & Diagnóstico
           </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {activeTab === 'command' && (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* FIX: Pass organizationId and userId to InteractiveActionCenter */}
             <InteractiveActionCenter organizationId={organizationId} userId={userProfile?.id || ''} />
             <p className="text-center text-textmuted text-sm mt-6">
                Use a Central de Comando para executar ações rápidas em qualquer módulo do sistema sem sair desta tela.
             </p>
         </div>
      )}

      {activeTab === 'strategy' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
                <h3 className="text-xl font-semibold text-textlight mb-5">Informações do Negócio (Contexto)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    id="name"
                    label="Nome da Empresa"
                    value={businessProfileForm.name}
                    onChange={(e) => handleUpdateProfile('name', e.target.value)}
                    />
                    <Input
                    id="industry"
                    label="Indústria"
                    value={businessProfileForm.industry}
                    onChange={(e) => handleUpdateProfile('industry', e.target.value)}
                    />
                    <Input
                    id="targetAudience"
                    label="Público-alvo"
                    value={businessProfileForm.targetAudience}
                    onChange={(e) => handleUpdateProfile('targetAudience', e.target.value)}
                    />
                    <Input
                    id="visualStyle"
                    label="Estilo Visual"
                    value={businessProfileForm.visualStyle}
                    onChange={(e) => handleUpdateProfile('visualStyle', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
                <h3 className="text-xl font-semibold text-textlight mb-5">Solicitação Estratégica</h3>
                <Textarea
                id="aiManagerPrompt"
                label="Qual é o seu desafio de marketing atual?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                placeholder="Ex: 'Quero um diagnóstico completo do meu marketing digital e ideias para uma campanha de lançamento.'"
                />
                <Button
                onClick={handleGenerateStrategy}
                isLoading={loading}
                variant="primary"
                className="w-full md:w-auto mt-4"
                >
                {loading ? 'Gerando Estratégia...' : 'Gerar Estratégia'}
                </Button>
            </div>

            {strategyText && (
                <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
                <h3 className="text-xl font-semibold text-textlight mb-5">Plano Gerado</h3>
                <div className="prose max-w-none text-textlight leading-relaxed mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                    {strategyText}
                </div>

                {suggestions.length > 0 && (
                    <div className="mt-6 border-t border-gray-800 pt-6">
                    <h4 className="text-lg font-semibold text-textlight mb-4">Sugestões Acionáveis:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suggestions.map((s, index) => (
                        <li key={index} className="bg-darkbg p-3 rounded border border-gray-700 text-sm text-textlight flex items-start gap-2">
                            <span className="text-accent">•</span> {s}
                        </li>
                        ))}
                    </ul>
                    </div>
                )}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default AIManager;