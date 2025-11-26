import React, { useState, useCallback, useRef } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      // FIX: Replace window.webkitAudioContext with window.AudioContext
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
    if (!audioBuffer || !audioContextRef.current) {
      setError('Nenhum áudio gerado para baixar.');
      return;
    }

    // Convert AudioBuffer to WAV format
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;

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
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

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

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitrinex-speech-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [audioBuffer]);


  return (
    <div className="container mx-auto max-w-3xl">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Ferramentas de Áudio (Texto para Fala)</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Gerar Fala a partir de Texto</h3>
        <Textarea
          id="speechText"
          label="Texto para converter em fala:"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={6}
          placeholder="Ex: 'Bem-vindo à VitrineX AI, sua solução completa de marketing com inteligência artificial!'"
        />

        <div className="mb-4">
          <label htmlFor="voiceSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Voz da IA:
          </label>
          <select
            id="voiceSelect"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Reprodução e Download</h3>
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={handlePlayAudio}
              variant="primary"
              size="lg"
              disabled={isPlaying || loading}
            >
              <PlayIcon className="h-5 w-5 mr-2" />
              Reproduzir
            </Button>
            <Button
              onClick={handleStopAudio}
              variant="secondary"
              size="lg"
              disabled={!isPlaying || loading}
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Parar
            </Button>
            <Button
              onClick={handleDownloadAudio}
              variant="outline"
              size="lg"
              disabled={loading}
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Baixar (.wav)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioTools;