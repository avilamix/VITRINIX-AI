
// In a real application, this would integrate with Firebase Authentication or a similar service.
// For this frontend-only app, these are mock functions.

import { UserProfile, LoginResponseDto, OrganizationMembership } from '../types';
import { MOCK_API_DELAY } from '../constants';
import { getUserProfile } from './firestoreService';

// TODO: Em um sistema real, a URL do backend viria de uma variável de ambiente ou configuração global
const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento

let currentUserId: string | null = 'mock-user-123'; // Simulate a logged-in user
let currentUserProfile: UserProfile | null = null;

// Initialize with a default mock organization so getActiveOrganization() works immediately
let currentUserOrganizations: OrganizationMembership[] = [
  {
    organization: {
      id: 'mock-org-default',
      name: 'Minha Organização',
      fileSearchStoreName: undefined
    },
    role: 'ADMIN'
  }
];

// MOCK para obter o token do Firebase (deveria vir do SDK do Firebase Auth no frontend)
const getFirebaseIdToken = async (): Promise<string> => {
  // Retorna um token mock para a demo.
  // Em produção, você usaria firebase.auth().currentUser.getIdToken()
  return 'mock-firebase-id-token'; 
};

export const loginWithGoogle = async (): Promise<UserProfile> => {
  console.log('Simulating Google login...');
  // await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY)); // Simulate network delay
  
  const idToken = await getFirebaseIdToken(); // Obter o token do Firebase

  try {
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      // Fallback for frontend-only demo if backend is down
      console.warn("Backend login failed, using local mock.");
      throw new Error("Backend unavailable");
    }

    const data: LoginResponseDto = await response.json();
    currentUserId = data.user.id;
    
    currentUserProfile = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      plan: 'premium', // MOCK: Assumindo premium após login para demo
      businessProfile: currentUserProfile?.businessProfile || { // Keep existing business profile if any
        name: 'Minha Empresa', industry: 'Marketing Digital', targetAudience: 'Pequenas e Médias Empresas', visualStyle: 'moderno'
      },
    };
    currentUserOrganizations = data.organizations;

    console.log('User logged in via backend:', currentUserId, currentUserOrganizations);
    if (!currentUserProfile) throw new Error('Failed to get user profile after login.');
    return currentUserProfile;

  } catch (error) {
    console.warn('Backend login failed, proceeding with mock session:', error);
    // Ensure profile exists in mock
    if (!currentUserProfile) {
        const profile = await getUserProfile(currentUserId!);
        currentUserProfile = profile || {
            id: currentUserId!,
            email: 'mock@example.com',
            plan: 'premium',
            businessProfile: { name: 'Minha Empresa', industry: 'Tech', targetAudience: 'Everyone', visualStyle: 'Modern' }
        };
    }
    return currentUserProfile!;
  }
};

export const logout = async (): Promise<void> => {
  console.log('Simulating logout...');
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  currentUserId = null;
  currentUserProfile = null;
  // Don't clear organizations to keep the app usable in demo mode without relogin
  // currentUserOrganizations = []; 
  console.log('Mock user logged out.');
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  // console.log('Simulating getting current user...');
  // await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  if (currentUserId && !currentUserProfile) {
    // If we have a currentUserId but no profile, try to fetch it
    // In a real app, this would be a backend call to /profile
    const profile = await getUserProfile(currentUserId);
    if (profile) {
      currentUserProfile = profile;
    }
  }
  return currentUserProfile;
};

// NOVO: Obter a organização ativa (ou a primeira)
export const getActiveOrganization = (): OrganizationMembership | undefined => {
  // Para fins de demo, retorna a primeira organização ou undefined
  return currentUserOrganizations.length > 0 ? currentUserOrganizations[0] : undefined;
};

// Exporte o getFirebaseIdToken para ser usado por outros serviços
export { getFirebaseIdToken };
