

import { ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { GoogleGenAI } from '@google/genai'; // Changed GoogleGenerativeAI to GoogleGenAI as per guidelines

// MOCK: Estas funções AGORA serão chamadas do BACKEND.
// Aqui no frontend, elas são stubs ou calls para o novo API Keys Service do backend.
// Para manter a compilação do frontend, vamos deixá-los como funções vazias ou de erro.
const mockSaveApiKey = async (apiKey: ApiKeyConfig): Promise<ApiKeyConfig> => {
  console.warn("MOCK: saveApiKey chamado no frontend. Em produção, isso iria para o backend.");
  return { ...apiKey, id: apiKey.id || `mock-key-${Date.now()}` };
};
const mockGetApiKeys = async (): Promise<ApiKeyConfig[]> => {
  console.warn("MOCK: getApiKeys chamado no frontend. Em produção, isso viria do backend.");
  // Retorna uma chave Gemini de ambiente se disponível, senão vazio.
  const envKey = process.env.API_KEY ? [{
    id: 'env-key-default',
    provider: 'Google Gemini',
    key: process.env.API_KEY,
    label: 'Environment Key (Frontend Mock)',
    isActive: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    status: 'unchecked',
    usageCount: 0
  } as ApiKeyConfig] : [];
  return Promise.resolve(envKey);
};


// Mock validation for other providers
const mockValidate = async (provider: ProviderName): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  // Randomly fail 5% of the time for demo purposes
  return Math.random() > 0.05;
};

// Real-ish validation for Gemini with detailed error handling
const validateGeminiKey = async (key: string): Promise<{ status: KeyStatus; error?: string }> => {
  try {
    // Corrected to GoogleGenAI
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Use gemini-2.5-flash for a lightweight validation call
    // Set maxOutputTokens to 1 to minimize cost/latency
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: 'ping' }] },
        config: { maxOutputTokens: 1 },
    });
    return { status: 'valid' };
  } catch (error: any) {
    console.error('Gemini key validation error:', error);
    // Attempt to parse specific error messages for status
    if (error.message?.includes('API key not valid')) {
      return { status: 'invalid', error: 'API Key is invalid.' };
    }
    if (error.message?.includes('quota')) {
      return { status: 'rate-limited', error: 'API Key usage quota exceeded.' };
    }
    // Generic error for others
    return { status: 'invalid', error: `Connection failed: ${error.message || 'Unknown error.'}` };
  }
};

/**
 * MOCK: Validates an API key against its provider.
 * In a real application, this would involve a backend call to validate.
 * @param config The API key configuration.
 * @returns An object containing the validation status and an optional error message.
 */
export const validateKey = async (config: ApiKeyConfig): Promise<{ status: KeyStatus; error?: string }> => {
  if (config.provider === 'Google Gemini') {
    return validateGeminiKey(config.key);
  } else {
    // Simulate validation for other providers
    const isValid = await mockValidate(config.provider);
    if (isValid) {
      return { status: 'valid' };
    } else {
      return { status: 'invalid', error: `Mock validation failed for ${config.provider}.` };
    }
  }
};


/**
 * MOCK: Retrieves the "best" API key for a given provider, applying fallback logic.
 * In a real application, this would be handled by a backend service that manages
 * key rotation, health checks, and usage limits.
 * @param providerName The name of the AI provider.
 * @returns The API key string.
 * @throws Error if no valid API key is found for the provider.
 */
export const getBestApiKey = async (providerName: ProviderName): Promise<string> => {
  // In a real application, this would typically involve:
  // 1. Fetching keys from a backend that manages them.
  // 2. Applying selection logic (e.g., default key, least used, key with highest success rate).
  // 3. Handling fallback if the primary key fails.

  // For this frontend mock, we simply return process.env.API_KEY or a placeholder.
  // For Gemini, we might try to use the selected API key from the aistudio API.
  if (providerName === 'Google Gemini') {
    if (process.env.API_KEY) {
      return process.env.API_KEY;
    }
    // Fallback if process.env.API_KEY is not set, or for other providers
    console.warn(`No process.env.API_KEY found for Google Gemini. Using fallback.`);
  }

  // Placeholder for other providers or if Gemini key is missing
  console.warn(`Using a mock API key for ${providerName}. This should come from a secure backend in production.`);
  return `mock-api-key-for-${providerName.replace(/\s/g, '-').toLowerCase()}`;
};


/**
 * MOCK: Executes an AI operation with fallback logic across multiple API keys for a given provider.
 * This simulates a client-side API key management and retry mechanism.
 * In a real backend, this logic would live on the server.
 * @param providerName The name of the AI provider.
 * @param operation A callback function that performs the AI operation with an API key.
 * @returns The result of the successful operation.
 * @throws Error if all API keys fail.
 */
export const executeWithProviderFallback = async <T>(
  providerName: ProviderName,
  operation: (apiKey: string) => Promise<T>,
): Promise<T> => {
  const apiKeys = await mockGetApiKeys(); // Use mockGetApiKeys for frontend demo
  const providerKeys = apiKeys.filter(k => k.provider === providerName && k.isActive);

  if (providerKeys.length === 0) {
    // If no specific keys are configured, try with process.env.API_KEY if available for Gemini
    if (providerName === 'Google Gemini' && process.env.API_KEY) {
      try {
        return await operation(process.env.API_KEY);
      } catch (e) {
        throw new Error(`Operation failed with environment API key: ${e.message}`);
      }
    }
    throw new Error(`No active API keys found for ${providerName}. Please configure them.`);
  }

  let lastError: any;
  // Sort keys to prioritize default and then active ones
  const sortedKeys = [...providerKeys].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });

  for (const keyConfig of sortedKeys) {
    try {
      // In a real app, 'keyConfig.key' might be encrypted and need decryption
      const result = await operation(keyConfig.key); 
      // Otimisticamente update usage count and status
      await mockSaveApiKey({ ...keyConfig, usageCount: keyConfig.usageCount + 1, lastValidatedAt: new Date(), status: 'valid' });
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`Operation failed with key ${keyConfig.label} (ID: ${keyConfig.id}) for ${providerName}: ${error.message}`);
      
      // Update key status based on error (mock logic)
      const status: KeyStatus = (error.message?.includes('quota') || error.status === 429) ? 'rate-limited' : 'invalid';
      await mockSaveApiKey({ ...keyConfig, status, errorMessage: error.message, lastValidatedAt: new Date() });
    }
  }

  throw new Error(`All API keys failed for ${providerName}. Last error: ${lastError?.message || 'Unknown error.'}`);
};
