import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  Plus, 
  Filter, 
  Calendar, 
  CheckCircle, 
  X, 
  Sliders, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Search,
  Check,
  Percent
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from 'recharts';
import { Campaign, DailyMetric, DashboardGoal } from '../types';

// ==========================================
// MOCK DATABASE & API SERVICE (React Query)
// ==========================================

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'c-1',
    name: 'Summer Clearance Push',
    status: 'active',
    platform: 'Instagram',
    spend: 4200,
    impressions: 125000,
    clicks: 6800,
    conversions: 340,
    ctr: 5.44,
    cvr: 5.0,
    roi: 3.2,
    startDate: '2026-06-01'
  },
  {
    id: 'c-2',
    name: 'Google Search - High Intent',
    status: 'active',
    platform: 'Google',
    spend: 8500,
    impressions: 95000,
    clicks: 8100,
    conversions: 486,
    ctr: 8.53,
    cvr: 6.0,
    roi: 4.1,
    startDate: '2026-05-15'
  },
  {
    id: 'c-3',
    name: 'B2B Tech Solutions Prospecting',
    status: 'active',
    platform: 'LinkedIn',
    spend: 6000,
    impressions: 48000,
    clicks: 1200,
    conversions: 48,
    ctr: 2.5,
    cvr: 4.0,
    roi: 1.8,
    startDate: '2026-06-10'
  },
  {
    id: 'c-4',
    name: 'Product Launch Video Blitz',
    status: 'completed',
    platform: 'TikTok',
    spend: 5000,
    impressions: 340000,
    clicks: 18500,
    conversions: 555,
    ctr: 5.44,
    cvr: 3.0,
    roi: 2.9,
    startDate: '2026-05-01'
  },
  {
    id: 'c-5',
    name: 'Retargeting Catalog Ads',
    status: 'active',
    platform: 'Facebook',
    spend: 3100,
    impressions: 78000,
    clicks: 4300,
    conversions: 258,
    ctr: 5.51,
    cvr: 6.0,
    roi: 3.8,
    startDate: '2026-06-05'
  },
  {
    id: 'c-6',
    name: 'Influencer Campaign - Brand Lift',
    status: 'paused',
    platform: 'Instagram',
    spend: 2500,
    impressions: 110000,
    clicks: 3900,
    conversions: 117,
    ctr: 3.55,
    cvr: 3.0,
    roi: 1.5,
    startDate: '2026-06-12'
  }
];

// Generates daily metrics over the last 30 days based on active campaigns
const generateDailyMetrics = (campaigns: Campaign[], numDays: number): DailyMetric[] => {
  const result: DailyMetric[] = [];
  const baseDate = new Date();
  
  for (let i = numDays - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - i);
    const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Aggregate data with slight random daily noise
    let totalImps = 0;
    let totalClicks = 0;
    let totalConvs = 0;
    
    campaigns.forEach(c => {
      // Divide metrics per day and add random variance
      const dailyFactor = 1 / numDays;
      const noise = 0.85 + Math.random() * 0.3; // ±15% noise
      
      totalImps += Math.round(c.impressions * dailyFactor * noise);
      totalClicks += Math.round(c.clicks * dailyFactor * noise);
      totalConvs += Math.round(c.conversions * dailyFactor * noise);
    });
    
    const ctr = totalImps > 0 ? Number(((totalClicks / totalImps) * 100).toFixed(2)) : 0;
    const cvr = totalClicks > 0 ? Number(((totalConvs / totalClicks) * 100).toFixed(2)) : 0;
    const engagementRate = totalImps > 0 ? Number((((totalClicks * 1.5 + totalConvs * 2) / totalImps) * 100).toFixed(2)) : 0;
    
    result.push({
      date: dateString,
      impressions: totalImps,
      clicks: totalClicks,
      conversions: totalConvs,
      ctr,
      cvr,
      engagementRate
    });
  }
  
  return result;
};

// In-memory campaign state
let databaseCampaigns = [...INITIAL_CAMPAIGNS];

// Simulation latency helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchMarketingData = async (platformFilter: string, days: number) => {
  await delay(400); // Simulate network latency
  
  const filteredCampaigns = platformFilter === 'All' 
    ? databaseCampaigns 
    : databaseCampaigns.filter(c => c.platform === platformFilter);
    
  const dailyMetrics = generateDailyMetrics(filteredCampaigns, days);
  
  return {
    campaigns: filteredCampaigns,
    dailyMetrics
  };
};

const addMockCampaign = async (campaign: Omit<Campaign, 'id' | 'ctr' | 'cvr' | 'roi'>) => {
  await delay(600); // Simulate network save
  
  const ctr = Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2));
  const cvr = Number(((campaign.conversions / campaign.clicks) * 100).toFixed(2));
  // Simple realistic ROI model: Conversions value minus cost
  const estimatedRevenue = campaign.conversions * 120; // Average order value $120
  const roi = Number((estimatedRevenue / campaign.spend).toFixed(1));
  
  const newCampaign: Campaign = {
    ...campaign,
    id: `c-${Date.now()}`,
    ctr,
    cvr,
    roi
  };
  
  databaseCampaigns = [newCampaign, ...databaseCampaigns];
  return newCampaign;
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  
  // States
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [timeframe, setTimeframe] = useState<number>(30); // 7, 30, 90 days
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  
  // Custom Goals State (with default values)
  const [goals, setGoals] = useState<DashboardGoal>({
    ctr: 5.0,
    cvr: 4.5,
    roi: 3.0
  });
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalInputs, setGoalInputs] = useState(goals);

  // New campaign form state
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignPlatform, setNewCampaignPlatform] = useState<Campaign['platform']>('Instagram');
  const [newCampaignSpend, setNewCampaignSpend] = useState('1500');
  const [newCampaignImps, setNewCampaignImps] = useState('50000');
  const [newCampaignClicks, setNewCampaignClicks] = useState('2500');
  const [newCampaignConvs, setNewCampaignConvs] = useState('120');

  // Interactive Chart selections
  const [visibleDailyMetrics, setVisibleDailyMetrics] = useState({
    ctr: true,
    cvr: true,
    engagementRate: false
  });
  
  const [barChartMetric, setBarChartMetric] = useState<'roi' | 'clicks' | 'conversions'>('roi');
  const [hoveredCampaignId, setHoveredCampaignId] = useState<string | null>(null);

  // React Query: Fetch Marketing Data
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['marketingData', platformFilter, timeframe],
    queryFn: () => fetchMarketingData(platformFilter, timeframe),
    staleTime: 5000
  });

  // React Query: Create Campaign Mutation
  const createCampaignMutation = useMutation({
    mutationFn: addMockCampaign,
    onSuccess: () => {
      // Invalidate query to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['marketingData'] });
      setIsNewCampaignModalOpen(false);
      // Reset form
      setNewCampaignName('');
      setNewCampaignSpend('1500');
      setNewCampaignImps('50000');
      setNewCampaignClicks('2500');
      setNewCampaignConvs('120');
    }
  });

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    createCampaignMutation.mutate({
      name: newCampaignName,
      platform: newCampaignPlatform,
      spend: Number(newCampaignSpend) || 100,
      impressions: Number(newCampaignImps) || 1000,
      clicks: Number(newCampaignClicks) || 50,
      conversions: Number(newCampaignConvs) || 1,
      status: 'active',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSaveGoals = () => {
    setGoals(goalInputs);
    setEditingGoals(false);
  };

  const toggleMetricVisibility = (metric: 'ctr' | 'cvr' | 'engagementRate') => {
    setVisibleDailyMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  // Aggregated Summary values calculated on current active data
  const campaignsList = data?.campaigns || [];
  const dailyMetrics = data?.dailyMetrics || [];

  const totalSpend = campaignsList.reduce((sum, c) => sum + c.spend, 0);
  const totalImpressions = campaignsList.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaignsList.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaignsList.reduce((sum, c) => sum + c.conversions, 0);

  const averageCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const averageCvr = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;
  // Realistic ROI calculation
  const totalRoi = totalSpend > 0 ? Number(((totalConversions * 120) / totalSpend).toFixed(1)) : 0;

  // Progress relative to goals
  const ctrGoalProgress = Math.min(100, Math.round((averageCtr / goals.ctr) * 100));
  const cvrGoalProgress = Math.min(100, Math.round((averageCvr / goals.cvr) * 100));
  const roiGoalProgress = Math.min(100, Math.round((totalRoi / goals.roi) * 100));

  return (
    <div className="space-y-8 animate-fade-in pb-12" id="dashboard-container">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="dashboard-header">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium tracking-wide text-xs uppercase">
            <Sparkles className="w-4 h-4" />
            <span>AI-Driven Marketing Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-title tracking-tight mt-1">Marketing Performance Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            Real-time analytics, daily engagement patterns, and conversion goal trackers.
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap items-center gap-2" id="dashboard-filters-row">
          {/* Platform filter */}
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-soft">
            <span className="text-xs font-semibold px-2 text-muted flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
            </span>
            {['All', 'Google', 'Facebook', 'Instagram', 'TikTok', 'LinkedIn'].map((p) => (
              <button
                key={p}
                id={`filter-platform-${p.toLowerCase()}`}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  platformFilter === p
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-body hover:bg-background'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Timeframe filter */}
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-soft">
            <span className="text-xs font-semibold px-2 text-muted flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                id={`filter-timeframe-${d}`}
                onClick={() => setTimeframe(d)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  timeframe === d
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-body hover:bg-background'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Action trigger */}
          <button
            id="btn-add-mock-campaign"
            onClick={() => setIsNewCampaignModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-opacity-90 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-soft transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Campaign</span>
          </button>
        </div>
      </div>

      {/* REFRESH/LOADING INDICATOR */}
      {isFetching && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl text-xs font-medium w-max animate-pulse">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
          Syncing performance metrics...
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        {/* KPI 1: Spend */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-card hover:shadow-soft transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Total Ad Spend</p>
              <h3 className="text-2xl font-bold text-title mt-2">
                ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </h3>
            </div>
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-success mt-4">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Efficient utilization</span>
          </div>
        </div>

        {/* KPI 2: Reach */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-card hover:shadow-soft transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-xl group-hover:scale-125 transition-all"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Impressions / Reach</p>
              <h3 className="text-2xl font-bold text-title mt-2">
                {totalImpressions >= 1000000 
                  ? `${(totalImpressions / 1000000).toFixed(2)}M` 
                  : totalImpressions.toLocaleString('en-US')}
              </h3>
            </div>
            <div className="bg-secondary/10 p-2.5 rounded-xl text-secondary">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-muted mt-4 flex items-center justify-between">
            <span>Clicks: {totalClicks.toLocaleString('en-US')}</span>
            <span className="font-semibold text-title">
              {((totalClicks / totalImpressions) * 100 || 0).toFixed(2)}% CTR
            </span>
          </div>
        </div>

        {/* KPI 3: Engagement (CTR) */}
        <div className={`bg-surface border p-5 rounded-2xl shadow-card hover:shadow-soft transition-all group relative overflow-hidden ${
          averageCtr >= goals.ctr ? 'border-success/30 bg-success/[0.01]' : 'border-border'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Avg Click-Through Rate</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl font-bold text-title">{averageCtr}%</h3>
                <span className="text-xs text-muted">Goal: {goals.ctr}%</span>
              </div>
            </div>
            <div className={`p-2.5 rounded-xl ${averageCtr >= goals.ctr ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-600'}`}>
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${averageCtr >= goals.ctr ? 'bg-success' : 'bg-amber-500'}`}
                style={{ width: `${ctrGoalProgress}%` }}
              ></div>
            </div>
            <p className="text-xs font-medium text-muted mt-1.5 text-right">{ctrGoalProgress}% of Target</p>
          </div>
        </div>

        {/* KPI 4: Conversions / ROI */}
        <div className={`bg-surface border p-5 rounded-2xl shadow-card hover:shadow-soft transition-all group relative overflow-hidden ${
          totalRoi >= goals.roi ? 'border-success/30 bg-success/[0.01]' : 'border-border'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">Marketing ROI</p>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-2xl font-bold text-title">{totalRoi}x</h3>
                <span className="text-xs text-muted">Goal: {goals.roi}x</span>
              </div>
            </div>
            <div className={`p-2.5 rounded-xl ${totalRoi >= goals.roi ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-600'}`}>
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${totalRoi >= goals.roi ? 'bg-success' : 'bg-amber-500'}`}
                style={{ width: `${roiGoalProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-xs text-muted">{totalConversions} Conversions</span>
              <span className="text-xs font-semibold text-title">{roiGoalProgress}% of Target</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DATA VISUALIZATION SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-row">
        
        {/* CHART 1: DAILY ENGAGEMENT RATES (2 COLS) */}
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-card flex flex-col justify-between lg:col-span-2 min-h-[450px]">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-title tracking-tight">Engagement Patterns Over Time</h2>
                <p className="text-muted text-xs">Daily CTR, CVR, and custom engagement indices.</p>
              </div>

              {/* Toggle metric lines */}
              <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border">
                <button
                  onClick={() => toggleMetricVisibility('ctr')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    visibleDailyMetrics.ctr 
                      ? 'bg-surface text-primary border border-border font-semibold shadow-sm' 
                      : 'text-muted'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4f46e5]"></span>
                  CTR
                </button>
                <button
                  onClick={() => toggleMetricVisibility('cvr')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    visibleDailyMetrics.cvr 
                      ? 'bg-surface text-primary border border-border font-semibold shadow-sm' 
                      : 'text-muted'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                  CVR
                </button>
                <button
                  onClick={() => toggleMetricVisibility('engagementRate')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    visibleDailyMetrics.engagementRate 
                      ? 'bg-surface text-primary border border-border font-semibold shadow-sm' 
                      : 'text-muted'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span>
                  Eng. Rate
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted">
                <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2"></div>
                Loading engagement trends...
              </div>
            ) : dailyMetrics.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted text-sm">
                No metric data available for selected platform.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCtr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCvr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--color-border), 0.5)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10 }}
                    axisLine={{ stroke: 'rgb(var(--color-border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10 }}
                    axisLine={{ stroke: 'rgb(var(--color-border))' }}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgb(var(--color-surface))', 
                      borderColor: 'rgb(var(--color-border))',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                      fontSize: '12px'
                    }} 
                  />
                  {visibleDailyMetrics.ctr && (
                    <Area 
                      type="monotone" 
                      dataKey="ctr" 
                      name="Click-Through Rate" 
                      stroke="#4f46e5" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorCtr)" 
                    />
                  )}
                  {visibleDailyMetrics.cvr && (
                    <Area 
                      type="monotone" 
                      dataKey="cvr" 
                      name="Conversion Rate" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorCvr)" 
                    />
                  )}
                  {visibleDailyMetrics.engagementRate && (
                    <Area 
                      type="monotone" 
                      dataKey="engagementRate" 
                      name="Engagement Rate" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorEng)" 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GOAL TRACKER & METRICS CONFIG (1 COL) */}
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-title tracking-tight">Metric Goals Panel</h2>
                <p className="text-muted text-xs">Manage targets and evaluate current ROI.</p>
              </div>
              <button
                onClick={() => {
                  if (editingGoals) {
                    handleSaveGoals();
                  } else {
                    setGoalInputs(goals);
                    setEditingGoals(true);
                  }
                }}
                className={`p-1.5 rounded-lg border transition-all ${
                  editingGoals 
                    ? 'bg-success/10 border-success/30 text-success font-semibold text-xs px-2.5' 
                    : 'bg-background border-border text-muted hover:text-title'
                }`}
              >
                {editingGoals ? 'Save Goals' : <Sliders className="w-4 h-4" />}
              </button>
            </div>

            {editingGoals ? (
              <div className="space-y-4 animate-zoom-in" id="goals-editor">
                <div className="bg-background p-4 rounded-2xl border border-border space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-title block mb-1">Target CTR (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={goalInputs.ctr}
                      onChange={e => setGoalInputs(prev => ({ ...prev, ctr: Number(e.target.value) }))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-title block mb-1">Target CVR (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={goalInputs.cvr}
                      onChange={e => setGoalInputs(prev => ({ ...prev, cvr: Number(e.target.value) }))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-title block mb-1">Target ROI (Multiplier)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={goalInputs.roi}
                      onChange={e => setGoalInputs(prev => ({ ...prev, roi: Number(e.target.value) }))}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Goal 1: CTR */}
                <div className="bg-background/50 p-3.5 rounded-2xl border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-title">Click-Through Rate Goal</span>
                    <span className={`text-xs font-bold ${averageCtr >= goals.ctr ? 'text-success' : 'text-amber-500'}`}>
                      {averageCtr}% / {goals.ctr}%
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${averageCtr >= goals.ctr ? 'bg-success' : 'bg-amber-500'}`}
                      style={{ width: `${ctrGoalProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-muted">Averages {timeframe} days of metrics</span>
                    <span className="text-[10px] font-semibold text-title">{ctrGoalProgress}% Achieved</span>
                  </div>
                </div>

                {/* Goal 2: CVR */}
                <div className="bg-background/50 p-3.5 rounded-2xl border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-title">Conversion Rate Goal</span>
                    <span className={`text-xs font-bold ${averageCvr >= goals.cvr ? 'text-success' : 'text-amber-500'}`}>
                      {averageCvr}% / {goals.cvr}%
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${averageCvr >= goals.cvr ? 'bg-success' : 'bg-amber-500'}`}
                      style={{ width: `${cvrGoalProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-muted">Averages clicks to purchases</span>
                    <span className="text-[10px] font-semibold text-title">{cvrGoalProgress}% Achieved</span>
                  </div>
                </div>

                {/* Goal 3: ROI */}
                <div className="bg-background/50 p-3.5 rounded-2xl border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-title">Marketing ROI Goal</span>
                    <span className={`text-xs font-bold ${totalRoi >= goals.roi ? 'text-success' : 'text-amber-500'}`}>
                      {totalRoi}x / {goals.roi}x
                    </span>
                  </div>
                  <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${totalRoi >= goals.roi ? 'bg-success' : 'bg-amber-500'}`}
                      style={{ width: `${roiGoalProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-muted">Target based on media cost vs revenue</span>
                    <span className="text-[10px] font-semibold text-title">{roiGoalProgress}% Achieved</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl mt-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-title">Smart Optimization Suggestion</h4>
              <p className="text-muted text-[11px] mt-1">
                {averageCtr >= goals.ctr 
                  ? "Instagram and Google CTR are exceeding target threshold. Consider shifting 15% of paused Facebook budget to Google Search ads for optimal conversions." 
                  : "Click-through rates are below target goals. We suggest testing video placements on TikTok and Instagram to lift CTR metrics past the threshold."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: CAMPAIGN BAR CHART COMPARISON & DETAILED TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-campaigns-section">
        
        {/* CHART 2: CAMPAIGN BAR CHART (1 COL) */}
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-title tracking-tight">Campaign Comparison</h2>
                <p className="text-muted text-xs">Compare metrics across active segments.</p>
              </div>

              {/* Selector for Bar Chart Metric */}
              <select
                id="select-barchart-metric"
                value={barChartMetric}
                onChange={e => setBarChartMetric(e.target.value as any)}
                className="bg-background text-title border border-border rounded-lg text-xs font-medium px-2 py-1 outline-none"
              >
                <option value="roi">ROI (Multiplier)</option>
                <option value="clicks">Clicks</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted text-xs">
                Loading comparisons...
              </div>
            ) : campaignsList.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted text-xs">
                No campaign data for comparative analysis.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignsList} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--color-border), 0.5)" />
                  <XAxis 
                    dataKey="platform" 
                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10 }}
                    axisLine={{ stroke: 'rgb(var(--color-border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'rgb(var(--color-text-muted))', fontSize: 10 }}
                    axisLine={{ stroke: 'rgb(var(--color-border))' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(var(--color-primary), 0.05)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgb(var(--color-surface))', 
                      borderColor: 'rgb(var(--color-border))',
                      borderRadius: '12px',
                      fontSize: '11px'
                    }} 
                  />
                  <Bar 
                    dataKey={barChartMetric} 
                    name={barChartMetric === 'roi' ? 'ROI (Multiplier)' : barChartMetric === 'clicks' ? 'Clicks' : 'Conversions'}
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* DETAILED DATA GRID (2 COLS) */}
        <div className="bg-surface border border-border p-6 rounded-3xl shadow-card lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-title tracking-tight">Active Campaigns Ledger</h2>
              <p className="text-muted text-xs">Real-time stats from Google, Facebook, Instagram, LinkedIn, and TikTok.</p>
            </div>
            
            {/* Simple stats */}
            <span className="bg-background border border-border text-title text-xs font-semibold px-3 py-1.5 rounded-xl">
              {campaignsList.length} Active Segments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-muted font-medium bg-background/50">
                  <th className="py-2.5 px-3">Campaign Info</th>
                  <th className="py-2.5 px-3">Platform</th>
                  <th className="py-2.5 px-3 text-right">Spend</th>
                  <th className="py-2.5 px-3 text-right">CTR / CVR</th>
                  <th className="py-2.5 px-3 text-right">Conversions</th>
                  <th className="py-2.5 px-3 text-right">ROI</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted">
                      Loading campaigns ledger...
                    </td>
                  </tr>
                ) : campaignsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted">
                      No matching campaigns. Add some or clear filters!
                    </td>
                  </tr>
                ) : (
                  campaignsList.map((campaign) => (
                    <tr 
                      key={campaign.id}
                      className={`border-b border-border transition-colors hover:bg-background/40 cursor-pointer ${
                        hoveredCampaignId === campaign.id ? 'bg-primary/5' : ''
                      }`}
                      onMouseEnter={() => setHoveredCampaignId(campaign.id)}
                      onMouseLeave={() => setHoveredCampaignId(null)}
                    >
                      <td className="py-3 px-3">
                        <p className="font-semibold text-title">{campaign.name}</p>
                        <p className="text-[10px] text-muted">Started: {campaign.startDate}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-background border border-border text-title font-medium px-2 py-0.5 rounded-lg text-[10px]">
                          {campaign.platform}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-title">
                        ${campaign.spend.toLocaleString('en-US')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <p className="font-semibold text-title">{campaign.ctr}% CTR</p>
                        <p className="text-[10px] text-muted">{campaign.cvr}% CVR</p>
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-title">
                        {campaign.conversions}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-bold ${campaign.roi >= goals.roi ? 'text-success' : 'text-amber-500'}`}>
                          {campaign.roi}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                          campaign.status === 'active'
                            ? 'bg-success/10 text-success border border-success/20'
                            : campaign.status === 'paused'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LAUNCH CAMPAIGN DIALOG (MODAL) */}
      {isNewCampaignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="modal-backdrop">
          <div className="bg-surface border border-border rounded-3xl shadow-glow w-full max-w-md overflow-hidden animate-zoom-in" id="modal-container">
            {/* Modal Header */}
            <div className="border-b border-border p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-title">Launch Mock Campaign</h3>
              </div>
              <button
                id="btn-close-modal"
                onClick={() => setIsNewCampaignModalOpen(false)}
                className="text-muted hover:text-title p-1.5 rounded-xl hover:bg-background transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateCampaignSubmit} className="p-5 space-y-4" id="launch-campaign-form">
              <div>
                <label className="text-xs font-semibold text-title block mb-1">Campaign Name</label>
                <input
                  type="text"
                  id="input-campaign-name"
                  placeholder="e.g. Winter Holiday Blast"
                  required
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-title block mb-1">Platform</label>
                  <select
                    id="select-campaign-platform"
                    value={newCampaignPlatform}
                    onChange={e => setNewCampaignPlatform(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Google">Google</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="LinkedIn">LinkedIn</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-title block mb-1">Budget Spend ($)</label>
                  <input
                    type="number"
                    id="input-campaign-spend"
                    required
                    value={newCampaignSpend}
                    onChange={e => setNewCampaignSpend(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-title block mb-1">Impressions</label>
                  <input
                    type="number"
                    id="input-campaign-impressions"
                    required
                    value={newCampaignImps}
                    onChange={e => setNewCampaignImps(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-title block mb-1">Clicks</label>
                  <input
                    type="number"
                    id="input-campaign-clicks"
                    required
                    value={newCampaignClicks}
                    onChange={e => setNewCampaignClicks(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-title block mb-1">Conversions</label>
                  <input
                    type="number"
                    id="input-campaign-conversions"
                    required
                    value={newCampaignConvs}
                    onChange={e => setNewCampaignConvs(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs text-title focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-[10px] text-muted">
                Launching this mock campaign will update the React Query store and dynamically adjust all interactive line & comparison charts.
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  id="btn-cancel-campaign"
                  onClick={() => setIsNewCampaignModalOpen(false)}
                  className="bg-background border border-border text-title font-medium text-xs px-4 py-2 rounded-xl hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-submit-campaign"
                  disabled={createCampaignMutation.isPending}
                  className="bg-primary hover:bg-opacity-95 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1"
                >
                  {createCampaignMutation.isPending ? 'Launching...' : 'Confirm Launch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
