

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
import { getActiveOrganization } from '../services/authService';

type Platform = 'Instagram' | 'Facebook' | 'TikTok' | 'Google' | 'Pinterest';

const platforms: Platform[] = ['Instagram', 'Facebook', 'TikTok', 'Google', 'Pinterest'];

// Helper para fazer requisições ao backend Files (para LibraryItems)
const BACKEND_URL = 'http://localhost:3000'; // Exemplo para desenvolvimento
async function uploadFileToBackend(
  file: File,
  name: string,
  type: string, // e.g., 'image', 'video', 'audio', 'text'
  tags: string[],
): Promise<any> {
  const activeOrg = getActiveOrganization();
  if (!activeOrg) throw new Error('No active organization found.');
  const organizationId = activeOrg.organization.id;
  const idToken = 'mock-firebase-id-token'; // FIXME: Obter do authService real

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);
  formData.append('type', type);
  formData.append('tags', tags.join(','));

  const response = await fetch(`${BACKEND_URL}/organizations/${organizationId}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `File upload failed: ${response.statusText}`);
  }
  return response.json();
}

const AdStudio: React.FC = () => {
  const [productDescription, setProductDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Instagram');
  const [generatedAd, setGeneratedAd] = useState<Ad | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>(PLACEHOLDER_IMAGE_BASE64);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const activeOrganization = getActiveOrganization();
  const organizationId = activeOrganization?.organization.id;
  const userId = 'mock-user-123'; // FIXME: Obter do contexto de autenticação real

  const handleGenerateAd = useCallback(async () => {
    if (!productDescription.trim() || !targetAudience.trim()) {
      setError('Please provide product description and target audience.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
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
        id: '', // Backend will assign
        organizationId: organizationId,
        userId: userId,
        platform: selectedPlatform,
        headline: adData.headline,
        copy: adData.copy,
        createdAt: new Date(), // Backend will set
        updatedAt: new Date(), // Backend will set
      };

      setGeneratedAd(newAd);

      const imageResponse = await generateImage(adData.visual_description, {
        model: GEMINI_IMAGE_PRO_MODEL,
        aspectRatio: '1:1', // Common for most platforms
        imageSize: '1K',
      });
      setGeneratedImageUrl(imageResponse.imageUrl || PLACEHOLDER_IMAGE_BASE64);
      newAd.mediaUrl = imageResponse.imageUrl || undefined; // Add image URL to ad object

      // No immediate save here, user explicitly clicks 'Salvar Anúncio'
    } catch (err) {
      console.error('Error generating ad:', err);
      setError(`Failed to generate ad: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [productDescription, targetAudience, selectedPlatform, organizationId, userId]);

  const handleDownload = useCallback(async () => {
    if (!generatedImageUrl) {
      setError('No image to download.');
      return;
    }

    // Fetch the image data to create a Blob, then a File
    const response = await fetch(generatedImageUrl);
    const blob = await response.blob();
    const fileName = `vitrinex-ad-${selectedPlatform}-${Date.now()}.png`;
    const imageFile = new File([blob], fileName, { type: blob.type });

    // Directly use the browser's download mechanism for the File
    const link = document.createElement('a');
    link.href = URL.createObjectURL(imageFile);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  }, [generatedImageUrl, selectedPlatform]);

  const handleSaveAd = useCallback(async () => {
    if (!generatedAd || !organizationId) {
      setError('Nenhum anúncio para salvar. Gere um anúncio primeiro.');
      return;
    }
    setLoading(true); // Re-use loading state for saving
    setError(null);
    try {
      const savedAd = await saveAd(generatedAd); // Save to backend
      alert(`Anúncio para "${savedAd.platform}" salvo com sucesso!`);
    } catch (err) {
      console.error('Error saving ad:', err);
      setError(`Falha ao salvar anúncio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [generatedAd, organizationId]);


  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Ad Studio</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Detalhes do Anúncio</h3>
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

        <div className="mb-6">
          <label htmlFor="platform" className="block text-sm font-medium text-textlight mb-1">
            Plataforma:
          </label>
          <select
            id="platform"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
            className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
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
          isLoading={loading && !generatedAd}
          variant="primary"
          className="w-full md:w-auto mt-4"
        >
          {loading && !generatedAd ? 'Gerando Anúncio...' : 'Gerar Anúncio'}
        </Button>
      </div>

      {generatedAd && (
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-xl font-semibold text-textlight mb-5">Anúncio Gerado para {generatedAd.platform}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-textlight mb-3">Headline:</h4>
              <p className="text-textdark text-xl font-medium mb-4">{generatedAd.headline}</p>

              <h4 className="text-lg font-semibold text-textlight mb-3">Copy:</h4>
              <p className="prose max-w-none text-textlight leading-relaxed bg-darkbg p-4 rounded-md h-auto min-h-[150px]" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedAd.copy}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => alert('Gerar Variações not implemented.')}>Gerar Variações</Button>
                <Button variant="outline" onClick={() => alert('Editar not implemented.')}>Editar</Button>
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-textlight mb-3">Criativo Visual:</h4>
              <div className="w-full aspect-square bg-gray-900 rounded-md flex items-center justify-center overflow-hidden border border-gray-700">
                {loading && !generatedImageUrl ? ( // Only show spinner if image is actively loading
                  <LoadingSpinner />
                ) : (
                  <img
                    src={generatedImageUrl}
                    alt="Generated ad creative"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handleDownload} variant="primary" className="w-full sm:w-auto">
                  Baixar Criativo
                </Button>
                <Button onClick={handleSaveAd} variant="primary" isLoading={loading} disabled={!generatedAd} className="w-full sm:w-auto">
                  {loading && generatedAd ? 'Salvando Anúncio...' : 'Salvar Anúncio'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdStudio;