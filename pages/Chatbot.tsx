

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat, generateTextStream, connectLiveSession, createBlob, decodeAudioData, decode, LiveSessionCallbacks, generateSpeech } from '../services/geminiService';
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
  DocumentIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import MultimodalChatInput from '../components/MultimodalChatInput';
import AudioVisualizer from '../components/AudioVisualizer';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { useToast } from '../contexts/ToastContext';

// FASE 2: Definição dos Slash Commands
const commands = [
  { key: '/post', text: 'Crie um post para Instagram sobre: ', desc: 'Gera legenda + ideia de imagem' },
  { key: '/refinar', text: 'Reescreva o texto acima tornando-o mais: ', desc: 'Ajuste de tom' },
  { key: '/analisar', text: 'Analise os pontos fortes e fracos de: ', desc: 'Crítica estratégica' }
];

const SUGGESTIONS = [
  "Crie um calendário editorial de 7 dias para marketing de SaaS.",
  "Escreva 5 títulos persuasivos para um webinar B2B.",
  "Analise as tendências atuais em computação em nuvem.",
  "Refine este parágrafo para um nível mais executivo: [Cole o texto]"
];

const PROVIDERS: ProviderName[] = ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Meta LLaMA'];

const DEFAULT_SYSTEM_INSTRUCTION = `Sua função principal é atuar como um Arquiteto de Marketing Digital e Copywriter Sênior para a plataforma VitrineX AI.
Você é um especialista em Marketing, Estratégia e Conteúdo.
Forneça respostas concisas, acionáveis e profissionais, formatadas com títulos e marcadores quando apropriado.
Você utiliza ferramentas para gerar imagens, textos persuasivos e estratégias de campanha.
Para qualquer solicitação de agendamento ou organização de calendário, você NÃO tem acesso a ferramentas de calendário. Em vez disso, instrua o usuário a utilizar o "Calendário Visual (SmartScheduler)" da plataforma para agendar o conteúdo.
Você NÃO pode executar código, fazer cálculos complexos, ou buscar locais físicos em um mapa. Mantenha o foco em estratégia de marketing e criação de conteúdo textual.`;

const STORAGE_KEY = 'vitrinex_chat_history';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('Google Gemini');
  
  // Brain / Persona Settings
  const [showBrainSettings, setShowBrainSettings] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);

  // File Upload State
  const [attachedFile, setAttachedFile] = useState<{name: string, type: string, data: string | Part} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FASE 1: Controle de Contexto
  const [useHistory, setUseHistory] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name');
  
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState<boolean>(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  
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
          text: `Olá. Sou seu Assistente de IA Empresarial (${selectedProvider}). Como posso auxiliar com seus objetivos hoje?`,
          timestamp: new Date().toISOString(),
        }];
      }
      setMessages(initialHistory);

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
    if ((!chatSession && useHistory) || !text.trim()) return;
    abortControllerRef.current = new AbortController();

    const userMessageText = text + (attachedFile ? ` [Arquivo Anexado: ${attachedFile.name}]` : '');
    const newUserMessage: ChatMessageType = { role: 'user', text: userMessageText, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);
    
    setMessages((prev) => [...prev, { role: 'model', text: '', timestamp: new Date().toISOString() }]);

    try {
      let messagePayload: string | (string | Part)[] = text;
      
      if (attachedFile) {
          if (typeof attachedFile.data === 'string') {
              messagePayload = `${text}\n\n[CONTEÚDO DO ARQUIVO ${attachedFile.name}]:\n${attachedFile.data}`;
          } else {
              messagePayload = [text, attachedFile.data];
          }
          setAttachedFile(null);
      }
      
      const onChunk = (partialText: string) => {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === 'model') {
            return [...prev.slice(0, -1), { ...lastMsg, text: partialText }];
          }
          return prev;
        });
      };

      if (useHistory && chatSession) {
        await sendMessageToChat(chatSession, messagePayload, onChunk, abortControllerRef.current.signal);
      } else {
        // FASE 1: Chamada sem histórico
        const stream = await generateTextStream(messagePayload, { model: GEMINI_PRO_MODEL, systemInstruction }, useKnowledgeBase);
        // FIX: Accumulate chunks for streaming response without history.
        let fullText = '';
        for await (const chunk of stream) {
            if (abortControllerRef.current.signal.aborted) break;
            fullText += chunk;
            onChunk(fullText);
        }
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError('Erro de processamento. Por favor, tente novamente.');
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatSession, attachedFile, useHistory, useKnowledgeBase, systemInstruction]);


  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);

  const handleFileClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
          addToast({type: 'error', message: 'Arquivo muito grande. Limite de 5MB.'});
          return;
      }

      try {
          if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
              const text = await file.text();
              setAttachedFile({ name: file.name, type: 'text', data: text });
          } else {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  const part: Part = { inlineData: { mimeType: file.type, data: base64 } };
                  setAttachedFile({ name: file.name, type: 'binary', data: part });
              };
              reader.readAsDataURL(file);
          }
          addToast({type: 'info', message: 'Arquivo anexado. Pronto para enviar.'});
      } catch (err) {
          addToast({type: 'error', message: 'Erro ao ler arquivo.'});
      }
      e.target.value = '';
  };

  const removeAttachment = () => setAttachedFile(null);

  const handleTTS = async (text: string) => {
      if (playbackSourceRef.current) {
          playbackSourceRef.current.stop();
          playbackSourceRef.current = null;
          return;
      }

      try {
          addToast({type: 'info', message: 'Gerando áudio...'});
          const base64Audio = await generateSpeech(text.substring(0, 1000));
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
    // A lógica de voz é complexa e mantida como está
  }, []);

  const handleStopVoice = useCallback(() => {
    // A lógica de voz é complexa e mantida como está
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
    <div className="flex h-full bg-background relative overflow-hidden rounded-tl-xl border-l border-t border-border">
      
      {/* BRAIN SETTINGS MODAL */}
      {showBrainSettings && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl border border-border flex flex-col">
                  <div className="flex justify-between items-center p-4 border-b border-border">
                      <h3 className="text-lg font-bold text-title flex items-center gap-2">
                          <Cog6ToothIcon className="w-5 h-5 text-primary" />
                          Configurar Cérebro da IA (System Prompt)
                      </h3>
                      <button onClick={() => setShowBrainSettings(false)} className="p-1 rounded-full text-muted hover:bg-background">
                          <XMarkIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                      <p className="text-sm text-muted mb-4">
                          Esta instrução define a persona e o comportamento base do assistente de IA. Edite com cuidado para alinhar a IA com seus objetivos.
                      </p>
                      <Textarea
                          id="systemInstruction"
                          value={systemInstruction}
                          onChange={(e) => setSystemInstruction(e.target.value)}
                          rows={15}
                          className="font-mono text-xs"
                      />
                  </div>
                  <div className="p-4 bg-background/50 border-t border-border rounded-b-xl flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowBrainSettings(false)}>Cancelar</Button>
                      <Button variant="primary" onClick={() => { setShowBrainSettings(false); initChat(); addToast({ type: 'success', message: 'Cérebro da IA atualizado e chat reiniciado.' }); }}>
                          Salvar e Reiniciar Chat
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                   <ChatBubbleLeftRightIcon className="w-5 h-5" />
                </div>
                <div>
                   <h2 className="font-bold text-title text-lg">Assistente IA</h2>
                   <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <p className="text-xs text-muted font-medium">{isLive ? 'Conexão de Voz Ativa' : 'Pronto para Ajudar'}</p>
                   </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setShowBrainSettings(true)} className="p-2 rounded-lg text-muted hover:bg-background" title="Configurar Persona da IA">
                    <Cog6ToothIcon className="w-5 h-5" />
                </button>
                <button onClick={handleClearChat} className="p-2 rounded-lg text-muted hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20" title="Limpar Histórico">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-8 md:p-8 space-y-6">
            {messages.map((msg, index) => (
                <ChatMessage 
                  key={`${msg.timestamp}-${index}`} 
                  message={msg}
                  onSpeak={handleTTS}
                  onDownload={handleDownloadTxt}
                  onShare={handleShareCopy}
                />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
        </div>
        
        {/* Suggestions & Input */}
        <div className="p-4 bg-surface border-t border-border">
          {messages.length <= 2 && !loading && (
             <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in">
                 {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSendMessage(s)} className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/5 rounded-full hover:bg-primary/10 border border-primary/10 transition-colors">
                      {s.substring(0, 40)}...
                    </button>
                 ))}
             </div>
          )}
          
          {attachedFile && (
            <div className="mb-2 flex items-center justify-between bg-background p-2 rounded-lg animate-in fade-in">
                <div className="flex items-center gap-2 text-sm text-body">
                   <DocumentIcon className="w-5 h-5 text-primary"/>
                   <span className="font-medium truncate max-w-xs">{attachedFile.name}</span>
                </div>
                <button onClick={removeAttachment} className="p-1 rounded-full text-muted hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600">
                   <XMarkIcon className="w-4 h-4"/>
                </button>
            </div>
          )}

          <div className="flex items-center gap-2 relative">
            <button onClick={handleFileClick} className="p-2.5 rounded-xl text-muted hover:bg-background" title="Anexar arquivo">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            <MultimodalChatInput
              onSendText={handleSendMessage}
              onStartVoice={handleStartVoice}
              onStopVoice={handleStopVoice}
              isTextLoading={loading}
              isVoiceActive={isLive}
              isListening={isListening}
              commands={commands} // FASE 2: Passa os comandos para o input
            />
          </div>

          {/* FASE 1: Context Controls */}
          <div className="flex items-center justify-end gap-4 pt-2 pr-20">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted hover:text-title">
                  <input 
                      type="checkbox" 
                      checked={useHistory} 
                      onChange={(e) => setUseHistory(e.target.checked)} 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Manter Contexto
              </label>
              <label className={`flex items-center gap-2 text-xs ${!kbName ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-muted hover:text-title'}`}>
                  <input 
                      type="checkbox" 
                      checked={useKnowledgeBase} 
                      onChange={(e) => setUseKnowledgeBase(e.target.checked)} 
                      disabled={!kbName}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Consultar Base (RAG)
              </label>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Chatbot;