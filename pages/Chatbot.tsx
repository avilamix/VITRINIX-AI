import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { startChat, sendMessageToChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_PRO_MODEL } from '../constants';
import { TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';

const SUGGESTIONS = [
  "Crie um calendário editorial para Instagram de 7 dias sobre Café.",
  "Escreva 5 headlines persuasivas para um anúncio de Black Friday.",
  "Analise as tendências atuais de marketing para E-commerce.",
  "Melhore este texto para torná-lo mais profissional: [Cole seu texto]"
];

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      const newChat = startChat(GEMINI_PRO_MODEL);
      setChatSession(newChat);
      setMessages([
        {
          role: 'model',
          text: 'Olá! Sou a VitrineX AI. Como posso impulsionar seu marketing hoje?',
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(`Failed to start chat: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }, []);

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

    const newUserMessage: ChatMessageType = {
      role: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);
    setError(null);

    try {
      const modelResponseText = await sendMessageToChat(chatSession, text);
      const newModelMessage: ChatMessageType = {
        role: 'model',
        text: modelResponseText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newModelMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Ocorreu um erro ao processar sua mensagem. Tente novamente.');
      setMessages((prev) => [...prev, {
        role: 'model',
        text: '⚠️ Tive um problema de conexão. Poderia repetir?',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [chatSession]);

  const handleClearChat = () => {
    if (window.confirm('Deseja iniciar uma nova conversa? O histórico atual será limpo.')) {
      initChat();
    }
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
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-xs text-textmuted font-medium">Gemini Pro Ativo</p>
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
             <ChatMessage key={index} message={msg} />
          ))}

          {loading && (
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
            isLoading={loading} 
            disabled={!chatSession} 
          />
          
          <div className="mt-2 text-center">
             <p className="text-[10px] text-gray-600">
                O assistente pode cometer erros. Considere verificar informações importantes.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;