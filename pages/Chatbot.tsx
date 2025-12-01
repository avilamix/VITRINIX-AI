
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat, connectLiveSession, createBlob, decodeAudioData, decode, LiveSessionCallbacks, generateSpeech } from '../services/geminiService';
import { Chat, Part } from '@google/genai';
import { GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL } from '../constants';
import { 
  TrashIcon, 
  SparklesIcon, 
  CircleStackIcon, 
  BoltIcon, 
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  PaperClipIcon,
  Cog6ToothIcon,
  XMarkIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import MultimodalChatInput from '../components/MultimodalChatInput';
import AudioVisualizer from '../components/AudioVisualizer';
import { useToast } from '../contexts/ToastContext';

const SUGGESTIONS = [
  "Crie um calendário editorial de 7 dias para marketing de SaaS.",
  "Escreva 5 títulos persuasivos para um webinar B2B.",
  "Analise as tendências atuais em computação em nuvem.",
  "Refine este parágrafo para um nível mais executivo: [Cole o texto]"
];

const QUICK_PROMPTS = [
  "Rascunhar Post Social",
  "Reescrita Profissional",
  "Plano Estratégico",
  "Análise SWOT",
  "Funil de Vendas",
  "Resposta de E-mail",
  "Gerar Palavras-chave"
];

const PROVIDERS: ProviderName[] = ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Meta LLaMA'];

const DEFAULT_SYSTEM_INSTRUCTION = `Você é um Assistente de IA Empresarial sofisticado, especializado em Marketing, Estratégia e Conteúdo.
Forneça respostas concisas, acionáveis e profissionais. Use um tom neutro e orientado para negócios.
Quando solicitado conteúdo, formate-o claramente com títulos e marcadores.`;

const STORAGE_KEY = 'nexus_chat_history';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('Google Gemini');
  const [inputText, setInputText] = useState<string>('');
  
  // Brain / Persona Settings
  const [showBrainSettings, setShowBrainSettings] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);

  // File Upload State
  const [attachedFile, setAttachedFile] = useState<{name: string, type: string, data: string | Part} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name');
  
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
  // Audio Refs for Playback
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const liveSessionRef = useRef<any>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      let initialHistory: ChatMessageType[] = [];
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        try { initialHistory = JSON.parse(stored); } catch (e) { console.error(e); }
      }

      if (initialHistory.length === 0) {
        initialHistory = [{
          role: 'model',
          text: `Olá. Sou seu Assistente de IA Empresarial (${selectedProvider}). Como posso auxiliar com seus objetivos hoje? Você pode digitar ou usar o microfone.`,
          timestamp: new Date().toISOString(),
        }];
      }
      setMessages(initialHistory);

      // Upgrade to GEMINI_PRO_MODEL for chatbot interactions
      const newChat = await startChatAsync(GEMINI_PRO_MODEL, selectedProvider, systemInstruction, initialHistory, useKnowledgeBase && !!kbName, kbName || undefined);
      setChatSession(newChat);
    } catch (err) {
      setError(`Falha na conexão. Por favor, verifique as configurações.`);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, useKnowledgeBase, kbName, systemInstruction]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isListening, isModelSpeaking]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;
    abortControllerRef.current = new AbortController();

    const newUserMessage: ChatMessageType = { role: 'user', text: text + (attachedFile ? ` [Arquivo Anexado: ${attachedFile.name}]` : ''), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);
    
    setMessages((prev) => [...prev, { role: 'model', text: '', timestamp: new Date().toISOString() }]);

    try {
      // Prepare message payload (Text + Optional File)
      let messagePayload: string | (string | Part)[] = text;
      
      if (attachedFile) {
          if (typeof attachedFile.data === 'string') {
              // It's a text content stuffing
              messagePayload = `${text}\n\n[CONTEÚDO DO ARQUIVO ${attachedFile.name}]:\n${attachedFile.data}`;
          } else {
              // It's a multimodal part
              messagePayload = [text, attachedFile.data];
          }
          setAttachedFile(null); // Clear after sending
      }

      await sendMessageToChat(
        chatSession, 
        messagePayload, 
        (partialText) => {
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'model') {
              return [...prev.slice(0, -1), { ...lastMsg, text: partialText }];
            }
            return prev;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError('Erro de processamento. Por favor, tente novamente.');
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatSession, attachedFile]);

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  // --- FILE UPLOAD LOGIC ---
  const handleFileClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) { // 5MB limit check
          addToast({type: 'error', message: 'Arquivo muito grande. Limite de 5MB.'});
          return;
      }

      try {
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
              const text = await file.text();
              setAttachedFile({ name: file.name, type: 'text', data: text });
          } else {
              // Binary (Image/PDF) -> Base64 Part
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  const part: Part = {
                      inlineData: {
                          mimeType: file.type,
                          data: base64
                      }
                  };
                  setAttachedFile({ name: file.name, type: 'binary', data: part });
              };
              reader.readAsDataURL(file);
          }
          addToast({type: 'info', message: 'Arquivo anexado. Pronto para enviar.'});
      } catch (err) {
          console.error("File read error", err);
          addToast({type: 'error', message: 'Erro ao ler arquivo.'});
      }
      e.target.value = ''; // Reset input
  };

  const removeAttachment = () => setAttachedFile(null);

  // --- MESSAGE ACTIONS ---
  const handleTTS = async (text: string) => {
      if (playbackSourceRef.current) {
          playbackSourceRef.current.stop();
          playbackSourceRef.current = null;
          return; // Toggle off behavior
      }

      try {
          addToast({type: 'info', message: 'Gerando áudio...'});
          const base64Audio = await generateSpeech(text.substring(0, 1000)); // Limit length
          if (!base64Audio) throw new Error("No audio generated");

          if (!playbackContextRef.current) playbackContextRef.current = new AudioContext();
          
          const audioBuffer = await decodeAudioData(decode(base64Audio), playbackContextRef.current, 24000, 1);
          const source = playbackContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(playbackContextRef.current.destination);
          source.onended = () => { playbackSourceRef.current = null; };
          source.start();
          playbackSourceRef.current = source;
      } catch (err) {
          addToast({type: 'error', message: 'Erro na reprodução de voz.'});
      }
  };

  const handleDownloadTxt = (text: string) => {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vitrinex-chat-${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast({type: 'success', message: 'Download iniciado.'});
  };

  const handleShareCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      addToast({type: 'success', message: 'Texto copiado para a área de transferência.'});
  };

  const handleStartVoice = useCallback(async () => {
    setError(null);
    setIsListening(true);
    setMessages(prev => [...prev, {role: 'user', text: '…', timestamp: new Date().toISOString()}]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new window.AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
      
      const outNode = outputAudioContextRef.current.createGain();
      const analyserNode = outputAudioContextRef.current.createAnalyser();
      analyserNode.fftSize = 256;
      outNode.connect(analyserNode);
      analyserNode.connect(outputAudioContextRef.current.destination);
      outputNodeRef.current = outNode;
      setAnalyser(analyserNode);

      const source = inputAudioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      const liveCallbacks: LiveSessionCallbacks = {
        onopen: () => {
          setIsLive(true);
          source.connect(scriptProcessorRef.current!);
          scriptProcessorRef.current!.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message) => {
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
          if (audioData && outputAudioContextRef.current && outputNodeRef.current) {
            setIsModelSpeaking(true);
            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
            const audioSource = outputAudioContextRef.current.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(outputNodeRef.current);
            audioSource.onended = () => { setIsModelSpeaking(false); };
            audioSource.start();
          }
        },
        onerror: (e) => setError(`Erro na Live API: ${e.message}`),
        onclose: () => setIsLive(false),
        onTranscriptionUpdate: (input, output) => {
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === 'user') {
                    return [...prev.slice(0, -1), { ...lastMsg, text: input || '…' }];
                }
                return prev;
            });
            if (output) {
                const modelMsgIndex = messages.findIndex(m => m.role === 'model' && m.timestamp > messages[messages.length-1].timestamp);
                if (modelMsgIndex > -1) {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[modelMsgIndex] = { ...newMessages[modelMsgIndex], text: output };
                        return newMessages;
                    });
                } else if (!messages.some(m => m.role === 'model' && m.timestamp > messages[messages.length-1].timestamp)) {
                    setMessages(prev => [...prev, {role: 'model', text: output, timestamp: new Date().toISOString()}]);
                }
            }
        },
        onTurnComplete: (input, output) => {
          setMessages(prev => {
              const lastUserMsgIndex = prev.map(m => m.role).lastIndexOf('user');
              const newMessages = [...prev];
              if(lastUserMsgIndex > -1) {
                 newMessages[lastUserMsgIndex] = {...newMessages[lastUserMsgIndex], text: input};
              }

              const lastModelMsgIndex = prev.map(m => m.role).lastIndexOf('model');
              if(lastModelMsgIndex > -1 && lastModelMsgIndex > lastUserMsgIndex) {
                 newMessages[lastModelMsgIndex] = {...newMessages[lastModelMsgIndex], text: output};
              } else {
                 newMessages.push({role: 'model', text: output, timestamp: new Date().toISOString()});
              }
              return newMessages;
          });
        }
      };

      const session = await connectLiveSession(liveCallbacks, systemInstruction);
      liveSessionRef.current = session;

      scriptProcessorRef.current.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        liveSessionRef.current?.sendRealtimeInput({ media: createBlob(inputData) });
      };

    } catch (err) {
      setError(`Falha na conexão de voz. Garanta que o acesso ao microfone foi permitido.`);
      setIsListening(false);
      setMessages(prev => prev.slice(0, -1));
    }
  }, [messages, systemInstruction]);

  const handleStopVoice = useCallback(() => {
    liveSessionRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    setIsListening(false);
    setIsLive(false);
    setAnalyser(null);
  }, []);

  const handleClearChat = () => {
    if (window.confirm('Limpar histórico da sessão? Esta ação não pode ser desfeita.')) {
      if (isLive) handleStopVoice();
      abortControllerRef.current?.abort();
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]); 
      initChat();
    }
  };

  return (
    <div className="flex h-full bg-background relative overflow-hidden rounded-tl-xl border-l border-t border-gray-200">
      
      {/* BRAIN SETTINGS MODAL */}
      {showBrainSettings && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-surface rounded-xl shadow-2xl w-full max-w-lg border border-border">
                  <div className="flex justify-between items-center p-4 border-b border-border">
                      <h3 className="text-lg font-bold text-title flex items-center gap-2">
                          <Cog6ToothIcon className="w-5 h-5 text-primary" /> Configurar Cérebro da IA
                      </h3>
                      <button onClick={() => setShowBrainSettings(false)} className="text-muted hover:text-error"><XMarkIcon className="w-6 h-6" /></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-muted mb-3">Defina a persona e as diretrizes do assistente.</p>
                      <textarea 
                          value={systemInstruction}
                          onChange={(e) => setSystemInstruction(e.target.value)}
                          className="w-full h-40 p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary focus:outline-none text-sm text-body resize-none"
                          placeholder="Ex: Você é um especialista em..."
                      />
                  </div>
                  <div className="p-4 border-t border-border flex justify-end gap-2">
                      <button onClick={() => setShowBrainSettings(false)} className="px-4 py-2 text-sm text-body hover:bg-gray-100 rounded-lg">Cancelar</button>
                      <button onClick={() => { setShowBrainSettings(false); initChat(); addToast({type:'success', message:'Persona atualizada!'}); }} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Salvar & Reiniciar</button>
                  </div>
              </div>
          </div>
      )}

      <aside className="hidden md:flex flex-col w-72 bg-surface border-r border-gray-200 h-full flex-none z-10">
        <div className="p-5 border-b border-gray-200">
           <h2 className="text-xs font-bold text-title uppercase tracking-wider flex items-center gap-2">
              <BoltIcon className="w-4 h-4 text-primary" />
              Ações Rápidas
           </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
           {QUICK_PROMPTS.map((prompt, idx) => (
              <button key={idx} onClick={() => setInputText(prompt)} className="w-full text-left px-3 py-2.5 text-sm text-body hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200 truncate" title={prompt}>
                {prompt}
              </button>
           ))}
           <div className="pt-6 pb-2 px-1">
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                 <LightBulbIcon className="w-3.5 h-3.5" /> Inspiração
              </h3>
           </div>
            {SUGGESTIONS.map((suggestion, idx) => (
              <button key={`sug-${idx}`} onClick={() => handleSendMessage(suggestion)} className="w-full text-left px-3 py-3 text-xs text-muted hover:text-primary bg-background/50 hover:bg-background border border-gray-100 rounded-lg transition-all mb-2.5 line-clamp-3 leading-relaxed">
                "{suggestion}"
              </button>
           ))}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50">
            {selectedProvider === 'Google Gemini' && kbName ? (
              <button onClick={() => setUseKnowledgeBase(!useKnowledgeBase)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors border ${useKnowledgeBase ? 'bg-success/10 text-success border-success/20' : 'bg-white text-muted border-gray-200'}`}>
                 <div className="flex items-center gap-2"><CircleStackIcon className="w-4 h-4" /> Base de Conhecimento</div>
                 <div className={`w-2 h-2 rounded-full ${useKnowledgeBase ? 'bg-success' : 'bg-gray-300'}`}></div>
              </button>
            ) : (
               <div className="text-center"><p className="text-[10px] text-muted mb-2">Conecte uma Base de Conhecimento na Biblioteca.</p></div>
            )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        <header className="flex-none bg-surface/80 backdrop-blur-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-title leading-none">Interface de Chat IA</h1>
              <div className="flex items-center gap-1 mt-0.5">
                 <span className="text-[10px] text-muted font-medium">Provedor:</span>
                 <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value as ProviderName)} className="text-[10px] font-semibold text-primary bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:underline">
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBrainSettings(true)} className="p-1.5 text-muted hover:text-primary hover:bg-gray-100 rounded-md transition-colors" title="Configurar Cérebro (Persona)">
               <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button onClick={handleClearChat} className="p-1.5 text-muted hover:text-error hover:bg-red-50 rounded-md transition-colors" title="Limpar Histórico">
                <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative pb-32"> {/* Added pb-32 for bottom spacing inside chat */}
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-full">
            {messages.map((msg, index) => (msg.text || loading) && 
                <ChatMessage 
                    key={index} 
                    message={msg} 
                    onSpeak={handleTTS}
                    onDownload={handleDownloadTxt}
                    onShare={handleShareCopy}
                />
            )}
            {loading && <div className="pl-2 mb-8"><TypingIndicator /></div>}
            {messages.length <= 1 && !loading && (
               <div className="mt-auto mb-10 flex flex-col items-center justify-center text-center opacity-60">
                 <SparklesIcon className="w-12 h-12 text-gray-300 mb-3" />
                 <p className="text-sm text-muted max-w-xs">Inicie uma conversa digitando ou usando o microfone.</p>
               </div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {isModelSpeaking && 
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 h-16 pointer-events-none">
                <div className="w-full h-full bg-surface/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg flex items-center justify-center px-4">
                    <SpeakerWaveIcon className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <AudioVisualizer analyser={analyser} isPlaying={isModelSpeaking} barColor="rgb(var(--color-primary))" />
                </div>
            </div>
        }

        <div className="flex-none bg-surface border-t border-gray-200 p-4 md:p-6 z-20 relative">
          {/* File Attachment Indicator */}
          {attachedFile && (
              <div className="absolute -top-10 left-6 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 border border-primary/20">
                  <DocumentIcon className="w-4 h-4" />
                  <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                  <button onClick={removeAttachment} className="hover:text-red-500"><XMarkIcon className="w-4 h-4" /></button>
              </div>
          )}

          <div className="max-w-3xl mx-auto w-full relative flex items-end gap-2">
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept=".txt,.md,.csv,.json,.pdf,image/*" 
             />
             <button 
                onClick={handleFileClick}
                className="p-3 mb-0.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-muted hover:text-title transition-colors"
                title="Anexar Arquivo"
                disabled={loading}
             >
                <PaperClipIcon className="w-5 h-5" />
             </button>

             {error && (
              <div className="absolute -top-14 left-0 right-0 mx-auto w-fit bg-red-100 text-red-800 text-xs px-4 py-2 rounded-full shadow-sm border border-red-200 flex items-center gap-2">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold hover:text-red-900">&times;</button>
              </div>
            )}
            
            <div className="flex-1">
                <MultimodalChatInput 
                onSendText={handleSendMessage}
                onStartVoice={handleStartVoice}
                onStopVoice={handleStopVoice}
                isTextLoading={loading}
                isVoiceActive={isLive}
                isListening={isListening}
                disabled={!chatSession && !isLive}
                textValue={inputText}
                onTextChange={setInputText}
                />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chatbot;
