import React, { useState, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { campaignBuilder } from '../services/geminiService';
import { saveCampaign } from '../services/firestoreService';
import { Campaign } from '../types';
import { useNavigate } from '../hooks/useNavigate'; // Custom hook for navigation

const CampaignBuilder: React.FC = () => {
  const [campaignPrompt, setCampaignPrompt] = useState<string>('');
  const [generatedCampaign, setGeneratedCampaign] = useState<Campaign | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useNavigate();

  const handleCreateCampaign = useCallback(async () => {
    if (!campaignPrompt.trim()) {
      setError('Please provide a campaign description.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedCampaign(null);
    setGeneratedVideoUrl(null);

    try {
      const { campaign, videoUrl } = await campaignBuilder(campaignPrompt);
      setGeneratedCampaign(campaign);
      setGeneratedVideoUrl(videoUrl);
      await saveCampaign(campaign); // Save to mock Firestore
    } catch (err) {
      console.error('Error building campaign:', err);
      setError(`Failed to build campaign: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [campaignPrompt]);

  const handleDownloadMaterials = useCallback(() => {
    if (!generatedCampaign) {
      setError('No campaign materials to download.');
      return;
    }
    const campaignData = JSON.stringify(generatedCampaign, null, 2);
    const blob = new Blob([campaignData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitrinex-campaign-${generatedCampaign.name.replace(/\s/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generatedCampaign]);

  const handleAddCalendar = useCallback(() => {
    // Navigate to SmartScheduler and pass campaign details for scheduling
    if (generatedCampaign) {
      console.log('Navigating to SmartScheduler with campaign:', generatedCampaign);
      navigateTo('SmartScheduler'); // Will need to enhance SmartScheduler to receive campaign details
    } else {
      setError('No campaign generated to add to calendar.');
    }
  }, [generatedCampaign, navigateTo]);


  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Campaign Builder</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Descreva sua Campanha</h3>
        <Textarea
          id="campaignPrompt"
          label="Qual campanha você gostaria de criar? Seja o mais detalhado possível:"
          value={campaignPrompt}
          onChange={(e) => setCampaignPrompt(e.target.value)}
          rows={6}
          placeholder="Ex: 'Uma campanha de lançamento para um novo curso online de fotografia avançada, visando fotógrafos amadores que querem profissionalizar seus trabalhos, duração de 2 semanas, com foco em Instagram e Facebook.'"
        />
        <Button
          onClick={handleCreateCampaign}
          isLoading={loading}
          variant="primary"
          className="w-full md:w-auto mt-4"
        >
          {loading ? 'Criando Campanha...' : 'Criar Campanha'}
        </Button>
      </div>

      {generatedCampaign && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Campanha Gerada: {generatedCampaign.name}</h3>
          <p className="text-gray-700 mb-4">
            <span className="font-semibold">Cronograma:</span> {generatedCampaign.timeline}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Posts ({generatedCampaign.posts.length})</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2 max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-md">
                {generatedCampaign.posts.map((post, index) => (
                  <li key={post.id || index} className="text-sm">
                    <strong>Post {index + 1}:</strong> {post.content_text.substring(0, 100)}...
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Anúncios ({generatedCampaign.ads.length})</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-2 max-h-64 overflow-y-auto bg-gray-50 p-4 rounded-md">
                {generatedCampaign.ads.map((ad, index) => (
                  <li key={ad.id || index} className="text-sm">
                    <strong>Ad {index + 1} ({ad.platform}):</strong> "{ad.headline}" - {ad.copy.substring(0, 70)}...
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {generatedVideoUrl && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Vídeo da Campanha</h4>
              <div className="relative w-full aspect-video bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                <video controls src={generatedVideoUrl} className="w-full h-full object-contain"></video>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleDownloadMaterials} variant="primary">Baixar Materiais</Button>
            <Button onClick={handleAddCalendar} variant="secondary">Adicionar ao Calendário</Button>
            {/* <Button variant="outline">Ver Detalhes (TODO)</Button> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignBuilder;