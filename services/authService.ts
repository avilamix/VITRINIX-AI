



// In a real application, this would integrate with Firebase Authentication or a similar service.
// For this frontend-only app, these are mock functions.

import { UserProfile, LoginResponseDto, OrganizationMembership, AIStudioClient } from '../types'; // FIX: Import AIStudioClient from types
import { MOCK_API_DELAY, DEFAULT_BUSINESS_PROFILE } from '../constants';

// TODO: Em um sistema real, a URL do backend viria de uma variável de ambiente ou configuração global
const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento

let currentUserId: string | null = null; // Changed to null, will be set on login/fetch
let currentUserProfile: UserProfile | null = null;
let currentUserOrganizations: OrganizationMembership[] = [];

// NEW: Helper to extract Firebase ID Token for backend communication
const getFirebaseIdToken = async (): Promise<string> => {
  if (window.aistudio && typeof (window.aistudio as unknown as AIStudioClient).getAuthToken === 'function') { // FIX: Cast to unknown first then AIStudioClient
    try {
      const token = await (window.aistudio as unknown as AIStudioClient).getAuthToken(); // FIX: Cast to unknown first then AIStudioClient
      if (token) return token;
    } catch (e) {
      console.warn("window.aistudio.getAuthToken failed, falling back to mock token.", e);
    }
  }
  // Fallback to a hardcoded mock token for local development if window.aistudio.getAuthToken is not available or fails.
  return 'mock-firebase-id-token'; 
};


export const loginWithGoogle = async (): Promise<UserProfile> => {
  console.log('Attempting Google login via backend...');
  
  const idToken = await getFirebaseIdToken(); // Obter o token do Firebase (mock ou real)

  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Login failed: ${response.statusText}`);
    }

    const data: LoginResponseDto = await response.json();
    currentUserId = data.user.id;
    
    // Constrói o perfil do usuário, adicionando o businessProfile padrão se não existir.
    // Em um sistema real, o businessProfile viria do backend também.
    currentUserProfile = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      plan: 'premium', // MOCK: Assumindo premium após login para demo
      businessProfile: DEFAULT_BUSINESS_PROFILE, // MOCK: Sempre usa o default por enquanto
    };
    currentUserOrganizations = data.organizations;

    console.log('User logged in via backend:', currentUserId, currentUserOrganizations);
    if (!currentUserProfile) throw new Error('Failed to get user profile after login.');
    return currentUserProfile;

  } catch (error) {
    console.error('Error during login:', error);
    throw new Error(`Failed to login: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const logout = async (): Promise<void> => {
  console.log('Simulating logout...');
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  currentUserId = null;
  currentUserProfile = null;
  currentUserOrganizations = [];
  console.log('Mock user logged out.');
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  console.log('Fetching current user from backend /auth/me...');
  
  const idToken = await getFirebaseIdToken();
  if (!idToken || idToken === 'mock-firebase-id-token') { // If no real token or still mock, cannot fetch real user
    console.warn("No valid Firebase ID token available. Cannot fetch current user from backend.");
    // Clear potentially stale local state if no token.
    currentUserId = null;
    currentUserProfile = null;
    currentUserOrganizations = [];
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      // If unauthorized or not found, assume session is invalid
      if (response.status === 401 || response.status === 404) {
        console.warn("User session invalid or not found on backend. Clearing local state.");
        currentUserId = null;
        currentUserProfile = null;
        currentUserOrganizations = [];
        return null;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || `Failed to fetch current user: ${response.statusText}`);
    }

    const data: LoginResponseDto = await response.json();
    currentUserId = data.user.id;
    currentUserProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        plan: 'premium', // MOCK: Assumindo premium após login para demo
        businessProfile: DEFAULT_BUSINESS_PROFILE, // MOCK: Sempre usa o default por enquanto, até o backend gerenciar
    };
    currentUserOrganizations = data.organizations;
    console.log('Current user fetched:', currentUserId, currentUserOrganizations);
    return currentUserProfile;

  } catch (error) {
    console.error('Error fetching current user:', error);
    // In case of any error, clear local state to prevent stale data
    currentUserId = null;
    currentUserProfile = null;
    currentUserOrganizations = [];
    throw new Error(`Failed to fetch current user session: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// NOVO: Obter a organização ativa (ou a primeira)
export const getActiveOrganization = (): OrganizationMembership | undefined => {
  // Para fins de demo, retorna a primeira organização ou undefined
  return currentUserOrganizations.length > 0 ? currentUserOrganizations[0] : undefined;
};

// Exporte o getFirebaseIdToken para ser usado por outros serviços
export { getFirebaseIdToken };
