
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
  SparklesIcon
} from '@heroicons/react/24/outline';

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
    const updated = { ...key, isDefault: true };
    await saveApiKey(updated);
    await fetchKeys();
  };

  const getStatusBadge = (status: KeyStatus) => {
    switch (status) {
      case 'valid': return <span className="flex items-center text-green-400 text-xs bg-green-900/20 px-2 py-0.5 rounded border border-green-800"><CheckCircleIcon className="w-3.5 h-3.5 mr-1"/> Valid</span>;
      case 'invalid': return <span className="flex items-center text-red-400 text-xs bg-red-900/20 px-2 py-0.5 rounded border border-red-800"><XCircleIcon className="w-3.5 h-3.5 mr-1"/> Invalid</span>;
      case 'rate-limited': return <span className="flex items-center text-yellow-400 text-xs bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-800"><ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1"/> Limited</span>;
      case 'expired': return <span className="flex items-center text-orange-400 text-xs bg-orange-900/20 px-2 py-0.5 rounded border border-orange-800"><ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1"/> Expired</span>;
      default: return <span className="flex items-center text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded border border-gray-700"><ArrowPathIcon className="w-3.5 h-3.5 mr-1"/> Unchecked</span>;
    }
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
                   <SparklesIcon className="w-5 h-5 mr-2 text-accent" /> Gerenciar Chaves
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
                  <Input id="keyLabel" placeholder="Ex: Produção..." value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} label="Nome" className="mb-0" />
               </div>
               
               <div className="md:col-span-4 relative">
                  <Input id="keyValue" type="password" placeholder="sk-..." value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} label="Chave API" className="mb-0 pr-10" />
                  {/* Test button inside/near input context could go here, but placing it as a main action is cleaner */}
               </div>
               
               <div className="md:col-span-2 flex gap-2">
                 <button 
                   onClick={handleTestConnection} 
                   disabled={testingKey || !newKeyValue}
                   className="flex items-center justify-center px-3 py-2 border border-gray-600 rounded-md text-textlight hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
                   title="Testar Conexão"
                 >
                    {testingKey ? <LoadingSpinner /> : <BeakerIcon className="w-5 h-5" />}
                 </button>
                 <Button onClick={handleAddKey} isLoading={addingKey} variant="primary" className="w-full flex-1" disabled={!newKeyValue || !newKeyLabel}>
                   Salvar
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

             <p className="text-xs text-textmuted mt-4 flex items-center opacity-70">
               <ShieldCheckIcon className="w-4 h-4 mr-1" />
               Chaves são armazenadas com segurança. A validação automática ocorre ao salvar.
             </p>
           </div>

           {/* Keys List */}
           <div className="space-y-6">
             {keysLoading ? (
               <div className="flex justify-center p-8"><LoadingSpinner /></div>
             ) : apiKeys.length === 0 ? (
               <div className="text-center p-12 text-textmuted border border-dashed border-gray-800 rounded-lg bg-lightbg/50">
                 <PlusIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                 <p>Nenhuma chave configurada.</p>
                 <p className="text-sm opacity-60">Adicione suas chaves de API acima para ativar os recursos de IA.</p>
               </div>
             ) : (
               PROVIDERS.map(provider => {
                 const providerKeys = apiKeys.filter(k => k.provider === provider);
                 if (providerKeys.length === 0) return null;

                 return (
                   <div key={provider} className="bg-lightbg rounded-lg shadow-sm border border-gray-800 overflow-hidden">
                     <div className="bg-gray-900/50 px-6 py-3 border-b border-gray-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent"></span>
                            <h4 className="font-semibold text-textlight">{provider}</h4>
                        </div>
                        <span className="text-xs bg-gray-800 text-textmuted px-2 py-1 rounded-full border border-gray-700">{providerKeys.length} chave(s)</span>
                     </div>
                     <div className="divide-y divide-gray-800">
                       {providerKeys.map(key => (
                         <div key={key.id} className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-white/[0.02] ${!key.isActive ? 'opacity-60 bg-gray-900/30' : ''}`}>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-textdark truncate">{key.label}</span>
                                {key.isDefault && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 font-bold tracking-wide">DEFAULT</span>}
                                {getStatusBadge(key.status)}
                              </div>
                              <div className="flex items-center text-xs text-textmuted gap-3 mt-1.5">
                                <span className="font-mono bg-darkbg px-1.5 py-0.5 rounded border border-gray-700">•••• {key.key.slice(-4)}</span>
                                <span className="hidden sm:inline">Criada: {new Date(key.createdAt).toLocaleDateString()}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>Uso: {key.usageCount}</span>
                              </div>
                              {key.errorMessage && (
                                <p className="text-xs text-red-400 mt-2 bg-red-900/10 p-1.5 rounded border border-red-900/20 max-w-xl">
                                    <span className="font-bold">Erro:</span> {key.errorMessage}
                                </p>
                              )}
                           </div>
                           
                           <div className="flex items-center gap-2 shrink-0">
                             <button 
                               onClick={() => handleValidateKey(key)} 
                               disabled={validatingId === key.id}
                               className="p-2 text-textmuted hover:text-accent hover:bg-white/5 rounded-md transition-colors" 
                               title="Testar/Revalidar"
                             >
                               {validatingId === key.id ? <LoadingSpinner /> : <ArrowPathIcon className="w-5 h-5" />}
                             </button>
                             <button 
                               onClick={() => handleToggleActive(key)}
                               className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${key.isActive ? 'border-green-600/30 text-green-400 hover:bg-green-900/20' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}
                             >
                               {key.isActive ? 'Ativa' : 'Pausada'}
                             </button>
                             {!key.isDefault && (
                               <button 
                                 onClick={() => handleSetDefault(key)}
                                 className="px-3 py-1.5 rounded text-xs font-medium border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                               >
                                 Definir Padrão
                               </button>
                             )}
                             <button 
                               onClick={() => handleDeleteKey(key.id)}
                               className="p-2 text-textmuted hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                               title="Excluir Chave"
                             >
                               <TrashIcon className="w-5 h-5" />
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
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