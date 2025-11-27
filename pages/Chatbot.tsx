
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_PRO_MODEL } from '../constants';
import { TrashIcon, SparklesIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';

const SUGGESTIONS = [
  "Crie um calendário editorial para Instagram de 7 dias sobre Café.",
  "Escreva 5 headlines persuasivas para um anúncio de Black Friday.",
  "Analise as tendências atuais de marketing para E-commerce.",
  "Melhore este texto para torná-lo mais profissional: [Cole seu texto]"
];

const PROVIDERS: ProviderName[] = ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Meta LLaMA'];

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('Google Gemini');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      // We use the async version now to support key retrieval
      const newChat = await startChatAsync(GEMINI_PRO_MODEL, selectedProvider);
      setChatSession(newChat);
      setMessages([
        {
          role: 'model',
          text: `Olá! Sou a VitrineX AI (${selectedProvider}). Como posso impulsionar seu marketing hoje?`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(`Failed to start chat with ${selectedProvider}. Please check your keys in Settings.`);
      setLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;

    // Reset abort controller for new request
    abortControllerRef.current = new AbortController();

    const newUserMessage: ChatMessageType = {
      role: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };
    
    // Optimistic update: Add user message AND empty model message immediately
    const newModelMessage: ChatMessageType = {
      role: 'model',
      text: '', // Start empty for streaming
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage, newModelMessage]);
    setLoading(true);
    setError(null);

    try {
      await sendMessageToChat(
        chatSession, 
        text, 
        (partialText) => {
          // Update the last message (the model's message) with streaming text
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            if (newMessages[lastMsgIndex].role === 'model') {
               newMessages[lastMsgIndex] = {
                 ...newMessages[lastMsgIndex],
                 text: partialText
               };
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      console.error('Error sending message:', err);
      // If manually aborted, don't show generic error
      if (!abortControllerRef.current?.signal.aborted) {
        setError('Ocorreu um erro ao processar sua mensagem. Tente novamente ou troque de provedor.');
        setMessages((prev) => [...prev, {
          role: 'model',
          text: '⚠️ Tive um problema de conexão. Poderia repetir?',
          timestamp: new Date().toISOString(),
        }]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatSession]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  const handleClearChat = () => {
    if (window.confirm('Deseja iniciar uma nova conversa? O histórico atual será limpo.')) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      initChat();
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedProvider(e.target.value as ProviderName);
      // Chat will re-init via useEffect dependency
  };

  return (
    <div className="flex flex-col h-full bg-darkbg relative">
      {/* Header */}
      <header className="flex-none bg-darkbg/80 backdrop-blur-md border-b border-gray-800 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-textdark leading-tight">Assistente de Marketing</h1>
              <div className="flex items-center gap-2 mt-1">
                 <CpuChipIcon className="w-3 h-3 text-textmuted" />
                 <select 
                    value={selectedProvider} 
                    onChange={handleProviderChange}
                    className="bg-transparent text-xs text-textmuted font-medium border-none p-0 focus:ring-0 cursor-pointer hover:text-textlight"
                 >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearChat}
            className="p-2 text-textmuted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title="Limpar Conversa"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative"
      >
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col min-h-full justify-start">
          
          {messages.map((msg, index) => (
             // Only render if text is not empty, OR if it's the last message (currently streaming)
             (msg.text || index === messages.length - 1) && <ChatMessage key={index} message={msg} />
          ))}

          {loading && messages.length > 0 && !messages[messages.length - 1].text && (
            <div className="flex justify-start mb-6 pl-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <TypingIndicator />
            </div>
          )}

          {/* Empty State Suggestions */}
          {messages.length === 1 && !loading && (
             <div className="mt-auto mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
               <p className="text-sm text-textmuted mb-4 font-medium text-center">Experimente perguntar:</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {SUGGESTIONS.map((suggestion, idx) => (
                   <button
                     key={idx}
                     onClick={() => handleSendMessage(suggestion)}
                     className="p-4 text-left text-sm text-textlight bg-lightbg/50 border border-gray-800/50 rounded-xl hover:bg-lightbg hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                   >
                     <span className="group-hover:text-primary transition-colors line-clamp-2">"{suggestion}"</span>
                   </button>
                 ))}
               </div>
             </div>
          )}

          <div ref={messagesEndRef} className="h-px w-full" />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none bg-darkbg border-t border-gray-800 p-4 pb-6 z-20">
        <div className="max-w-4xl mx-auto w-full relative">
           {error && (
            <div className="absolute -top-14 left-0 right-0 mx-auto w-fit bg-red-900/90 text-red-100 text-xs px-3 py-2 rounded-full shadow-lg border border-red-500/50 backdrop-blur animate-in fade-in slide-in-from-bottom-2">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-bold hover:text-white">&times;</button>
            </div>
          )}
          
          <ChatInput 
            onSend={handleSendMessage} 
            onStop={handleStopGeneration}
            isLoading={loading} 
            disabled={!chatSession} 
          />
          
          <div className="mt-2 text-center">
             <p className="text-[10px] text-gray-600">
                Usando {selectedProvider}. O assistente pode cometer erros.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
