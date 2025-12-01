
import { ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { GoogleGenAI } from '@google/genai'; // Usando o novo SDK
import { getFirebaseIdToken, getActiveOrganization } from './authService';

const BACKEND_URL = 'http://localhost:3000'; // Backend URL

// Helper para obter o ID da organização ativa
const getActiveOrganizationId = (): string => {
  const activeOrg = getActiveOrganization();
  if (!activeOrg) {
    // Return a default mock ID if auth service hasn't loaded yet or is in offline mode
    return 'mock-org-default';
  }
  return activeOrg.organization.id;
};

// Validates an API key against its provider via Backend OR Client-side fallback
export const validateKey = async (config: ApiKeyConfig): Promise<{ status: KeyStatus; error?: string }> => {
  const organizationId = getActiveOrganizationId();
  
  // 1. Tentar validação via Backend
  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(config),
    });

    if (response.ok) {
      return response.json();
    }
    // Se falhar (ex: 404, 500 ou Network Error), cai no catch e tenta client-side
  } catch (error) {
    console.warn('Backend validation failed/unreachable, attempting client-side validation.', error);
  }

  // 2. Fallback: Validação Client-Side (Direto com Google)
  if (config.provider === 'Google Gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: config.key });
      
      // Validação completa usando o prompt "Explain how AI works..." para garantir que a chave tem permissão de geração
      // Isso replica a lógica do snippet Python fornecido pelo usuário.
      await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: "Explain how AI works in a few words"
      });

      return { status: 'valid' };
    } catch (error: any) {
      console.error('Client-side key validation failed:', error);
      
      let errorMsg = error.message || 'Erro desconhecido';
      if (errorMsg.includes('401') || errorMsg.includes('API key not valid')) {
          return { status: 'invalid', error: 'Chave de API inválida ou expirada.' };
      }
      return { status: 'invalid', error: `Erro na validação: ${errorMsg}` };
    }
  }

  // Para outros provedores em modo offline, não podemos validar client-side facilmente sem expor lógica ou CORS
  return { status: 'unchecked', error: 'Backend indisponível para validar este provedor.' };
};

// MOCK: Retrieves the "best" API key for a given provider, applying fallback logic.
export const getBestApiKey = async (providerName: ProviderName): Promise<string> => {
  const organizationId = getActiveOrganizationId();

  try {
    const idToken = await getFirebaseIdToken();
    const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}/best-key?provider=${encodeURIComponent(providerName)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
        throw new Error('Backend unavailable');
    }

    const data = await response.json();
    return data.key; 
  } catch (error: any) {
    // Fallback: Check local storage active key first
    const localActiveKey = localStorage.getItem('vitrinex_gemini_api_key');
    
    if (providerName === 'Google Gemini') {
        if (localActiveKey) return localActiveKey;
        if (process.env.API_KEY) return process.env.API_KEY;
    }
    
    throw new Error(`No active API key found for ${providerName}. Please configure them.`);
  }
};

/**
 * MOCK: Executes an AI operation with fallback logic across multiple API keys for a given provider.
 */
export const executeWithProviderFallback = async <T>(
  providerName: ProviderName,
  operation: (apiKey: string) => Promise<T>,
): Promise<T> => {
  
  let keyToUse: string | undefined;
  try {
    keyToUse = await getBestApiKey(providerName);
  } catch (e) {
    console.warn(`Could not get best API key from backend for ${providerName}: ${(e as Error).message}`);
    // Ultimate fallback for frontend demo
    if (providerName === 'Google Gemini') {
        const localKey = localStorage.getItem('vitrinex_gemini_api_key');
        keyToUse = localKey || process.env.API_KEY;
    }
  }

  if (!keyToUse) {
    throw new Error(`No API key available for ${providerName}.`);
  }

  try {
    const result = await operation(keyToUse);
    return result;
  } catch (error: any) {
    console.error(`Direct frontend operation failed for ${providerName}: ${error.message}`);
    throw new Error(`AI Operation failed: ${error.message}`);
  }
};
