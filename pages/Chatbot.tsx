
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { sendMessageToChat } from '../services/geminiService';
import { Part } from '@google/genai';
import { GEMINI_PRO_MODEL } from '../constants';
import { 
  TrashIcon, 
  SparklesIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  DocumentIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon
} from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import MultimodalChatInput from '../components/MultimodalChatInput';
import Button from '../components/Button';
import Textarea from '../components/Textarea';
import { useToast } from '../contexts/ToastContext';
import { generateSpeech, decode, decodeAudioData } from '../services/geminiService';

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

const DEFAULT_SYSTEM_INSTRUCTION = `Sua função principal é atuar como um Arquiteto de Marketing Digital e Copywriter Sênior...`;

const STORAGE_KEY = 'vitrinex_chat_history';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showBrainSettings, setShowBrainSettings] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);

  const [attachedFile, setAttachedFile] = useState<{name: string, type: string, data: string | Part} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [useHistory, setUseHistory] = useState(true);
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name');
  
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      setMessages([{
        role: 'model',
        text: `Olá! Sou seu Assistente de IA Empresarial. Como posso ajudar hoje?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, []);
  
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const userMessageText = text + (attachedFile ? ` [Arquivo Anexado: ${attachedFile.name}]` : '');
    const newUserMessage: ChatMessageType = { role: 'user', text: userMessageText, timestamp: new Date().toISOString() };
    
    const currentHistory = useHistory ? [...messages, newUserMessage] : [newUserMessage];
    setMessages(currentHistory);
    setLoading(true);
    setError(null);
    
    setMessages((prev) => [...prev, { role: 'model', text: '', timestamp: new Date().toISOString() }]);

    try {
      let messagePayload: string | (string | Part)[] = text;
      
      if (attachedFile) {
          // Handle file payload
      }
      
      const onChunk = (partialText: string) => {
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], text: partialText };
          return newMessages;
        });
      };

      await sendMessageToChat(
        useHistory ? messages : [], 
        messagePayload, 
        onChunk, 
        { model: GEMINI_PRO_MODEL, systemInstruction, useKnowledgeBase }, 
        signal
      );

    } catch (err) {
      if (!signal.aborted) {
        setError('Erro de processamento. Por favor, tente novamente.');
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      setAttachedFile(null);
    }
  }, [messages, attachedFile, useHistory, useKnowledgeBase, systemInstruction]);

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setLoading(false);
  }, []);
  
  const handleClearChat = () => {
    if (window.confirm('Limpar histórico da sessão?')) {
      abortControllerRef.current?.abort();
      localStorage.removeItem(STORAGE_KEY);
      setMessages([{
        role: 'model',
        text: `Olá! Sou seu Assistente de IA Empresarial. Como posso ajudar hoje?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // ... implementation remains the same
  };
  
  const removeAttachment = () => setAttachedFile(null);

  const handleTTS = async (text: string) => {
      // ... implementation remains the same
  };
  
  const handleDownloadTxt = (text: string) => {
      // ... implementation remains the same
  };
  
  const handleShareCopy = (text: string) => {
      // ... implementation remains the same
  };

  return (
    <div className="flex h-full bg-background relative overflow-hidden rounded-tl-xl border-l border-t border-border">
      {/* BRAIN SETTINGS MODAL */}
      {showBrainSettings && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-surface rounded-xl shadow-2xl w-full max-w-2xl border border-border flex flex-col">
                  {/* ... modal content ... */}
                   <Button variant="primary" onClick={() => { setShowBrainSettings(false); addToast({ type: 'success', message: 'Cérebro da IA atualizado.' }); }}>
                      Salvar e Fechar
                   </Button>
              </div>
          </div>
      )}

      <div className="flex flex-col flex-1 h-full min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
            {/* ... header content ... */}
        </div>

        <div ref={null} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
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
        
        <div className="p-4 bg-surface border-t border-border">
          {/* ... suggestions & input ... */}
          <div className="flex items-center gap-2 relative">
            <button onClick={handleFileClick} className="p-2.5 rounded-xl text-muted hover:bg-background" title="Anexar arquivo">
              <PaperClipIcon className="w-5 h-5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

            <MultimodalChatInput
              onSendText={handleSendMessage}
              onStartVoice={() => {}}
              onStopVoice={() => {}}
              isTextLoading={loading}
              isVoiceActive={false}
              isListening={false}
              commands={commands}
            />
          </div>
          <div className="flex items-center justify-end gap-4 pt-2 pr-20">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted hover:text-title">
                  <input type="checkbox" checked={useHistory} onChange={(e) => setUseHistory(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  Manter Contexto
              </label>
              <label className={`flex items-center gap-2 text-xs ${!kbName ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-muted hover:text-title'}`}>
                  <input type="checkbox" checked={useKnowledgeBase} onChange={(e) => setUseKnowledgeBase(e.target.checked)} disabled={!kbName} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                  Consultar Base (RAG)
              </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
