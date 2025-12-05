
import { UserProfile, LoginResponseDto, OrganizationMembership } from '../types';
import { MOCK_API_DELAY } from '../constants';
import { getUserProfile } from './firestoreService';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento

let currentUserId: string | null = 'mock-user-123'; // Default to mock for initial load/demo
let currentUserProfile: UserProfile | null = null;

// Initialize with a default mock organization
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

// Get the actual Firebase ID token from the current user
const getFirebaseIdToken = async (): Promise<string> => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  // Fallback to mock token if not logged in (e.g., demo mode or initial load)
  // console.warn("No authenticated user found, using mock token.");
  return 'mock-firebase-id-token'; 
};

export const loginWithGoogle = async (): Promise<UserProfile> => {
  console.log('Initiating Google login...');
  const provider = new GoogleAuthProvider();

  try {
    // 1. Client-side authentication with Firebase
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();

    // 2. Exchange token with backend for app-specific profile & organizations
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      console.warn("Backend login failed (Backend might be offline), falling back to local session based on Firebase User.");
      // Fallback: Create a local profile based on Firebase data
      currentUserId = firebaseUser.uid;
      currentUserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'User',
        plan: 'free', 
        businessProfile: {
            name: 'Minha Empresa',
            industry: 'Geral',
            targetAudience: 'Todos',
            visualStyle: 'Padrão'
        }
      };
      return currentUserProfile;
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

    console.log('User logged in successfully:', currentUserId);
    return currentUserProfile;

  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  console.log('Logging out...');
  try {
      await signOut(auth);
  } catch(e) {
      console.warn("Firebase signout error", e);
  }

  currentUserId = null;
  currentUserProfile = null;
  // currentUserOrganizations = []; // Optionally clear organizations
  console.log('User logged out.');
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  if (currentUserId && !currentUserProfile) {
    // Try to fetch profile if ID is set but profile is missing
    const profile = await getUserProfile(currentUserId);
    if (profile) {
      currentUserProfile = profile;
    }
  }
  return currentUserProfile;
};

export const getActiveOrganization = (): OrganizationMembership | undefined => {
  return currentUserOrganizations.length > 0 ? currentUserOrganizations[0] : undefined;
};

export { getFirebaseIdToken };
