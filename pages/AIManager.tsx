import React, { useState, useEffect, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import { aiManagerStrategy } from '../services/geminiService';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';

const AIManager: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  // For now, using a mock user ID. In a real app, this would come from auth context.
  const userId = 'mock-user-123';

  const fetchUserProfile = useCallback(async () => {
    setIsProfileLoading(true);
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile.businessProfile);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError('Failed to load business profile. Please update it in Settings.');
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateStrategy = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate a strategy.');
      return;
    }

    setLoading(true);
    setError(null);
    setStrategyText(null);
    setSuggestions([]);

    try {
      const result = await aiManagerStrategy(prompt, userProfile);
      setStrategyText(result.strategyText);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error('Error generating strategy:', err);
      setError(`Failed to generate strategy: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, userProfile]);

  const handleUpdateProfile = useCallback(async (field: keyof UserProfile['businessProfile'], value: string) => {
    const updatedProfile = { ...userProfile, [field]: value };
    setUserProfile(updatedProfile);
    try {
      await updateUserProfile(userId, { businessProfile: updatedProfile });
    } catch (err) {
      console.error('Failed to update business profile for AI Manager:', err);
      setError('Failed to save profile changes for AI Manager. This might affect future generations.');
    }
  }, [userProfile, userId]);


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
      <h2 className="text-3xl font-bold text-textdark mb-8">Assistente IA (AI Manager)</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Informações do Negócio (para IA)</h3>
        <Input
          id="businessName"
          label="Nome da Empresa"
          value={userProfile.name}
          onChange={(e) => handleUpdateProfile('name', e.target.value)}
          placeholder="Nome da sua empresa"
        />
        <Input
          id="industry"
          label="Indústria"
          value={userProfile.industry}
          onChange={(e) => handleUpdateProfile('industry', e.target.value)}
          placeholder="Ex: E-commerce de moda, Consultoria de TI"
        />
        <Input
          id="targetAudience"
          label="Público-alvo"
          value={userProfile.targetAudience}
          onChange={(e) => handleUpdateProfile('targetAudience', e.target.value)}
          placeholder="Ex: Jovens adultos (18-35), Pequenas empresas"
        />
        <Input
          id="visualStyle"
          label="Estilo Visual Desejado"
          value={userProfile.visualStyle}
          onChange={(e) => handleUpdateProfile('visualStyle', e.target.value)}
          placeholder="Ex: Moderno, Minimalista, Vibrante, Profissional"
        />
        <p className="text-sm text-textmuted mt-2">
          Estas informações ajudam a IA a gerar estratégias mais precisas para o seu negócio.
        </p>
      </div>

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Solicitação ao Assistente IA</h3>
        <Textarea
          id="aiManagerPrompt"
          label="Descreva sua situação de marketing ou o que você gostaria de analisar/criar:"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          placeholder="Ex: 'Quero um diagnóstico completo do meu marketing digital e ideias para uma campanha de lançamento de um novo produto.', ou 'Minha taxa de conversão de anúncios está baixa, identifique as falhas e sugira funis de vendas.'"
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
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
          <h3 className="text-xl font-semibold text-textlight mb-5">Estratégia Gerada</h3>
          <div className="prose max-w-none text-textlight leading-relaxed mb-6" style={{ whiteSpace: 'pre-wrap' }}>
            {strategyText}
          </div>

          {suggestions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-textlight mb-4">Sugestões Adicionais:</h4>
              <ul className="list-disc list-inside space-y-2 text-textlight">
                {suggestions.map((s, index) => (
                  <li key={index}>{s}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary">Criar Calendário</Button>
                <Button variant="secondary">Criar Campanha</Button>
                <Button variant="secondary">Adicionar ao Calendário</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIManager;