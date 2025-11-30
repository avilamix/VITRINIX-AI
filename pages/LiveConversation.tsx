import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { connectLiveSession, createBlob, decodeAudioData, decode } from '../services/geminiService';
import { LiveSessionCallbacks } from '../services/geminiService';
import { ChatBubbleLeftRightIcon, MicrophoneIcon, SpeakerWaveIcon, StopCircleIcon } from '@heroicons/react/24/outline';
import { TranscriptionSegment } from '../types'; // Import TranscriptionSegment

type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
const VOICE_OPTIONS: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const LiveConversation: React.FC = () => {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [systemInstruction, setSystemInstruction] = useState<string>('You are a friendly and helpful customer support agent.');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');

  const sessionPromiseRef = useRef<ReturnType<typeof connectLiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [currentInputTranscription, setCurrentInputTranscription] = useState<string>('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ user: string; model: string }>>([]);

  const cleanupAudio = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close().catch(console.error);
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close().catch(console.error);
    }
    for (const source of audioSourcesRef.current.values()) {
      source.stop();
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    outputNodeRef.current = null;
    mediaStreamRef.current = null;
  }, []);

  const startConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    setConversationHistory([]);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new window.AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

      const liveCallbacks: LiveSessionCallbacks = {
        onopen: () => {
          setIsLive(true);
          setLoading(false);
          source.connect(scriptProcessorRef.current!);
          scriptProcessorRef.current!.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message) => {
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
          if (base64EncodedAudioString && outputAudioContextRef.current && outputNodeRef.current) {
            nextStartTimeRef.current = Math.max(
              nextStartTimeRef.current,
              outputAudioContextRef.current.currentTime,
            );
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              outputAudioContextRef.current,
              24000,
              1,
            );
            const audioSource = outputAudioContextRef.current.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(outputNodeRef.current);
            audioSource.addEventListener('ended', () => {
              audioSourcesRef.current.delete(audioSource);
            });

            audioSource.start(nextStartTimeRef.current);
            nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
            audioSourcesRef.current.add(audioSource);
          }

          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const src of audioSourcesRef.current.values()) {
              src.stop();
              audioSourcesRef.current.delete(src);
            }
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error('Live conversation error:', e);
          setError(`Live conversation error: ${e.message}`);
          stopConversation();
        },
        onclose: (e) => {
          console.debug('Live conversation closed:', e);
          stopConversation();
        },
        onTranscriptionUpdate: (input, output) => {
          setCurrentInputTranscription(input);
          setCurrentOutputTranscription(output);
        },
        onTurnComplete: (input, output) => {
          setConversationHistory((prev) => [...prev, { user: input, model: output }]);
          setCurrentInputTranscription('');
          setCurrentOutputTranscription('');
        }
      };

      const session = await connectLiveSession(liveCallbacks, systemInstruction, [
        // Example function declaration for Live API if needed
        // {
        //   functionDeclarations: [{
        //     name: 'controlLight', parameters: {
        //       type: 'OBJECT', properties: { brightness: { type: 'NUMBER' } }, required: ['brightness']
        //     }
        //   }]
        // }
      ]);
      sessionPromiseRef.current = Promise.resolve(session); // Store resolved session promise

      scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        sessionPromiseRef.current?.then((s) => {
          s.sendRealtimeInput({ media: pcmBlob });
        });
      };

    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(`Failed to start conversation: ${err instanceof Error ? err.message : String(err)}. Please ensure microphone access is granted.`);
      setLoading(false);
      cleanupAudio();
    }
  }, [cleanupAudio, systemInstruction]);

  const stopConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const session = await sessionPromiseRef.current;
      if (session) {
        session.close();
      }
    } catch (err) {
      console.error('Error closing session:', err);
    } finally {
      setIsLive(false);
      setLoading(false);
      cleanupAudio();
    }
  }, [cleanupAudio]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isLive) {
        stopConversation();
      }
      cleanupAudio();
    };
  }, [isLive, stopConversation, cleanupAudio]);

  return (
    <div className="container mx-auto max-w-3xl flex flex-col h-[calc(100vh-140px)] py-8 lg:py-10">
      <h2 className="text-3xl font-bold text-textdark mb-8">Live Conversation (Voice AI)</h2>

      {error && (
        <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded relative mb-8" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      <div className="bg-lightbg p-6 rounded-lg shadow-sm border border-gray-800 mb-6 flex-grow flex flex-col">
        <div className="mb-6">
          <label htmlFor="systemInstruction" className="block text-sm font-medium text-textlight mb-1">
            Instrução do Sistema (para a IA):
          </label>
          <textarea
            id="systemInstruction"
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark placeholder-textmuted focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm resize-y"
            placeholder="Ex: 'Você é um assistente de vendas amigável e persuasivo.'"
            disabled={isLive || loading}
          ></textarea>
        </div>

        <div className="mb-6">
          <label htmlFor="voiceSelect" className="block text-sm font-medium text-textlight mb-1">
            Voz da IA:
          </label>
          <select
            id="voiceSelect"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
            className="block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm bg-lightbg text-textdark focus:outline-none focus:ring-2 focus:ring-neonGreen focus:border-neonGreen focus:ring-offset-2 focus:ring-offset-lightbg sm:text-sm"
            disabled={isLive || loading}
          >
            {VOICE_OPTIONS.map(voice => (
              <option key={voice} value={voice}>{voice}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          {!isLive ? (
            <Button
              onClick={startConversation}
              isLoading={loading}
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <MicrophoneIcon className="h-5 w-5 mr-2" />
              {loading ? 'Iniciando...' : 'Iniciar Conversa'}
            </Button>
          ) : (
            <Button
              onClick={stopConversation}
              isLoading={loading}
              variant="danger"
              size="lg"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <StopCircleIcon className="h-5 w-5 mr-2" />
              {loading ? 'Parando...' : 'Parar Conversa'}
            </Button>
          )}
        </div>

        <h3 className="text-xl font-semibold text-textlight mb-5">Transcrição ao Vivo:</h3>
        <div className="border border-gray-700 bg-darkbg p-5 rounded-md overflow-y-auto flex-1 text-sm text-textlight">
          {conversationHistory.map((turn, index) => (
            <div key={index} className="mb-4">
              <p className="font-semibold text-primary">Você: <span className="font-normal text-textlight">{turn.user}</span></p>
              <p className="font-semibold text-secondary">IA: <span className="font-normal text-textlight">{turn.model}</span></p>
            </div>
          ))}
          {currentInputTranscription && (
             <p className="font-semibold text-primary mb-2">Você (digitando): <span className="font-normal text-textlight">{currentInputTranscription}</span></p>
          )}
          {currentOutputTranscription && (
            <p className="font-semibold text-secondary">IA (falando): <span className="font-normal text-textlight">{currentOutputTranscription}</span></p>
          )}
          {!isLive && conversationHistory.length === 0 && !currentInputTranscription && !currentOutputTranscription && (
            <p className="text-textmuted text-center">Inicie uma conversa para ver a transcrição.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveConversation;