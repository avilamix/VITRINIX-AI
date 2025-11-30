

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Textarea from '../components/Textarea';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import SaveToLibraryButton from '../components/SaveToLibraryButton';
import { generateImage, editImage, generateVideo, analyzeImage, analyzeVideo } from '../services/geminiService';
import {
  GEMINI_IMAGE_PRO_MODEL,
  VEO_FAST_GENERATE_MODEL,
  PLACEHOLDER_IMAGE_BASE64,
  IMAGE_ASPECT_RATIOS,
  IMAGE_SIZES,
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_VIDEO_RESOLUTION,
  LIBRARY_ITEM_TYPES, // Import from frontend constants
} from '../constants';

interface CreativeStudioProps {
  organizationId: string | undefined;
  userId: string | undefined;
}

type MediaType = 'image' | 'video' | 'audio' | 'text' | 'post' | 'ad'; // Estendido para incluir mais tipos

const CreativeStudio: React.FC<CreativeStudioProps> = ({ organizationId, userId }) => {
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

  // State for saving to library
  const [savedItemName, setSavedItemName] = useState<string>('');
  const [savedItemTags, setSavedItemTags] = useState<string>('');


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setGeneratedMediaUrl(null); // Clear generated media when new file is uploaded
      setGeneratedAnalysis(null); // Clear analysis
      setError(null);
      // FIX: Ensure file.name is accessed safely
      setSavedItemName(selectedFile.name.split('.').slice(0, -1).join('.')); // Pre-fill name

      // Determine media type based on file type
      if (selectedFile.type.startsWith('image')) {
        setMediaType('image');
      } else if (selectedFile.type.startsWith('video')) {
        setMediaType('video');
      } else if (selectedFile.type.startsWith('audio')) {
        setMediaType('audio');
      } else if (selectedFile.type.startsWith('text') || selectedFile.type === 'application/pdf') {
        setMediaType('text');
      } else {
        setError('Unsupported file type. Please upload an image, video, audio, or text document.');
        setFile(null);
        setPreviewUrl(null);
        setSavedItemName('');
      }
    }
  }, []); // Remove file from dependency array, use selectedFile directly

  const handleGenerateMedia = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for generation.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);
    setSavedItemName(''); // Clear previous save name
    setSavedItemTags(''); // Clear previous save tags

    try {
      if (mediaType === 'image') {
        const response = await generateImage(prompt, {
          model: GEMINI_IMAGE_PRO_MODEL,
          aspectRatio: imageAspectRatio,
          imageSize: imageSize,
        });
        setGeneratedMediaUrl(response.imageUrl || null);
      } else if (mediaType === 'video') { 
        const response = await generateVideo(prompt, {
          model: VEO_FAST_GENERATE_MODEL,
          config: {
            numberOfVideos: 1,
            resolution: videoResolution as "720p" | "1080p",
            aspectRatio: videoAspectRatio as "16:9" | "9:16"
          }
        });
        setGeneratedMediaUrl(response || null);
      } else {
        setError(`Generation for media type "${mediaType}" is not yet implemented.`);
        return;
      }
      setSavedItemName(`Generated ${mediaType} - ${prompt.substring(0, 30)}...`); // Pre-fill name based on prompt
    } catch (err) {
      console.error(`Error generating ${mediaType}:`, err);
      setError(`Failed to generate ${mediaType}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, mediaType, imageAspectRatio, imageSize, videoAspectRatio, videoResolution, organizationId]);

  const handleEditMedia = useCallback(async () => {
    if (!file || !previewUrl || !prompt.trim()) {
      setError('Please upload a file and enter a prompt for editing.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);
    setSavedItemName(''); // Clear previous save name
    setSavedItemTags(''); // Clear previous save tags

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1]; // Extract base64 part
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          const response = await editImage(prompt, base64Data, mimeType, GEMINI_IMAGE_PRO_MODEL);
          setGeneratedMediaUrl(response.imageUrl || null);
        } else if (mediaType === 'video') {
          // Video editing is complex and usually involves multiple frames or specialized APIs.
          // For this example, we'll simulate video editing as if it's generating a new video based on existing and prompt.
          const response = await generateVideo(prompt, {
            model: VEO_FAST_GENERATE_MODEL,
            image: { imageBytes: base64Data, mimeType: mimeType }, // Use initial frame as reference
            config: {
              numberOfVideos: 1,
              resolution: videoResolution as "720p" | "1080p",
              aspectRatio: videoAspectRatio as "16:9" | "9:16"
            }
          });
          setGeneratedMediaUrl(response || null);
        } else {
          setError(`Editing for media type "${mediaType}" is not yet implemented.`);
          return;
        }
        setSavedItemName(`Edited ${mediaType} - ${prompt.substring(0, 30)}...`); // Pre-fill name based on prompt
      } catch (err) {
        console.error(`Error editing ${mediaType}:`, err);
        setError(`Failed to edit ${mediaType}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (err) => {
      console.error('File reading error:', err);
      setError('Failed to read file for editing.');
      setLoading(false);
    };
  }, [file, previewUrl, prompt, mediaType, videoAspectRatio, videoResolution, organizationId]);

  const handleAnalyzeMedia = useCallback(async () => {
    if (!file || !prompt.trim()) { // Removed previewUrl check as file is sufficient
      setError('Please upload a file and enter a prompt for analysis.');
      return;
    }
    if (!organizationId) {
      setError('No active organization found. Please login.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedAnalysis(null); // Clear previous analysis
    setSavedItemName(''); // Clear previous save name
    setSavedItemTags(''); // Clear previous save tags

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1]; // Extract base64 part
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          const analysis = await analyzeImage(base64Data, mimeType, prompt);
          setGeneratedAnalysis(analysis);
        } else if (mediaType === 'video') { // mediaType === 'video'
          // For video analysis, Gemini expects a GCS URI or similar, not inlineData.
          // This is a simplification. In a real app, the video would need to be uploaded to GCS first.
          // For now, we'll just log an error or provide a mock analysis.
          if (file.size > 2 * 1024 * 1024) { // Roughly check if it's too large for direct analysis in mock.
             setGeneratedAnalysis('Video analysis is currently simulated for smaller videos, or requires Google Cloud Storage URI for larger files. Mock analysis: "This video appears to show dynamic content based on your prompt."');
          } else {
            // In a real scenario, you'd upload the video to GCS and pass its URI.
            // For this mock, we'll just use the prompt as a basis for a simple response.
            setGeneratedAnalysis(`Simulated video analysis for "${file.name}": "The video aligns with your request regarding ${prompt}."`);
          }
        } else {
          setError(`Analysis for media type "${mediaType}" is not yet implemented.`);
          return;
        }
      } catch (err) {
        console.error(`Error analyzing ${mediaType}:`, err);
        setError(`Failed to analyze ${mediaType}: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = (err) => {
      console.error('File reading error for analysis:', err);
      setError('Failed to read file for analysis.');
      setLoading(false);
    };
  }, [file, prompt, mediaType, organizationId]);


  const handleExport = useCallback(() => {
    if (!generatedMediaUrl) {
      setError('No generated media to export.');
      return;
    }
    const link = document.createElement('a');
    link.href = generatedMediaUrl;
    link.download = `vitrinex-creative-${mediaType}-${Date.now()}.${mediaType === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedMediaUrl, mediaType]);

  useEffect(() => {
    // Clean up previous preview URL when file changes or component unmounts
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Creative Studio</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input/Controls Panel */}
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
                setFile(null); // Clear file when changing media type
                setPreviewUrl(null);
                setGeneratedMediaUrl(null);
                setGeneratedAnalysis(null);
                setSavedItemName('');
                setSavedItemTags('');
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            >
              {LIBRARY_ITEM_TYPES.map(typeOption => (
                 <option key={typeOption} value={typeOption}>{typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}</option>
              ))}
            </select>
          </div>

          <Input
            id="fileUpload"
            label="Carregar Mídia Existente:"
            type="file"
            // Adjust accepted file types based on selected mediaType
            accept={
              mediaType === 'image' ? 'image/*' :
              mediaType === 'video' ? 'video/*' :
              mediaType === 'audio' ? 'audio/*' :
              mediaType === 'text' ? 'text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              '*/*' // Fallback for 'other' or unspecified
            }
            onChange={handleFileChange}
            ref={fileInputRef}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80 mb-6"
          />

          {previewUrl && (
            <div className="mt-4 mb-6">
              <p className="text-sm font-medium text-textlight mb-1">Pré-visualização:</p>
              {mediaType === 'image' ? (
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-700" />
              ) : mediaType === 'video' ? (
                <video src={previewUrl} controls className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-700"></video>
              ) : mediaType === 'audio' ? (
                <audio src={previewUrl} controls className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-700"></audio>
              ) : ( // Text or other
                <div className="w-full h-auto max-h-48 overflow-y-auto p-4 bg-darkbg rounded-md border border-gray-700 text-sm text-textlight">
                  <p>Text file preview not available. File name: {file?.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Image Generation Specific Controls */}
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
                <label htmlFor="imageSize" className="block text-sm font-medium text-textlight mb-1">Image Size:</label>
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

          {/* Video Generation Specific Controls */}
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
                <label htmlFor="videoResolution" className="block text-sm font-medium text-textlight mb-1">Resolution:</label>
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
            label="Descreva sua criação, edição ou análise (prompt para IA):"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={`Ex: 'Um cachorro astronauta flutuando no espaço com planetas coloridos.' ou 'Transforme esta imagem em um estilo cyberpunk.' ou 'Analise o objeto principal nesta imagem e descreva-o.'`}
            className="flex-1 min-h-[100px]"
          />

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 pt-4 border-t border-gray-900">
            <Button onClick={handleGenerateMedia} isLoading={loading && !file} variant="primary" className="w-full sm:w-auto">
              {loading && !file ? `Gerando ${mediaType}...` : `Gerar ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} IA`}
            </Button>
            <Button onClick={handleEditMedia} isLoading={loading && !!file} variant="secondary" disabled={!file || mediaType === 'audio' || mediaType === 'text'} className="w-full sm:w-auto">
              {loading && !!file ? `Editando ${mediaType}...` : `Editar com IA`}
            </Button>
            <Button onClick={handleAnalyzeMedia} isLoading={loading && !!file && generatedAnalysis === null} variant="outline" disabled={!file || !prompt.trim()} className="w-full sm:w-auto">
              {loading && !!file && generatedAnalysis === null ? `Analisando ${mediaType}...` : `Analisar ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`}
            </Button>
          </div>
        </div>

        {/* Output/Viewer Panel */}
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 h-full flex flex-col">
          <h3 className="text-xl font-semibold text-textlight mb-5">Resultados e Exportação</h3>
          <div className="relative w-full aspect-video bg-gray-900 rounded-md flex items-center justify-center overflow-hidden border border-gray-700 mb-6 flex-1">
            {loading && !generatedMediaUrl && !generatedAnalysis ? ( // Show spinner only if actively generating/analyzing and no result yet
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
                    placeholder={`Nome para o ${mediaType} gerado`}
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
                    organizationId={organizationId} // Pass organizationId
                    userId={userId} // Pass userId
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