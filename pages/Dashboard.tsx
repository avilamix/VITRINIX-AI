import React, { useState, useEffect, useCallback } from 'react';
import { Post, Ad, ScheduleEntry, Trend } from '../types';
import { getPosts, getAds, getScheduleEntries, getTrends } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import { useNavigate } from '../hooks/useNavigate';
import { useLanguage } from '../contexts/LanguageContext';
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
  <div className="bg-surface p-6 rounded-xl shadow-card border border-gray-100 dark:border-gray-800 hover:shadow-soft transition-all duration-300">
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
  const { t, language } = useLanguage();

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
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-title">{t('dashboard.title')}</h2>
           <p className="text-muted mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="text-sm text-muted font-medium mt-2 md:mt-0 bg-surface px-3 py-1 rounded-md border border-gray-200 dark:border-gray-800">
            {new Date().toLocaleDateString(language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-surface rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-error p-4 rounded-r shadow-sm" role="alert">
          <p className="font-bold text-error">System Alert</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <SummaryCard title={t('dashboard.total_content')} value={totalPosts} description={t('dashboard.total_content_desc')} icon={DocumentTextIcon} />
            <SummaryCard title={t('dashboard.campaigns_card')} value={totalAds} description={t('dashboard.campaigns_desc')} icon={MegaphoneIcon} />
            <SummaryCard title={t('dashboard.scheduled')} value={upcomingSchedule} description={t('dashboard.scheduled_desc')} icon={CalendarDaysIcon} />
            <SummaryCard title={t('dashboard.trends_card')} value={detectedTrends} description={t('dashboard.trends_desc')} icon={ChartBarIcon} />
          </div>

          <section className="bg-surface rounded-xl shadow-card border border-gray-100 dark:border-gray-800 p-8">
            <h3 className="text-lg font-bold text-title mb-6">{t('dashboard.quick_actions')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Button onClick={() => navigateTo('ContentGenerator')} variant="primary" size="lg" className="justify-between group">
                 <span>{t('dashboard.btn_generate')}</span>
                 <DocumentTextIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('AdStudio')} variant="outline" size="lg" className="justify-between group">
                 <span>{t('dashboard.btn_ad')}</span>
                 <MegaphoneIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('AIManager')} variant="outline" size="lg" className="justify-between group">
                 <span>{t('dashboard.btn_strategy')}</span>
                 <ChartBarIcon className="w-5 h-5 opacity-70 group-hover:opacity-100" />
              </Button>
              <Button onClick={() => navigateTo('TrendHunter')} variant="ghost" size="lg" className="justify-start border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                 {t('dashboard.btn_market')}
              </Button>
              <Button onClick={() => navigateTo('CreativeStudio')} variant="ghost" size="lg" className="justify-start border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                 {t('dashboard.btn_media')}
              </Button>
              <Button onClick={() => navigateTo('SmartScheduler')} variant="ghost" size="lg" className="justify-start border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600">
                 {t('dashboard.btn_schedule')}
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;