

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
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  ServerStackIcon,
  MagnifyingGlassIcon
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Add Key Form State
  const [newKeyProvider, setNewKeyProvider] = useState<ProviderName>('Google Gemini');
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [newKeyValue, setNewKeyValue] = useState<string>('');
  const [addingKey, setAddingKey] = useState<boolean>(false);
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; status: KeyStatus } | null>(null);
  const [lastTestedValue, setLastTestedValue] = useState<string>(''); // Cache last tested key
  
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
      setExpandedProviders(prev => ({ ...newExpanded, ...prev })); 
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
        // 1. Priority: If there's a key that failed recently (invalid), select that provider
        const failingKey = apiKeys.find(k => k.status === 'invalid' || k.status === 'rate-limited');
        if (failingKey) {
            setNewKeyProvider(failingKey.provider);
            return;
        }

        // 2. Secondary: If Google Gemini is missing, suggest it
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
    if (!newKeyValue.trim() || !newKeyLabel.trim()) return;
    setAddingKey(true);
    
    try {
      const keyId = `key-${Date.now()}`;
      
      let initialStatus: KeyStatus = 'unchecked';
      let errorMessage: string | undefined = undefined;

      // Optimization: If we just tested this exact key and it passed, skip re-validation call
      if (newKeyValue.trim() === lastTestedValue && testResult) {
          initialStatus = testResult.status;
          if (!testResult.success) errorMessage = testResult.message;
      } else {
          // Perform validation immediately before saving
          const tempConfig: ApiKeyConfig = {
              id: keyId,
              provider: newKeyProvider,
              key: newKeyValue.trim(),
              label: newKeyLabel.trim(),
              isActive: true,
              isDefault: false,
              createdAt: new Date().toISOString(),
              status: 'unchecked',
              usageCount: 0
          };
          const validation = await validateKey(tempConfig);
          initialStatus = validation.status;
          errorMessage = validation.error;
      }

      const newKey: ApiKeyConfig = {
        id: keyId,
        provider: newKeyProvider,
        key: newKeyValue.trim(),
        label: newKeyLabel.trim(),
        isActive: true,
        // If it's the first key for this provider, make it default automatically
        isDefault: apiKeys.filter(k => k.provider === newKeyProvider).length === 0,
        createdAt: new Date().toISOString(),
        status: initialStatus,
        errorMessage: errorMessage,
        usageCount: 0
      };
      
      // Save the already validated key
      await saveApiKey(newKey);
      await fetchKeys();
      
      setNewKeyValue('');
      setNewKeyLabel('');
      setTestResult({ success: true, message: 'Chave salva e validada!', status: initialStatus });
      setLastTestedValue('');
      
      setTimeout(() => setTestResult(null), 3000);
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
      // ValidateKey service saves to DB, we just update local state to reflect change immediately
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
    if (key.isDefault) return;
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

  // Helper to sort keys: Default first, then Active, then others
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
      valid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 ring-emerald-500/20',
      invalid: 'bg-rose-500/10 text-rose-400 border-rose-500/20 ring-rose-500/20',
      expired: 'bg-orange-500/10 text-orange-400 border-orange-500/20 ring-orange-500/20',
      'rate-limited': 'bg-amber-500/10 text-amber-400 border-amber-500/20 ring-amber-500/20',
      unchecked: 'bg-gray-500/10 text-gray-400 border-gray-500/20 ring-gray-500/20',
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
      <span 
        title={`Status: ${labels[status]}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ring-1 ring-inset ${styles[status]} select-none`}
      >
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-8 lg:py-10 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-textdark">Configurações</h2>
          <p className="text-textmuted text-sm mt-1">Gerencie seu perfil e conexões de IA</p>
        </div>
        
        <div className="flex bg-lightbg rounded-lg p-1 border border-gray-800 shadow-sm">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'keys' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white hover:bg-white/5'}`}
          >
            <KeyIcon className="w-4 h-4" />
            Chaves de API
          </button>
          <button 
             onClick={() => setActiveTab('profile')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-accent text-darkbg shadow-sm' : 'text-textlight hover:text-white hover:bg-white/5'}`}
          >
            <ServerStackIcon className="w-4 h-4" />
            Perfil do Negócio
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
         <div className="bg-lightbg p-8 rounded-xl shadow-lg border border-gray-800 max-w-2xl animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-semibold text-textlight mb-6 flex items-center gap-2">
              <ServerStackIcon className="w-5 h-5 text-accent" />
              Perfil do Negócio
            </h3>
            {profileLoading ? <LoadingSpinner /> : (
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

      {activeTab === 'keys' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           
           {/* Add Key Card */}
           <div className="bg-gradient-to-br from-lightbg to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-accent/10"></div>
             
             <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-lg font-semibold text-textlight flex items-center gap-2">
                   <div className="p-1.5 bg-accent/10 rounded-lg">
                     <PlusIcon className="w-5 h-5 text-accent" /> 
                   </div>
                   Adicionar Nova Conexão
                </h3>
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end relative z-10">
               <div className="lg:col-span-3">
                 <label className="block text-xs font-semibold text-textmuted uppercase tracking-wider mb-1.5 ml-1">Provedor</label>
                 <div className="relative">
                   <select 
                      value={newKeyProvider} 
                      onChange={(e) => setNewKeyProvider(e.target.value as ProviderName)}
                      className="block w-full pl-3 pr-10 py-2.5 border border-gray-600 rounded-lg bg-darkbg text-textdark focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm appearance-none transition-shadow"
                   >
                      {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                   </select>
                   <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                 </div>
               </div>
               
               <div className="lg:col-span-3">
                  <Input id="keyLabel" placeholder="Ex: Produção, Teste..." value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} label="Nome Identificador" className="mb-0" />
               </div>
               
               <div className="lg:col-span-4 relative">
                  <Input 
                    id="keyValue" 
                    type="password" 
                    placeholder="sk-..." 
                    value={newKeyValue} 
                    onChange={(e) => setNewKeyValue(e.target.value)} 
                    label="Chave API (Secret Key)" 
                    className="mb-0 pr-16" 
                  />
                  <div className="absolute right-1 top-[29px]">
                      <button
                        onClick={handleTestConnection}
                        disabled={testingKey || !newKeyValue}
                        className="text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50 transition-colors flex items-center gap-1"
                        title="Testar Conexão"
                      >
                         {testingKey ? <LoadingSpinner /> : 'Testar'}
                      </button>
                  </div>
               </div>
               
               <div className="lg:col-span-2">
                 <Button onClick={handleAddKey} isLoading={addingKey} variant="primary" className="w-full h-[42px]" disabled={!newKeyValue || !newKeyLabel}>
                   Salvar
                 </Button>
               </div>
             </div>

             {testResult && (
                <div className={`mt-4 mx-1 p-3 rounded-lg text-sm flex items-center animate-in fade-in slide-in-from-top-2 border ${testResult.success ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                    {testResult.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                    <span className="font-medium">{testResult.message}</span>
                </div>
             )}
           </div>

           {/* Keys List by Provider */}
           <div className="space-y-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <h3 className="text-sm font-semibold text-textmuted uppercase tracking-wider ml-1 flex items-center gap-2">
                   <ServerStackIcon className="w-4 h-4" /> Provedores Configurados
                </h3>
                <div className="relative w-full md:w-64">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-textmuted" />
                   </div>
                   <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg leading-5 bg-lightbg text-textdark placeholder-textmuted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent sm:text-sm transition duration-150 ease-in-out"
                      placeholder="Buscar chaves (Provedor, Label...)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>
             
             {keysLoading ? (
               <div className="flex justify-center p-12 bg-lightbg rounded-xl"><LoadingSpinner /></div>
             ) : apiKeys.length === 0 ? (
               <div className="text-center p-12 border border-dashed border-gray-700 rounded-xl bg-lightbg/30">
                 <KeyIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                 <p className="text-lg font-medium text-textlight">Nenhuma chave configurada</p>
                 <p className="text-sm text-textmuted mt-1">Adicione suas chaves de API acima para começar a usar a IA.</p>
               </div>
             ) : (
               PROVIDERS.map(provider => {
                 const providerKeys = filteredApiKeys.filter(k => k.provider === provider);
                 const hasKeys = providerKeys.length > 0;
                 
                 // If search is active and no keys match for this provider, hide the provider
                 if (searchTerm && !hasKeys) return null;

                 const activeKeysCount = providerKeys.filter(k => k.isActive).length;
                 // If search matches, expand by default or keep current state?
                 // Let's rely on user interaction, but maybe force expand if searching?
                 const isExpanded = searchTerm ? true : expandedProviders[provider];
                 
                 // Sort keys for better UX logic inside the box
                 const sortedKeys = getSortedKeys(providerKeys);

                 return (
                   <div key={provider} className={`rounded-xl border transition-all duration-200 overflow-hidden ${hasKeys ? 'bg-lightbg border-gray-700 shadow-sm' : 'bg-transparent border-gray-800 opacity-70 hover:opacity-100'}`}>
                     <button 
                       onClick={() => toggleAccordion(provider)}
                       className={`w-full px-6 py-4 flex justify-between items-center transition-colors ${hasKeys ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-800/30'}`}
                     >
                        <div className="flex items-center gap-4">
                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${hasKeys ? (activeKeysCount > 0 ? 'bg-accent shadow-accent/50' : 'bg-yellow-500 shadow-yellow-500/50') : 'bg-gray-700 shadow-none'}`}></div>
                            <div className="text-left">
                                <h4 className={`font-semibold text-sm ${hasKeys ? 'text-textdark' : 'text-textmuted'}`}>{provider}</h4>
                                {hasKeys && <p className="text-[10px] text-textmuted mt-0.5">{activeKeysCount} chave(s) ativa(s)</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {!hasKeys && <span className="text-xs text-textmuted italic mr-2">Não configurado</span>}
                            {hasKeys && (
                                <span className="flex items-center text-xs bg-darkbg text-textmuted px-2.5 py-1 rounded-md border border-gray-700 font-mono">
                                    {providerKeys.length}
                                </span>
                            )}
                            {isExpanded ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
                        </div>
                     </button>
                     
                     {isExpanded && (
                       <div className="border-t border-gray-800 bg-black/20">
                         {providerKeys.length === 0 ? (
                             <div className="p-6 text-center text-sm text-textmuted">
                                 Nenhuma chave adicionada para {provider}. Use o formulário acima.
                             </div>
                         ) : (
                             <div className="divide-y divide-gray-800/50">
                               {sortedKeys.map((key, index) => (
                                 <div key={key.id} className={`p-4 md:px-6 transition-colors ${!key.isActive ? 'opacity-60 grayscale-[0.5]' : ''} ${key.isDefault ? 'bg-accent/[0.02]' : ''}`}>
                                   <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                     
                                     {/* Left Section: Info */}
                                     <div className="flex-1 min-w-0 w-full">
                                        <div className="flex items-center gap-3 mb-2">
                                          {key.isDefault && (
                                              <span className="bg-accent text-darkbg text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" title="Chave Padrão (Primary)">
                                                  <StarIconSolid className="w-3 h-3" /> PADRÃO
                                              </span>
                                          )}
                                          <span className="font-semibold text-textlight text-sm truncate">{key.label}</span>
                                          <StatusBadge status={key.status} />
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center text-xs text-textmuted gap-3 font-mono">
                                          <div className="flex items-center bg-darkbg px-2.5 py-1.5 rounded border border-gray-700/50 max-w-[200px] sm:max-w-none">
                                            <span className="mr-3 select-all">
                                              {showKeySecret[key.id] ? key.key : `••••••••••••••••••••${key.key.slice(-4)}`}
                                            </span>
                                            <button onClick={() => toggleKeyVisibility(key.id)} className="text-gray-500 hover:text-white transition-colors ml-auto">
                                              {showKeySecret[key.id] ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                                            </button>
                                          </div>
                                          
                                          {key.lastValidatedAt && (
                                            <span className="text-gray-600 hidden sm:inline">Validada: {new Date(key.lastValidatedAt).toLocaleDateString()}</span>
                                          )}
                                        </div>

                                        {key.errorMessage && (
                                          <div className="mt-3 text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-900/30 flex items-start gap-2">
                                              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-400" />
                                              <span>{key.errorMessage}</span>
                                          </div>
                                        )}
                                     </div>
                                     
                                     {/* Right Section: Actions */}
                                     <div className="flex items-center gap-2 shrink-0 self-end md:self-center w-full md:w-auto justify-end border-t md:border-t-0 border-gray-800 pt-3 md:pt-0 mt-2 md:mt-0">
                                       
                                       {/* Validate Button */}
                                       <button 
                                         onClick={() => handleValidateKey(key)} 
                                         disabled={validatingId === key.id}
                                         className="p-2 text-textmuted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" 
                                         title="Revalidar Conexão"
                                       >
                                         {validatingId === key.id ? <LoadingSpinner /> : <ArrowPathIcon className="w-5 h-5" />}
                                       </button>

                                       <div className="w-px h-4 bg-gray-800 mx-1"></div>

                                       {/* Default Toggle */}
                                       <button 
                                         onClick={() => handleSetDefault(key)}
                                         disabled={key.isDefault}
                                         className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-medium ${
                                           key.isDefault 
                                           ? 'text-yellow-500 cursor-default opacity-50' 
                                           : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-500/10'
                                         }`}
                                         title={key.isDefault ? "Esta é a chave principal" : "Definir como Principal"}
                                       >
                                         {key.isDefault ? <StarIconSolid className="w-5 h-5" /> : <StarIcon className="w-5 h-5" />}
                                       </button>

                                       {/* Active Toggle */}
                                       <button 
                                         onClick={() => handleToggleActive(key)}
                                         className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${key.isActive ? 'bg-green-600/20 border border-green-600/50' : 'bg-gray-700/50 border border-gray-600'}`}
                                         title={key.isActive ? "Desativar Chave" : "Ativar Chave"}
                                       >
                                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-300 ${key.isActive ? 'translate-x-4 bg-green-400' : 'translate-x-0 bg-gray-400'}`}></span>
                                       </button>

                                       <div className="w-px h-4 bg-gray-800 mx-1"></div>

                                       {/* Delete */}
                                       <button 
                                         onClick={() => handleDeleteKey(key.id)}
                                         className="p-2 text-textmuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                         title="Excluir Chave"
                                       >
                                         <TrashIcon className="w-5 h-5" />
                                       </button>
                                     </div>
                                   </div>
                                   {/* Fallback Indication */}
                                   {!key.isDefault && index === 1 && sortedKeys[0].isDefault && (
                                       <div className="ml-1 mt-1 flex items-center gap-1 text-[10px] text-gray-600">
                                            <div className="w-3 h-3 border-l border-b border-gray-700 rounded-bl-md"></div>
                                            <span>Fallback (reserva)</span>
                                       </div>
                                   )}
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
             
             <div className="flex items-center justify-center gap-2 text-xs text-textmuted mt-8 opacity-60">
               <ShieldCheckIcon className="w-4 h-4" />
               <span>Suas chaves são criptografadas e armazenadas localmente no navegador.</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;