

export interface TranscriptionSegment {
  text: string;
  isFinal: boolean;
}

// Define BusinessProfile interface
export interface BusinessProfile {
  name: string;
  industry: string;
  targetAudience: string;
  visualStyle: string;
}

// Define UserProfile interface
export interface UserProfile {
  id: string;
  email: string;
  name?: string; // Added name property
  plan: 'free' | 'premium';
  businessProfile: BusinessProfile;
}

// Define Post interface
export interface Post {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  contentText: string; // Renamed from content_text
  imageUrl?: string; // Renamed from image_url
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
  tags?: string[];
}

// Define Ad interface
export interface Ad {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'Google' | 'Pinterest';
  headline: string;
  copy: string;
  mediaUrl?: string; // Renamed from media_url
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
}

// Define Campaign interface
export interface Campaign {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  name: string;
  type: string; // e.g., 'general', 'product_launch'
  videoUrl?: string; // Renamed from video_url
  timeline: string;
  generatedPosts?: Array<{ contentText: string; keywords: string[] }>; // JSON type
  generatedAds?: Array<{ platform: string; headline: string; copy: string }>; // JSON type
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
}

// Define Trend interface
export interface Trend {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  query: string;
  score: number; // e.g., viral score
  data: string; // summary of the trend
  sources?: Array<{ uri: string; title?: string }>; // 'title' optional
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
}

// Define LibraryItem interface
export interface LibraryItem {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  type: 'image' | 'video' | 'text' | 'post' | 'ad' | 'audio'; // Added 'audio' type
  fileUrl: string; // Renamed from file_url
  thumbnailUrl?: string; // Renamed from thumbnail_url, For images/videos
  tags: string[];
  name: string;
  createdAt: Date; // Changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
}

// Define ScheduleEntry interface
export interface ScheduleEntry {
  id: string;
  organizationId: string; // NEW: Added organizationId
  userId: string;
  datetime: Date; // Changed from string to Date (ISO date string for scheduling)
  platform: string; // e.g., 'Instagram', 'Facebook'
  contentId: string; // Reference to LibraryItem ID or Post/Ad ID
  contentType: 'post' | 'ad' | 'audio' | 'video' | 'image' | 'text'; // Added types for content
  status: 'scheduled' | 'published' | 'failed';
  createdAt: Date; // NEW: Added createdAt, changed from string to Date
  updatedAt: Date; // NEW: Added updatedAt, changed from string to Date
  libraryItemName?: string; // Added for convenience
  libraryItemThumbnailUrl?: string; // Added for convenience
}

// Define ChatMessage interface for Chatbot
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string; // ISO date string
}

// --- API Key Management Types ---

export type ProviderName =
  | 'Google Gemini'
  | 'OpenAI'
  | 'Anthropic'
  | 'Mistral'
  | 'Groq'
  | 'DeepSeek'
  | 'Cohere'
  | 'Meta LLaMA'
  | 'Replicate'
  | 'Hugging Face'
  | 'Together AI';

export type KeyStatus = 'valid' | 'invalid' | 'expired' | 'rate-limited' | 'unchecked';

export interface ApiKeyConfig {
  id: string;
  provider: ProviderName;
  key: string; // Stored "encrypted" in backend, plaintext here for mock
  label: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  lastValidatedAt?: string;
  status: KeyStatus;
  errorMessage?: string;
  usageCount: number;
}

export interface ApiKeySystemConfig {
  defaultProvider: ProviderName;
}

// FIX: Define AIStudio interface explicitly to avoid type conflicts
// This interface is exported for use within the module context.
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// NEW: Interface for RAG query response from backend
export interface KnowledgeBaseQueryResponse {
  resposta: string;
  arquivos_usados: string[];
  trechos_referenciados: string[];
  confianca: number;
}

// NEW: Backend DTOs for communication
export interface OrganizationResponseDto {
  id: string;
  name: string;
  fileSearchStoreName?: string; // Optional, name of associated File Search store
}

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER'; // Assuming Prisma Role enum

export interface OrganizationMembership {
  organization: OrganizationResponseDto;
  role: Role;
}

export interface LoginResponseDto {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  organizations: OrganizationMembership[];
}
// REMOVED Global declaration to avoid conflict with duplicate declaration in other files.
// declare global {
//   interface Window {
//     aistudio?: AIStudio;
//   }
// }