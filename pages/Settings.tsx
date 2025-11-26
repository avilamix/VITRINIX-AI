import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';

interface SettingsProps {
  onApiKeySelected: () => void; // Callback to re-check API key status
  onOpenApiKeySelection: () => void; // Callback to open API key selection dialog
}

const Settings: React.FC<SettingsProps> = ({ onApiKeySelected, onOpenApiKeySelection }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [businessProfileForm, setBusinessProfileForm] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiSelectionWindow, setHasApiSelectionWindow] = useState<boolean>(false);

  const userId = 'mock-user-123'; // Mock user ID

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
        setBusinessProfileForm(profile.businessProfile);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setError('Failed to load user profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserProfile();
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setHasApiSelectionWindow(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBusinessProfileChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setBusinessProfileForm((prev) => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!userProfile) return;

    setSaving(true);
    setError(null);
    try {
      const updatedProfile: UserProfile = {
        ...userProfile,
        businessProfile: businessProfileForm,
      };
      await updateUserProfile(userId, updatedProfile);
      setUserProfile(updatedProfile);
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }, [userProfile, businessProfileForm, userId]);

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Configurações</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
          <p className="ml-2 text-textlight">Loading settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Profile */}
          <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
            <h3 className="text-xl font-semibold text-textlight mb-5">Perfil do Negócio</h3>
            <Input
              id="name"
              label="Nome da Empresa"
              value={businessProfileForm.name}
              onChange={handleBusinessProfileChange}
              placeholder="Nome da sua empresa"
            />
            <Input
              id="industry"
              label="Indústria"
              value={businessProfileForm.industry}
              onChange={handleBusinessProfileChange}
              placeholder="Ex: E-commerce de moda, Consultoria de TI"
            />
            <Input
              id="targetAudience"
              label="Público-alvo"
              value={businessProfileForm.targetAudience}
              onChange={handleBusinessProfileChange}
              placeholder="Ex: Jovens adultos (18-35), Pequenas empresas"
            />
            <Input
              id="visualStyle"
              label="Estilo Visual"
              value={businessProfileForm.visualStyle}
              onChange={handleBusinessProfileChange}
              placeholder="Ex: Moderno, Minimalista, Vibrante"
            />
            <Button
              onClick={handleSaveSettings}
              isLoading={saving}
              variant="primary"
              className="w-full md:w-auto mt-4"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>

          {/* API Key & Subscription */}
          <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
            <h3 className="text-xl font-semibold text-textlight mb-5">API Key & Plano</h3>

            <div className="mb-8">
              <label className="block text-sm font-medium text-textlight mb-2">Gemini API Key:</label>
              {hasApiSelectionWindow ? (
                <>
                  <p className="text-sm text-textlight mb-3">
                    Gerencie sua chave API do Google Gemini. Para usar modelos como Veo e o Gemini 3 Pro Image, você precisará de uma chave vinculada a um projeto de GCP pago.
                  </p>
                  <Button
                    onClick={onOpenApiKeySelection}
                    variant="secondary"
                    className="w-full md:w-auto"
                  >
                    Alterar Chave API
                  </Button>
                  <p className="mt-3 text-sm text-textmuted">
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Saiba mais sobre faturamento</a>.
                  </p>
                </>
              ) : (
                <p className="text-sm text-yellow-300 bg-yellow-900 p-3 rounded-md">
                  A ferramenta de seleção de API Key não está disponível neste ambiente. Por favor, certifique-se de que a variável de ambiente `API_KEY` esteja configurada.
                </p>
              )}
            </div>

            <div className="border-t border-gray-900 pt-6 mt-6">
              <label className="block text-sm font-medium text-textlight mb-2">Plano de Assinatura:</label>
              <p className="text-lg font-bold text-primary mb-3">
                {userProfile?.plan ? userProfile.plan.charAt(0).toUpperCase() + userProfile.plan.slice(1) : 'Carregando...'}
              </p>
              <p className="text-sm text-textlight">
                Gerencie seu plano de assinatura para ter acesso a mais recursos e usos.
              </p>
              <Button
                onClick={() => alert('Gerenciar Plano not implemented.')}
                variant="outline"
                className="w-full md:w-auto mt-4"
              >
                Gerenciar Plano
              </Button>
            </div>

            <div className="border-t border-gray-900 pt-6 mt-6">
              <label className="block text-sm font-medium text-textlight mb-2">Exportação de Dados:</label>
              <p className="text-sm text-textlight">
                Baixe todos os seus dados gerados e configurados pela VitrineX AI.
              </p>
              <Button
                onClick={() => alert('Baixar Dados not implemented.')}
                variant="outline"
                className="w-full md:w-auto mt-4"
              >
                Baixar Dados
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;