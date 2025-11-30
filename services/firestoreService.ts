

import { UserProfile, Post, Ad, Campaign, Trend, LibraryItem, ScheduleEntry, ApiKeyConfig, OrganizationMembership } from '../types';
import { MOCK_API_DELAY, DEFAULT_BUSINESS_PROFILE } from '../constants';
import { getFirebaseIdToken, getActiveOrganization } from './authService';

// TODO: Em um sistema real, a URL do backend viria de uma variável de ambiente ou configuração global
const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento

// Helper para obter o ID da organização ativa (Centralizado aqui)
export const getActiveOrganizationId = (): string => { // FIX: Exported for shared use
  const activeOrg: OrganizationMembership | undefined = getActiveOrganization();
  if (!activeOrg) {
    throw new Error('No active organization found. Please login and select an organization.');
  }
  return activeOrg.organization.id;
};

// Helper genérico para fazer requisições ao backend
async function fetchBackend<T>(
  entityPath: string,
  method: string = 'GET',
  body?: any,
): Promise<T> {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/${entityPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Backend call to ${entityPath} failed: ${response.statusText}`);
  }
  return response.json();
}

// --- User Profile Operations ---
// User profile é gerenciado pelo authService e a resposta de login.
// O backend ainda não tem um endpoint específico para "profile", então mantém mock por enquanto
// ou buscaria dados do usuário diretamente do `auth/me` endpoint.
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  // Simula o perfil do usuário, deve ser substituído por um endpoint de perfil do backend
  console.log(`Simulating fetching user profile for: ${userId}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY));
  return {
    id: userId,
    email: 'mock-user@vitrinex.com',
    name: 'Mock User',
    plan: 'premium',
    businessProfile: DEFAULT_BUSINESS_PROFILE,
  };
};

export const updateUserProfile = async (userId: string, profile: Partial<UserProfile['businessProfile']>): Promise<void> => { // FIX: Corrected profile type
  // Simula atualização do perfil do usuário, deve ser substituído por um endpoint de perfil do backend
  console.log(`Simulating updating user profile for: ${userId}`, profile);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY));
  // Em um backend real, enviaria `profile.businessProfile` para um endpoint `/users/:id/profile`
};


// --- Post Operations ---
export const savePost = async (post: Post): Promise<Post> => {
  const isUpdate = !!post.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `posts/${post.id}` : 'posts';
  return fetchBackend<Post>(entityPath, method, post);
};

// FIX: Removed userId argument
export const getPosts = async (): Promise<Post[]> => {
  return fetchBackend<Post[]>('posts');
};

export const deletePost = async (postId: string): Promise<void> => {
  return fetchBackend<void>(`posts/${postId}`, 'DELETE');
};

// --- Ad Operations ---
export const saveAd = async (ad: Ad): Promise<Ad> => {
  const isUpdate = !!ad.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `ads/${ad.id}` : 'ads';
  return fetchBackend<Ad>(entityPath, method, ad);
};

// FIX: Removed userId argument
export const getAds = async (): Promise<Ad[]> => {
  return fetchBackend<Ad[]>('ads');
};

export const deleteAd = async (adId: string): Promise<void> => {
  return fetchBackend<void>(`ads/${adId}`, 'DELETE');
};

// --- Campaign Operations ---
export const saveCampaign = async (campaign: Campaign): Promise<Campaign> => {
  const isUpdate = !!campaign.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `campaigns/${campaign.id}` : 'campaigns';
  return fetchBackend<Campaign>(entityPath, method, campaign);
};

// FIX: Removed userId argument
export const getCampaigns = async (): Promise<Campaign[]> => {
  return fetchBackend<Campaign[]>('campaigns');
};

export const deleteCampaign = async (campaignId: string): Promise<void> => {
  return fetchBackend<void>(`campaigns/${campaignId}`, 'DELETE');
};

// --- Trend Operations ---
export const saveTrend = async (trend: Trend): Promise<Trend> => {
  const isUpdate = !!trend.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `trends/${trend.id}` : 'trends';
  return fetchBackend<Trend>(entityPath, method, trend);
};

// FIX: Removed userId argument
export const getTrends = async (): Promise<Trend[]> => {
  return fetchBackend<Trend[]>('trends');
};

export const deleteTrend = async (trendId: string): Promise<void> => {
  return fetchBackend<void>(`trends/${trendId}`, 'DELETE');
};

// --- LibraryItem Operations (agora gerenciado pelo módulo Files no backend) ---

/**
 * Uploads a file to the backend and creates a new LibraryItem entry.
 */
export const uploadFileAndCreateLibraryItemViaBackend = async (
  organizationId: string,
  userId: string, // Frontend provides, but backend will infer from auth
  file: File,
  name: string,
  type: LibraryItem['type'],
  tags: string[],
): Promise<LibraryItem> => {
  const idToken = await getFirebaseIdToken();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('type', type);
  formData.append('tags', tags.join(','));

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      // 'Content-Type': 'multipart/form-data' is automatically set by browser for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `File upload failed: ${response.statusText}`);
  }
  const uploadedItem = await response.json();
  // Map the backend response DTO to frontend LibraryItem type
  return {
    id: uploadedItem.id,
    organizationId: uploadedItem.organizationId,
    userId: uploadedItem.userId,
    name: uploadedItem.name,
    type: uploadedItem.type,
    fileUrl: uploadedItem.fileUrl,
    thumbnailUrl: uploadedItem.thumbnailUrl,
    tags: uploadedItem.tags,
    createdAt: new Date(uploadedItem.createdAt),
    updatedAt: new Date(uploadedItem.updatedAt),
  };
};

export const saveLibraryItem = async (item: LibraryItem): Promise<LibraryItem> => {
  const isUpdate = !!item.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `files/${item.id}` : 'files';
  return fetchBackend<LibraryItem>(entityPath, method, item);
};

// FIX: getLibraryItems now accepts filters directly, not userId
export const getLibraryItems = async (filters?: { tags?: string[]; type?: string; searchTerm?: string }): Promise<LibraryItem[]> => {
  const organizationId = getActiveOrganizationId();
  const idToken = await getFirebaseIdToken();
  const queryParams = new URLSearchParams();
  if (filters?.tags && filters.tags.length > 0) {
    queryParams.append('tags', filters.tags.join(','));
  }
  if (filters?.type) {
    queryParams.append('type', filters.type);
  }
  if (filters?.searchTerm) {
    queryParams.append('searchTerm', filters.searchTerm);
  }

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/files?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `Backend call to files failed: ${response.statusText}`);
  }
  return response.json();
};

export const getLibraryItemById = async (itemId: string): Promise<LibraryItem> => {
  return fetchBackend<LibraryItem>(`files/${itemId}`, 'GET');
};

export const deleteLibraryItem = async (itemId: string): Promise<void> => {
  return fetchBackend<void>(`files/${itemId}`, 'DELETE');
};

// --- ScheduleEntry Operations ---
export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<ScheduleEntry> => {
  const isUpdate = !!entry.id;
  const method = isUpdate ? 'PATCH' : 'POST';
  const entityPath = isUpdate ? `schedules/${entry.id}` : 'schedules';
  return fetchBackend<ScheduleEntry>(entityPath, method, entry);
};

// FIX: Removed userId argument
export const getScheduleEntries = async (): Promise<ScheduleEntry[]> => {
  return fetchBackend<ScheduleEntry[]>('schedules');
};

export const deleteScheduleEntry = async (entryId: string): Promise<void> => {
  return fetchBackend<void>(`schedules/${entryId}`, 'DELETE');
};

// --- API Key Management Operations ---
// REMOVIDO: API Keys agora são gerenciadas pelo backend via keyManagerService
export const getApiKeys = async (): Promise<ApiKeyConfig[]> => {
  return Promise.resolve([]);
};

export const saveApiKey = async (apiKey: ApiKeyConfig): Promise<ApiKeyConfig> => {
  console.warn("saveApiKey chamado no frontend, mas chaves devem ser gerenciadas pelo backend.");
  return Promise.resolve(apiKey);
};

export const deleteApiKey = async (keyId: string): Promise<void> => {
  console.warn("deleteApiKey chamado no frontend, mas chaves devem ser gerenciadas pelo backend.");
  return Promise.resolve();
};