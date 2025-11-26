import React, { useState, useCallback } from 'react';
import Textarea from '../components/Textarea';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateText, generateImage } from '../services/geminiService';
import { saveAd } from '../services/firestoreService';
import { Ad } from '../types';
import { GEMINI_PRO_MODEL, GEMINI_IMAGE_PRO_MODEL, PLACEHOLDER_IMAGE_BASE64 } from '../constants';
import { Type } from '@google/genai';

type Platform = 'Instagram' | 'Facebook' | 'TikTok' | 'Google' | 'Pinterest';

const platforms: Platform[] = ['Instagram', 'Facebook', 'TikTok', 'Google', 'Pinterest'];

const AdStudio: React.FC = () => {
  const [productDescription, setProductDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Instagram');
  const [generatedAd, setGeneratedAd] = useState<Ad | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(PLACEHOLDER_IMAGE_BASE64);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = 'mock-user-123';

  const handleGenerateAd = useCallback(async () => {
    if (!productDescription.trim() || !targetAudience.trim()) {
      setError('Please provide product description and target audience.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedAd(null);
    setGeneratedImageUrl(PLACEHOLDER_IMAGE_BASE64);

    try {
      const adPrompt = `Generate a compelling ad for ${selectedPlatform}.
      Product: "${productDescription}".
      Target Audience: "${targetAudience}".
      Provide a headline, ad copy, and a visual description for an image/video creative.
      Return the output as a JSON object with 'headline', 'copy', and 'visual_description' keys.`;

      const textResponse = await generateText(adPrompt, {
        model: GEMINI_PRO_MODEL,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            copy: { type: Type.STRING },
            visual_description: { type: Type.STRING },
          },
          required: ['headline', 'copy', 'visual_description'],
        },
      });

      const adData = JSON.parse(textResponse);
      const newAd: Ad = {
        id: `ad-${Date.now()}`,
        userId: userId,
        platform: selectedPlatform,
        headline: adData.headline,
        copy: adData.copy,
        createdAt: new Date().toISOString(),
      };

      setGeneratedAd(newAd);

      const imageResponse = await generateImage(adData.visual_description, {
        model: GEMINI_IMAGE_PRO_MODEL,
        aspectRatio: '1:1', // Common for most platforms
        imageSize: '1K',
      });
      setGeneratedImageUrl(imageResponse.imageUrl || PLACEHOLDER_IMAGE_BASE64);
      newAd.media_url = imageResponse.imageUrl || undefined; // Add image URL to ad object

      await saveAd(newAd); // Save to mock Firestore
    } catch (err) {
      console.error('Error generating ad:', err);
      setError(`Failed to generate ad: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [productDescription, targetAudience, selectedPlatform, userId]);

  const handleDownload = useCallback(() => {
    if (!generatedImageUrl) {
      setError('No image to download.');
      return;
    }
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `vitrinex-ad-${selectedPlatform}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImageUrl, selectedPlatform]);

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Ad Studio</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Detalhes do Anúncio</h3>
        <Textarea
          id="productDescription"
          label="Descrição do Produto/Serviço:"
          value={productDescription}
          onChange={(e) => setProductDescription(e.target.value)}
          rows={4}
          placeholder="Ex: 'Um novo software de gestão de projetos com IA para pequenas e médias empresas que otimiza tarefas e comunicação.'"
        />
        <Input
          id="targetAudience"
          label="Público-alvo:"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="Ex: 'Empreendedores, gerentes de equipe, freelancers que buscam eficiência.'"
        />

        <div className="mb-4">
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
            Plataforma:
          </label>
          <select
            id="platform"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleGenerateAd}
          isLoading={loading}
          variant="primary"
          className="w-full md:w-auto mt-4"
        >
          {loading ? 'Gerando Anúncio...' : 'Gerar Anúncio'}
        </Button>
      </div>

      {generatedAd && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Anúncio Gerado para {generatedAd.platform}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Headline:</h4>
              <p className="text-gray-800 text-xl font-medium mb-4">{generatedAd.headline}</p>

              <h4 className="text-lg font-semibold text-gray-700 mb-2">Copy:</h4>
              <p className="prose max-w-none text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-md h-auto" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedAd.copy}
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => alert('Gerar Variações not implemented.')}>Gerar Variações</Button>
                <Button variant="outline" onClick={() => alert('Editar not implemented.')}>Editar</Button>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Criativo Visual:</h4>
              <div className="w-full aspect-square bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200">
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <img
                    src={generatedImageUrl}
                    alt="Generated ad creative"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <Button onClick={handleDownload} className="mt-4 w-full" variant="primary">
                Baixar Criativo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdStudio;