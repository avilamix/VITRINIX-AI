import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage as ChatMessageType, ProviderName } from '../types';
import { startChatAsync, sendMessageToChat } from '../services/geminiService';
import { Chat } from '@google/genai';
import { GEMINI_FLASH_MODEL } from '../constants';
import { TrashIcon, SparklesIcon, CircleStackIcon, BoltIcon } from '@heroicons/react/24/outline';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import TypingIndicator from '../components/TypingIndicator';

const SUGGESTIONS = [
  "Create a 7-day editorial calendar for SaaS marketing.",
  "Write 5 persuasive headlines for a B2B webinar.",
  "Analyze current trends in cloud computing.",
  "Refine this paragraph to be more executive-level: [Paste text]"
];

const QUICK_PROMPTS = [
  "Draft Social Post",
  "Professional Rewrite",
  "Strategic Plan",
  "SWOT Analysis",
  "Sales Funnel",
  "Email Response",
  "Generate Keywords"
];

const PROVIDERS: ProviderName[] = ['Google Gemini', 'OpenAI', 'Anthropic', 'Mistral', 'Meta LLaMA'];

const SYSTEM_INSTRUCTION = `You are a sophisticated Enterprise AI Assistant specialized in Marketing, Strategy, and Content.
Provide concise, actionable, and professional responses. Use a neutral, business-oriented tone.
When asked for content, format it clearly with headings and bullet points.`;

const STORAGE_KEY = 'nexus_chat_history';

const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('Google Gemini');
  const [inputText, setInputText] = useState<string>('');
  
  const [useKnowledgeBase, setUseKnowledgeBase] = useState<boolean>(false);
  const kbName = localStorage.getItem('vitrinex_kb_name'); // Kept key for compatibility
  
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
          text: `Hello. I am your Enterprise AI Assistant (${selectedProvider}). How may I assist with your objectives today?`,
          timestamp: new Date().toISOString(),
        }];
      }

      setMessages(initialHistory);

      const newChat = await startChatAsync(
        GEMINI_FLASH_MODEL, 
        selectedProvider, 
        SYSTEM_INSTRUCTION,
        initialHistory, 
        useKnowledgeBase && kbName ? kbName : undefined 
      );
      
      setChatSession(newChat);
      setLoading(false);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(`Connection failed with ${selectedProvider}. Please verify settings.`);
      setLoading(false);
    }
  }, [selectedProvider, useKnowledgeBase, kbName]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;
    abortControllerRef.current = new AbortController();

    const newUserMessage: ChatMessageType = { role: 'user', text: text, timestamp: new Date().toISOString() };
    const newModelMessage: ChatMessageType = { role: 'model', text: '', timestamp: new Date().toISOString() };

    setMessages((prev) => [...prev, newUserMessage, newModelMessage]);
    setLoading(true);
    setError(null);

    try {
      await sendMessageToChat(
        chatSession, 
        text, 
        (partialText) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            if (newMessages[lastMsgIndex].role === 'model') {
               newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], text: partialText };
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError('Processing error. Please try again.');
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
    if (window.confirm('Clear session history? This action cannot be undone.')) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]); 
      initChat();
    }
  };

  const handleFillInput = (prompt: string) => setInputText(prompt);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden rounded-tl-xl border-l border-t border-gray-200">
      
      {/* Header */}
      <header className="flex-none bg-surface border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
             <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-title uppercase tracking-wide">AI Workspace</h1>
            <div className="flex items-center gap-2">
               <select 
                  value={selectedProvider} 
                  onChange={(e) => setSelectedProvider(e.target.value as ProviderName)}
                  className="text-xs text-muted font-medium bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:text-primary transition-colors"
               >
                  {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
               </select>
               
               {selectedProvider === 'Google Gemini' && kbName && (
                  <button 
                    onClick={() => setUseKnowledgeBase(!useKnowledgeBase)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ml-2 ${useKnowledgeBase ? 'bg-success/10 text-success' : 'bg-gray-100 text-muted'}`}
                  >
                     <CircleStackIcon className="w-3 h-3" />
                     {useKnowledgeBase ? "KB Linked" : "KB Unlinked"}
                  </button>
               )}
            </div>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2 text-muted hover:text-error hover:bg-red-50 rounded-lg transition-colors"
          title="Reset Session"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative bg-gray-50/50"
      >
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col min-h-full">
          {messages.map((msg, index) => (
             (msg.text || index === messages.length - 1) && <ChatMessage key={index} message={msg} />
          ))}

          {loading && messages.length > 0 && !messages[messages.length - 1].text && (
            <div className="pl-2 mb-8"><TypingIndicator /></div>
          )}

          {/* Empty State / Suggestions */}
          {messages.length === 1 && !loading && (
             <div className="mt-auto mb-10">
               <p className="text-xs font-bold text-muted uppercase tracking-wider mb-4 text-center">Suggested Inquiries</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {SUGGESTIONS.map((suggestion, idx) => (
                   <button
                     key={idx}
                     onClick={() => handleSendMessage(suggestion)}
                     className="p-4 text-left text-sm text-body bg-surface border border-gray-200 rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 group"
                   >
                     <span className="group-hover:text-primary transition-colors">{suggestion}</span>
                   </button>
                 ))}
               </div>
             </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none bg-surface border-t border-gray-200 p-6 z-20">
        <div className="max-w-4xl mx-auto w-full relative">
           {error && (
            <div className="absolute -top-16 left-0 right-0 mx-auto w-fit bg-red-100 text-red-800 text-xs px-4 py-2 rounded-full shadow-sm border border-red-200">
              {error}
              <button onClick={() => setError(null)} className="ml-2 font-bold hover:text-red-900">&times;</button>
            </div>
          )}
          
          <ChatInput 
            onSend={handleSendMessage} 
            onStop={handleStopGeneration}
            isLoading={loading} 
            disabled={!chatSession} 
            value={inputText}
            onChange={setInputText}
          />
          
          <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
             <div className="flex items-center gap-1.5 flex-shrink-0 text-muted">
                <BoltIcon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">Quick Actions</span>
             </div>
             {QUICK_PROMPTS.map((prompt, idx) => (
               <button
                 key={idx}
                 onClick={() => handleFillInput(prompt)}
                 className="whitespace-nowrap px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-body hover:border-primary hover:text-primary hover:bg-white transition-all flex-shrink-0 font-medium"
               >
                 {prompt}
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;