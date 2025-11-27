
import { ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { getApiKeys, saveApiKey } from './firestoreService';
import { GoogleGenAI } from '@google/genai';

// Mock validation for other providers
const mockValidate = async (provider: ProviderName): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  // Randomly fail 5% of the time for demo purposes
  return Math.random() > 0.05;
};

// Real-ish validation for Gemini
const validateGeminiKey = async (key: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    // Try a very cheap call, like getting a model info or a simple generate
    // Note: models.get is deprecated in new SDK, using a simple generate call on flash
    await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
    });
    return true;
  } catch (error) {
    console.warn("Gemini Validation Failed:", error);
    return false;
  }
};

export const validateKey = async (config: ApiKeyConfig): Promise<{ status: KeyStatus; error?: string }> => {
  let isValid = false;
  let errorMsg = undefined;

  try {
    if (config.provider === 'Google Gemini') {
      isValid = await validateGeminiKey(config.key);
    } else {
      isValid = await mockValidate(config.provider);
    }

    if (!isValid) {
        errorMsg = 'Validation failed: Invalid key or network error.';
    }
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  const newStatus: KeyStatus = isValid ? 'valid' : 'invalid';
  
  // Update status in DB
  const updatedConfig = { 
      ...config, 
      status: newStatus, 
      lastValidatedAt: new Date().toISOString(),
      errorMessage: errorMsg 
  };
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
