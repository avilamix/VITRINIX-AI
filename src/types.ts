export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  platform: 'Google' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'TikTok';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate (%)
  cvr: number; // Conversion rate (%)
  roi: number; // Return on investment (ratio)
  startDate: string;
}

export interface DailyMetric {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  engagementRate: number;
}

export interface DashboardGoal {
  ctr: number;
  cvr: number;
  roi: number;
}
