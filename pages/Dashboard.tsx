import React, { useState, useEffect, useCallback } from 'react';
import { Post, Ad, ScheduleEntry, Trend } from '../types';
import { getPosts, getAds, getScheduleEntries, getTrends } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { useNavigate } from '../hooks/useNavigate';
import { 
  DocumentTextIcon, 
  MegaphoneIcon, 
  CalendarDaysIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, description, icon: Icon }) => (
  <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 hover:shadow-soft transition-shadow duration-300">
    <div className="flex justify-between items-start mb-4">
       <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-3xl font-bold text-title mt-1 tracking-tight">{value}</p>
       </div>
       <div className="p-2.5 bg-background rounded-lg text-primary">
          <Icon className="w-5 h-5" />
       </div>
    </div>
    <div className="flex items-center">
      <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full mr-2">Active</span>
      <p className="text-xs text-muted">{description}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = 'mock-user-123';
      const fetchedPosts = await getPosts(userId);
      const fetchedAds = await getAds(userId);
      const fetchedSchedule = await getScheduleEntries(userId);
      const fetchedTrends = await getTrends(userId);

      setPosts(fetchedPosts);
      setAds(fetchedAds);
      setSchedule(fetchedSchedule);
      setTrends(fetchedTrends);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('System could not retrieve analytics data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalPosts = posts.length;
  const totalAds = ads.length;
  const upcomingSchedule = schedule.filter(s => new Date(s.datetime) > new Date()).length;
  const detectedTrends = trends.length;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-title">Executive Overview</h2>
           <p className="text-muted mt-1">Welcome back. Here is your platform activity summary.</p>
        </div>
        <div className="text-sm text-muted font-medium mt-2 md:mt-0 bg-surface px-3 py-1 rounded-md border border-gray-200">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-surface rounded-xl border border-gray-100 shadow-sm">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-error p-4 rounded-r shadow-sm" role="alert">
          <p className="font-bold text-error">System Alert</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <SummaryCard title="Total Content" value={totalPosts} description="Generated across all channels" icon={DocumentTextIcon} />
            <SummaryCard title="Ad Campaigns" value={totalAds} description="Active advertisements" icon={MegaphoneIcon} />
            <SummaryCard title="Scheduled Events" value={upcomingSchedule} description="Pending publication" icon={CalendarDaysIcon} />
            <SummaryCard title="Market Trends" value={detectedTrends} description="Tracked opportunities" icon={ChartBarIcon} />
          </div>

          <section className="bg-surface rounded-xl shadow-card border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-title mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Button onClick={() => navigateTo('ContentGenerator')} variant="primary" size="lg" className="justify-between group">
                 <span>Generate Content</span>
                 <DocumentTextIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('AdStudio')} variant="outline" size="lg" className="justify-between group">
                 <span>Create Advertisement</span>
                 <MegaphoneIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('AIManager')} variant="outline" size="lg" className="justify-between group">
                 <span>Strategic Analysis</span>
                 <ChartBarIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('TrendHunter')} variant="ghost" size="lg" className="justify-start border border-gray-200 hover:border-gray-300">
                 Market Research
              </Button>
              <Button onClick={() => navigateTo('CreativeStudio')} variant="ghost" size="lg" className="justify-start border border-gray-200 hover:border-gray-300">
                 Media Studio
              </Button>
              <Button onClick={() => navigateTo('SmartScheduler')} variant="ghost" size="lg" className="justify-start border border-gray-200 hover:border-gray-300">
                 Manage Schedule
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;