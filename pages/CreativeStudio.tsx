import React, { useState, useCallback, useRef } from 'react';
import Textarea from '../components/Textarea';
import Input from '../components/Input';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateImage, editImage, generateVideo, analyzeImage, analyzeVideo } from '../services/geminiService';
import { uploadFile } from '../services/cloudStorageService';
import { saveLibraryItem } from '../services/firestoreService';
import { LibraryItem } from '../types';
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
} from '../constants';

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


  const userId = 'mock-user-123';

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setGeneratedMediaUrl(null); // Clear generated media when new file is uploaded
      setGeneratedAnalysis(null); // Clear analysis
      setError(null);

      // Determine media type based on file type
      if (selectedFile.type.startsWith('image')) {
        setMediaType('image');
      } else if (selectedFile.type.startsWith('video')) {
        setMediaType('video');
      } else {
        setError('Unsupported file type. Please upload an image or video.');
        setFile(null);
        setPreviewUrl(null);
      }
    }
  }, []);

  const handleGenerateMedia = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for generation.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);

    try {
      if (mediaType === 'image') {
        const response = await generateImage(prompt, {
          model: GEMINI_IMAGE_PRO_MODEL,
          aspectRatio: imageAspectRatio,
          imageSize: imageSize,
        });
        setGeneratedMediaUrl(response.imageUrl || null);
      } else { // mediaType === 'video'
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
    } catch (err) {
      console.error(`Error generating ${mediaType}:`, err);
      setError(`Failed to generate ${mediaType}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [prompt, mediaType, imageAspectRatio, imageSize, videoAspectRatio, videoResolution]);

  const handleEditMedia = useCallback(async () => {
    if (!file || !previewUrl || !prompt.trim()) {
      setError('Please upload a file and enter a prompt for editing.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedMediaUrl(null);
    setGeneratedAnalysis(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1]; // Extract base64 part
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          const response = await editImage(prompt, base64Data, mimeType, GEMINI_IMAGE_PRO_MODEL);
          setGeneratedMediaUrl(response.imageUrl || null);
        } else {
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
        }
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
  }, [file, previewUrl, prompt, mediaType, videoAspectRatio, videoResolution]);

  const handleAnalyzeMedia = useCallback(async () => {
    if (!file || !previewUrl || !prompt.trim()) {
      setError('Please upload a file and enter a prompt for analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedAnalysis(null); // Clear previous analysis

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(',')[1]; // Extract base64 part
      const mimeType = file.type;

      try {
        if (mediaType === 'image') {
          const analysis = await analyzeImage(base64Data, mimeType, prompt);
          setGeneratedAnalysis(analysis);
        } else { // mediaType === 'video'
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
  }, [file, previewUrl, prompt, mediaType]);


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

  const handleSaveProject = useCallback(async () => {
    if (!generatedMediaUrl) {
      setError('No generated media to save.');
      return;
    }
    let fileToUpload = file;
    let fileName = file?.name || `generated-${mediaType}-${Date.now()}.${mediaType === 'image' ? 'png' : 'mp4'}`;
    let fileType = file?.type || (mediaType === 'image' ? 'image/png' : 'video/mp4');

    if (!fileToUpload) { // If it was a generation, create a dummy file for upload
      try {
        const response = await fetch(generatedMediaUrl);
        const blob = await response.blob();
        fileToUpload = new File([blob], fileName, { type: fileType });
      } catch (fetchError) {
        console.error('Error fetching generated media for saving:', fetchError);
        setError(`Failed to fetch generated media to save: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      if (fileToUpload) {
        const item = await uploadFile(fileToUpload, userId, mediaType); // Upload original or generated as new file
        await saveLibraryItem({ ...item, file_url: generatedMediaUrl, name: `${prompt || 'Generated'} ${item.name}` });
        alert('Projeto salvo na biblioteca!');
      } else {
        alert('Nenhum arquivo para salvar. Gere algo primeiro.');
      }
    } catch (err) {
      console.error('Error saving project:', err);
      setError(`Failed to save project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [generatedMediaUrl, file, userId, mediaType, prompt]);

  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Creative Studio</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input/Controls Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Ferramentas Criativas</h3>

          <div className="mb-4">
            <label htmlFor="mediaType" className="block text-sm font-medium text-gray-700 mb-1">
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
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-indigo-700"
          />

          {previewUrl && (
            <div className="mt-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Pré-visualização:</p>
              {mediaType === 'image' ? (
                <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-200" />
              ) : (
                <video src={previewUrl} controls className="w-full h-auto max-h-48 object-contain rounded-md border border-gray-200"></video>
              )}
            </div>
          )}

          {/* Image Generation Specific Controls */}
          {mediaType === 'image' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="imageAspectRatio" className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio:</label>
                <select
                  id="imageAspectRatio"
                  value={imageAspectRatio}
                  onChange={(e) => setImageAspectRatio(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  {IMAGE_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="imageSize" className="block text-sm font-medium text-gray-700 mb-1">Image Size:</label>
                <select
                  id="imageSize"
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  {IMAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Video Generation Specific Controls */}
          {mediaType === 'video' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="videoAspectRatio" className="block text-sm font-medium text-gray-700 mb-1">Aspect Ratio:</label>
                <select
                  id="videoAspectRatio"
                  value={videoAspectRatio}
                  onChange={(e) => setVideoAspectRatio(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  {VIDEO_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="videoResolution" className="block text-sm font-medium text-gray-700 mb-1">Resolution:</label>
                <select
                  id="videoResolution"
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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

          <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-100">
            <Button onClick={handleGenerateMedia} isLoading={loading && !file} variant="primary">
              {loading && !file ? `Gerando ${mediaType}...` : `Gerar ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} IA`}
            </Button>
            <Button onClick={handleEditMedia} isLoading={loading && !!file} variant="secondary" disabled={!file}>
              {loading && !!file ? `Editando ${mediaType}...` : `Editar com IA`}
            </Button>
            <Button onClick={handleAnalyzeMedia} isLoading={loading && !!file && generatedAnalysis === null} variant="outline" disabled={!file || !prompt.trim()}>
              {loading && !!file && generatedAnalysis === null ? `Analisando ${mediaType}...` : `Analisar ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`}
            </Button>
          </div>
        </div>

        {/* Output/Viewer Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Resultados e Exportação</h3>
          <div className="relative w-full aspect-video bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-200 mb-4 flex-1">
            {loading ? (
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
            <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200 flex-1 overflow-y-auto">
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Análise da IA:</h4>
              <p className="prose max-w-none text-gray-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                {generatedAnalysis}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-4 border-t border-gray-100">
            <Button onClick={handleExport} variant="primary" disabled={!generatedMediaUrl}>Exportar</Button>
            <Button onClick={handleSaveProject} variant="secondary" disabled={!generatedMediaUrl}>Salvar Projeto</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeStudio;