import React, { useState, useCallback, useRef } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input'; // Import Input for name/tags
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';
import { uploadFile } from '../services/cloudStorageService'; // For uploading audio file
import { saveLibraryItem } from '../services/firestoreService'; // For saving metadata
import { LibraryItem } from '../types'; // Import LibraryItem
import { SpeakerWaveIcon, PlayIcon, StopIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
const VOICE_OPTIONS: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const AudioTools: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null); // Store the generated WAV blob

  // State for saving to library
  const [savedItemName, setSavedItemName] = useState<string>('');
  const [savedItemTags, setSavedItemTags] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const userId = 'mock-user-123'; // Mock user ID

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
    }
  }, []);

  const handleGenerateSpeech = useCallback(async () => {
    if (!inputText.trim()) {
      setError('Por favor, insira o texto para gerar a fala.');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    setGeneratedAudioBlob(null); // Clear previous blob
    setSavedItemName(''); // Clear previous save name
    setSavedItemTags(''); // Clear previous save tags

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    try {
      const base64Audio = await generateSpeech(inputText, selectedVoice);
      if (base64Audio) {
        initAudioContext();
        if (audioContextRef.current) {
          const buffer = await decodeAudioData(
            decode(base64Audio),
            audioContextRef.current,
            24000,
            1,
          );
          setAudioBuffer(buffer);

          // Convert AudioBuffer to WAV Blob for download/save
          const audioData = buffer.getChannelData(0);
          const sampleRate = buffer.sampleRate;
          const numChannels = buffer.numberOfChannels;

          function floatTo16BitPCM(input: Float32Array) {
            const output = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            return output;
          }

          function writeString(view: DataView, offset: number, s: string) {
            for (let i = 0; i < s.length; i++) {
              view.setUint8(offset + i, s.charCodeAt(i));
            }
          }

          const dataLength = audioData.length * numChannels * 2; // 2 bytes per sample
          const bufferBytes = new ArrayBuffer(44 + dataLength);
          const view = new DataView(bufferBytes);

          // WAV header
          writeString(view, 0, 'RIFF'); // ChunkID
          view.setUint32(4, 36 + dataLength, true); // ChunkSize
          writeString(view, 8, 'WAVE'); // Format
          writeString(view, 12, 'fmt '); // Subchunk1ID
          view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
          view.setUint16(20, 1, true); // AudioFormat (PCM = 1)
          view.setUint16(22, numChannels, true); // NumChannels
          view.setUint32(24, sampleRate, true); // SampleRate
          view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
          view.setUint16(32, numChannels * 2, true); // BlockAlign
          view.setUint16(34, 16, true); // BitsPerSample

          writeString(view, 36, 'data'); // Subchunk2ID
          view.setUint32(40, dataLength, true); // Subchunk2Size

          const pcmData = floatTo16BitPCM(audioData);
          let offset = 44;
          for (let i = 0; i < pcmData.length; i++) {
            view.setInt16(offset, pcmData[i], true);
            offset += 2;
          }
          const wavBlob = new Blob([view], { type: 'audio/wav' });
          setGeneratedAudioBlob(wavBlob);
          setSavedItemName(`Generated speech - ${inputText.substring(0, 30)}...`); // Pre-fill name
        } else {
          throw new Error("AudioContext not initialized.");
        }
      } else {
        setError('Nenhuma fala gerada.');
      }
    } catch (err) {
      console.error('Erro ao gerar fala:', err);
      setError(`Falha ao gerar fala: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedVoice, initAudioContext]);

  const handlePlayAudio = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  }, [audioBuffer]);

  const handleStopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const handleDownloadAudio = useCallback(() => {
    if (!generatedAudioBlob) {
      setError('Nenhum áudio gerado para baixar.');
      return;
    }
    const url = URL.createObjectURL(generatedAudioBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitrinex-speech-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generatedAudioBlob]);

  const handleSaveAudioToLibrary = useCallback(async () => {
    if (!generatedAudioBlob) {
      setError('Nenhum áudio gerado para salvar na biblioteca.');
      return;
    }
    if (!savedItemName.trim()) {
      setError('Por favor, forneça um nome para o item.');
      return;
    }

    setLoading(true); // Use loading state for saving process
    setError(null);

    try {
      const fileName = `${savedItemName.trim()}.wav`;
      const audioFile = new File([generatedAudioBlob], fileName, { type: 'audio/wav' });

      // Upload the actual audio file to Cloud Storage (mock)
      const uploadedItem = await uploadFile(audioFile, userId, 'audio' as LibraryItem['type']); // Cast 'audio' to LibraryItem['type']

      const tagsArray = savedItemTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const libraryItemToSave: LibraryItem = {
        ...uploadedItem, // Use id, userId, createdAt, file_url, thumbnail_url from the uploadedItem
        type: 'audio' as LibraryItem['type'], // Explicitly set type to audio
        name: fileName, // Use the user-provided name
        tags: tagsArray,
      };
      await saveLibraryItem(libraryItemToSave); // Save metadata to Firestore
      alert(`Áudio "${fileName}" salvo na biblioteca com sucesso!`);
      setSavedItemName('');
      setSavedItemTags('');
    } catch (err) {
      console.error('Erro ao salvar áudio na biblioteca:', err);
      setError(`Falha ao salvar áudio na biblioteca: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [generatedAudioBlob, savedItemName, savedItemTags, userId]);


  return (
    <div className="container mx-auto max-w-3xl py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Ferramentas de Áudio (Texto para Fala)</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-8">
        <h3 className="text-xl font-semibold text-textlight mb-5">Gerar Fala a partir de Texto</h3>
        <Textarea
          id="speechText"
          label="Texto para converter em fala:"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={6}
          placeholder="Ex: 'Bem-vindo à VitrineX AI, sua solução completa de marketing com inteligência artificial!'"
        />

        <div className="mb-6">
          <label htmlFor="voiceSelect" className="block text-sm font-medium text-textlight mb-1">
            Voz da IA:
          </label>
          <select
            id="voiceSelect"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
            className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            disabled={loading}
          >
            {VOICE_OPTIONS.map(voice => (
              <option key={voice} value={voice}>{voice}</option>
            ))}
          </select>
        </div>

        <Button
          onClick={handleGenerateSpeech}
          isLoading={loading}
          variant="primary"
          className="w-full md:w-auto mt-4"
          disabled={!inputText.trim()}
        >
          {loading ? 'Gerando Fala...' : 'Gerar Fala'}
        </Button>
      </div>

      {audioBuffer && (
        <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-xl font-semibold text-textlight mb-5">Reprodução e Download</h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Button
              onClick={handlePlayAudio}
              variant="primary"
              size="lg"
              disabled={isPlaying || loading}
              className="w-full sm:w-auto"
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Reproduzir
            </Button>
            <Button
              onClick={handleStopAudio}
              variant="secondary"
              size="lg"
              disabled={!isPlaying || loading}
              className="w-full sm:w-auto"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Parar
            </Button>
            <Button
              onClick={handleDownloadAudio}
              variant="outline"
              size="lg"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Baixar (.wav)
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-900">
            <h4 className="text-lg font-semibold text-textlight mb-4">Salvar na Biblioteca:</h4>
            <Input
              id="savedAudioName"
              label="Nome do Áudio:"
              value={savedItemName}
              onChange={(e) => setSavedItemName(e.target.value)}
              placeholder="Nome para o áudio gerado"
            />
            <Textarea
              id="savedAudioTags"
              label="Tags (separadas por vírgula):"
              value={savedItemTags}
              onChange={(e) => setSavedItemTags(e.target.value)}
              placeholder="Ex: 'tts, saudação, marketing'"
              rows={2}
            />
            <Button
              onClick={handleSaveAudioToLibrary}
              isLoading={loading}
              variant="primary"
              className="w-full md:w-auto mt-4"
              disabled={!generatedAudioBlob || !savedItemName.trim()}
            >
              {loading ? 'Salvando...' : 'Salvar na Biblioteca'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioTools;