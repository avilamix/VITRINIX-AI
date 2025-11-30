

import React, { useState, useCallback, useEffect } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { searchTrends, generateText } from '../services/geminiService';
import { saveTrend } from '../services/firestoreService';
import { Trend } from '../types';
import { useNavigate } from '../hooks/useNavigate';
import { GEMINI_FLASH_MODEL } from '../constants';
import { LightBulbIcon } from '@heroicons/react/24/outline';

const TrendHunter: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // New state for inline idea generation
  const [generatedIdeas, setGeneratedIdeas] = useState<Record<string, string>>({});
  const [generatingIdeaFor, setGeneratingIdeaFor] = useState<string | null>(null);

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
    setGeneratedIdeas({}); // Clear previous ideas

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
      alert(`${trendsWithUserId.length} tendências encontradas e salvas com sucesso!`);

    } catch (err) {
      console.error('Error searching trends:', err);
      setError(`Failed to search trends: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [query, city, userId, userLocation]);

  const handleGenerateContentIdea = useCallback(async (trend: Trend) => {
    setGeneratingIdeaFor(trend.id);
    try {
      const prompt = `Based on the trending topic "${trend.query}" and the following details: "${trend.data}", suggest a creative and engaging content idea (e.g., a social media post concept or blog title). Keep it concise.`;
      const idea = await generateText(prompt, { model: GEMINI_FLASH_MODEL });
      setGeneratedIdeas(prev => ({ ...prev, [trend.id]: idea }));
    } catch (err) {
      console.error('Error generating idea:', err);
      alert('Failed to generate content idea. Please try again.');
    } finally {
      setGeneratingIdeaFor(null);
    }
  }, []);

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

  const hasActiveFilters = query.trim() || city.trim();

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setCity('');
    setTrends([]);
    setGeneratedIdeas({});
    setError(null);
  }, []);

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Trend Hunter</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Buscar Tendências</h3>
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
          <p className="text-sm text-yellow-300 bg-yellow-900 p-3 rounded-md mb-6">
            A geolocalização não está disponível. Tendências por cidade podem ser menos precisas.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={handleSearchTrends}
            isLoading={loading}
            variant="primary"
            className="w-full sm:w-auto"
          >
            {loading ? 'Buscando Tendências...' : 'Buscar Tendências'}
          </Button>
          {hasActiveFilters && (
            <Button
              onClick={handleClearSearch}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Limpar Busca
            </Button>
          )}
        </div>
      </div>

      {trends.length > 0 && (
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-xl font-semibold text-textlight mb-5">Resultados de Tendências</h3>
          <div className="space-y-8">
            {trends.map((trend) => (
              <div key={trend.id} className="p-5 border border-gray-700 rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-semibold text-textdark">{trend.query}</h4>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${trend.score > 70 ? 'bg-green-800 text-green-200' : trend.score > 40 ? 'bg-yellow-800 text-yellow-200' : 'bg-primary/50 text-textdark'}`}>
                    Score Viral: {trend.score}
                  </span>
                </div>
                <p className="text-textlight leading-relaxed mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                  {trend.data}
                </p>
                {trend.sources && trend.sources.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-textmuted mb-2">Fontes:</p>
                    <ul className="list-disc list-inside text-sm text-primary space-y-1">
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
                
                {/* Generated Idea Section */}
                {generatedIdeas[trend.id] && (
                  <div className="mt-4 mb-4 p-4 bg-accent/5 border border-accent/20 rounded-md animate-in fade-in">
                     <h5 className="text-sm font-bold text-accent mb-1 flex items-center gap-2">
                       <LightBulbIcon className="w-4 h-4" />
                       Content Idea
                     </h5>
                     <p className="text-sm text-textlight italic">"{generatedIdeas[trend.id]}"</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
                  <Button 
                    onClick={() => handleGenerateContentIdea(trend)} 
                    isLoading={generatingIdeaFor === trend.id}
                    variant="outline" 
                    className="w-full sm:w-auto"
                  >
                    Generate Content Idea
                  </Button>
                  <Button onClick={() => handleCreateContentFromTrend(trend)} variant="primary" className="w-full sm:w-auto">Criar Conteúdo da Tendência</Button>
                  <Button onClick={() => handleAddTrendToCalendar(trend)} variant="secondary" className="w-full sm:w-auto">Adicionar ao Calendário</Button>
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
