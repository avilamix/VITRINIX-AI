

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat, connectLiveSession, createBlob, decodeAudioData, decode, LiveSessionCallbacks } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_FLASH_MODEL } from '../constants';
import { 
  TrashIcon, 
  SparklesIcon, 
  CircleStackIcon, 
  BoltIcon, 
  LightBulbIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import MultimodalChatInput from '../components/MultimodalChatInput';
import AudioVisualizer from '../components/AudioVisualizer';

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

const SYSTEM_INSTRUCTION = `Você é um Assistente de IA Empresarial sofisticado, especializado em Marketing, Estratégia e Conteúdo.
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
  
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name');
  
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
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

      const newChat = await startChatAsync(GEMINI_FLASH_MODEL, selectedProvider, SYSTEM_INSTRUCTION, initialHistory, useKnowledgeBase && !!kbName, kbName || undefined);
      setChatSession(newChat);
    } catch (err) {
      setError(`Falha na conexão. Por favor, verifique as configurações.`);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, useKnowledgeBase, kbName]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isListening, isModelSpeaking]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;
    abortControllerRef.current = new AbortController();

    const newUserMessage: ChatMessageType = { role: 'user', text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);
    
    setMessages((prev) => [...prev, { role: 'model', text: '', timestamp: new Date().toISOString() }]);

    try {
      await sendMessageToChat(
        chatSession, 
        text, 
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
  }, [chatSession]);

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

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
      
      let nextStartTime = 0;
      const audioSources = new Set<AudioBufferSourceNode>();

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
            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
            const audioSource = outputAudioContextRef.current.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(outputNodeRef.current);
            audioSource.onended = () => { audioSources.delete(audioSource); if (audioSources.size === 0) setIsModelSpeaking(false); };
            audioSource.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
            audioSources.add(audioSource);
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

      const session = await connectLiveSession(liveCallbacks, SYSTEM_INSTRUCTION);
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
  }, []);

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
          <button onClick={handleClearChat} className="p-1.5 text-muted hover:text-error hover:bg-red-50 rounded-md transition-colors" title="Limpar Histórico">
            <TrashIcon className="w-4 h-4" />
          </button>
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 flex flex-col min-h-full">
            {messages.map((msg, index) => (msg.text || loading) && <ChatMessage key={index} message={msg} />)}
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

        <div className="flex-none bg-surface border-t border-gray-200 p-4 md:p-6 z-20">
          <div className="max-w-3xl mx-auto w-full relative">
             {error && (
              <div className="absolute -top-14 left-0 right-0 mx-auto w-fit bg-red-100 text-red-800 text-xs px-4 py-2 rounded-full shadow-sm border border-red-200 flex items-center gap-2">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold hover:text-red-900">&times;</button>
              </div>
            )}
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
      </main>
    </div>
  );
};

export default Chatbot;
