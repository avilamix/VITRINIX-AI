

import React, { useState, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { campaignBuilder } from '../services/geminiService';
import { saveCampaign } from '../services/firestoreService';
import { Campaign } from '../types';
import { useNavigate } from '../hooks/useNavigate'; // Custom hook for navigation
import { getActiveOrganization } from '../services/authService';

const CampaignBuilder: React.FC = () => {
  const [campaignPrompt, setCampaignPrompt] = useState<string>('');
  const [generatedCampaign, setGeneratedCampaign] = useState<Campaign | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useNavigate();

  const activeOrganization = getActiveOrganization();
  const organizationId = activeOrganization?.organization.id;


  const handleCreateCampaign = useCallback(async () => {
    if (!campaignPrompt.trim()) {
      setError('Please provide a campaign description.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
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
      // saveCampaign is now called inside geminiService.campaignBuilder
      alert(`Campanha "${campaign.name}" criada e salva com sucesso!`);
    } catch (err) {
      console.error('Error building campaign:', err);
      setError(`Failed to build campaign: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [campaignPrompt, organizationId]);

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
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Campaign Builder</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Descreva sua Campanha</h3>
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
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-xl font-semibold text-textlight mb-5">Campanha Gerada: {generatedCampaign.name}</h3>
          <p className="text-textlight mb-6">
            <span className="font-semibold">Cronograma:</span> {generatedCampaign.timeline}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-lg font-semibold text-textlight mb-4">Posts ({generatedCampaign.generatedPosts?.length || 0})</h4>
              <ul className="list-disc list-inside text-textlight space-y-3 max-h-64 overflow-y-auto bg-darkbg p-4 rounded-md border border-gray-700">
                {generatedCampaign.generatedPosts?.map((post: any, index: number) => (
                  <li key={index} className="text-sm">
                    <strong>Post {index + 1}:</strong> {post.contentText?.substring(0, 100)}...
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-textlight mb-4">Anúncios ({generatedCampaign.generatedAds?.length || 0})</h4>
              <ul className="list-disc list-inside text-textlight space-y-3 max-h-64 overflow-y-auto bg-darkbg p-4 rounded-md border border-gray-700">
                {generatedCampaign.generatedAds?.map((ad: any, index: number) => (
                  <li key={index} className="text-sm">
                    <strong>Ad {index + 1} ({ad.platform}):</strong> "{ad.headline}" - {ad.copy?.substring(0, 70)}...
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {generatedVideoUrl && (
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-textlight mb-4">Vídeo da Campanha</h4>
              <div className="relative w-full aspect-video bg-gray-900 rounded-md overflow-hidden border border-gray-700">
                <video controls src={generatedVideoUrl} className="w-full h-full object-contain"></video>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownloadMaterials} variant="primary" className="w-full sm:w-auto">Baixar Materiais</Button>
            <Button onClick={handleAddCalendar} variant="secondary" className="w-full sm:w-auto">Adicionar ao Calendário</Button>
            {/* <Button variant="outline">Ver Detalhes (TODO)</Button> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignBuilder;