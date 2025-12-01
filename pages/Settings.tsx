
import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { validateKey } from '../services/keyManagerService';
import { queryArchitect } from '../services/geminiService'; // Import Architect service
import { UserProfile, ApiKeyConfig, ProviderName, KeyStatus, OrganizationMembership } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PlusIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  ServerStackIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getFirebaseIdToken, getActiveOrganization } from '../services/authService';
import { useToast } from '../contexts/ToastContext';

const PROVIDERS: ProviderName[] = [
  'Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Groq',
  'DeepSeek', 'Cohere', 'Meta LLaMA', 'Replicate', 'Hugging Face', 'Together AI'
];

interface SettingsProps {
  onApiKeySelected: () => void;
  onOpenApiKeySelection: () => void;
}

const BACKEND_URL = 'http://localhost:3000';

const Settings: React.FC<SettingsProps> = ({ onApiKeySelected, onOpenApiKeySelection }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'keys' | 'architect'>('keys');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [businessProfileForm, setBusinessProfileForm] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [keysLoading, setKeysLoading] = useState<boolean>(true);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [newKeyProvider, setNewKeyProvider] = useState<ProviderName>('Google Gemini');
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [newKeyValue, setNewKeyValue] = useState<string>('');
  const [addingKey, setAddingKey] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status: KeyStatus } | null>(null);
  const [lastTestedValue, setLastTestedValue] = useState<string>('');

  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Architect State
  const [archQuery, setArchQuery] = useState('');
  const [archResponse, setArchResponse] = useState<string | null>(null);
  const [archLoading, setArchLoading] = useState(false);

  const { addToast } = useToast();
  const userId = 'mock-user-123';
  const activeOrganization: OrganizationMembership | undefined = getActiveOrganization();
  const organizationId = activeOrganization?.organization.id || 'mock-org-default';

  const fetchUserProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const profile = await getUserProfile(userId);
      if (profile) {
        setUserProfile(profile);
        setBusinessProfileForm(profile.businessProfile);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [userId]);

  const handleBusinessProfileChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setBusinessProfileForm((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!userProfile) return;
    setSavingProfile(true);
    try {
      const updatedProfile: UserProfile = { ...userProfile, businessProfile: businessProfileForm };
      await updateUserProfile(userId, updatedProfile);
      setUserProfile(updatedProfile);
      addToast({ type: 'success', message: 'Configurações salvas com sucesso!' });
    } catch (err) {
      addToast({ type: 'error', title: 'Erro', message: `Falha ao salvar: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setSavingProfile(false);
    }
  }, [userProfile, businessProfileForm, userId, addToast]);

  const fetchKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      let keys: ApiKeyConfig[] = [];
      let fetchedFromBackend = false;

      // 1. Try Backend
      try {
        const idToken = await getFirebaseIdToken();
        const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${idToken}` },
        });
        if (response.ok) {
          keys = await response.json();
          fetchedFromBackend = true;
        }
      } catch (err) {
        // Silent fail for backend
      }

      // 2. Local Storage Fallback & Sync
      if (!fetchedFromBackend) {
        const localKeysStr = localStorage.getItem('vitrinex_api_keys_list');
        keys = localKeysStr ? JSON.parse(localKeysStr) : [];
      }

      // 3. Sync with Login Key (from App.tsx) - CRITICAL FOR 100% ACTIVATION
      const loginKey = localStorage.getItem('vitrinex_gemini_api_key');
      if (loginKey) {
        // Verificar se a chave de login já está na lista
        const existingKeyIndex = keys.findIndex(k => k.key === loginKey);
        
        if (existingKeyIndex === -1) {
          // Se não estiver, adiciona como chave principal importada
          const newMainKey: ApiKeyConfig = {
            id: 'auto-login-key',
            provider: 'Google Gemini',
            key: loginKey,
            label: 'Chave Ativa (Sessão)',
            isActive: true,
            isDefault: true,
            createdAt: new Date().toISOString(),
            status: 'valid',
            usageCount: 0
          };
          keys.unshift(newMainKey);
          
          // Persist back to local list
          if (!fetchedFromBackend) {
             localStorage.setItem('vitrinex_api_keys_list', JSON.stringify(keys));
          }
        }
      }

      setApiKeys(keys);

      const newExpanded: Record<string, boolean> = {};
      keys.forEach(k => { newExpanded[k.provider] = true; });
      setExpandedProviders(prev => ({ ...newExpanded, ...prev }));
    } finally {
      setKeysLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchUserProfile();
    fetchKeys();
  }, [fetchUserProfile, fetchKeys]);

  useEffect(() => {
    if (apiKeys.length > 0) {
      const failingKey = apiKeys.find(k => k.status === 'invalid' || k.status === 'rate-limited');
      if (failingKey) {
        setNewKeyProvider(failingKey.provider);
        return;
      }
      const hasGemini = apiKeys.some(k => k.provider === 'Google Gemini');
      if (!hasGemini) {
        setNewKeyProvider('Google Gemini');
        return;
      }
    }
  }, [apiKeys]);

  const handleTestConnection = async () => {
    if (!newKeyValue.trim()) {
      setTestResult({ success: false, message: 'Insira uma chave para testar.', status: 'unchecked' });
      return;
    }
    setTestingKey(true);
    setTestResult(null);

    try {
      const tempConfig: ApiKeyConfig = {
        id: 'temp', provider: newKeyProvider, key: newKeyValue.trim(), label: 'Temp',
        isActive: true, isDefault: false, createdAt: new Date().toISOString(), status: 'unchecked', usageCount: 0
      };

      const validation = await validateKey(tempConfig);

      if (validation.status === 'valid') {
        setTestResult({ success: true, message: 'Conexão bem-sucedida! Chave válida.', status: 'valid' });
        setLastTestedValue(newKeyValue.trim());
        if (!newKeyLabel.trim()) {
          setNewKeyLabel(`${newKeyProvider} Key (Nova)`);
        }
      } else {
        setTestResult({ success: false, message: validation.error || 'Falha na validação da chave.', status: validation.status });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro desconhecido ao testar.', status: 'invalid' });
    } finally {
      setTestingKey(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyValue.trim() || !newKeyLabel.trim() || !organizationId) return;
    setAddingKey(true);

    try {
      const idToken = await getFirebaseIdToken();
      let initialStatus: KeyStatus = 'unchecked';
      let errorMessage: string | undefined = undefined;

      // Validate key first if not already done
      if (newKeyValue.trim() === lastTestedValue && testResult) {
          initialStatus = testResult.status;
          if (!testResult.success) errorMessage = testResult.message;
      } else {
          const tempConfig: ApiKeyConfig = {
              id: 'temp', provider: newKeyProvider, key: newKeyValue.trim(), label: newKeyLabel.trim(),
              isActive: true, isDefault: false, createdAt: new Date().toISOString(), status: 'unchecked', usageCount: 0
          };
          const validation = await validateKey(tempConfig);
          initialStatus = validation.status;
          errorMessage = validation.error;
      }

      // Check if it's the first key, make it default automatically
      const isFirstGeminiKey = apiKeys.filter(k => k.provider === 'Google Gemini').length === 0;
      const isDefault = isFirstGeminiKey && newKeyProvider === 'Google Gemini';

      const newKeyData = {
        id: `key-${Date.now()}`,
        provider: newKeyProvider,
        key: newKeyValue.trim(),
        label: newKeyLabel.trim(),
        isActive: true,
        isDefault: isDefault,
        status: initialStatus,
        errorMessage: errorMessage,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      // Try Backend Save
      try {
        const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({ ...newKeyData, encryptedKey: newKeyData.key }),
        });
        if (!response.ok) throw new Error('Backend save failed');
      } catch (e) {
        console.warn("Backend save failed, saving locally.");
        const currentLocal = JSON.parse(localStorage.getItem('vitrinex_api_keys_list') || '[]');
        localStorage.setItem('vitrinex_api_keys_list', JSON.stringify([...currentLocal, newKeyData]));
      }

      // CRITICAL: If default or Google Gemini, update the ACTIVE global key
      if (newKeyProvider === 'Google Gemini' && (isDefault || apiKeys.length === 0)) {
          localStorage.setItem('vitrinex_gemini_api_key', newKeyData.key);
          onApiKeySelected(); // Notify app to reload key
      }

      await fetchKeys();
      setNewKeyValue('');
      setNewKeyLabel('');
      setTestResult({ success: true, message: 'Chave salva e ativada!', status: initialStatus });
      setLastTestedValue('');
      setTimeout(() => setTestResult(null), 3000);
      setExpandedProviders(prev => ({ ...prev, [newKeyProvider]: true }));
      
      addToast({ type: 'success', message: `Chave para ${newKeyProvider} adicionada e ativa.` });
    } catch (err) {
      addToast({ type: 'error', title: 'Erro', message: `Erro ao adicionar chave: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setAddingKey(false);
    }
  };

  const handleValidateKey = async (key: ApiKeyConfig) => {
    setValidatingId(key.id);
    try {
        const validation = await validateKey(key);
        // Update local state primarily
        const updatedKeys = apiKeys.map(k => k.id === key.id ? { ...k, status: validation.status, errorMessage: validation.error } : k);
        setApiKeys(updatedKeys);
        localStorage.setItem('vitrinex_api_keys_list', JSON.stringify(updatedKeys));
        addToast({ type: validation.status === 'valid' ? 'success' : 'warning', message: `Chave ${validation.status === 'valid' ? 'validada' : 'inválida'}` });
    } finally {
      setValidatingId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Remover esta chave API?')) return;
    
    // Check if we are deleting the currently active key
    const keyToDelete = apiKeys.find(k => k.id === id);
    const activeKey = localStorage.getItem('vitrinex_gemini_api_key');
    const isDeletingActive = keyToDelete && keyToDelete.key === activeKey;

    try {
        try {
            const idToken = await getFirebaseIdToken();
            await fetch(`${BACKEND_URL}/api-keys/${organizationId}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
        } catch(e) { /* Ignore backend fail */ }

        const currentLocal = JSON.parse(localStorage.getItem('vitrinex_api_keys_list') || '[]');
        const updatedLocal = currentLocal.filter((k: any) => k.id !== id);
        localStorage.setItem('vitrinex_api_keys_list', JSON.stringify(updatedLocal));
        
        if (isDeletingActive) {
            localStorage.removeItem('vitrinex_gemini_api_key');
            onApiKeySelected(); // Will likely trigger lock screen or key refresh
        }

        await fetchKeys();
        addToast({ type: 'success', message: 'Chave removida.' });
    } catch (err) {
        addToast({ type: 'error', message: 'Erro ao excluir.' });
    }
  };

  const handleSetDefault = async (key: ApiKeyConfig) => {
      if (key.isDefault) return;
      
      const updatedKeys = apiKeys.map(k => {
          if (k.provider === key.provider) {
              return { ...k, isDefault: k.id === key.id };
          }
          return k;
      });
      setApiKeys(updatedKeys);
      localStorage.setItem('vitrinex_api_keys_list', JSON.stringify(updatedKeys));
      
      // CRITICAL: Sync active key to global storage
      if (key.provider === 'Google Gemini') {
          localStorage.setItem('vitrinex_gemini_api_key', key.key);
          onApiKeySelected();
      }

      addToast({ type: 'success', message: 'Chave definida como Principal e ativada em todos os módulos.' });
  };

  const handleArchitectQuery = async () => {
    if (!archQuery.trim()) return;
    setArchLoading(true);
    setArchResponse(null);
    try {
        const response = await queryArchitect(archQuery);
        setArchResponse(response);
    } catch (e: any) {
        addToast({ type: 'error', message: `Erro: ${e.message}`});
    } finally {
        setArchLoading(false);
    }
  };

  const toggleAccordion = (provider: string) => {
    setExpandedProviders(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeySecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSortedKeys = (keys: ApiKeyConfig[]) => {
    return [...keys].sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return 0;
    });
  };

  const filteredApiKeys = apiKeys.filter(key => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      key.provider.toLowerCase().includes(searchLower) ||
      key.label.toLowerCase().includes(searchLower) ||
      key.status.toLowerCase().includes(searchLower)
    );
  });

  const StatusBadge = ({ status }: { status: KeyStatus }) => {
    const styles = {
      valid: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      invalid: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
      expired: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
      'rate-limited': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      unchecked: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    };
    const icons = {
      valid: <CheckCircleIcon className="w-3.5 h-3.5" />,
      invalid: <XCircleIcon className="w-3.5 h-3.5" />,
      expired: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
      'rate-limited': <BoltIcon className="w-3.5 h-3.5" />,
      unchecked: <ArrowPathIcon className="w-3.5 h-3.5" />,
    };
    const labels = {
      valid: 'Válida',
      invalid: 'Inválida',
      expired: 'Expirada',
      'rate-limited': 'Rate Limit',
      unchecked: 'Não verificada',
    };
    return (
      <span title={`Status: ${labels[status]}`} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]} select-none`}>
        {icons[status]} {labels[status]}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8 lg:py-10 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-title">Configurações</h2>
          <p className="text-muted text-sm mt-1">Gerencie seu perfil e conexões de IA</p>
        </div>
        <div className="flex bg-surface rounded-lg p-1 border border-border shadow-sm">
          <button onClick={() => setActiveTab('keys')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'keys' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-title hover:bg-background'}`}>
            <KeyIcon className="w-4 h-4" /> Chaves de API
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-title hover:bg-background'}`}>
            <ServerStackIcon className="w-4 h-4" /> Perfil do Negócio
          </button>
          <button onClick={() => setActiveTab('architect')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'architect' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-title hover:bg-background'}`}>
            <CpuChipIcon className="w-4 h-4" /> Arquiteto
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-surface p-8 rounded-xl shadow-card border border-border max-w-2xl animate-in fade-in zoom-in-95 duration-300">
          <h3 className="text-xl font-semibold text-title mb-6 flex items-center gap-2">
            <ServerStackIcon className="w-5 h-5 text-primary" /> Perfil do Negócio
          </h3>
          {profileLoading ? <div className="flex justify-center p-8"><LoadingSpinner /></div> : (
            <div className="space-y-5">
              <Input id="name" label="Nome da Empresa" value={businessProfileForm.name} onChange={handleBusinessProfileChange} />
              <Input id="industry" label="Indústria" value={businessProfileForm.industry} onChange={handleBusinessProfileChange} />
              <Input id="targetAudience" label="Público-alvo" value={businessProfileForm.targetAudience} onChange={handleBusinessProfileChange} />
              <Input id="visualStyle" label="Estilo Visual" value={businessProfileForm.visualStyle} onChange={handleBusinessProfileChange} />
              <div className="pt-4">
                <Button onClick={handleSaveSettings} isLoading={savingProfile} variant="primary" className="w-full sm:w-auto">Salvar Configurações</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'architect' && (
        <div className="bg-surface p-8 rounded-xl shadow-card border border-border max-w-4xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                    <CpuChipIcon className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-title">Arquiteto do Sistema</h3>
                    <p className="text-sm text-muted">Analise a estrutura do código e obtenha insights técnicos sobre a plataforma.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-background border border-border p-4 rounded-lg">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Arquivos Indexados</p>
                    <p className="text-2xl font-mono text-title">32</p>
                </div>
                <div className="bg-background border border-border p-4 rounded-lg">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Stack Frontend</p>
                    <p className="text-sm text-title font-medium">React, Vite, Tailwind</p>
                </div>
                <div className="bg-background border border-border p-4 rounded-lg">
                    <p className="text-xs text-muted uppercase font-bold mb-1">Stack Backend</p>
                    <p className="text-sm text-title font-medium">NestJS, Prisma, Gemini</p>
                </div>
            </div>

            <div className="bg-background border border-border rounded-xl p-6">
                <h4 className="text-sm font-semibold text-title mb-4 flex items-center gap-2">
                    <CommandLineIcon className="w-4 h-4 text-primary" /> Consulta ao Arquiteto
                </h4>
                <div className="space-y-4">
                    <Textarea 
                        id="archQuery" 
                        value={archQuery} 
                        onChange={(e) => setArchQuery(e.target.value)} 
                        placeholder="Ex: Qual é o schema do banco de dados para os usuários? Como a autenticação é tratada?"
                        rows={3}
                        className="font-mono text-sm"
                    />
                    <div className="flex justify-end">
                        <Button onClick={handleArchitectQuery} isLoading={archLoading} disabled={!archQuery.trim()} variant="primary">
                            Analisar Código
                        </Button>
                    </div>
                </div>

                {archResponse && (
                    <div className="mt-6 pt-6 border-t border-border animate-in fade-in">
                        <div className="prose prose-sm max-w-none text-body bg-surface p-4 rounded-lg border border-border">
                            <pre className="whitespace-pre-wrap font-sans">{archResponse}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Add Key Card */}
          <div className="bg-surface p-6 rounded-xl shadow-card border border-border relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-lg font-semibold text-title flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg"><PlusIcon className="w-5 h-5 text-primary" /></div> Adicionar Nova Conexão
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end relative z-10">
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5 ml-1">Provedor</label>
                <div className="relative">
                  <select value={newKeyProvider} onChange={(e) => setNewKeyProvider(e.target.value as ProviderName)} className="block w-full pl-3 pr-10 py-2.5 border border-border rounded-lg bg-background text-body focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm appearance-none transition-shadow">
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 text-muted absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
              <div className="lg:col-span-3">
                <Input id="keyLabel" placeholder="Ex: Produção, Teste..." value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} label="Nome Identificador" className="mb-0" />
              </div>
              <div className="lg:col-span-4 relative">
                <Input id="keyValue" type="password" placeholder="sk-..." value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} label="Chave API (Secret Key)" className="mb-0 pr-16" />
                <div className="absolute right-1 top-[29px]">
                  <button onClick={handleTestConnection} disabled={testingKey || !newKeyValue} className="text-xs font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-body px-3 py-1.5 rounded-md disabled:opacity-50 transition-colors flex items-center gap-1" title="Testar Conexão">
                    {testingKey ? <LoadingSpinner className="w-3 h-3" /> : 'Testar'}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-2">
                <Button onClick={handleAddKey} isLoading={addingKey} variant="primary" className="w-full h-[42px]" disabled={!newKeyValue || !newKeyLabel || !organizationId}>Salvar</Button>
              </div>
            </div>
            {testResult && (
              <div className={`mt-4 mx-1 p-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2 border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'}`}>
                {testResult.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                <span className="font-medium">{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider ml-1 flex items-center gap-2">
                <ServerStackIcon className="w-4 h-4" /> Provedores Configurados
              </h3>
              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-muted" />
                </div>
                <input type="text" className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg leading-5 bg-surface text-body placeholder-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out" placeholder="Buscar chaves..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>

            {keysLoading ? <div className="flex justify-center p-12 bg-surface rounded-xl border border-border"><LoadingSpinner /></div>
            : apiKeys.length === 0 ? (
              <div className="text-center p-12 border border-dashed border-border rounded-xl bg-surface/50">
                <KeyIcon className="w-12 h-12 mx-auto mb-4 text-muted/50" />
                <p className="text-lg font-medium text-title">Nenhuma chave configurada</p>
                <p className="text-sm text-muted mt-1">Adicione suas chaves de API acima para começar a usar a IA.</p>
              </div>
            ) : ( PROVIDERS.map(provider => {
                const providerKeys = filteredApiKeys.filter(k => k.provider === provider);
                const hasKeys = providerKeys.length > 0;
                if (searchTerm && !hasKeys) return null;
                const activeKeysCount = providerKeys.filter(k => k.isActive).length;
                const isExpanded = searchTerm ? true : expandedProviders[provider];
                const sortedKeys = getSortedKeys(providerKeys);

                return (
                  <div key={provider} className={`rounded-xl border transition-all duration-200 overflow-hidden ${hasKeys ? 'bg-surface border-border shadow-sm' : 'bg-transparent border-border opacity-70 hover:opacity-100'}`}>
                    <button onClick={() => toggleAccordion(provider)} className={`w-full px-6 py-4 flex justify-between items-center transition-colors ${hasKeys ? 'hover:bg-background' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${hasKeys ? (activeKeysCount > 0 ? 'bg-primary shadow-primary/50' : 'bg-yellow-500 shadow-yellow-500/50') : 'bg-gray-400 dark:bg-gray-600 shadow-none'}`}></div>
                        <div className="text-left">
                          <h4 className={`font-semibold text-sm ${hasKeys ? 'text-title' : 'text-muted'}`}>{provider}</h4>
                          {hasKeys && <p className="text-[10px] text-muted mt-0.5">{activeKeysCount} chave(s) ativa(s)</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {!hasKeys && <span className="text-xs text-muted italic mr-2">Não configurado</span>}
                        {hasKeys && <span className="flex items-center text-xs bg-background text-muted px-2.5 py-1 rounded-md border border-border font-mono">{providerKeys.length}</span>}
                        {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-muted" /> : <ChevronDownIcon className="w-5 h-5 text-muted" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-background/50">
                        {providerKeys.length === 0 ? <div className="p-6 text-center text-sm text-muted">Nenhuma chave adicionada para {provider}. Use o formulário acima.</div>
                        : ( <div className="divide-y divide-border">
                            {sortedKeys.map((key, index) => (
                              <div key={key.id} className={`p-4 md:px-6 transition-colors ${!key.isActive ? 'opacity-60 grayscale-[0.5]' : ''} ${key.isDefault ? 'bg-primary/[0.03]' : ''}`}>
                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                  <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                      {key.isDefault && <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" title="Chave Padrão"><StarIconSolid className="w-3 h-3" /> ATIVA</span>}
                                      <span className="font-semibold text-title text-sm truncate">{key.label}</span>
                                      <StatusBadge status={key.status} />
                                    </div>
                                    <div className="flex flex-wrap items-center text-xs text-muted gap-3 font-mono">
                                      <div className="flex items-center bg-background px-2.5 py-1.5 rounded border border-border max-w-[200px] sm:max-w-none">
                                        <span className="mr-3 select-all">{showKeySecret[key.id] ? key.key : `••••••••••••••••••••${key.key.slice(-4)}`}</span>
                                        <button onClick={() => toggleKeyVisibility(key.id)} className="text-muted hover:text-primary transition-colors ml-auto">{showKeySecret[key.id] ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}</button>
                                      </div>
                                      {key.lastValidatedAt && <span className="text-muted hidden sm:inline">Validada: {new Date(key.lastValidatedAt).toLocaleDateString()}</span>}
                                    </div>
                                    {key.errorMessage && <div className="mt-3 text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800 flex items-start gap-2"><ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-500" /><span>{key.errorMessage}</span></div>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-end border-t md:border-t-0 border-border pt-3 md:pt-0 mt-2 md:mt-0">
                                    <button onClick={() => handleValidateKey(key)} disabled={validatingId === key.id} className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Revalidar Conexão">{validatingId === key.id ? <LoadingSpinner className="w-4 h-4" /> : <ArrowPathIcon className="w-5 h-5" />}</button>
                                    <div className="w-px h-4 bg-border mx-1"></div>
                                    <button onClick={() => handleSetDefault(key)} disabled={key.isDefault} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-medium ${key.isDefault ? 'text-yellow-500 cursor-default opacity-50' : 'text-muted hover:text-yellow-500 hover:bg-yellow-500/10'}`} title={key.isDefault ? "Esta é a chave principal" : "Definir como Principal"}>{key.isDefault ? <StarIconSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}</button>
                                    <div className="w-px h-4 bg-border mx-1"></div>
                                    <button onClick={() => handleDeleteKey(key.id)} className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir Chave"><TrashIcon className="w-5 h-5" /></button>
                                  </div>
                                </div>
                                {!key.isDefault && index === 1 && sortedKeys[0].isDefault && <div className="ml-1 mt-1 flex items-center gap-1 text-[10px] text-muted"><div className="w-3 h-3 border-l border-b border-border rounded-bl-md"></div><span>Fallback (reserva)</span></div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-muted mt-8 opacity-60">
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Suas chaves são armazenadas localmente para sua segurança.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
