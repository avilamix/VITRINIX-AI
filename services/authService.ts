// In a real application, this would integrate with Firebase Authentication or a similar service.
// For this frontend-only app, these are mock functions.

import { UserProfile } from '../types';
import { MOCK_API_DELAY } from '../constants';
import { getUserProfile } from './firestoreService';

let currentUserId: string | null = 'mock-user-123'; // Simulate a logged-in user

export const loginWithGoogle = async (): Promise<UserProfile> => {
  console.log('Simulating Google login...');
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY)); // Simulate network delay

  currentUserId = 'mock-user-123'; // Always return the same mock user for simplicity
  console.log('Mock user logged in:', currentUserId);
  const profile = await getUserProfile(currentUserId); // Ensure profile exists/is fetched
  if (!profile) throw new Error('Failed to get mock user profile after login.');
  return profile;
};

export const logout = async (): Promise<void> => {
  console.log('Simulating logout...');
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  currentUserId = null;
  console.log('Mock user logged out.');
};

export const getCurrentUser = async (): Promise<UserProfile | null> => {
  console.log('Simulating getting current user...');
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  if (currentUserId) {
    return getUserProfile(currentUserId);
  }
  return null;
};