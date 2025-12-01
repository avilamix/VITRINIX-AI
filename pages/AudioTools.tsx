import React, { useState, useCallback, useRef, useEffect } from 'react';
import Textarea from '../components/Textarea';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import Input from '../components/Input';
import AudioVisualizer from '../components/AudioVisualizer';
import SaveToLibraryButton from '../components/SaveToLibraryButton';
import { generateSpeech, decode, decodeAudioData, transcribeAudio } from '../services/geminiService';
import { 
  SpeakerWaveIcon, 
  PlayIcon, 
  StopIcon, 
  ArrowDownTrayIcon, 
  DocumentTextIcon, 
  ClipboardDocumentIcon, 
  MicrophoneIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';

type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
const VOICE_OPTIONS: VoiceName[] = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir'];

const AudioTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tts' | 'stt'>('tts');

  // TTS State
  const [inputText, setInputText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Kore');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null);
  
  // STT State
  const [transcriptionFile, setTranscriptionFile] = useState<File | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);

  // Shared State
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [savedItemName, setSavedItemName] = useState<string>('');
  const [savedItemTags, setSavedItemTags] = useState<string>('');

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { addToast } = useToast();
  const userId = 'mock-user-123';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) sourceNodeRef.current.stop();
      if (audioContextRef.current) audioContextRef.current.close();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    };
  }, []);

  // --- HELPER: WAV Encoding ---
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0; // Pointer for header writing

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(36 + buffer.length * 2 * numOfChan); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this example)
    setUint32(0x61746164); // "data" - chunk
    setUint32(buffer.length * 2 * numOfChan); // chunk length

    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    // Reset pos for data writing loop logic separation
    // Actual data start at byte 44
    let sampleIdx = 0;
    while (sampleIdx < buffer.length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][sampleIdx])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(44 + offset, sample, true); // write 16-bit sample
        offset += 2;
      }
      sampleIdx++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });

    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }
  };

  // --- TTS LOGIC ---
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const handleGenerateSpeech = useCallback(async () => {
    if (!inputText.trim()) {
      addToast({ type: 'warning', message: 'Por favor, insira o texto para gerar a fala.' });
      return;
    }

    setLoading(true);
    setError(null);
    setAudioBuffer(null);
    setIsPlaying(false);
    setGeneratedAudioBlob(null);
    setAnalyser(null);
    setSavedItemName('');
    setSavedItemTags('');

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
          
          // Generate WAV Blob for download/save
          const wavBlob = bufferToWav(buffer);
          setGeneratedAudioBlob(wavBlob);
          setSavedItemName(`TTS - ${selectedVoice} - ${inputText.substring(0, 15)}...`);
          setSavedItemTags(`tts, ia, ${selectedVoice.toLowerCase()}`);
          addToast({ type: 'success', title: 'Sucesso', message: 'Áudio gerado com sucesso.' });
        }
      } else {
        throw new Error('Nenhum áudio retornado pela API.');
      }
    } catch (err) {
      console.error('TTS Error:', err);
      setError(`Falha ao gerar fala: ${err instanceof Error ? err.message : String(err)}`);
      addToast({ type: 'error', title: 'Erro', message: 'Falha na geração de áudio.' });
    } finally {
      setLoading(false);
    }
  }, [inputText, selectedVoice, initAudioContext, addToast]);

  const handlePlayAudio = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current) return;
    initAudioContext();

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;

    // Visualizer setup
    const analyserNode = audioContextRef.current.createAnalyser();
    analyserNode.fftSize = 256;
    setAnalyser(analyserNode);

    source.connect(analyserNode);
    analyserNode.connect(audioContextRef.current.destination);
    
    source.onended = () => setIsPlaying(false);
    source.start(0);
    sourceNodeRef.current = source;
    setIsPlaying(true);
  }, [audioBuffer, initAudioContext]);

  const handleStopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const handleDownloadAudio = useCallback(() => {
    if (!generatedAudioBlob) return;
    const url = URL.createObjectURL(generatedAudioBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitrinex-tts-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generatedAudioBlob]);

  // --- STT LOGIC ---
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.wav`, { type: 'audio/wav' });
        
        setTranscriptionFile(audioFile);
        const url = URL.createObjectURL(audioBlob);
        setPreviewAudioUrl(url);
        setSavedItemName(`Gravação ${new Date().toLocaleTimeString()}`);
        setSavedItemTags('gravação, stt');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Recording Error:', err);
      addToast({ type: 'error', message: 'Erro ao acessar microfone. Verifique permissões.' });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        addToast({ type: 'error', message: 'Por favor, carregue um arquivo de áudio válido.' });
        return;
      }
      setTranscriptionFile(file);
      const url = URL.createObjectURL(file);
      setPreviewAudioUrl(url);
      setTranscriptionText('');
      setSavedItemName(file.name.split('.')[0]);
      setSavedItemTags('upload, stt');
    }
  };

  const handleTranscribe = async () => {
    if (!transcriptionFile) return;
    setIsTranscribing(true);
    setError(null);
    try {
      const text = await transcribeAudio(transcriptionFile);
      setTranscriptionText(text);
      addToast({ type: 'success', title: 'Transcrição Concluída', message: 'Áudio processado com sucesso.' });
    } catch (err) {
      setError(`Erro na transcrição: ${err instanceof Error ? err.message : String(err)}`);
      addToast({ type: 'error', message: 'Falha ao transcrever o áudio.' });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleClearSTT = () => {
    setTranscriptionFile(null);
    setTranscriptionText('');
    if (previewAudioUrl) URL.revokeObjectURL(previewAudioUrl);
    setPreviewAudioUrl(null);
    setSavedItemName('');
    setSavedItemTags('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-8 lg:py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-title">Laboratório de Voz</h2>
        
        <div className="flex bg-surface rounded-lg p-1 border border-border shadow-sm">
           <button 
             onClick={() => setActiveTab('tts')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'tts' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-title hover:bg-background'}`}
           >
             <SpeakerWaveIcon className="w-4 h-4" />
             Gerar Voz (TTS)
           </button>
           <button 
             onClick={() => setActiveTab('stt')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'stt' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-title hover:bg-background'}`}
           >
             <MicrophoneIcon className="w-4 h-4" />
             Transcrever (STT)
           </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-8" role="alert">
          <strong className="font-bold">Erro: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* --- TTS TAB --- */}
      {activeTab === 'tts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
          {/* TTS Input */}
          <div className="bg-surface p-6 rounded-xl shadow-card border border-border flex flex-col h-full">
            <h3 className="text-xl font-semibold text-title mb-5">Texto para Fala</h3>
            <Textarea
              id="speechText"
              label="Digite seu texto:"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              placeholder="Ex: 'Olá! Bem-vindo à VitrineX. Como posso ajudar a impulsionar sua marca hoje?'"
              className="flex-grow font-medium"
            />

            <div className="mb-6 mt-4">
              <label htmlFor="voiceSelect" className="block text-sm font-medium text-title mb-1.5">
                Selecione a Voz:
              </label>
              <div className="relative">
                <select
                  id="voiceSelect"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as VoiceName)}
                  className="block w-full px-4 py-3 border border-border rounded-xl shadow-sm bg-background text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none transition-all"
                >
                  {VOICE_OPTIONS.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted">
                  <SpeakerWaveIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateSpeech}
              isLoading={loading && !audioBuffer}
              variant="primary"
              className="w-full py-3"
            >
              {loading && !audioBuffer ? 'Gerando Áudio...' : 'Gerar Fala'}
            </Button>
          </div>

          {/* TTS Output */}
          <div className="bg-surface p-6 rounded-xl shadow-card border border-border flex flex-col h-full">
             <h3 className="text-xl font-semibold text-title mb-5">Player e Exportação</h3>
             
             <div className="bg-black/5 dark:bg-black/40 rounded-xl border border-border flex-grow min-h-[200px] mb-6 relative overflow-hidden flex items-center justify-center group">
                {audioBuffer ? (
                   <AudioVisualizer 
                     analyser={analyser} 
                     isPlaying={isPlaying} 
                     barColor="rgb(var(--color-primary))" 
                     className="opacity-80"
                   />
                ) : (
                   <div className="text-muted flex flex-col items-center opacity-60">
                      <SpeakerWaveIcon className="w-16 h-16 mb-4 stroke-1" />
                      <span className="text-sm font-medium">O áudio gerado aparecerá aqui</span>
                   </div>
                )}
                
                {/* Play Overlay Button */}
                {audioBuffer && (
                  <button
                    onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                    className="absolute z-10 p-4 rounded-full bg-primary text-white shadow-lg hover:scale-110 transition-transform focus:outline-none"
                  >
                    {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
                  </button>
                )}
             </div>

            {generatedAudioBlob && (
              <div className="mt-auto space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background p-4 rounded-lg border border-border">
                  <Input
                    id="savedAudioName"
                    label="Nome do Arquivo:"
                    value={savedItemName}
                    onChange={(e) => setSavedItemName(e.target.value)}
                    placeholder="Ex: Voz Institucional"
                    className="mb-0"
                  />
                  <Input
                    id="savedAudioTags"
                    label="Tags:"
                    value={savedItemTags}
                    onChange={(e) => setSavedItemTags(e.target.value)}
                    placeholder="Ex: tts, ia, voz"
                    className="mb-0"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleDownloadAudio} variant="outline" className="w-full">
                    <ArrowDownTrayIcon className="w-5 h-5 mr-2" /> Baixar (WAV)
                  </Button>
                  <SaveToLibraryButton
                    content={generatedAudioBlob}
                    type="audio"
                    userId={userId}
                    initialName={savedItemName}
                    variant="secondary"
                    className="w-full"
                    tags={savedItemTags.split(',').map(t => t.trim()).filter(Boolean)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- STT TAB --- */}
      {activeTab === 'stt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
           {/* STT Input */}
           <div className="bg-surface p-6 rounded-xl shadow-card border border-border flex flex-col h-full">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-semibold text-title">Fonte de Áudio</h3>
                {transcriptionFile && (
                  <button onClick={handleClearSTT} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                    <TrashIcon className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
              
              {!transcriptionFile ? (
                <div className="flex-grow flex flex-col gap-6 justify-center">
                   {/* Recorder Area */}
                   <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors ${isRecording ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-border bg-background hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                      <div className="mb-4 relative">
                        {isRecording && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>}
                        <div className={`p-4 rounded-full ${isRecording ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                           <MicrophoneIcon className="w-10 h-10" />
                        </div>
                      </div>
                      
                      {isRecording ? (
                        <>
                          <p className="text-2xl font-mono text-red-600 font-bold mb-4">{formatTime(recordingTime)}</p>
                          <Button onClick={handleStopRecording} variant="danger" size="lg">
                            <StopIcon className="w-5 h-5 mr-2" /> Parar Gravação
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={handleStartRecording} variant="primary" size="lg" className="mb-4">
                            Iniciar Gravação
                          </Button>
                          <p className="text-sm text-muted">ou</p>
                        </>
                      )}
                   </div>

                   {/* Upload Area */}
                   {!isRecording && (
                     <div className="text-center">
                        <input 
                          type="file" 
                          accept="audio/*" 
                          onChange={handleFileUpload} 
                          className="hidden" 
                          id="audioUpload" 
                        />
                        <label htmlFor="audioUpload" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 cursor-pointer p-2 rounded-md hover:bg-primary/5 transition-colors">
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            Carregar arquivo de áudio (MP3, WAV, OGG)
                        </label>
                     </div>
                   )}
                </div>
              ) : (
                <div className="flex-grow flex flex-col justify-center">
                   <div className="bg-background p-6 rounded-xl border border-border text-center">
                      <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                         <DocumentTextIcon className="w-8 h-8" />
                      </div>
                      <p className="font-semibold text-title truncate max-w-xs mx-auto">{transcriptionFile.name}</p>
                      <p className="text-xs text-muted mt-1">{(transcriptionFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      
                      {previewAudioUrl && (
                        <audio controls src={previewAudioUrl} className="w-full mt-6 h-10" />
                      )}
                   </div>
                </div>
              )}

              {transcriptionFile && !isRecording && (
                <Button 
                  onClick={handleTranscribe} 
                  isLoading={isTranscribing} 
                  variant="primary" 
                  className="w-full mt-6 py-3"
                >
                  {isTranscribing ? 'Transcrevendo Áudio...' : 'Iniciar Transcrição'}
                </Button>
              )}
           </div>

           {/* STT Output */}
           <div className="bg-surface p-6 rounded-xl shadow-card border border-border flex flex-col h-full">
              <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-semibold text-title">Resultado</h3>
                  {transcriptionText && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(transcriptionText);
                          addToast({type: 'success', message: 'Copiado!'});
                        }} 
                        className="text-muted hover:text-primary transition-colors p-1" 
                        title="Copiar texto"
                      >
                          <ClipboardDocumentIcon className="w-5 h-5" />
                      </button>
                  )}
              </div>

              <div className={`flex-grow rounded-xl border p-4 min-h-[300px] overflow-y-auto mb-6 relative transition-colors ${transcriptionText ? 'bg-background border-border' : 'bg-gray-50 dark:bg-gray-900/30 border-dashed border-border'}`}>
                  {isTranscribing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <LoadingSpinner className="w-10 h-10 mb-4" />
                          <span className="text-muted text-sm font-medium animate-pulse">A IA está processando o áudio...</span>
                      </div>
                  ) : transcriptionText ? (
                      <div className="prose prose-sm max-w-none text-body whitespace-pre-wrap leading-relaxed">
                        {transcriptionText}
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-muted opacity-60">
                        <DocumentTextIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm">O texto transcrito aparecerá aqui.</p>
                      </div>
                  )}
              </div>

              {transcriptionText && (
                  <div className="pt-4 border-t border-border space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            id="savedTransName"
                            label="Nome do Arquivo:"
                            value={savedItemName}
                            onChange={(e) => setSavedItemName(e.target.value)}
                            placeholder="Ex: Entrevista 01"
                            className="mb-0"
                        />
                        <Input
                            id="savedTransTags"
                            label="Tags:"
                            value={savedItemTags}
                            onChange={(e) => setSavedItemTags(e.target.value)}
                            placeholder="Ex: entrevista, stt"
                            className="mb-0"
                        />
                      </div>
                      <SaveToLibraryButton
                        content={transcriptionText}
                        type="text"
                        userId={userId}
                        initialName={savedItemName}
                        variant="secondary"
                        label="Salvar Transcrição"
                        className="w-full"
                        tags={savedItemTags.split(',').map(t => t.trim()).filter(Boolean)}
                      />
                  </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AudioTools;