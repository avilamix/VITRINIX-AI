
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Textarea from '../components/Textarea';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import SaveToLibraryButton from '../components/SaveToLibraryButton';
import { generateImage, editImage, generateVideo, analyzeImage, analyzeVideo } from '../services/geminiService';
import {
  GEMINI_IMAGE_PRO_MODEL,
  GEMINI_IMAGE_FLASH_MODEL,
  VEO_FAST_GENERATE_MODEL,
  PLACEHOLDER_IMAGE_BASE64,
  IMAGE_ASPECT_RATIOS,
  IMAGE_SIZES,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RESOLUTION,
} from '../constants';
import { useToast } from '../contexts/ToastContext';

type MediaType = 'image' | 'video';

const CreativeStudio: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState<string | null>(null);
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageAspectRatio, setImageAspectRatio] = useState<string>(DEFAULT_ASPECT_RATIO);
  const [imageSize, setImageSize] = useState<string>(DEFAULT_IMAGE_SIZE);
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(DEFAULT_ASPECT_RATIO);
  const [videoResolution, setVideoResolution] = useState<string>(DEFAULT_VIDEO_RESOLUTION);

  const [savedItemName, setSavedItemName] = useState<string>('');
  const [savedItemTags, setSavedItemTags] = useState<string>('');

  const { addToast } = useToast();
  const userId = 'mock-user-123';

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setGeneratedMediaUrl(null);
      setGeneratedAnalysis(null);
      setError(null);
      setSavedItemName(selectedFile.name.split('.').slice(0, -1).join('.'));

      if (selectedFile.type.startsWith('image')) {
        setMediaType('image');
      } else if (selectedFile.type.startsWith('video')) {
        setMediaType('video');
      } else {
        addToast({ type: 'error', message: 'Tipo de arquivo não suportado. Por favor, envie uma imagem ou vídeo.' });
        setFile(null);
        setPreviewUrl(null);
        setSavedItemName('');
      }
    }
  }, [addToast]);

  const handleGenerateMedia = useCallback(async () => {
    if (!prompt.trim()) {
      addToast({ type: 'warning', message: 'Por favor, insira um prompt para a geração.' });
      setError('A descrição da imagem (Prompt) é obrigatória.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);
    setSavedItemName('');
    setSavedItemTags('');

    try {
      if (mediaType === 'image') {
        const response = await generateImage(prompt, {
          model: GEMINI_IMAGE_PRO_MODEL,
          aspectRatio: imageAspectRatio,
          imageSize: imageSize,
        });
        setGeneratedMediaUrl(response.imageUrl || null);
      } else {
        const response = await generateVideo(prompt, {
          model: VEO_FAST_GENERATE_MODEL,
          config: {
            numberOfVideos: 1,
            resolution: videoResolution as "720p" | "1080p",
            aspectRatio: videoAspectRatio as "16:9" | "9:16"
          }
        });
        setGeneratedMediaUrl(response || null);
      }
      setSavedItemName(`Gerado ${mediaType} - ${prompt.substring(0, 30)}...`);
      addToast({ type: 'success', title: 'Mídia Gerada', message: `${mediaType === 'image' ? 'Imagem' : 'Vídeo'} gerado com sucesso.` });
    } catch (err) {
      const errorMessage = `Falha ao gerar ${mediaType}: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      addToast({ type: 'error', title: 'Erro', message: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [prompt, mediaType, imageAspectRatio, imageSize, videoAspectRatio, videoResolution, addToast]);

  const handleEditMedia = useCallback(async () => {
    if (!file || !previewUrl || !prompt.trim()) {
      addToast({ type: 'warning', message: 'Por favor, carregue um arquivo e insira um prompt para editar.' });
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);
    setSavedItemName('');
    setSavedItemTags('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          // Use Flash Image model for editing per request (Nano Banana)
          const response = await editImage(prompt, base64Data, mimeType, GEMINI_IMAGE_FLASH_MODEL);
          setGeneratedMediaUrl(response.imageUrl || null);
        } else {
          const response = await generateVideo(prompt, {
            model: VEO_FAST_GENERATE_MODEL,
            image: { imageBytes: base64Data, mimeType: mimeType },
            config: {
              numberOfVideos: 1,
              resolution: videoResolution as "720p" | "1080p",
              aspectRatio: videoAspectRatio as "16:9" | "9:16"
            }
          });
          setGeneratedMediaUrl(response || null);
        }
        setSavedItemName(`Editado ${mediaType} - ${prompt.substring(0, 30)}...`);
        addToast({ type: 'success', title: 'Mídia Editada', message: `${mediaType === 'image' ? 'Imagem' : 'Vídeo'} editado com sucesso.` });
      } catch (err) {
        const errorMessage = `Falha ao editar ${mediaType}: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMessage);
        addToast({ type: 'error', title: 'Erro de Edição', message: errorMessage });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (err) => {
      console.error('File reading error:', err);
      addToast({ type: 'error', message: 'Falha ao ler o arquivo para edição.' });
      setLoading(false);
    };
  }, [file, previewUrl, prompt, mediaType, videoAspectRatio, videoResolution, addToast]);

  const handleAnalyzeMedia = useCallback(async () => {
    if (!file || !prompt.trim()) {
      addToast({ type: 'warning', message: 'Por favor, carregue um arquivo e insira um prompt para análise.' });
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedAnalysis(null);
    setSavedItemName('');
    setSavedItemTags('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          const analysis = await analyzeImage(base64Data, mimeType, prompt);
          setGeneratedAnalysis(analysis);
        } else {
          if (file.size > 2 * 1024 * 1024) {
             setGeneratedAnalysis('Análise de vídeo é simulada para vídeos menores ou requer URI do Google Cloud Storage para arquivos maiores. Análise simulada: "Este vídeo parece mostrar conteúdo dinâmico com base no seu prompt."');
          } else {
            setGeneratedAnalysis(`Análise de vídeo simulada para "${file.name}": "O vídeo se alinha com sua solicitação sobre ${prompt}."`);
          }
        }
        // FIX: Add missing 'message' property to the toast object.
        addToast({ type: 'success', title: 'Análise Concluída', message: 'A mídia foi analisada com sucesso.' });
      } catch (err) {
        const errorMessage = `Falha ao analisar ${mediaType}: ${err instanceof Error ? err.message : String(err)}`;
        setError(errorMessage);
        addToast({ type: 'error', title: 'Erro na Análise', message: errorMessage });
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (err) => {
      console.error('File reading error for analysis:', err);
      addToast({ type: 'error', message: 'Falha ao ler o arquivo para análise.' });
      setLoading(false);
    };
  }, [file, prompt, mediaType, addToast]);


  const handleExport = useCallback(() => {
    if (!generatedMediaUrl) {
      addToast({ type: 'warning', message: 'Nenhuma mídia gerada para exportar.' });
      return;
    }
    const link = document.createElement('a');
    link.href = generatedMediaUrl;
    link.download = `vitrinex-creative-${mediaType}-${Date.now()}.${mediaType === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({ type: 'info', message: 'Download iniciado.' });
  }, [generatedMediaUrl, mediaType, addToast]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Estúdio Criativo</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Erro!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 h-full flex flex-col">
          <h3 className="text-xl font-semibold text-textlight mb-5">Ferramentas Criativas</h3>

          <div className="mb-6">
            <label htmlFor="mediaType" className="block text-sm font-medium text-textlight mb-1">
              Tipo de Mídia:
            </label>
            <select
              id="mediaType"
              value={mediaType}
              onChange={(e) => {
                setMediaType(e.target.value as MediaType);
                setFile(null);
                setPreviewUrl(null);
                setGeneratedMediaUrl(null);
                setGeneratedAnalysis(null);
                setSavedItemName('');
                setSavedItemTags('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            >
              <option value="image">Imagem</option>
              <option value="video">Vídeo</option>
            </select>
          </div>

          <Input
            id="fileUpload"
            label="Carregar Mídia Existente:"
            type="file"
            accept={mediaType === 'image' ? 'image/*' : 'video/*'}
            onChange={handleFileChange}
            ref={fileInputRef}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 mb-6"
          />

          {previewUrl && (
            <div className="mt-4 mb-6">
              <p className="text-sm font-medium text-textlight mb-1">Pré-visualização:</p>
              {mediaType === 'image' ? (
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-700" />
              ) : (
                <video src={previewUrl} controls className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-700"></video>
              )}
            </div>
          )}

          {mediaType === 'image' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="imageAspectRatio" className="block text-sm font-medium text-textlight mb-1">Aspect Ratio:</label>
                <select
                  id="imageAspectRatio"
                  value={imageAspectRatio}
                  onChange={(e) => setImageAspectRatio(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
                >
                  {IMAGE_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="imageSize" className="block text-sm font-medium text-textlight mb-1">Tamanho da Imagem:</label>
                <select
                  id="imageSize"
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
                >
                  {IMAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
            </div>
          )}

          {mediaType === 'video' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="videoAspectRatio" className="block text-sm font-medium text-textlight mb-1">Aspect Ratio:</label>
                <select
                  id="videoAspectRatio"
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
                >
                  {VIDEO_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="videoResolution" className="block text-sm font-medium text-textlight mb-1">Resolução:</label>
                <select
                  id="videoResolution"
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
                >
                  {VIDEO_RESOLUTIONS.map(res => <option key={res} value={res}>{res}</option>)}
                </select>
              </div>
            </div>
          )}

          <Textarea
            id="creativePrompt"
            label="Descreva a imagem (Prompt) *"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={`Ex: 'Um cachorro astronauta flutuando no espaço com planetas coloridos.'`}
            className={`flex-1 min-h-[100px] ${!prompt.trim() && error ? 'border-red-500 focus:ring-red-500' : ''}`}
          />

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 pt-4 border-t border-gray-900">
            <Button onClick={handleGenerateMedia} isLoading={loading && !file} variant="primary" className="w-full sm:w-auto">
              {loading && !file ? `Gerando ${mediaType}...` : `Gerar ${mediaType === 'image' ? 'Imagem' : 'Vídeo'} com IA`}
            </Button>
            <Button onClick={handleEditMedia} isLoading={loading && !!file} variant="secondary" disabled={!file} className="w-full sm:w-auto">
              {loading && !!file ? `Editando ${mediaType}...` : `Editar com IA`}
            </Button>
            <Button onClick={handleAnalyzeMedia} isLoading={loading && !!file && generatedAnalysis === null} variant="outline" disabled={!file || !prompt.trim()} className="w-full sm:w-auto">
              {loading && !!file && generatedAnalysis === null ? `Analisando ${mediaType}...` : `Analisar ${mediaType === 'image' ? 'Imagem' : 'Vídeo'}`}
            </Button>
          </div>
        </div>

        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 h-full flex flex-col">
          <h3 className="text-xl font-semibold text-textlight mb-5">Resultados e Exportação</h3>
          <div className="relative w-full aspect-video bg-gray-900 rounded-md flex items-center justify-center overflow-hidden border border-gray-700 mb-6 flex-1">
            {loading && !generatedMediaUrl && !generatedAnalysis ? (
              <LoadingSpinner />
            ) : generatedMediaUrl ? (
              mediaType === 'image' ? (
                <img src={generatedMediaUrl} alt="Generated media" className="w-full h-full object-contain" />
              ) : (
                <video src={generatedMediaUrl} controls className="w-full h-full object-contain"></video>
              )
            ) : (
              <img src={PLACEHOLDER_IMAGE_BASE64} alt="Placeholder" className="w-full h-full object-contain p-8" />
            )}
          </div>

          {generatedAnalysis && (
            <div className="mt-4 p-4 bg-darkbg rounded-md border border-gray-700 flex-1 overflow-y-auto min-h-[100px] mb-6">
              <h4 className="text-lg font-semibold text-textlight mb-3">Análise da IA:</h4>
              <p className="prose max-w-none text-textlight leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedAnalysis}
              </p>
            </div>
          )}

          {(generatedMediaUrl || generatedAnalysis) && (
            <div className="mt-4 pt-4 border-t border-gray-900">
              <h4 className="text-lg font-semibold text-textlight mb-4">Salvar na Biblioteca:</h4>
              <div className="space-y-4">
                 <Input
                    id="savedItemName"
                    label="Nome do Item:"
                    value={savedItemName}
                    onChange={(e) => setSavedItemName(e.target.value)}
                    placeholder={`Nome para ${mediaType === 'image' ? 'a imagem' : 'o vídeo'} gerado`}
                  />
                  <Textarea
                    id="savedItemTags"
                    label="Tags (separadas por vírgula):"
                    value={savedItemTags}
                    onChange={(e) => setSavedItemTags(e.target.value)}
                    placeholder="Ex: 'ai, criativo, campanha, verão'"
                    rows={2}
                  />
                  <SaveToLibraryButton
                    content={generatedMediaUrl || generatedAnalysis || null}
                    type={generatedAnalysis ? 'text' : mediaType}
                    userId={userId}
                    initialName={savedItemName}
                    tags={savedItemTags.split(',').map(t => t.trim()).filter(Boolean)}
                    variant="primary"
                    className="w-full sm:w-auto"
                    disabled={!savedItemName.trim()}
                  />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-auto pt-4 border-t border-gray-900">
             <Button onClick={handleExport} variant="secondary" disabled={!generatedMediaUrl || loading} className="w-full sm:w-auto">Exportar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeStudio;
