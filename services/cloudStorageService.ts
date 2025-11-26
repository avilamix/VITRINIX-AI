import { LibraryItem } from '../types';
import { MOCK_API_DELAY } from '../constants';

// In a real application, this would interact with a backend service (e.g., Cloud Functions)
// which then interacts with Google Cloud Storage.
// For this frontend-only app, these are mock functions.

const mockStorage: { [key: string]: string } = {}; // Simulates stored file URLs

export const uploadFile = async (file: File, userId: string, type: LibraryItem['type']): Promise<LibraryItem> => {
  console.log(`Simulating upload of file: ${file.name} for user ${userId}, type: ${type}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY)); // Simulate network delay

  const fileUrl = `https://picsum.photos/400/300?random=${Date.now()}`; // Placeholder image URL
  const itemId = `lib-${Date.now()}`;
  mockStorage[itemId] = fileUrl;

  const newItem: LibraryItem = {
    id: itemId,
    userId: userId,
    type: type,
    file_url: fileUrl,
    thumbnail_url: type === 'image' || type === 'video' ? fileUrl : undefined,
    tags: [],
    name: file.name,
    createdAt: new Date().toISOString(),
  };

  console.log('File uploaded (mock):', newItem);
  return newItem;
};

export const getFileUrl = async (itemId: string): Promise<string | null> => {
  console.log(`Simulating fetching file URL for item: ${itemId}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  const url = mockStorage[itemId] || null;
  console.log(`Fetched URL (mock) for ${itemId}: ${url}`);
  return url;
};

export const deleteFile = async (itemId: string): Promise<void> => {
  console.log(`Simulating deletion of file for item: ${itemId}`);
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY / 2)); // Simulate network delay

  if (mockStorage[itemId]) {
    delete mockStorage[itemId];
    console.log(`File ${itemId} deleted (mock).`);
  } else {
    console.warn(`File ${itemId} not found in mock storage for deletion.`);
  }
};
