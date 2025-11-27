
import React, { useState, useEffect, useCallback } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUserProfile, updateUserProfile, getApiKeys, saveApiKey, deleteApiKey } from '../services/firestoreService';
import { validateKey } from '../services/keyManagerService';
import { UserProfile, ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { DEFAULT_BUSINESS_PROFILE } from '../constants';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  TrashIcon, 
  PlusIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  BeakerIcon,
  SparklesIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const PROVIDERS: ProviderName[] = [
  'Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Groq', 
  'DeepSeek', 'Cohere', 'Meta LLaMA', 'Replicate', 'Hugging Face', 'Together AI'
];

interface SettingsProps {
  onApiKeySelected: () => void;
  onOpenApiKeySelection: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onApiKeySelected, onOpenApiKeySelection }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'keys'>('keys');
  
  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [businessProfileForm, setBusinessProfileForm] = useState<UserProfile['businessProfile']>(DEFAULT_BUSINESS_PROFILE);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Key Manager State
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig[]>([]);
  const [keysLoading, setKeysLoading] = useState<boolean>(true);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});
  
  // Add Key Form State
  const [newKeyProvider, setNewKeyProvider] = useState<ProviderName>('Google Gemini');
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [newKeyValue, setNewKeyValue] = useState<string>('');
  const [addingKey, setAddingKey] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const userId = 'mock-user-123';

  // --- Profile Logic ---
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
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      alert(`Falha ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingProfile(false);
    }
  }, [userProfile, businessProfileForm, userId]);

  // --- Key Manager Logic ---
  const fetchKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const keys = await getApiKeys();
      setApiKeys(keys);
      
      // Auto-expand providers that have keys
      const newExpanded: Record<string, boolean> = {};
      keys.forEach(k => {
        newExpanded[k.provider] = true;
      });
      setExpandedProviders(prev => ({ ...newExpanded, ...prev })); // Keep user interactions, but expand existing
    } catch (err) {
      console.error('Error fetching keys:', err);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchKeys();
  }, []); // Run once on mount

  // Smart Pre-fill Logic
  useEffect(() => {
    if (apiKeys.length > 0) {
        // 1. Priority: If there's a key that failed recently (invalid), select that provider to help user fix it
        const failingKey = apiKeys.find(k => k.status === 'invalid' || k.status === 'rate-limited');
        if (failingKey) {
            setNewKeyProvider(failingKey.provider);
            return;
        }

        // 2. Secondary: If Google Gemini is missing, suggest it (since it's the core engine)
        const hasGemini = apiKeys.some(k => k.provider === 'Google Gemini');
        if (!hasGemini) {
            setNewKeyProvider('Google Gemini');
            return;
        }

        // 3. Fallback: Most frequent provider
        const counts = apiKeys.reduce((acc, curr) => {
            acc[curr.provider] = (acc[curr.provider] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const mostFreq = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        setNewKeyProvider(mostFreq as ProviderName);
    }
  }, [apiKeys]);

  const handleTestConnection = async () => {
      if (!newKeyValue.trim()) {
          setTestResult({ success: false, message: 'Insira uma chave para testar.' });
          return;
      }

      setTestingKey(true);
      setTestResult(null);

      try {
          // Create ephemeral config for validation
          const tempConfig: ApiKeyConfig = {
              id: 'temp',
              provider: newKeyProvider,
              key: newKeyValue.trim(),
              label: 'Temp',
              isActive: true,
              isDefault: false,
              createdAt: new Date().toISOString(),
              status: 'unchecked',
              usageCount: 0
          };

          const validation = await validateKey(tempConfig);
          
          if (validation.status === 'valid') {
              setTestResult({ success: true, message: 'Conexão bem-sucedida! Chave válida.' });
              // Auto-fill label if empty
              if (!newKeyLabel.trim()) {
                  setNewKeyLabel(`${newKeyProvider} Key (Nova)`);
              }
          } else {
              setTestResult({ success: false, message: validation.error || 'Falha na validação da chave.' });
          }
      } catch (e: any) {
          setTestResult({ success: false, message: e.message || 'Erro desconhecido ao testar.' });
      } finally {
          setTestingKey(false);
      }
  };

  const handleAddKey = async () => {
    if (!newKeyValue.trim() || !newKeyLabel.trim()) return;
    setAddingKey(true);
    setTestResult(null);
    try {
      const newKey: ApiKeyConfig = {
        id: `key-${Date.now()}`,
        provider: newKeyProvider,
        key: newKeyValue.trim(),
        label: newKeyLabel.trim(),
        isActive: true,
        isDefault: apiKeys.filter(k => k.provider === newKeyProvider).length === 0,
        createdAt: new Date().toISOString(),
        status: 'unchecked',
        usageCount: 0
      };
      
      // Auto-validate on add
      const validation = await validateKey(newKey);
      const validatedKey = { ...newKey, ...validation };

      await saveApiKey(validatedKey);
      await fetchKeys();
      setNewKeyValue('');
      setNewKeyLabel('');
      setTestResult({ success: true, message: 'Chave salva e validada!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setTestResult(null), 3000);
      
      // Ensure the provider is expanded
      setExpandedProviders(prev => ({ ...prev, [newKeyProvider]: true }));
    } catch (err) {
      alert('Error adding key');
    } finally {
      setAddingKey(false);
    }
  };

  const handleValidateKey = async (key: ApiKeyConfig) => {
    setValidatingId(key.id);
    try {
      const res = await validateKey(key);
      // Update local state to reflect change immediately
      setApiKeys(prev => prev.map(k => k.id === key.id ? { ...k, status: res.status, errorMessage: res.error } : k));
    } finally {
      setValidatingId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Remover esta chave API?')) return;
    await deleteApiKey(id);
    await fetchKeys();
  };

  const handleToggleActive = async (key: ApiKeyConfig) => {
    const updated = { ...key, isActive: !key.isActive };
    await saveApiKey(updated);
    await fetchKeys();
  };

  const handleSetDefault = async (key: ApiKeyConfig) => {
    if (key.isDefault) return; // Already default
    const updated = { ...key, isDefault: true };
    await saveApiKey(updated);
    await fetchKeys();
  };

  const toggleAccordion = (provider: string) => {
    setExpandedProviders(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKeySecret(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Visual Components
  const StatusBadge = ({ status }: { status: KeyStatus }) => {
    const styles = {
      valid: 'bg-green-500/10 text-green-400 border-green-500/20',
      invalid: 'bg-red-500/10 text-red-400 border-red-500/20',
      expired: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'rate-limited': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      unchecked: 'bg-gray-700/30 text-gray-400 border-gray-600/30',
    };

    const icons = {
      valid: <CheckCircleIcon className="w-3 h-3" />,
      invalid: <XCircleIcon className="w-3 h-3" />,
      expired: <ExclamationTriangleIcon className="w-3 h-3" />,
      'rate-limited': <BoltIcon className="w-3 h-3" />,
      unchecked: <ArrowPathIcon className="w-3 h-3" />,
    };

    const labels = {
      valid: 'Valid',
      invalid: 'Invalid',
      expired: 'Expired',
      'rate-limited': 'Rate Limited',
      unchecked: 'Unchecked',
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-textdark">Configurações</h2>
        <div className="flex bg-lightbg rounded-lg p-1 border border-gray-800">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'keys' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white'}`}
          >
            Chaves de API
          </button>
          <button 
             onClick={() => setActiveTab('profile')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white'}`}
          >
            Perfil do Negócio
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
         <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 max-w-2xl">
            <h3 className="text-xl font-semibold text-textlight mb-5">Perfil do Negócio</h3>
            {profileLoading ? <LoadingSpinner /> : (
              <>
                <Input id="name" label="Nome da Empresa" value={businessProfileForm.name} onChange={handleBusinessProfileChange} />
                <Input id="industry" label="Indústria" value={businessProfileForm.industry} onChange={handleBusinessProfileChange} />
                <Input id="targetAudience" label="Público-alvo" value={businessProfileForm.targetAudience} onChange={handleBusinessProfileChange} />
                <Input id="visualStyle" label="Estilo Visual" value={businessProfileForm.visualStyle} onChange={handleBusinessProfileChange} />
                <Button onClick={handleSaveSettings} isLoading={savingProfile} variant="primary" className="mt-4">Salvar Configurações</Button>
              </>
            )}
         </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-8">
           {/* Add Key Section */}
           <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-textlight flex items-center">
                   <PlusIcon className="w-5 h-5 mr-2 text-accent" /> Adicionar Nova Chave
                </h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
               <div className="md:col-span-3">
                 <label className="block text-sm font-medium text-textlight mb-1">Provedor</label>
                 <select 
                    value={newKeyProvider} 
                    onChange={(e) => setNewKeyProvider(e.target.value as ProviderName)}
                    className="block w-full px-3 py-2 border border-gray-700 rounded-md bg-darkbg text-textdark focus:ring-accent focus:border-accent sm:text-sm"
                 >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
               </div>
               
               <div className="md:col-span-3">
                  <Input id="keyLabel" placeholder="Ex: Produção, Teste..." value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} label="Nome/Rótulo" className="mb-0" />
               </div>
               
               <div className="md:col-span-4 relative group">
                  <Input 
                    id="keyValue" 
                    type="password" 
                    placeholder="Cole sua chave aqui..." 
                    value={newKeyValue} 
                    onChange={(e) => setNewKeyValue(e.target.value)} 
                    label="Chave API" 
                    className="mb-0 pr-10" 
                  />
                  <div className="absolute right-0 top-[28px] h-[38px] flex items-center pr-1">
                      <button
                        onClick={handleTestConnection}
                        disabled={testingKey || !newKeyValue}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded mr-1 disabled:opacity-50 transition-colors"
                        title="Testar Conexão"
                      >
                         {testingKey ? '...' : 'Testar'}
                      </button>
                  </div>
               </div>
               
               <div className="md:col-span-2">
                 <Button onClick={handleAddKey} isLoading={addingKey} variant="primary" className="w-full" disabled={!newKeyValue || !newKeyLabel}>
                   Salvar Chave
                 </Button>
               </div>
             </div>

             {/* Test Result Feedback */}
             {testResult && (
                <div className={`mt-4 p-3 rounded-md text-sm flex items-center animate-in fade-in slide-in-from-top-1 ${testResult.success ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                    {testResult.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                    {testResult.message}
                </div>
             )}
             
             <div className="mt-4 flex items-center text-xs text-textmuted opacity-70">
               <ShieldCheckIcon className="w-4 h-4 mr-1.5" />
               <span>Suas chaves são armazenadas localmente no seu navegador para esta demonstração.</span>
             </div>
           </div>

           {/* Keys List */}
           <div className="space-y-4">
             {keysLoading ? (
               <div className="flex justify-center p-8"><LoadingSpinner /></div>
             ) : apiKeys.length === 0 ? (
               <div className="text-center p-12 text-textmuted border border-dashed border-gray-800 rounded-lg bg-lightbg/50">
                 <KeyIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                 <p>Nenhuma chave configurada.</p>
                 <p className="text-sm opacity-60">Adicione suas chaves de API acima para começar.</p>
               </div>
             ) : (
               PROVIDERS.map(provider => {
                 const providerKeys = apiKeys.filter(k => k.provider === provider);
                 if (providerKeys.length === 0) return null;
                 const isExpanded = expandedProviders[provider];

                 return (
                   <div key={provider} className="bg-lightbg rounded-lg shadow-sm border border-gray-800 overflow-hidden">
                     <button 
                       onClick={() => toggleAccordion(provider)}
                       className="w-full bg-gray-900/50 px-6 py-4 border-b border-gray-800 flex justify-between items-center hover:bg-gray-800/50 transition-colors"
                     >
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(0,255,153,0.4)]"></span>
                            <h4 className="font-semibold text-textlight text-sm uppercase tracking-wide">{provider}</h4>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs bg-darkbg text-textmuted px-2.5 py-0.5 rounded-full border border-gray-700 font-mono">
                                {providerKeys.length} {providerKeys.length === 1 ? 'chave' : 'chaves'}
                            </span>
                            {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-textmuted" /> : <ChevronDownIcon className="w-4 h-4 text-textmuted" />}
                        </div>
                     </button>
                     
                     {isExpanded && (
                       <div className="divide-y divide-gray-800/50">
                         {providerKeys.map(key => (
                           <div key={key.id} className={`p-4 transition-colors ${!key.isActive ? 'opacity-60 bg-gray-900/20' : 'hover:bg-white/[0.01]'}`}>
                             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                               {/* Left Section: Info */}
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-medium text-textdark truncate text-sm">{key.label}</span>
                                    <StatusBadge status={key.status} />
                                  </div>
                                  
                                  <div className="flex items-center text-xs text-textmuted gap-3 font-mono">
                                    <div className="flex items-center bg-darkbg px-2 py-1 rounded border border-gray-700/50">
                                      <span className="mr-2">
                                        {showKeySecret[key.id] ? key.key : `••••••••••••${key.key.slice(-4)}`}
                                      </span>
                                      <button onClick={() => toggleKeyVisibility(key.id)} className="text-gray-500 hover:text-white">
                                        {showKeySecret[key.id] ? <EyeSlashIcon className="w-3 h-3" /> : <EyeIcon className="w-3 h-3" />}
                                      </button>
                                    </div>
                                    <span className="hidden sm:inline text-gray-600">|</span>
                                    <span>Adicionada: {new Date(key.createdAt).toLocaleDateString()}</span>
                                  </div>

                                  {key.errorMessage && (
                                    <div className="mt-2 text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/20 flex items-start">
                                        <ExclamationTriangleIcon className="w-4 h-4 mr-1.5 shrink-0" />
                                        <span>{key.errorMessage}</span>
                                    </div>
                                  )}
                               </div>
                               
                               {/* Right Section: Actions */}
                               <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                 {/* Default Toggle */}
                                 <button 
                                   onClick={() => handleSetDefault(key)}
                                   disabled={key.isDefault}
                                   className={`p-1.5 rounded-md transition-all ${
                                     key.isDefault 
                                     ? 'text-yellow-400 cursor-default' 
                                     : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-900/10'
                                   }`}
                                   title={key.isDefault ? "Chave Padrão" : "Definir como Padrão"}
                                 >
                                   {key.isDefault ? <StarIconSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                                 </button>

                                 {/* Validate */}
                                 <button 
                                   onClick={() => handleValidateKey(key)} 
                                   disabled={validatingId === key.id}
                                   className="p-1.5 text-textmuted hover:text-accent hover:bg-accent/10 rounded-md transition-colors" 
                                   title="Revalidar Conexão"
                                 >
                                   {validatingId === key.id ? <LoadingSpinner /> : <ArrowPathIcon className="w-5 h-5" />}
                                 </button>

                                 {/* Pause/Active Toggle */}
                                 <button 
                                   onClick={() => handleToggleActive(key)}
                                   className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                                     key.isActive 
                                     ? 'border-green-600/30 text-green-400 hover:bg-green-900/20' 
                                     : 'border-gray-600 text-gray-400 hover:bg-gray-800'
                                   }`}
                                 >
                                   {key.isActive ? 'ON' : 'OFF'}
                                 </button>

                                 {/* Delete */}
                                 <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                 <button 
                                   onClick={() => handleDeleteKey(key.id)}
                                   className="p-1.5 text-textmuted hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                                   title="Excluir Chave"
                                 >
                                   <TrashIcon className="w-4 h-4" />
                                 </button>
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 );
               })
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
