import React, { useState, useCallback, useEffect } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { searchTrends } from '../services/geminiService';
import { saveTrend } from '../services/firestoreService';
import { Trend } from '../types';
import { useNavigate } from '../hooks/useNavigate'; // Custom hook for navigation

const TrendHunter: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const { navigateTo } = useNavigate();

  // For now, using a mock user ID. In a real app, this would come from auth context.
  const userId = 'mock-user-123';

  // Attempt to get user's geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation access denied or failed:', err);
          // Fallback or inform user that location-based trends might be less accurate
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const handleSearchTrends = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a search query for trends.');
      return;
    }

    setLoading(true);
    setError(null);
    setTrends([]);

    try {
      // Pass userLocation if city is provided, or undefined otherwise to rely on general search
      const location = city.trim() && userLocation ? userLocation : undefined;
      const fetchedTrends = await searchTrends(query, location);

      // Add mock user ID before saving
      const trendsWithUserId = fetchedTrends.map(t => ({ ...t, userId: userId }));
      setTrends(trendsWithUserId);

      // Save to mock Firestore
      for (const trend of trendsWithUserId) {
        await saveTrend(trend);
      }

    } catch (err) {
      console.error('Error searching trends:', err);
      setError(`Failed to search trends: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [query, city, userId, userLocation]);

  const handleCreateContentFromTrend = useCallback((trend: Trend) => {
    // Navigate to ContentGenerator and pre-fill prompt
    console.log('Navigating to ContentGenerator with trend:', trend);
    navigateTo('ContentGenerator'); // Will need to enhance ContentGenerator to receive initial prompt
    // For now, we can just alert or log
    alert(`Creating content based on trend: ${trend.query}\nSummary: ${trend.data.substring(0, 100)}...`);
  }, [navigateTo]);

  const handleAddTrendToCalendar = useCallback((trend: Trend) => {
    // Navigate to SmartScheduler to schedule content related to this trend
    console.log('Navigating to SmartScheduler with trend:', trend);
    navigateTo('SmartScheduler'); // Will need to enhance SmartScheduler to receive details
    alert(`Adding trend "${trend.query}" to calendar (not implemented).`);
  }, [navigateTo]);


  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Trend Hunter</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Buscar Tendências</h3>
        <Input
          id="trendQuery"
          label="Nicho ou Tópico:"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 'Marketing digital para restaurantes', 'tecnologia vestível'"
        />
        <Input
          id="trendCity"
          label="Cidade (opcional, para tendências locais):"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ex: 'São Paulo', 'Rio de Janeiro'"
        />
        {!userLocation && city.trim() && (
          <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md mb-2">
            A geolocalização não está disponível. Tendências por cidade podem ser menos precisas.
          </p>
        )}
        <Button
          onClick={handleSearchTrends}
          isLoading={loading}
          variant="primary"
          className="w-full md:w-auto mt-4"
        >
          {loading ? 'Buscando Tendências...' : 'Buscar Tendências'}
        </Button>
      </div>

      {trends.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Resultados de Tendências</h3>
          <div className="space-y-6">
            {trends.map((trend) => (
              <div key={trend.id} className="p-4 border border-gray-200 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-semibold text-gray-800">{trend.query}</h4>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${trend.score > 70 ? 'bg-green-100 text-green-800' : trend.score > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    Score Viral: {trend.score}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3" style={{ whiteSpace: 'pre-wrap' }}>
                  {trend.data}
                </p>
                {trend.sources && trend.sources.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Fontes:</p>
                    <ul className="list-disc list-inside text-sm text-blue-600">
                      {trend.sources.map((source, idx) => (
                        <li key={idx}>
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button onClick={() => handleCreateContentFromTrend(trend)} variant="primary">Criar Conteúdo da Tendência</Button>
                  <Button onClick={() => handleAddTrendToCalendar(trend)} variant="secondary">Adicionar ao Calendário</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendHunter;