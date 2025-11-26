import React, { useState, useEffect, useCallback } from 'react';
import { Post, Ad, ScheduleEntry, Trend } from '../types';
import { getPosts, getAds, getScheduleEntries, getTrends } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button'; // Assuming Button component is available
import { useNavigate } from '../hooks/useNavigate'; // Custom hook for navigation

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, description }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-4xl font-bold text-primary mb-2">{value}</p>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

const Dashboard: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useNavigate(); // Using the custom navigation hook

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // For now, using a mock user ID. In a real app, this would come from auth context.
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
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPosts = posts.length;
  const totalAds = ads.length;
  const upcomingSchedule = schedule.filter(s => new Date(s.datetime) > new Date()).length;
  const detectedTrends = trends.length;

  const currentWeekStart = new Date();
  currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of the current week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  const postsThisWeek = posts.filter(post => new Date(post.createdAt) >= currentWeekStart).length;
  const adsThisWeek = ads.filter(ad => new Date(ad.createdAt) >= currentWeekStart).length;

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <LoadingSpinner />
          <p className="ml-2 text-gray-600">Loading dashboard...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Resumo Semanal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Posts Criados" value={postsThisWeek} description="Esta semana" />
              <SummaryCard title="Anúncios Criados" value={adsThisWeek} description="Esta semana" />
              <SummaryCard title="Agendamentos" value={upcomingSchedule} description="Próximos eventos" />
              <SummaryCard title="Tendências Detectadas" value={detectedTrends} description="Recentemente" />
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Visão Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Total de Posts" value={totalPosts} description="Em toda a plataforma" />
              <SummaryCard title="Total de Anúncios" value={totalAds} description="Em toda a plataforma" />
              <SummaryCard title="Próximos Agendamentos" value={upcomingSchedule} description="Programados" />
              <SummaryCard title="Tendências Ativas" value={detectedTrends} description="Para explorar" />
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-gray-700 mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Button onClick={() => navigateTo('ContentGenerator')} variant="primary" size="lg">Criar Conteúdo</Button>
              <Button onClick={() => navigateTo('AdStudio')} variant="primary" size="lg">Criar Anúncio</Button>
              <Button onClick={() => navigateTo('AIManager')} variant="primary" size="lg">Assistente IA</Button>
              <Button onClick={() => navigateTo('TrendHunter')} variant="secondary" size="lg">Tendências</Button>
              <Button onClick={() => navigateTo('CreativeStudio')} variant="secondary" size="lg">Estúdio Criativo</Button>
              <Button onClick={() => navigateTo('SmartScheduler')} variant="secondary" size="lg">Agendamentos</Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;