

import { ApiKeyConfig, ProviderName, KeyStatus } from '../types';
import { GoogleGenAI } from '@google/genai';
import { getFirebaseIdToken, getActiveOrganization } from './authService';

const BACKEND_URL = 'http://localhost:3000'; // Backend URL

// Helper para obter o ID da organização ativa
const getActiveOrganizationId = (): string => {
  const activeOrg = getActiveOrganization();
  if (!activeOrg) {
    throw new Error('No active organization found. Please login and select an organization.');
  }
  return activeOrg.organization.id;
};

// MOCK: Validates an API key against its provider via Backend
export const validateKey = async (config: ApiKeyConfig): Promise<{ status: KeyStatus; error?: string }> => {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  try {
    const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Backend validation failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('Error validating key via backend:', error);
    return { status: 'invalid', error: `Validation failed: ${error.message}` };
  }
};

// MOCK: Retrieves the "best" API key for a given provider, applying fallback logic.
// This function will primarily be used by frontend-only components (like Live Conversation)
// if direct backend proxy is not feasible/implemented for that specific interaction.
// Otherwise, the backend's AiProxyService handles key selection internally.
export const getBestApiKey = async (providerName: ProviderName): Promise<string> => {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  try {
    const response = await fetch(`${BACKEND_URL}/api-keys/${organizationId}/best-key?provider=${encodeURIComponent(providerName)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to get best API key from backend: ${response.statusText}`);
    }

    const data = await response.json();
    return data.key; // Backend should return the decrypted key string
  } catch (error: any) {
    console.error(`Error fetching best API key for ${providerName} from backend:`, error);
    // Fallback if backend call fails (e.g., backend down, no keys configured)
    if (providerName === 'Google Gemini' && process.env.API_KEY) {
      console.warn(`Falling back to process.env.API_KEY for Google Gemini.`);
      return process.env.API_KEY;
    }
    throw new Error(`No active API key found for ${providerName}. Please configure them.`);
  }
};


/**
 * MOCK: Executes an AI operation with fallback logic across multiple API keys for a given provider.
 * This is primarily for frontend components that *must* make direct API calls (e.g., Live API).
 * Most other AI operations should go through the backend's AI Proxy service.
 * @param providerName The name of the AI provider.
 * @param operation A callback function that performs the AI operation with an API key.
 * @returns The result of the successful operation.
 * @throws Error if all API keys fail.
 */
export const executeWithProviderFallback = async <T>(
  providerName: ProviderName,
  operation: (apiKey: string) => Promise<T>,
): Promise<T> => {
  // In this refactored architecture, this function is *only* for non-proxied frontend interactions.
  // The primary method for most AI calls should be via the backend's AI Proxy.
  // For Gemini, we will attempt to get a key from the backend, then fall back to process.env.API_KEY.
  
  let keyToUse: string | undefined;
  try {
    keyToUse = await getBestApiKey(providerName);
  } catch (e) {
    console.warn(`Could not get best API key from backend for ${providerName}: ${e.message}`);
    if (providerName === 'Google Gemini' && process.env.API_KEY) {
      keyToUse = process.env.API_KEY;
    } else {
      throw new Error(`No API key available for ${providerName}. Please ensure it's configured and valid.`);
    }
  }

  if (!keyToUse) {
    throw new Error(`No API key available for ${providerName}.`);
  }

  // Execute the operation with the obtained key
  try {
    const result = await operation(keyToUse);
    console.log(`Operation successful with key for ${providerName}.`);
    return result;
  } catch (error: any) {
    console.error(`Direct frontend operation failed for ${providerName} with key: ${error.message}`);
    // In a real scenario, this would trigger more complex fallback logic or re-validation.
    // For now, we simply re-throw as the backend should handle multi-key fallback.
    throw new Error(`Frontend AI operation failed for ${providerName}: ${error.message}`);
  }
};
