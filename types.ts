

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
  plan: 'free' | 'premium';
  businessProfile: BusinessProfile;
}

// Define Post interface
export interface Post {
  id: string;
  userId: string;
  content_text: string;
  image_url?: string;
  createdAt: string; // ISO date string
  tags?: string[];
}

// Define Ad interface
export interface Ad {
  id: string;
  userId: string;
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'Google' | 'Pinterest';
  headline: string;
  copy: string;
  media_url?: string;
  createdAt: string; // ISO date string
}

// Define Campaign interface
export interface Campaign {
  id: string;
  userId: string;
  name: string;
  type: string; // e.g., 'general', 'product_launch'
  posts: Post[];
  ads: Ad[];
  video_url?: string;
  timeline: string;
  createdAt: string; // ISO date string
}

// Define Trend interface
export interface Trend {
  id: string;
  userId: string;
  query: string;
  score: number; // e.g., viral score
  data: string; // summary of the trend
  sources?: Array<{ uri: string; title: string }>;
  createdAt: string; // ISO date string
}

// Define LibraryItem interface
export interface LibraryItem {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'text' | 'post' | 'ad' | 'audio'; // Added 'audio' type
  file_url: string;
  thumbnail_url?: string; // For images/videos
  tags: string[];
  name: string;
  createdAt: string; // ISO date string
}

// Define ScheduleEntry interface
export interface ScheduleEntry {
  id: string;
  userId: string;
  datetime: string; // ISO date string for scheduling
  platform: string; // e.g., 'Instagram', 'Facebook'
  contentId: string; // Reference to LibraryItem ID or Post/Ad ID
  contentType: 'post' | 'ad' | 'audio' | 'video' | 'image' | 'text'; // Added types for content
  status: 'scheduled' | 'published' | 'failed';
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
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// REMOVED Global declaration to avoid conflict with src/types.ts
