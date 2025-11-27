
import { ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { getApiKeys, saveApiKey } from './firestoreService';
import { GoogleGenAI } from '@google/genai';

// Mock validation for other providers
const mockValidate = async (provider: ProviderName): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  // Randomly fail 5% of the time for demo purposes
  return Math.random() > 0.05;
};

// Real-ish validation for Gemini with detailed error handling
const validateGeminiKey = async (key: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    
    // Use gemini-2.5-flash for a lightweight validation call
    // Set maxOutputTokens to 1 to minimize cost/latency
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: 'ping' }] },
        config: { maxOutputTokens: 1 },
    });
    
    console.log('Gemini Key Validation: Success');
    return { isValid: true };
  } catch (error: any) {
    console.error("Gemini Key Validation Failed:", error);

    // Extract detailed error info
    let status = 'Unknown';
    if (error.status) status = error.status.toString();
    else if (error.response?.status) status = error.response.status.toString();
    else if (error.message?.match(/(\d{3})/)) status = error.message.match(/(\d{3})/)[1];

    let message = error.message || 'Unknown error occurred';

    // Categorize errors for better UI feedback
    if (status === '401' || message.includes('401') || message.toLowerCase().includes('invalid api key')) {
        return { isValid: false, error: `401 Unauthorized: The API Key is incorrect.` };
    }
    if (status === '403' || message.includes('403')) {
        return { isValid: false, error: `403 Forbidden: Key lacks permissions or billing is disabled.` };
    }
    if (status === '404' || message.includes('404')) {
        return { isValid: false, error: `404 Not Found: Validation model (gemini-2.5-flash) unavailable.` };
    }
    if (status === '429' || message.includes('429')) {
        return { isValid: false, error: `429 Rate Limit: Quota exceeded for this key.` };
    }
    if (status === '500' || message.includes('500')) {
        return { isValid: false, error: `500 Server Error: Google Gemini API internal error.` };
    }

    // Network errors (often empty status or specific messages)
    if (message.includes('fetch') || message.includes('network')) {
         return { isValid: false, error: `Network Error: Could not reach Google API. Check firewall/connection.` };
    }

    return { isValid: false, error: `${status}: ${message}` };
  }
};

export const validateKey = async (config: ApiKeyConfig): Promise<{ status: KeyStatus; error?: string }> => {
  let isValid = false;
  let errorMsg: string | undefined = undefined;

  try {
    if (config.provider === 'Google Gemini') {
      const result = await validateGeminiKey(config.key);
      isValid = result.isValid;
      errorMsg = result.error;
    } else {
      isValid = await mockValidate(config.provider);
      if (!isValid) errorMsg = "Mock validation check failed (simulated).";
    }
  } catch (e: any) {
    isValid = false;
    errorMsg = `System Error: ${e.message || String(e)}`;
  }

  const newStatus: KeyStatus = isValid ? 'valid' : 'invalid';
  
  // Update status in DB
  const updatedConfig = { 
      ...config, 
      status: newStatus, 
      lastValidatedAt: new Date().toISOString(),
      errorMessage: errorMsg 
  };
  
  // Only update if it's stored (has an ID that implies persistence, though here we always assume so)
  await saveApiKey(updatedConfig);

  return { status: newStatus, error: errorMsg };
};

export const getBestApiKey = async (provider: ProviderName): Promise<string> => {
  const allKeys = await getApiKeys();
  const providerKeys = allKeys.filter(k => k.provider === provider && k.isActive && k.status !== 'invalid' && k.status !== 'expired' && k.status !== 'rate-limited');

  if (providerKeys.length === 0) {
    // Fallback: Check for environment variable if Gemini and no keys in DB
    if (provider === 'Google Gemini' && process.env.API_KEY) {
        return process.env.API_KEY;
    }
    throw new Error(`No active API keys found for provider: ${provider}`);
  }

  // 1. Try default key
  const defaultKey = providerKeys.find(k => k.isDefault);
  if (defaultKey) return defaultKey.key;

  // 2. Round-robin or random distribution (simple random for now)
  const randomIndex = Math.floor(Math.random() * providerKeys.length);
  return providerKeys[randomIndex].key;
};

export const reportKeyFailure = async (keyString: string, provider: ProviderName, errorType: 'rate-limit' | 'auth' | 'other') => {
  const allKeys = await getApiKeys();
  const keyConfig = allKeys.find(k => k.key === keyString && k.provider === provider);

  if (keyConfig) {
    let newStatus = keyConfig.status;
    if (errorType === 'auth') newStatus = 'invalid';
    if (errorType === 'rate-limit') newStatus = 'rate-limited';

    await saveApiKey({
      ...keyConfig,
      status: newStatus,
      errorMessage: `Automatically marked as ${newStatus} due to API error.`,
      lastValidatedAt: new Date().toISOString()
    });
    console.log(`Key ${keyConfig.label} marked as ${newStatus}`);
  }
};

// Wrapper to execute a function with key fallback
export const executeWithProviderFallback = async <T>(
  provider: ProviderName,
  operation: (apiKey: string) => Promise<T>
): Promise<T> => {
  const allKeys = await getApiKeys();
  let availableKeys = allKeys.filter(k => k.provider === provider && k.isActive && k.status === 'valid');

  // If no "valid" keys, look for "unchecked" or generic ones
  if (availableKeys.length === 0) {
     availableKeys = allKeys.filter(k => k.provider === provider && k.isActive && k.status !== 'invalid' && k.status !== 'expired' && k.status !== 'rate-limited');
  }

  // If absolutely no DB keys, try env for Gemini
  if (availableKeys.length === 0 && provider === 'Google Gemini' && process.env.API_KEY) {
     try {
         return await operation(process.env.API_KEY);
     } catch (e: any) {
         throw e;
     }
  }

  if (availableKeys.length === 0) {
    throw new Error(`No available keys for ${provider}. Please configure them in Settings.`);
  }

  // Sort by default first, then usage or random
  availableKeys.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));

  let lastError: any;

  for (const keyConfig of availableKeys) {
    try {
      // Increment usage count locally (optimistic)
      keyConfig.usageCount = (keyConfig.usageCount || 0) + 1;
      saveApiKey(keyConfig); // Fire and forget save

      return await operation(keyConfig.key);
    } catch (error: any) {
      lastError = error;
      console.warn(`Operation failed with key ${keyConfig.label}:`, error);

      const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota exceeded');
      const isAuthError = error.status === 401 || error.status === 403 || error.message?.includes('401') || error.message?.includes('API key not valid');

      if (isRateLimit) {
        await reportKeyFailure(keyConfig.key, provider, 'rate-limit');
      } else if (isAuthError) {
        await reportKeyFailure(keyConfig.key, provider, 'auth');
      } else {
        // If it's a generic error (500), maybe don't invalidate the key immediately, but try next
      }
      // Continue to next key
    }
  }

  throw new Error(`All keys failed for ${provider}. Last error: ${lastError?.message}`);
};
