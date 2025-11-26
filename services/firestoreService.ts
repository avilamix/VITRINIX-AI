import { UserProfile, Post, Ad, Campaign, Trend, LibraryItem, ScheduleEntry } from '../types';
import { MOCK_API_DELAY, DEFAULT_BUSINESS_PROFILE } from '../constants';

// In a real application, this would interact with a backend service (e.g., Cloud Functions)
// which then interacts with Google Firestore.
// For this frontend-only app, these are mock functions.

const mockDb = {
  users: {
    'mock-user-123': {
      id: 'mock-user-123',
      email: 'user@example.com',
      plan: 'premium',
      businessProfile: DEFAULT_BUSINESS_PROFILE,
    } as UserProfile,
  },
  posts: {} as { [id: string]: Post },
  ads: {} as { [id: string]: Ad },
  campaigns: {} as { [id: string]: Campaign },
  trends: {} as { [id: string]: Trend },
  library: {} as { [id: string]: LibraryItem },
  schedule: {} as { [id: string]: ScheduleEntry },
};

// Generic mock function to simulate Firestore operations
async function mockFirestoreOperation<T>(operation: () => T | Promise<T>): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, MOCK_API_DELAY));
  return await operation();
}

// --- User Profile Operations ---
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  console.log(`Simulating fetching user profile for: ${userId}`);
  return mockFirestoreOperation(() => {
    const user = mockDb.users[userId];
    if (!user) {
      // Create a default profile if not found
      mockDb.users[userId] = {
        id: userId,
        email: 'mock-user@vitrinex.com',
        plan: 'free',
        businessProfile: DEFAULT_BUSINESS_PROFILE,
      };
      console.log('Created default user profile for mock user.');
      return mockDb.users[userId];
    }
    return user;
  });
};

export const updateUserProfile = async (userId: string, profile: Partial<UserProfile>): Promise<void> => {
  console.log(`Simulating updating user profile for: ${userId}`, profile);
  return mockFirestoreOperation(() => {
    if (mockDb.users[userId]) {
      mockDb.users[userId] = { ...mockDb.users[userId], ...profile };
      console.log('User profile updated (mock).');
    } else {
      console.warn(`User profile for ${userId} not found (mock).`);
    }
  });
};

// --- Content (Posts, Ads, Campaigns, Trends, Library, Schedule) Operations ---
export const savePost = async (post: Post): Promise<Post> => {
  console.log('Simulating saving post:', post);
  return mockFirestoreOperation(() => {
    if (!post.id) post.id = `post-${Date.now()}`;
    mockDb.posts[post.id] = post;
    console.log('Post saved (mock).');
    return post;
  });
};

export const getPosts = async (userId: string): Promise<Post[]> => {
  console.log(`Simulating fetching posts for: ${userId}`);
  return mockFirestoreOperation(() => Object.values(mockDb.posts).filter(p => p.userId === userId));
};

export const saveAd = async (ad: Ad): Promise<Ad> => {
  console.log('Simulating saving ad:', ad);
  return mockFirestoreOperation(() => {
    if (!ad.id) ad.id = `ad-${Date.now()}`;
    mockDb.ads[ad.id] = ad;
    console.log('Ad saved (mock).');
    return ad;
  });
};

export const getAds = async (userId: string): Promise<Ad[]> => {
  console.log(`Simulating fetching ads for: ${userId}`);
  return mockFirestoreOperation(() => Object.values(mockDb.ads).filter(a => a.userId === userId));
};

export const saveCampaign = async (campaign: Campaign): Promise<Campaign> => {
  console.log('Simulating saving campaign:', campaign);
  return mockFirestoreOperation(() => {
    if (!campaign.id) campaign.id = `campaign-${Date.now()}`;
    mockDb.campaigns[campaign.id] = campaign;
    console.log('Campaign saved (mock).');
    return campaign;
  });
};

export const getCampaigns = async (userId: string): Promise<Campaign[]> => {
  console.log(`Simulating fetching campaigns for: ${userId}`);
  return mockFirestoreOperation(() => Object.values(mockDb.campaigns).filter(c => c.userId === userId));
};

export const saveTrend = async (trend: Trend): Promise<Trend> => {
  console.log('Simulating saving trend:', trend);
  return mockFirestoreOperation(() => {
    if (!trend.id) trend.id = `trend-${Date.now()}`;
    mockDb.trends[trend.id] = trend;
    console.log('Trend saved (mock).');
    return trend;
  });
};

export const getTrends = async (userId: string): Promise<Trend[]> => {
  console.log(`Simulating fetching trends for: ${userId}`);
  return mockFirestoreOperation(() => Object.values(mockDb.trends).filter(t => t.userId === userId));
};


export const saveLibraryItem = async (item: LibraryItem): Promise<LibraryItem> => {
  console.log('Simulating saving library item:', item);
  return mockFirestoreOperation(() => {
    if (!item.id) item.id = `lib-${Date.now()}`;
    mockDb.library[item.id] = item;
    console.log('Library item saved (mock).');
    return item;
  });
};

export const getLibraryItems = async (userId: string, tags?: string[]): Promise<LibraryItem[]> => {
  console.log(`Simulating fetching library items for: ${userId}, tags: ${tags}`);
  return mockFirestoreOperation(() => {
    let items = Object.values(mockDb.library).filter(item => item.userId === userId);
    if (tags && tags.length > 0) {
      items = items.filter(item => tags.some(tag => item.tags.includes(tag)));
    }
    return items;
  });
};

export const deleteLibraryItem = async (itemId: string): Promise<void> => {
  console.log(`Simulating deleting library item: ${itemId}`);
  return mockFirestoreOperation(() => {
    if (mockDb.library[itemId]) {
      delete mockDb.library[itemId];
      console.log(`Library item ${itemId} deleted (mock).`);
    } else {
      console.warn(`Library item ${itemId} not found for deletion (mock).`);
    }
  });
};

export const saveScheduleEntry = async (entry: ScheduleEntry): Promise<ScheduleEntry> => {
  console.log('Simulating saving schedule entry:', entry);
  return mockFirestoreOperation(() => {
    if (!entry.id) entry.id = `schedule-${Date.now()}`;
    mockDb.schedule[entry.id] = entry;
    console.log('Schedule entry saved (mock).');
    return entry;
  });
};

export const getScheduleEntries = async (userId: string): Promise<ScheduleEntry[]> => {
  console.log(`Simulating fetching schedule entries for: ${userId}`);
  return mockFirestoreOperation(() => Object.values(mockDb.schedule).filter(s => s.userId === userId));
};

export const deleteScheduleEntry = async (entryId: string): Promise<void> => {
  console.log(`Simulating deleting schedule entry: ${entryId}`);
  return mockFirestoreOperation(() => {
    if (mockDb.schedule[entryId]) {
      delete mockDb.schedule[entryId];
      console.log(`Schedule entry ${entryId} deleted (mock).`);
    } else {
      console.warn(`Schedule entry ${entryId} not found for deletion (mock).`);
    }
  });
};